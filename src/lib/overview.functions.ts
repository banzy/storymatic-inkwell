import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type StoryOverview = {
  words: number;
  sceneCount: number;
  chapterCount: number;
  startedScenes: number;
  emptyScenes: number;
  longestScene: { id: string; title: string; words: number } | null;
  lastWrittenAt: string | null;
  recent: { sceneId: string; title: string; at: string; words: number }[];
  owed: { id: string; title: string; promise: string }[];
  owedCount: number;
  worthALook: { id: string; title: string; body: string; sceneId: string | null }[];
  worthALookCount: number;
  needsReview: number;
  unplacedScenes: number;
  plannedNotWritten: { id: string; title: string }[];
};

/**
 * A calm read of where the book stands. Pure reads — nothing is generated, nothing
 * is scored, and nothing here changes the draft.
 */
export const getStoryOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const projectId = data.projectId;

    const [scenesRes, chaptersRes, revisionsRes, promisesRes, observationsRes, claimsRes, beatsRes] =
      await Promise.all([
        supabase
          .from("scenes")
          .select("id, title, word_count, story_time, updated_at")
          .eq("project_id", projectId)
          .is("deleted_at", null)
          .order("position"),
        supabase
          .from("chapters")
          .select("id")
          .eq("project_id", projectId)
          .is("deleted_at", null),
        supabase
          .from("scene_revisions")
          .select("scene_id, word_count, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(24),
        supabase
          .from("story_promises")
          .select("id, title, promise, status")
          .eq("project_id", projectId)
          .eq("status", "open")
          .order("created_at", { ascending: false }),
        supabase
          .from("observations")
          .select("id, title, body, scene_id, status")
          .eq("project_id", projectId)
          .eq("kind", "discovery")
          .eq("status", "open")
          .order("created_at", { ascending: false }),

        supabase
          .from("story_claims")
          .select("id")
          .eq("project_id", projectId)
          .eq("validity", "needs_review"),
        supabase
          .from("outline_beats")
          .select("id, title, status, scene_id")
          .eq("project_id", projectId)
          .eq("status", "planned")
          .is("scene_id", null)
          .order("position"),
      ]);

    const scenes = scenesRes.data ?? [];
    const titles = new Map(scenes.map((scene) => [scene.id, scene.title ?? "Untitled scene"]));

    const words = scenes.reduce((total, scene) => total + (scene.word_count ?? 0), 0);
    const started = scenes.filter((scene) => (scene.word_count ?? 0) > 0);
    const longest = [...started].sort(
      (a, b) => (b.word_count ?? 0) - (a.word_count ?? 0),
    )[0];

    const seen = new Set<string>();
    const recent: StoryOverview["recent"] = [];
    for (const revision of revisionsRes.data ?? []) {
      if (!revision.scene_id || seen.has(revision.scene_id)) continue;
      if (!titles.has(revision.scene_id)) continue;
      seen.add(revision.scene_id);
      recent.push({
        sceneId: revision.scene_id,
        title: titles.get(revision.scene_id)!,
        at: revision.created_at,
        words: revision.word_count ?? 0,
      });
      if (recent.length === 5) break;
    }

    const owedAll = promisesRes.data ?? [];
    const observations = observationsRes.data ?? [];

    const overview: StoryOverview = {
      words,
      sceneCount: scenes.length,
      chapterCount: (chaptersRes.data ?? []).length,
      startedScenes: started.length,
      emptyScenes: scenes.length - started.length,
      longestScene: longest
        ? { id: longest.id, title: longest.title ?? "Untitled scene", words: longest.word_count ?? 0 }
        : null,
      lastWrittenAt: (revisionsRes.data ?? [])[0]?.created_at ?? null,
      recent,
      owed: owedAll.slice(0, 4).map((row) => ({
        id: row.id,
        title: row.title,
        promise: row.promise ?? "",
      })),
      owedCount: owedAll.length,
      worthALook: observations.slice(0, 3).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body ?? "",
        sceneId: row.scene_id,
      })),
      worthALookCount: observations.length,
      needsReview: (claimsRes.data ?? []).length,
      unplacedScenes: scenes.filter((scene) => !scene.story_time?.trim()).length,
      plannedNotWritten: (beatsRes.data ?? [])
        .slice(0, 4)
        .map((row) => ({ id: row.id, title: row.title })),
    };

    return overview;
  });
