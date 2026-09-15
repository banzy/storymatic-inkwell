import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AiUnavailableError, generateJson } from "./ai.server";

const uuid = z.string().uuid();

const ENTITY_KINDS = ["character", "location", "object", "faction", "thread"] as const;

export type StoryEntity = {
  id: string;
  kind: string;
  name: string;
  aliases: string[];
  identity: string | null;
  current_state: string | null;
  notes: string | null;
  truth_type: string;
  author_confirmed: boolean;
  first_scene_id: string | null;
};

export type StoryClaim = {
  id: string;
  entity_id: string | null;
  scene_id: string | null;
  claim_kind: string;
  subject: string;
  assertion: string;
  basis: string;
  truth_type: string;
  validity: string;
  knowledge_holder: string | null;
  knowledge_state: string | null;
  story_position: number | null;
  evidence: { scene_id: string; quote: string }[];
  author_confirmed: boolean;
};

const SELECT_ENTITIES =
  "id, kind, name, aliases, identity, current_state, notes, truth_type, author_confirmed, first_scene_id";
const SELECT_CLAIMS =
  "id, entity_id, scene_id, claim_kind, subject, assertion, basis, truth_type, validity, knowledge_holder, knowledge_state, story_position, evidence, author_confirmed";

/** Everything the Story and Characters views read. Ownership is enforced by RLS. */
export const getStoryModel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const [entities, claims] = await Promise.all([
      context.supabase
        .from("story_entities")
        .select(SELECT_ENTITIES)
        .eq("project_id", data.projectId)
        .order("kind")
        .order("name"),
      context.supabase
        .from("story_claims")
        .select(SELECT_CLAIMS)
        .eq("project_id", data.projectId)
        .order("story_position", { ascending: true, nullsFirst: false })
        .order("created_at"),
    ]);
    if (entities.error) throw new Error(entities.error.message);
    if (claims.error) throw new Error(claims.error.message);
    return {
      entities: (entities.data ?? []) as StoryEntity[],
      claims: (claims.data ?? []) as StoryClaim[],
    };
  });

/* ------------------------------------------------------------------ analysis */

const ANALYSIS_SYSTEM = [
  "You read one scene of a novel and report only what that scene supports.",
  "Return people, places, objects, groups and plot threads that actually appear, plus discrete claims.",
  "Every claim needs a verbatim quote copied character-for-character from the scene text; never paraphrase a quote.",
  'basis: "explicit" when the scene states it outright, "inferred" when you are reading between the lines, "speculative" when it is a guess.',
  'truth_type: "canonical" only for what the narration establishes as true; "inferred" for your reading; "possible" for what might be true; "planned" for something a character intends.',
  "A character saying something establishes that they said it, not that it is true.",
  "For knowledge claims, set knowledge_holder to the character and knowledge_state to knows, believes, suspects, misunderstands or does_not_know.",
  "Prefer few precise claims over many vague ones. Invent nothing. If the scene supports little, return little.",
].join(" ");

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["entities", "claims"],
  properties: {
    entities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "name", "identity", "current_state"],
        properties: {
          kind: { type: "string", enum: [...ENTITY_KINDS] },
          name: { type: "string" },
          identity: { type: ["string", "null"] },
          current_state: { type: ["string", "null"] },
        },
      },
    },
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "subject",
          "assertion",
          "claim_kind",
          "basis",
          "truth_type",
          "knowledge_holder",
          "knowledge_state",
          "quote",
        ],
        properties: {
          subject: { type: "string" },
          assertion: { type: "string" },
          claim_kind: {
            type: "string",
            enum: ["fact", "knowledge", "relationship", "event", "thread", "world"],
          },
          basis: { type: "string", enum: ["explicit", "inferred", "speculative"] },
          truth_type: {
            type: "string",
            enum: ["canonical", "inferred", "possible", "planned"],
          },
          knowledge_holder: { type: ["string", "null"] },
          knowledge_state: { type: ["string", "null"] },
          quote: { type: "string" },
        },
      },
    },
  },
} as const;

type AnalysisResult = {
  entities: { kind: string; name: string; identity: string | null; current_state: string | null }[];
  claims: {
    subject: string;
    assertion: string;
    claim_kind: string;
    basis: string;
    truth_type: string;
    knowledge_holder: string | null;
    knowledge_state: string | null;
    quote: string;
  }[];
};

const normalise = (text: string) => text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim();

/**
 * Reads the scene as it is stored (so every claim is anchored to a real, saved
 * revision), extracts entities and claims, and replaces only this scene's
 * derived claims. Nothing else in the story model is touched.
 */
export const analyseScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: uuid, sceneId: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: scene, error } = await supabase
      .from("scenes")
      .select("id, project_id, title, position, plain_text")
      .eq("id", data.sceneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!scene || scene.project_id !== data.projectId) throw new Error("Scene not found");

    const sceneText = (scene.plain_text ?? "").trim();
    if (sceneText.length < 40) {
      return {
        ok: false as const,
        kind: "empty",
        message: "There isn't enough written in this scene yet to understand it.",
      };
    }

    const { data: revision } = await supabase
      .from("scene_revisions")
      .select("id")
      .eq("scene_id", scene.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let result: AnalysisResult;
    try {
      result = await generateJson<AnalysisResult>({
        system: ANALYSIS_SYSTEM,
        input: `Scene title: ${scene.title}\n\nScene text:\n${sceneText.slice(0, 24000)}`,
        schemaName: "scene_understanding",
        schema: ANALYSIS_SCHEMA,
      });
    } catch (err) {
      if (err instanceof AiUnavailableError)
        return { ok: false as const, kind: err.kind, message: err.message };
      return {
        ok: false as const,
        kind: "error",
        message: "Storymatic couldn't read this scene just now. Your writing is unaffected.",
      };
    }

    const haystack = normalise(sceneText);

    // Existing entities, so names are reused rather than duplicated.
    const { data: existing } = await supabase
      .from("story_entities")
      .select("id, kind, name")
      .eq("project_id", data.projectId);
    const key = (kind: string, name: string) => `${kind}::${name.trim().toLowerCase()}`;
    const entityIds = new Map<string, string>();
    for (const row of existing ?? []) entityIds.set(key(row.kind, row.name), row.id);

    for (const entity of result.entities.slice(0, 24)) {
      if (!entity.name?.trim()) continue;
      const existingId = entityIds.get(key(entity.kind, entity.name));
      if (existingId) {
        // Author edits are never overwritten by a later reading of the manuscript.
        const { data: current } = await supabase
          .from("story_entities")
          .select("author_confirmed, identity, current_state")
          .eq("id", existingId)
          .maybeSingle();
        if (current && !current.author_confirmed) {
          await supabase
            .from("story_entities")
            .update({
              identity: entity.identity ?? current.identity,
              current_state: entity.current_state ?? current.current_state,
            })
            .eq("id", existingId);
        }
        continue;
      }
      const { data: inserted } = await supabase
        .from("story_entities")
        .insert({
          project_id: data.projectId,
          kind: entity.kind,
          name: entity.name.trim(),
          identity: entity.identity,
          current_state: entity.current_state,
          truth_type: "inferred",
          first_scene_id: scene.id,
        })
        .select("id")
        .maybeSingle();
      if (inserted) entityIds.set(key(entity.kind, entity.name), inserted.id);
    }

    // Only claims derived from this scene are replaced; confirmed claims are kept.
    await supabase
      .from("story_claims")
      .delete()
      .eq("scene_id", scene.id)
      .eq("author_confirmed", false);

    let kept = 0;
    let dropped = 0;
    for (const claim of result.claims.slice(0, 40)) {
      const quote = (claim.quote ?? "").trim();
      // An unverifiable quote means the claim has no anchor in the manuscript.
      if (!quote || !haystack.includes(normalise(quote))) {
        dropped += 1;
        continue;
      }
      const entityId =
        entityIds.get(key("character", claim.subject)) ??
        entityIds.get(key("location", claim.subject)) ??
        entityIds.get(key("object", claim.subject)) ??
        entityIds.get(key("faction", claim.subject)) ??
        entityIds.get(key("thread", claim.subject)) ??
        null;
      const { error: insertError } = await supabase.from("story_claims").insert({
        project_id: data.projectId,
        entity_id: entityId,
        scene_id: scene.id,
        revision_id: revision?.id ?? null,
        claim_kind: claim.claim_kind,
        subject: claim.subject,
        assertion: claim.assertion,
        basis: claim.basis,
        truth_type: claim.truth_type,
        knowledge_holder: claim.knowledge_holder,
        knowledge_state: claim.knowledge_state,
        story_position: scene.position,
        evidence: [{ scene_id: scene.id, quote }] as never,
      });
      if (!insertError) kept += 1;
    }

    return { ok: true as const, claims: kept, unverified: dropped };
  });

/* ---------------------------------------------------------------- judgements */

export const setClaimJudgement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ id: uuid, action: z.enum(["confirm", "reject", "reopen", "review"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch =
      data.action === "confirm"
        ? { author_confirmed: true, truth_type: "canonical", validity: "current" }
        : data.action === "reject"
          ? { author_confirmed: true, truth_type: "rejected", validity: "superseded" }
          : data.action === "review"
            ? { validity: "needs_review" }
            : { author_confirmed: false, truth_type: "inferred", validity: "current" };
    const { error } = await context.supabase.from("story_claims").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        identity: z.string().trim().max(2000).nullable(),
        currentState: z.string().trim().max(2000).nullable(),
        notes: z.string().trim().max(4000).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("story_entities")
      .update({
        identity: data.identity,
        current_state: data.currentState,
        notes: data.notes,
        author_confirmed: true,
        truth_type: "canonical",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
