import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  SAMPLE_CHAPTER_TITLE,
  SAMPLE_DIRECTIONS,
  SAMPLE_DIRECTION_SUMMARY,
  SAMPLE_GENRE,
  SAMPLE_OBSERVATIONS,
  SAMPLE_SCENES,
  SAMPLE_TITLE,
} from "./sample-manuscript";
import { countWords, docToPlainText, splitIntoScenes, textToDoc } from "./prose";

const uuid = z.string().uuid();

/** Editor documents are stored as jsonb; the generated Json type is structural. */
const asJson = (value: unknown) => value as never;

/* ------------------------------------------------------------------ projects */

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, title, genre, is_sample, updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(160),
        genre: z.string().trim().max(120).optional(),
        creativeDirection: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        owner_id: userId,
        title: data.title,
        genre: data.genre ?? null,
        creative_direction: data.creativeDirection ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .insert({ project_id: project.id, title: "Chapter One", position: 1 })
      .select("id")
      .single();
    if (chapterError) throw new Error(chapterError.message);

    const { error: sceneError } = await supabase.from("scenes").insert({
      project_id: project.id,
      chapter_id: chapter.id,
      title: "Scene One",
      position: 1,
      content: asJson(textToDoc("")),
    });
    if (sceneError) throw new Error(sceneError.message);

    return { projectId: project.id };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------- sample project */

async function buildSample(supabase: SupabaseLike, userId: string) {
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      owner_id: userId,
      title: SAMPLE_TITLE,
      genre: SAMPLE_GENRE,
      creative_direction: SAMPLE_DIRECTION_SUMMARY,
      is_sample: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .insert({ project_id: project.id, title: SAMPLE_CHAPTER_TITLE, position: 1 })
    .select("id")
    .single();
  if (chapterError) throw new Error(chapterError.message);

  const sceneIds: Record<string, string> = {};
  let position = 1;
  for (const scene of SAMPLE_SCENES) {
    const doc = textToDoc(scene.body);
    const plain = docToPlainText(doc);
    const { data: row, error: sceneError } = await supabase
      .from("scenes")
      .insert({
        project_id: project.id,
        chapter_id: chapter.id,
        title: scene.title,
        position: position++,
        summary: scene.summary,
        pov: scene.pov,
        location: scene.location,
        story_time: scene.storyTime,
        content: asJson(doc),
        plain_text: plain,
        word_count: countWords(plain),
      })
      .select("id")
      .single();
    if (sceneError) throw new Error(sceneError.message);
    sceneIds[scene.key] = row.id;

    await supabase.from("scene_revisions").insert({
      project_id: project.id,
      scene_id: row.id,
      content: asJson(doc),
      plain_text: plain,
      word_count: countWords(plain),
      source: "sample",
      label: "Sample manuscript",
    });
  }

  for (const direction of SAMPLE_DIRECTIONS) {
    await supabase.from("author_directions").insert({
      project_id: project.id,
      scope: direction.scope,
      chapter_id: direction.scope === "chapter" ? chapter.id : null,
      scene_id: direction.sceneKey ? sceneIds[direction.sceneKey] : null,
      subject: direction.subject ?? null,
      body: direction.body,
      kind: direction.kind,
    });
  }

  for (const observation of SAMPLE_OBSERVATIONS) {
    await supabase.from("observations").insert({
      project_id: project.id,
      scene_id: sceneIds[observation.sceneKey] ?? null,
      title: observation.title,
      body: observation.body,
      why_it_matters: observation.whyItMatters,
      uncertainty: observation.uncertainty ?? null,
      origin: "sample",
      evidence: observation.evidence.map((item) => ({
        scene_id: sceneIds[item.sceneKey],
        quote: item.quote,
      })),
    });
  }

  return project.id;
}

export const openSampleProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("is_sample", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) return { projectId: existing.id, created: false };
    const projectId = await buildSample(supabase, userId);
    return { projectId, created: true };
  });

export const resetSampleProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Only sample projects are touched; other projects are never read or changed.
    const { error } = await supabase.from("projects").delete().eq("is_sample", true);
    if (error) throw new Error(error.message);
    const projectId = await buildSample(supabase, userId);
    return { projectId };
  });

/* ----------------------------------------------------------------- workspace */

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, title, genre, creative_direction, is_sample")
      .eq("id", data.projectId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Project not found");

    const [chapters, scenes, directions, observations] = await Promise.all([
      supabase
        .from("chapters")
        .select("id, title, position")
        .eq("project_id", project.id)
        .is("deleted_at", null)
        .order("position"),
      supabase
        .from("scenes")
        .select("id, chapter_id, title, position, word_count, updated_at, deleted_at")
        .eq("project_id", project.id)
        .order("position"),
      supabase
        .from("author_directions")
        .select("id, scope, scene_id, chapter_id, subject, body, kind, status, is_inferred, confirmed")
        .eq("project_id", project.id)
        .order("created_at"),
      supabase
        .from("observations")
        .select("id, scene_id, title, body, why_it_matters, uncertainty, status, origin, evidence")
        .eq("project_id", project.id)
        .order("created_at"),
    ]);

    for (const result of [chapters, scenes, directions, observations]) {
      if (result.error) throw new Error(result.error.message);
    }

    return {
      project,
      chapters: chapters.data ?? [],
      scenes: scenes.data ?? [],
      directions: directions.data ?? [],
      observations: observations.data ?? [],
    };
  });

export const getScene = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sceneId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: scene, error } = await context.supabase
      .from("scenes")
      .select(
        "id, project_id, chapter_id, title, summary, pov, location, story_time, content, plain_text, word_count, updated_at, deleted_at",
      )
      .eq("id", data.sceneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!scene) throw new Error("Scene not found");
    return scene;
  });

export const saveScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sceneId: uuid,
        content: z.unknown(),
        plainText: z.string(),
        wordCount: z.number().int().nonnegative(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: scene, error: readError } = await supabase
      .from("scenes")
      .select("id, project_id, plain_text")
      .eq("id", data.sceneId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!scene) throw new Error("Scene not found");

    const { error } = await supabase
      .from("scenes")
      .update({
        content: asJson(data.content),
        plain_text: data.plainText,
        word_count: data.wordCount,
      })
      .eq("id", data.sceneId);
    if (error) throw new Error(error.message);

    let revisionId: string | null = null;
    if (scene.plain_text !== data.plainText) {
      const { data: last } = await supabase
        .from("scene_revisions")
        .select("id, plain_text, created_at")
        .eq("scene_id", data.sceneId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastAge = last ? Date.now() - new Date(last.created_at).getTime() : Infinity;
      // One revision per scene per 90s of active writing keeps history readable.
      if (!last || (last.plain_text !== data.plainText && lastAge > 90_000)) {
        const { data: revision, error: revisionError } = await supabase
          .from("scene_revisions")
          .insert({
            project_id: scene.project_id,
            scene_id: data.sceneId,
            content: asJson(data.content),
            plain_text: data.plainText,
            word_count: data.wordCount,
            source: "author",
          })
          .select("id")
          .single();
        if (revisionError) throw new Error(revisionError.message);
        revisionId = revision.id;
      }
    }

    // Anything the story model based on wording that has now changed is marked
    // as needing another look — never silently kept, never silently deleted.
    let needsReview = 0;
    if (scene.plain_text !== data.plainText) {
      const { data: claims } = await supabase
        .from("story_claims")
        .select("id, evidence")
        .eq("scene_id", data.sceneId)
        .eq("validity", "current");
      const haystack = flattenText(data.plainText);
      const stale: string[] = [];
      for (const claim of claims ?? []) {
        const evidence = Array.isArray(claim.evidence)
          ? (claim.evidence as { quote?: string }[])
          : [];
        const quotes = evidence.map((item) => (item.quote ?? "").trim()).filter(Boolean);
        if (quotes.length === 0) continue;
        if (!quotes.every((quote) => haystack.includes(flattenText(quote)))) stale.push(claim.id);
      }
      if (stale.length > 0) {
        await supabase.from("story_claims").update({ validity: "needs_review" }).in("id", stale);
        needsReview = stale.length;
      }
    }

    return { savedAt: new Date().toISOString(), revisionId, needsReview };
  });

/** Quote matching ignores curly quotes and whitespace differences, never offsets. */
const flattenText = (text: string) =>
  text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();


/* --------------------------------------------------------- chapters & scenes */

export const createChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: uuid, title: z.string().trim().max(160).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: last } = await supabase
      .from("chapters")
      .select("position")
      .eq("project_id", data.projectId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: chapter, error } = await supabase
      .from("chapters")
      .insert({
        project_id: data.projectId,
        title: data.title?.trim() || "New chapter",
        position: (last?.position ?? 0) + 1,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { chapterId: chapter.id };
  });

export const createScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ projectId: uuid, chapterId: uuid, title: z.string().trim().max(160).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: last } = await supabase
      .from("scenes")
      .select("position")
      .eq("chapter_id", data.chapterId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: scene, error } = await supabase
      .from("scenes")
      .insert({
        project_id: data.projectId,
        chapter_id: data.chapterId,
        title: data.title?.trim() || "New scene",
        position: (last?.position ?? 0) + 1,
        content: asJson(textToDoc("")),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { sceneId: scene.id };
  });

export const renameNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(["chapter", "scene"]),
        id: uuid,
        title: z.string().trim().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } =
      data.kind === "chapter"
        ? await context.supabase.from("chapters").update({ title: data.title }).eq("id", data.id)
        : await context.supabase.from("scenes").update({ title: data.title }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(["chapter", "scene"]),
        id: uuid,
        direction: z.enum(["up", "down"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const readCurrent = async () => {
      if (data.kind === "chapter") {
        const { data: row } = await supabase
          .from("chapters")
          .select("id, position, project_id")
          .eq("id", data.id)
          .maybeSingle();
        return row ? { position: row.position, scope: row.project_id } : null;
      }
      const { data: row } = await supabase
        .from("scenes")
        .select("id, position, chapter_id")
        .eq("id", data.id)
        .maybeSingle();
      return row ? { position: row.position, scope: row.chapter_id } : null;
    };

    const current = await readCurrent();
    if (!current) throw new Error("Not found");

    const neighbour = await (async () => {
      const ascending = data.direction === "down";
      if (data.kind === "chapter") {
        const query = supabase
          .from("chapters")
          .select("id, position")
          .eq("project_id", current.scope)
          .is("deleted_at", null);
        const { data: row } = await (ascending
          ? query.gt("position", current.position).order("position", { ascending: true })
          : query.lt("position", current.position).order("position", { ascending: false })
        )
          .limit(1)
          .maybeSingle();
        return row;
      }
      const query = supabase
        .from("scenes")
        .select("id, position")
        .eq("chapter_id", current.scope)
        .is("deleted_at", null);
      const { data: row } = await (ascending
        ? query.gt("position", current.position).order("position", { ascending: true })
        : query.lt("position", current.position).order("position", { ascending: false })
      )
        .limit(1)
        .maybeSingle();
      return row;
    })();

    if (!neighbour) return { moved: false };

    if (data.kind === "chapter") {
      await supabase.from("chapters").update({ position: current.position }).eq("id", neighbour.id);
      await supabase.from("chapters").update({ position: neighbour.position }).eq("id", data.id);
    } else {
      await supabase.from("scenes").update({ position: current.position }).eq("id", neighbour.id);
      await supabase.from("scenes").update({ position: neighbour.position }).eq("id", data.id);
    }
    return { moved: true };
  });

/**
 * Puts one scene directly before or after another — what dragging a card on the
 * corkboard does. The scene joins the target's chapter if it wasn't already in
 * it; nothing in either scene's text is touched.
 */
export const placeScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ sceneId: uuid, targetSceneId: uuid, before: z.boolean() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.sceneId === data.targetSceneId) return { moved: false as const };

    const { data: target, error: targetError } = await supabase
      .from("scenes")
      .select("id, chapter_id, position")
      .eq("id", data.targetSceneId)
      .maybeSingle();
    if (targetError) throw new Error(targetError.message);
    if (!target) return { moved: false as const };

    // The nearest sibling on the side the card was dropped, so we can land between them.
    const siblings = supabase
      .from("scenes")
      .select("id, position")
      .eq("chapter_id", target.chapter_id)
      .is("deleted_at", null)
      .neq("id", data.sceneId);
    const { data: neighbour } = await (data.before
      ? siblings.lt("position", target.position).order("position", { ascending: false })
      : siblings.gt("position", target.position).order("position", { ascending: true })
    )
      .limit(1)
      .maybeSingle();

    const position = neighbour
      ? (target.position + neighbour.position) / 2
      : data.before
        ? target.position - 1
        : target.position + 1;

    const { error } = await supabase
      .from("scenes")
      .update({ chapter_id: target.chapter_id, position })
      .eq("id", data.sceneId);
    if (error) throw new Error(error.message);
    return { moved: true as const };
  });

export const setSceneDeleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sceneId: uuid, deleted: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scenes")
      .update({ deleted_at: data.deleted ? new Date().toISOString() : null })
      .eq("id", data.sceneId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setChapterDeleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ chapterId: uuid, deleted: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const stamp = data.deleted ? new Date().toISOString() : null;
    const { error } = await context.supabase
      .from("chapters")
      .update({ deleted_at: stamp })
      .eq("id", data.chapterId);
    if (error) throw new Error(error.message);
    await context.supabase
      .from("scenes")
      .update({ deleted_at: stamp })
      .eq("chapter_id", data.chapterId);
    return { ok: true };
  });

export const updateSceneMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sceneId: uuid,
        summary: z.string().max(2000).nullable(),
        pov: z.string().max(160).nullable(),
        location: z.string().max(200).nullable(),
        storyTime: z.string().max(200).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scenes")
      .update({
        summary: data.summary,
        pov: data.pov,
        location: data.location,
        story_time: data.storyTime,
      })
      .eq("id", data.sceneId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------------------------------------------- revisions */

export const listRevisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sceneId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("scene_revisions")
      .select("id, created_at, word_count, source, label, plain_text")
      .eq("scene_id", data.sceneId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const restoreRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ revisionId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: revision, error } = await supabase
      .from("scene_revisions")
      .select("id, project_id, scene_id, content, plain_text, word_count")
      .eq("id", data.revisionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!revision) throw new Error("Revision not found");

    const { data: scene } = await supabase
      .from("scenes")
      .select("content, plain_text, word_count")
      .eq("id", revision.scene_id)
      .maybeSingle();

    // Keep the pre-restore text recoverable.
    if (scene && scene.plain_text !== revision.plain_text) {
      await supabase.from("scene_revisions").insert({
        project_id: revision.project_id,
        scene_id: revision.scene_id,
        content: asJson(scene.content),
        plain_text: scene.plain_text,
        word_count: scene.word_count,
        source: "author",
        label: "Before restore",
      });
    }

    const { error: updateError } = await supabase
      .from("scenes")
      .update({
        content: asJson(revision.content),
        plain_text: revision.plain_text,
        word_count: revision.word_count,
      })
      .eq("id", revision.scene_id);
    if (updateError) throw new Error(updateError.message);

    return { sceneId: revision.scene_id };
  });

/* -------------------------------------------------------------------- import */

export const importManuscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: uuid,
        chapterTitle: z.string().trim().max(160).optional(),
        text: z.string().min(1).max(400_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: last } = await supabase
      .from("chapters")
      .select("position")
      .eq("project_id", data.projectId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: chapter, error } = await supabase
      .from("chapters")
      .insert({
        project_id: data.projectId,
        title: data.chapterTitle?.trim() || "Imported chapter",
        position: (last?.position ?? 0) + 1,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const parts = splitIntoScenes(data.text);
    let position = 1;
    let firstSceneId: string | null = null;
    for (const part of parts) {
      const doc = textToDoc(part.body);
      const plain = docToPlainText(doc);
      const { data: scene, error: sceneError } = await supabase
        .from("scenes")
        .insert({
          project_id: data.projectId,
          chapter_id: chapter.id,
          title: part.title,
          position: position++,
          content: asJson(doc),
          plain_text: plain,
          word_count: countWords(plain),
        })
        .select("id")
        .single();
      if (sceneError) throw new Error(sceneError.message);
      if (!firstSceneId) firstSceneId = scene.id;
      await supabase.from("scene_revisions").insert({
        project_id: data.projectId,
        scene_id: scene.id,
        content: asJson(doc),
        plain_text: plain,
        word_count: countWords(plain),
        source: "import",
        label: "Imported",
      });
    }

    return { chapterId: chapter.id, sceneId: firstSceneId, sceneCount: parts.length };
  });

/* ----------------------------------------------------------------- direction */

export const saveDirection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid.optional(),
        projectId: uuid,
        scope: z.enum(["project", "chapter", "scene"]),
        chapterId: uuid.nullable().optional(),
        sceneId: uuid.nullable().optional(),
        subject: z.string().trim().max(160).nullable().optional(),
        body: z.string().trim().min(1).max(2000),
        kind: z.enum(["standing", "planned", "exception"]),
        status: z.enum(["active", "retired"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const row = {
      project_id: data.projectId,
      scope: data.scope,
      chapter_id: data.chapterId ?? null,
      scene_id: data.sceneId ?? null,
      subject: data.subject ?? null,
      body: data.body,
      kind: data.kind,
      status: data.status ?? "active",
      is_inferred: false,
      confirmed: true,
    };
    if (data.id) {
      const { error } = await supabase.from("author_directions").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await supabase
      .from("author_directions")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const setDirectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: uuid, status: z.enum(["active", "retired"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("author_directions")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setObservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: uuid, status: z.enum(["open", "intentional", "dismissed"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("observations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Minimal structural type so the sample builder can accept the request client. */
type SupabaseLike = {
  from: (table: string) => any;
};
