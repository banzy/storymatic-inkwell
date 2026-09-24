import { randomUUID } from "node:crypto";
import {
  adoptProposals,
  engineReplySchema,
  EngineConflict,
  undoLastChange,
  type EngineState,
} from "./model";
import { COLLABORATOR_PROMPT, conversationContext, relevance } from "./context";
import { EngineStore, PROCESSING_TIMEOUT_MS } from "./store.server";
import { generateEngineReply, type EngineGenerator } from "./provider.server";
import { countWords, textToDoc } from "../prose";

function assertIdle(state: EngineState) {
  if (
    state.turns.some(
      (turn) =>
        turn.status === "processing" &&
        Date.now() - Date.parse(turn.startedAt) < PROCESSING_TIMEOUT_MS,
    )
  ) {
    throw new EngineConflict("Wait for the current response before changing the book.");
  }
  if (state.turns.some((turn) => turn.draft?.status === "adopting")) {
    throw new EngineConflict("Finish adding the pending scene before changing the book.");
  }
}

export class CollaborationEngine {
  constructor(
    readonly store: EngineStore,
    readonly generate: EngineGenerator = generateEngineReply,
  ) {}

  async send(projectId: string, requestId: string, message: string) {
    const { state, attemptId } = await this.store.begin(projectId, requestId, message);
    if (!attemptId) return state;
    try {
      const project = await this.store.project(projectId);
      const scenes = await this.store.database
        .collection("scenes")
        .find(
          { project_id: projectId, deleted_at: null },
          { projection: { _id: 0, id: 1, title: 1, plain_text: 1, chapter_id: 1, position: 1 } },
        )
        .toArray();
      const selected = scenes
        .map((scene) => ({
          scene,
          score: relevance(`${scene["title"]} ${scene["plain_text"]}`, message),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ scene }) => ({
          id: scene["id"],
          title: scene["title"],
          chapterId: scene["chapter_id"],
          position: scene["position"],
          excerpt: String(scene["plain_text"] ?? "").slice(0, 4000),
        }));
      const reply = engineReplySchema.parse(
        await this.generate(
          COLLABORATOR_PROMPT,
          JSON.stringify({
            project,
            ...conversationContext(state, message),
            manuscriptCoverage: {
              totalScenes: scenes.length,
              selectedScenes: selected.length,
              complete: false,
            },
            manuscriptExcerpts: selected,
            currentAuthorMessage: message,
          }),
        ),
      );
      const targeted = reply.proposals
        .filter((proposal) => proposal.targetId)
        .map((proposal) => proposal.targetId);
      if (new Set(targeted).size !== targeted.length)
        throw new Error(
          "Assistance proposed conflicting changes to one book item. Retry with a narrower request.",
        );
      for (const proposal of reply.proposals) {
        if (proposal.targetId && !state.items.some((item) => item.id === proposal.targetId))
          throw new Error(
            "Assistance referenced an unknown book item. Your existing book was left intact.",
          );
        if (
          proposal.origin === "author" &&
          (!proposal.sourceQuote?.trim() || !message.includes(proposal.sourceQuote))
        ) {
          throw new Error(
            "Assistance could not substantiate an attributed author decision. Your message is saved; please retry.",
          );
        }
        if (proposal.origin === "suggestion") proposal.sourceQuote = null;
      }
      const current = await this.store.load(projectId);
      const next = structuredClone(current);
      const turn = next.turns.find((entry) => entry.id === requestId);
      if (!turn || turn.attemptId !== attemptId || turn.status !== "processing")
        throw new EngineConflict("This response was superseded by a retry.");
      if (current.bookVersion !== state.bookVersion)
        throw new EngineConflict(
          "The book changed while the response was being written. Retry using the current book.",
        );
      turn.answer = reply.answer;
      turn.status = "complete";
      turn.error = null;
      turn.proposals = reply.proposals.map((proposal) => ({
        ...proposal,
        id: randomUUID(),
        itemId: proposal.targetId ?? randomUUID(),
        baseItemVersion: state.items.find((item) => item.id === proposal.targetId)?.version ?? null,
        status: "pending",
      }));
      turn.draft = reply.draft
        ? {
            ...reply.draft,
            id: randomUUID(),
            status: "proposed",
            chapterId: null,
            chapterPosition: null,
            sourceBookVersion: state.bookVersion,
          }
        : null;
      return await this.store.save(current, next);
    } catch (error) {
      const message =
        error instanceof EngineConflict
          ? error.message
          : error instanceof Error &&
              error.name !== "ZodError" &&
              error.name !== "SyntaxError" &&
              error.name !== "TypeError"
            ? error.name === "TimeoutError"
              ? "Writing assistance took too long. Your message is saved; you can retry."
              : error.message
            : "Writing assistance returned an unusable response. Your message is saved; you can retry.";
      return this.store.fail(projectId, requestId, attemptId, message);
    }
  }

  async review(
    projectId: string,
    revision: number,
    turnId: string,
    ids: string[],
    action: "adopt" | "dismiss",
  ) {
    const state = await this.store.load(projectId);
    if (state.revision !== revision)
      throw new EngineConflict("The book changed. Refresh before reviewing this proposal.");
    assertIdle(state);
    const next =
      action === "adopt"
        ? adoptProposals(state, turnId, ids, new Date().toISOString())
        : structuredClone(state);
    if (action === "dismiss") {
      const turn = next.turns.find((entry) => entry.id === turnId);
      if (
        !turn ||
        !ids.length ||
        ids.some((id) => !turn.proposals.some((p) => p.id === id && p.status === "pending"))
      )
        throw new EngineConflict("These changes are no longer pending.");
      for (const proposal of turn.proposals)
        if (ids.includes(proposal.id)) proposal.status = "dismissed";
    }
    return next === state ? state : this.store.save(state, next);
  }

  async undo(projectId: string, revision: number, changeId: string) {
    const state = await this.store.load(projectId);
    if (state.revision !== revision)
      throw new EngineConflict("The book changed. Refresh before undoing.");
    assertIdle(state);
    const next = undoLastChange(state, changeId, new Date().toISOString());
    return next === state ? state : this.store.save(state, next);
  }

  /** A durable adoption record plus deterministic IDs makes partial writes safe to retry without transactions. */
  async adoptDraft(projectId: string, revision: number, turnId: string) {
    let state = await this.store.load(projectId);
    let draft = state.turns.find((entry) => entry.id === turnId)?.draft;
    if (!draft) throw new EngineConflict("That scene draft was not found.");
    if (draft.status === "adopted") return { state, sceneId: draft.id };
    if (draft.status === "proposed") {
      if (state.revision !== revision)
        throw new EngineConflict("Refresh before adopting this draft.");
      assertIdle(state);
      if (draft.sourceBookVersion !== state.bookVersion)
        throw new EngineConflict(
          "Your book direction has changed since this scene was drafted. Ask for an updated draft.",
        );
      const lastChapter = await this.store.database
        .collection("chapters")
        .find({ project_id: projectId })
        .sort({ position: -1 })
        .limit(1)
        .next();
      const next = structuredClone(state);
      const nextDraft = next.turns.find((entry) => entry.id === turnId)!.draft!;
      nextDraft.status = "adopting";
      nextDraft.chapterId = randomUUID();
      nextDraft.chapterPosition = Number(lastChapter?.["position"] ?? 0) + 1;
      state = await this.store.save(state, next);
      draft = state.turns.find((entry) => entry.id === turnId)!.draft!;
    }
    const database = this.store.database;
    const now = new Date().toISOString();
    const content = textToDoc(draft.text);
    const base = { project_id: projectId, created_at: now, updated_at: now };
    // These IDs are fixed in the aggregate before the first external write.
    await database.collection<{ _id: string }>("scene_revisions").updateOne(
      { _id: draft.id },
      {
        $setOnInsert: {
          ...base,
          id: draft.id,
          scene_id: draft.id,
          content,
          plain_text: draft.text,
          word_count: countWords(draft.text),
          source: "assistant",
          label: "Adopted conversation draft",
        },
      },
      { upsert: true },
    );
    await database.collection<{ _id: string }>("chapters").updateOne(
      { _id: draft.chapterId! },
      {
        $setOnInsert: {
          ...base,
          id: draft.chapterId,
          title: draft.title,
          position: draft.chapterPosition,
          deleted_at: null,
        },
      },
      { upsert: true },
    );
    await database.collection<{ _id: string }>("scenes").updateOne(
      { _id: draft.id },
      {
        $setOnInsert: {
          ...base,
          id: draft.id,
          chapter_id: draft.chapterId,
          title: draft.title,
          position: 1,
          content,
          plain_text: draft.text,
          word_count: countWords(draft.text),
          deleted_at: null,
          summary: null,
          pov: null,
          location: null,
          story_time: null,
        },
      },
      { upsert: true },
    );
    const current = await this.store.load(projectId);
    const next = structuredClone(current);
    next.turns.find((entry) => entry.id === turnId)!.draft!.status = "adopted";
    return { state: await this.store.save(current, next), sceneId: draft.id };
  }
}
