import { BSON, type Db } from "mongodb";
import { randomUUID } from "node:crypto";
import { emptyEngine, EngineConflict, type EngineState } from "./model";

type StoredEngine = EngineState & { _id: string };
const MAX_STATE_BYTES = 8 * 1024 * 1024;
export const PROCESSING_TIMEOUT_MS = 120_000;

/** One aggregate makes book changes + provenance + conversation atomic on standalone MongoDB. */
export class EngineStore {
  constructor(readonly database: Db) {}

  async project(projectId: string) {
    const project = await this.database
      .collection("projects")
      .findOne({ id: projectId, owner_id: "local", deleted_at: null });
    if (!project) throw new Error("Project not found.");
    return { id: projectId, title: String(project["title"] ?? "Untitled book") };
  }

  async load(projectId: string): Promise<EngineState> {
    await this.project(projectId);
    const collection = this.database.collection<StoredEngine>("book_engines");
    try {
      await collection.updateOne(
        { _id: projectId },
        { $setOnInsert: { ...emptyEngine(projectId) } },
        { upsert: true },
      );
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === 11000))
        throw error;
    }
    const document = await collection.findOne({ _id: projectId });
    if (!document) throw new Error("Could not open this book's memory.");
    const { _id, ...state } = document;
    return state;
  }

  async save(previous: EngineState, next: EngineState): Promise<EngineState> {
    await this.project(previous.projectId);
    if (next.projectId !== previous.projectId) throw new Error("Book identity cannot change.");
    const state = { ...next, revision: previous.revision + 1 };
    const document: StoredEngine = { ...state, _id: previous.projectId };
    if (BSON.calculateObjectSize(document) > MAX_STATE_BYTES) {
      throw new Error(
        "This early engine's book-memory capacity has been reached. Export the project before continuing; existing work is preserved.",
      );
    }
    const result = await this.database
      .collection<StoredEngine>("book_engines")
      .replaceOne({ _id: previous.projectId, revision: previous.revision }, document);
    if (!result.matchedCount)
      throw new EngineConflict("The book changed in another request. Refresh and try again.");
    return state;
  }

  async begin(projectId: string, requestId: string, text: string) {
    const state = await this.load(projectId);
    if (state.turns.some((turn) => turn.draft?.status === "adopting"))
      throw new EngineConflict("Finish adding the pending scene first.");
    const existing = state.turns.find((turn) => turn.id === requestId);
    if (existing && existing.text !== text)
      throw new EngineConflict("That message identifier was already used for different text.");
    if (existing?.status === "complete") return { state, attemptId: null };
    const active = state.turns.find(
      (turn) =>
        turn.status === "processing" &&
        Date.now() - Date.parse(turn.startedAt) < PROCESSING_TIMEOUT_MS,
    );
    if (active)
      throw new EngineConflict(
        "Storymatic is still responding. Your saved message will be here when it finishes.",
      );
    const next = structuredClone(state);
    for (const turn of next.turns) {
      if (turn.status === "processing") {
        turn.status = "failed";
        turn.error =
          "The previous response was interrupted. Your message is saved; you can retry it.";
      }
    }
    const attemptId = randomUUID();
    const now = new Date().toISOString();
    const turn = next.turns.find((entry) => entry.id === requestId);
    if (turn) Object.assign(turn, { status: "processing", error: null, attemptId, startedAt: now });
    else
      next.turns.push({
        id: requestId,
        text,
        createdAt: now,
        startedAt: now,
        attemptId,
        status: "processing",
        answer: null,
        error: null,
        proposals: [],
        draft: null,
      });
    return { state: await this.save(state, next), attemptId };
  }

  async fail(projectId: string, requestId: string, attemptId: string, message: string) {
    // A different request may have changed planning state while this response failed.
    for (let i = 0; i < 3; i++) {
      const state = await this.load(projectId);
      const next = structuredClone(state);
      const turn = next.turns.find((entry) => entry.id === requestId);
      if (!turn || turn.attemptId !== attemptId || turn.status !== "processing") return state;
      turn.status = "failed";
      turn.error = message;
      try {
        return await this.save(state, next);
      } catch (error) {
        if (!(error instanceof EngineConflict)) throw error;
      }
    }
    throw new EngineConflict(
      "Could not record the response status. The original message is preserved.",
    );
  }
}
