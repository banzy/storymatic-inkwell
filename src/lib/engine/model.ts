import { z } from "zod";

export const itemKinds = [
  "brief",
  "character",
  "relationship",
  "outline",
  "thread",
  "world",
  "direction",
  "secret",
  "question",
] as const;
export const itemKindLabels: Record<(typeof itemKinds)[number], string> = {
  brief: "Book brief",
  character: "Character",
  relationship: "Relationship",
  outline: "Outline",
  thread: "Plot / subplot",
  world: "World",
  direction: "Voice & direction",
  secret: "Private intention",
  question: "Open question",
};

const proposalSchema = z
  .object({
    targetId: z.string().uuid().nullable(),
    kind: z.enum(itemKinds),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(6000),
    commitment: z.enum(["tentative", "decided"]),
    origin: z.enum(["author", "suggestion"]),
    sourceQuote: z.string().max(3000).nullable(),
    rationale: z.string().trim().min(1).max(1200),
  })
  .strict();

export const engineReplySchema = z
  .object({
    answer: z.string().trim().min(1).max(16000),
    proposals: z.array(proposalSchema).max(20),
    draft: z
      .object({
        title: z.string().trim().min(1).max(160),
        brief: z.string().trim().min(1).max(4000),
        text: z.string().trim().min(1).max(30000),
        reviewNotes: z.array(z.string().max(1500)).max(8),
      })
      .strict()
      .nullable(),
  })
  .strict();

export type EngineReply = z.infer<typeof engineReplySchema>;
export type BookItem = {
  id: string;
  kind: (typeof itemKinds)[number];
  title: string;
  body: string;
  commitment: "tentative" | "decided";
  origin: "author" | "suggestion";
  sourceTurnId: string;
  sourceQuote: string | null;
  version: number;
};
export type Proposal = EngineReply["proposals"][number] & {
  id: string;
  itemId: string;
  baseItemVersion: number | null;
  status: "pending" | "adopted" | "dismissed" | "undone";
};
export type SceneDraft = NonNullable<EngineReply["draft"]> & {
  id: string;
  status: "proposed" | "adopting" | "adopted";
  chapterId: string | null;
  chapterPosition: number | null;
  sourceBookVersion: number;
};
export type Turn = {
  id: string;
  text: string;
  createdAt: string;
  status: "processing" | "complete" | "failed";
  attemptId: string;
  startedAt: string;
  answer: string | null;
  error: string | null;
  proposals: Proposal[];
  draft: SceneDraft | null;
};
export type BookChange = {
  id: string;
  turnId: string;
  proposalIds: string[];
  createdAt: string;
  before: BookItem[];
  after: BookItem[];
  undoneAt: string | null;
};
export type EngineState = {
  schemaVersion: 1;
  projectId: string;
  revision: number;
  bookVersion: number;
  items: BookItem[];
  turns: Turn[];
  changes: BookChange[];
};

export function emptyEngine(projectId: string): EngineState {
  return {
    schemaVersion: 1,
    projectId,
    revision: 0,
    bookVersion: 0,
    items: [],
    turns: [],
    changes: [],
  };
}

export class EngineConflict extends Error {}

/** Apply the complete group or nothing. Tentative ideas remain tentative even when adopted. */
export function adoptProposals(
  state: EngineState,
  turnId: string,
  ids: string[],
  now: string,
): EngineState {
  const next = structuredClone(state);
  const turn = next.turns.find((entry) => entry.id === turnId);
  if (!turn || turn.status !== "complete")
    throw new EngineConflict("That conversation is not ready.");
  const proposals = ids.map((id) => {
    const proposal = turn.proposals.find((entry) => entry.id === id);
    if (!proposal) throw new EngineConflict("A proposed change was not found.");
    return proposal;
  });
  if (!proposals.length || new Set(ids).size !== ids.length)
    throw new EngineConflict("Choose distinct changes to adopt.");
  if (proposals.every((proposal) => proposal.status === "adopted")) return state;
  if (proposals.some((proposal) => proposal.status !== "pending"))
    throw new EngineConflict("These changes have already been reviewed.");
  if (new Set(proposals.map((p) => p.itemId)).size !== proposals.length)
    throw new EngineConflict("Two changes target the same book item.");
  const before: BookItem[] = [];
  const after: BookItem[] = [];
  for (const proposal of proposals) {
    const current = next.items.find((item) => item.id === proposal.itemId);
    if ((current?.version ?? null) !== proposal.baseItemVersion) {
      throw new EngineConflict(
        "The book changed since this proposal. Discuss it again before applying it.",
      );
    }
    if (current) before.push(structuredClone(current));
    const item: BookItem = {
      id: proposal.itemId,
      kind: proposal.kind,
      title: proposal.title,
      body: proposal.body,
      commitment: proposal.commitment,
      origin: proposal.origin,
      sourceTurnId: turn.id,
      sourceQuote: proposal.sourceQuote,
      version: (current?.version ?? 0) + 1,
    };
    next.items = next.items.filter((entry) => entry.id !== item.id);
    next.items.push(item);
    after.push(item);
    proposal.status = "adopted";
  }
  next.bookVersion += 1;
  next.changes.push({
    id: `change-${next.bookVersion}`,
    turnId,
    proposalIds: ids,
    createdAt: now,
    before,
    after,
    undoneAt: null,
  });
  return next;
}

/** Reverse only the latest live group; later changes must be undone first. */
export function undoLastChange(state: EngineState, changeId: string, now: string): EngineState {
  const next = structuredClone(state);
  const change = next.changes.find((entry) => entry.id === changeId);
  if (!change) throw new EngineConflict("That change was not found.");
  if (change.undoneAt) return state;
  if (next.changes.filter((entry) => !entry.undoneAt).at(-1)?.id !== change.id) {
    throw new EngineConflict("Undo the later book changes first.");
  }
  const changedIds = new Set(change.after.map((item) => item.id));
  next.items = next.items.filter((item) => !changedIds.has(item.id));
  // Use a fresh version to invalidate proposals produced before the undo (no ABA).
  next.items.push(...change.before.map((item) => ({ ...item, version: next.bookVersion + 2 })));
  change.undoneAt = now;
  const turn = next.turns.find((entry) => entry.id === change.turnId)!;
  for (const proposal of turn.proposals)
    if (change.proposalIds.includes(proposal.id)) proposal.status = "undone";
  next.bookVersion += 1;
  return next;
}
