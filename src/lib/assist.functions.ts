import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AiUnavailableError, generateJson } from "./ai.server";

const uuid = z.string().uuid();

export const EDIT_ACTIONS = [
  "rewrite",
  "tension",
  "tighten",
  "expand",
  "clarify",
  "dialogue",
  "rhythm",
  "voice",
  "custom",
  "continue",
] as const;

export type EditAction = (typeof EDIT_ACTIONS)[number];

const ACTION_BRIEF: Record<EditAction, string> = {
  rewrite: "Rewrite the passage, keeping its meaning and the author's voice.",
  tension: "Raise the tension of the passage without adding new events.",
  tighten: "Tighten the passage. Cut slack, keep every beat that matters.",
  expand: "Expand the passage with texture that is already implied by the scene.",
  clarify: "Clarify the passage so it reads cleanly, without explaining it away.",
  dialogue: "Adjust the dialogue so it sounds spoken and true to each character.",
  rhythm: "Change the rhythm of the passage: sentence length, cadence, breath.",
  voice: "Preserve the author's voice while smoothing anything that stumbles.",
  custom: "Follow the author's instruction exactly.",
  continue: "Continue the scene from where the text stops. Write forward, do not summarise.",
};

/** Product-facing failure shape; the UI shows this instead of inventing an answer. */
type Unavailable = { ok: false; kind: string; message: string };

function unavailable(error: unknown): Unavailable {
  if (error instanceof AiUnavailableError)
    return { ok: false, kind: error.kind, message: error.message };
  return {
    ok: false,
    kind: "error",
    message: "Assistance isn't available right now. Your writing is unaffected.",
  };
}

type SceneRow = {
  id: string;
  title: string;
  position: number;
  chapter_id: string;
  plain_text: string;
};

type Ctx = { supabase: { from: (table: string) => any } };

async function loadContext(
  context: Ctx,
  projectId: string,
  sceneId: string | null,
): Promise<{
  projectTitle: string;
  genre: string | null;
  creativeDirection: string | null;
  chapters: { id: string; title: string; position: number }[];
  scenes: SceneRow[];
  directions: { body: string; kind: string; scene_id: string | null; chapter_id: string | null }[];
}> {
  const [project, chapters, scenes, directions] = await Promise.all([
    context.supabase
      .from("projects")
      .select("title, genre, creative_direction")
      .eq("id", projectId)
      .single(),
    context.supabase
      .from("chapters")
      .select("id, title, position")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("position"),
    context.supabase
      .from("scenes")
      .select("id, title, position, chapter_id, plain_text")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("position"),
    context.supabase
      .from("author_directions")
      .select("body, kind, scene_id, chapter_id")
      .eq("project_id", projectId)
      .eq("status", "active"),
  ]);

  if (project.error) throw new Error(project.error.message);
  // Ownership is enforced by row-level security on every one of these reads.
  if (sceneId && !(scenes.data ?? []).some((row: SceneRow) => row.id === sceneId)) {
    throw new Error("Scene not found in this project.");
  }

  return {
    projectTitle: project.data.title as string,
    genre: (project.data.genre as string | null) ?? null,
    creativeDirection: (project.data.creative_direction as string | null) ?? null,
    chapters: chapters.data ?? [],
    scenes: (scenes.data ?? []) as SceneRow[],
    directions: directions.data ?? [],
  };
}

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function directionsBlock(
  directions: { body: string; kind: string; scene_id: string | null; chapter_id: string | null }[],
  sceneId: string | null,
  chapterId: string | null,
) {
  const relevant = directions.filter(
    (d) =>
      (!d.scene_id && !d.chapter_id) ||
      (sceneId && d.scene_id === sceneId) ||
      (chapterId && d.chapter_id === chapterId),
  );
  if (relevant.length === 0) return "None recorded.";
  // Scene-level instructions come last so they take precedence when read in order.
  const order = { standing: 0, planned: 1, exception: 2 } as Record<string, number>;
  return relevant
    .sort((a, b) => (order[a.kind] ?? 0) - (order[b.kind] ?? 0))
    .map((d) => {
      const label =
        d.kind === "planned"
          ? "PLANNED (author intends this; it is NOT established in the draft)"
          : d.kind === "exception"
            ? "INTENTIONAL EXCEPTION for this scene"
            : "STANDING PREFERENCE";
      const scope = d.scene_id ? "this scene" : d.chapter_id ? "this chapter" : "whole project";
      return `- [${label} · ${scope}] ${d.body}`;
    })
    .join("\n");
}

const PROPOSAL_SYSTEM = `You are Storymatic, a literary editor working inside an author's manuscript.
The author is the director: you propose, they decide.
Rules:
- Return only the replacement prose for the passage you were given. No preamble, no commentary inside the prose, no quotation marks around it.
- Never rewrite anything outside the given passage.
- Never resolve an ambiguity the author is keeping open, and never introduce facts that the manuscript has not established.
- A PLANNED author intention is not yet true in the draft: never write it onto the page unless the instruction asks for it.
- Match the manuscript's existing voice, tense and point of view.
- Keep paragraph breaks as blank lines.
- The explanation is one or two calm sentences about what you changed and why.`;

const PROPOSAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["proposed_text", "explanation"],
  properties: {
    proposed_text: { type: "string" },
    explanation: { type: "string" },
  },
};

export const proposePassageEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: uuid,
        sceneId: uuid,
        action: z.enum(EDIT_ACTIONS),
        instruction: z.string().trim().max(2000).optional(),
        selection: z.string().max(20000),
        sceneText: z.string().max(60000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const ctx = await loadContext(context as unknown as Ctx, data.projectId, data.sceneId);
      const scene = ctx.scenes.find((row) => row.id === data.sceneId)!;
      const chapter = ctx.chapters.find((row) => row.id === scene.chapter_id) ?? null;
      const others = ctx.scenes
        .filter((row) => row.id !== scene.id)
        .map((row) => `### ${row.title}\n${clip(row.plain_text, 1200)}`)
        .join("\n\n");

      const brief =
        data.action === "custom"
          ? (data.instruction ?? "").trim() || ACTION_BRIEF.rewrite
          : ACTION_BRIEF[data.action];

      const input = [
        `BOOK: ${ctx.projectTitle}${ctx.genre ? ` (${ctx.genre})` : ""}`,
        ctx.creativeDirection ? `CREATIVE DIRECTION: ${ctx.creativeDirection}` : "",
        `CHAPTER: ${chapter?.title ?? "—"}`,
        `SCENE: ${scene.title}`,
        `AUTHOR DIRECTION IN FORCE:\n${directionsBlock(ctx.directions, scene.id, scene.chapter_id)}`,
        `WHAT THE AUTHOR ASKED FOR: ${brief}`,
        data.action === "custom" ? "" : data.instruction ? `EXTRA NOTE: ${data.instruction}` : "",
        `CURRENT SCENE TEXT:\n${clip(data.sceneText, 24000)}`,
        data.action === "continue"
          ? "TASK: write the next stretch of this scene (roughly 120–250 words) as `proposed_text`. It will be appended, not replace anything."
          : `PASSAGE TO REPLACE (verbatim):\n${data.selection}\n\nTASK: return the replacement for this passage only.`,
        others ? `OTHER SCENES FOR CONTEXT ONLY (do not edit):\n${clip(others, 12000)}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const result = await generateJson<{ proposed_text: string; explanation: string }>({
        system: PROPOSAL_SYSTEM,
        input,
        schemaName: "passage_proposal",
        schema: PROPOSAL_SCHEMA,
      });

      return {
        ok: true as const,
        proposedText: result.proposed_text.trim(),
        explanation: result.explanation.trim(),
      };
    } catch (error) {
      return unavailable(error);
    }
  });

const ASK_SYSTEM = `You are Storymatic, the intelligence of this specific book. You are not a general assistant.
Rules:
- Answer only from the manuscript, the author's recorded direction, and the question's scope.
- Separate what the manuscript establishes from your interpretation and from any new suggestion. Set "basis" accordingly.
- If the manuscript does not support an answer, say so plainly and set basis to "insufficient".
- A PLANNED author intention is not an event in the story. Never treat it as something a character knows or as something that happened.
- When asked what a character knows at a point in the manuscript, use only what that character could have learned up to that point.
- Quote sources verbatim from the scenes given, short (under 25 words), and cite the scene reference tag.
- Do not invent quotations. If you have no verbatim source, return an empty sources list.
- Your answer is not manuscript text and never becomes story canon.`;

const ASK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "basis", "sources"],
  properties: {
    answer: { type: "string" },
    basis: { type: "string", enum: ["evidence", "interpretation", "suggestion", "insufficient"] },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["scene_ref", "quote"],
        properties: {
          scene_ref: { type: "string" },
          quote: { type: "string" },
        },
      },
    },
  },
};

export const askStorymatic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        projectId: uuid,
        sceneId: uuid.nullable(),
        scope: z.enum(["selection", "scene", "chapter", "project"]),
        question: z.string().trim().min(1).max(2000),
        selection: z.string().max(20000).optional(),
        sceneText: z.string().max(60000).optional(),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(6000) }))
          .max(12)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const ctx = await loadContext(context as unknown as Ctx, data.projectId, data.sceneId);
      const scene = data.sceneId ? (ctx.scenes.find((row) => row.id === data.sceneId) ?? null) : null;

      const inScope = ctx.scenes.filter((row) => {
        if (data.scope === "project") return true;
        if (!scene) return false;
        if (data.scope === "chapter") return row.chapter_id === scene.chapter_id;
        return row.id === scene.id;
      });

      const refs = new Map<string, string>();
      const passages = inScope
        .map((row, index) => {
          const ref = `S${index + 1}`;
          refs.set(ref, row.id);
          const chapter = ctx.chapters.find((c) => c.id === row.chapter_id);
          const body =
            row.id === scene?.id && data.sceneText ? data.sceneText : row.plain_text;
          return `[${ref}] ${chapter?.title ?? "Chapter"} · ${row.title}\n${clip(body, data.scope === "project" ? 3500 : 12000)}`;
        })
        .join("\n\n");

      const coverage =
        data.scope === "project"
          ? "Scope: the whole project. Scene text may be clipped; do not claim exhaustive coverage."
          : data.scope === "chapter"
            ? "Scope: the current chapter only. Earlier or later chapters were not retrieved."
            : data.scope === "selection"
              ? "Scope: the selected passage, read inside its scene."
              : "Scope: the current scene only.";

      const input = [
        `BOOK: ${ctx.projectTitle}${ctx.genre ? ` (${ctx.genre})` : ""}`,
        ctx.creativeDirection ? `CREATIVE DIRECTION: ${ctx.creativeDirection}` : "",
        coverage,
        `AUTHOR DIRECTION ON RECORD:\n${directionsBlock(ctx.directions, scene?.id ?? null, scene?.chapter_id ?? null)}`,
        data.scope === "selection" && data.selection
          ? `SELECTED PASSAGE:\n${clip(data.selection, 8000)}`
          : "",
        `MANUSCRIPT IN SCOPE:\n${passages || "(nothing written yet)"}`,
        data.history?.length
          ? `EARLIER IN THIS CONVERSATION:\n${data.history
              .map((turn) => `${turn.role === "user" ? "Author" : "Storymatic"}: ${clip(turn.text, 1200)}`)
              .join("\n")}`
          : "",
        `QUESTION: ${data.question}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const result = await generateJson<{
        answer: string;
        basis: string;
        sources: { scene_ref: string; quote: string }[];
      }>({
        system: ASK_SYSTEM,
        input,
        schemaName: "storymatic_answer",
        schema: ASK_SCHEMA,
      });

      return {
        ok: true as const,
        answer: result.answer.trim(),
        basis: result.basis,
        sources: (result.sources ?? [])
          .map((source) => ({
            sceneId: refs.get(source.scene_ref.trim().toUpperCase()) ?? null,
            quote: source.quote.trim(),
          }))
          .filter((source): source is { sceneId: string; quote: string } =>
            Boolean(source.sceneId && source.quote),
          ),
      };
    } catch (error) {
      return unavailable(error);
    }
  });
