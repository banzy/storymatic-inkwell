import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import {
  emptyEngine,
  adoptProposals,
  undoLastChange,
  type EngineReply,
  type EngineState,
  type Turn,
} from "../src/lib/engine/model";
import { conversationContext } from "../src/lib/engine/context";
import { EngineStore } from "../src/lib/engine/store.server";
import { CollaborationEngine } from "../src/lib/engine/service.server";
import { SaveQueue } from "../src/lib/save-queue";

const fixture = (): EngineReply => ({
  answer: "A possible foundation. The motive remains private.",
  proposals: [
    {
      targetId: null,
      kind: "secret",
      title: "A possible betrayal",
      body: "He may betray her, but she trusts him in the opening.",
      commitment: "tentative",
      origin: "suggestion",
      sourceQuote: null,
      rationale: "An open alternative, not an event in the draft.",
    },
  ],
  draft: null,
});
const turn = (): Turn => ({
  id: randomUUID(),
  text: "What if he betrayed her?",
  createdAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  attemptId: randomUUID(),
  status: "complete",
  answer: "Consider this possibility.",
  error: null,
  proposals: [],
  draft: null,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("adopting an exploration retains uncertainty; grouped changes can be undone", () => {
  const state = emptyEngine(randomUUID());
  const message = turn();
  message.proposals = [
    {
      ...fixture().proposals[0]!,
      id: randomUUID(),
      itemId: randomUUID(),
      baseItemVersion: null,
      status: "pending",
    },
  ];
  state.turns.push(message);
  const accepted = adoptProposals(state, message.id, [message.proposals[0]!.id], "now");
  assert.equal(accepted.items[0]!.commitment, "tentative");
  assert.equal(state.items.length, 0);
  assert.equal(adoptProposals(accepted, message.id, [message.proposals[0]!.id], "later"), accepted);
  const undone = undoLastChange(accepted, accepted.changes[0]!.id, "later");
  assert.equal(undone.items.length, 0);
  assert.equal(undone.turns[0]!.proposals[0]!.status, "undone");
});

test("unknown or stale grouped proposals change nothing", () => {
  const state = emptyEngine(randomUUID());
  const message = turn();
  const itemId = randomUUID();
  message.proposals = [
    { ...fixture().proposals[0]!, id: randomUUID(), itemId, baseItemVersion: 1, status: "pending" },
  ];
  state.turns.push(message);
  assert.throws(
    () => adoptProposals(state, message.id, [message.proposals[0]!.id], "now"),
    /book changed/,
  );
  assert.equal(state.bookVersion, 0);
});

test("context retrieves relevant old conversation and includes all adopted planning", () => {
  const state = emptyEngine(randomUUID());
  const older = turn();
  older.text = "The lighthouse keeper is her mother.";
  older.draft = {
    id: randomUUID(),
    title: "The lighthouse",
    brief: "An encounter",
    text: "She climbed the steps.",
    reviewNotes: [],
    status: "proposed",
    chapterId: null,
    chapterPosition: null,
    sourceBookVersion: 0,
  };
  state.turns = [older, ...Array.from({ length: 12 }, () => turn())];
  const context = conversationContext(state, "What about the lighthouse keeper?");
  assert.ok(context.conversation.some((item) => item.id === older.id));
  assert.equal(context.historyCoverage.savedTurns, 13);
  assert.equal(
    context.conversation.find((item) => item.id === older.id)?.draft?.excerpt,
    older.draft.text,
  );
});

test("a save in flight drains newer writing and flush waits for both saves", async () => {
  const first = deferred<void>();
  const second = deferred<void>();
  const payloads: string[] = [];
  const queue = new SaveQueue<string>(async (value) => {
    payloads.push(value);
    await (value === "old" ? first.promise : second.promise);
  });
  queue.enqueue("old");
  const flush = queue.flush();
  queue.enqueue("new");
  assert.equal(queue.flush(), flush);
  first.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(payloads, ["old", "new"]);
  let completed = false;
  void flush.then(() => {
    completed = true;
  });
  await Promise.resolve();
  assert.equal(completed, false);
  second.resolve();
  assert.equal(await flush, true);
});

test("failure of an older save never restores its payload over newer writing", async () => {
  const first = deferred<void>();
  const payloads: string[] = [];
  const queue = new SaveQueue<string>(async (value) => {
    payloads.push(value);
    if (payloads.length === 1) await first.promise;
  });
  queue.enqueue("old");
  const flush = queue.flush();
  queue.enqueue("newest");
  first.reject(new Error("offline"));
  assert.equal(await flush, false);
  assert.equal(await queue.flush(), true);
  assert.deepEqual(payloads, ["old", "newest"]);
});

test(
  "MongoDB engine integration",
  { skip: !process.env["STORYMATIC_TEST_MONGODB_URI"] },
  async (suite) => {
    const client = new MongoClient(process.env["STORYMATIC_TEST_MONGODB_URI"]!, {
      serverSelectionTimeoutMS: 3000,
    });
    await client.connect();
    const database = client.db(`storymatic_engine_test_${randomUUID().replaceAll("-", "")}`);
    const store = new EngineStore(database);
    const projectId = randomUUID();
    await database
      .collection("projects")
      .insertOne({ id: projectId, owner_id: "local", title: "Engine fixture", deleted_at: null });
    try {
      await suite.test(
        "messages survive reload; repeated requests do not regenerate; choices stay outside active book",
        async () => {
          let calls = 0;
          const engine = new CollaborationEngine(store, async () => {
            calls++;
            return fixture();
          });
          const id = randomUUID();
          const result = await engine.send(projectId, id, "What if he betrayed her?");
          assert.equal(result.turns.at(-1)!.status, "complete");
          assert.equal(result.items.length, 0);
          assert.equal((await new EngineStore(database).load(projectId)).turns.at(-1)!.id, id);
          await engine.send(projectId, id, "What if he betrayed her?");
          assert.equal(calls, 1);
          await assert.rejects(engine.send(projectId, id, "Different text"), /different text/);
          const accepted = await engine.review(
            projectId,
            result.revision,
            id,
            result.turns.at(-1)!.proposals.map((p) => p.id),
            "adopt",
          );
          assert.equal(accepted.items[0]!.commitment, "tentative");
          assert.equal(await database.collection("scenes").countDocuments({}), 0);
          const undone = await engine.undo(
            projectId,
            accepted.revision,
            accepted.changes.at(-1)!.id,
          );
          assert.equal(undone.items.length, 0);
        },
      );
      await suite.test(
        "failed generation preserves author message and retry uses the same turn",
        async () => {
          const id = randomUUID();
          const failing = new CollaborationEngine(store, async () => {
            throw new Error("Test failure");
          });
          const failed = await failing.send(projectId, id, "Keep this raw idea.");
          assert.equal(failed.turns.at(-1)!.status, "failed");
          const working = new CollaborationEngine(store, async () => fixture());
          const retried = await working.send(projectId, id, "Keep this raw idea.");
          assert.equal(retried.turns.filter((entry) => entry.id === id).length, 1);
          assert.equal(retried.turns.at(-1)!.status, "complete");
        },
      );
      await suite.test(
        "unsupported attribution and foreign targets are rejected without changing the book",
        async () => {
          for (const proposal of [
            {
              ...fixture().proposals[0]!,
              origin: "author" as const,
              sourceQuote: "Words never said",
            },
            { ...fixture().proposals[0]!, targetId: randomUUID() },
          ]) {
            const engine = new CollaborationEngine(store, async () => ({
              ...fixture(),
              proposals: [proposal],
            }));
            const state = await engine.send(projectId, randomUUID(), "Perhaps.");
            assert.equal(state.turns.at(-1)!.status, "failed");
            assert.equal(state.items.length, 0);
          }
        },
      );
      await suite.test(
        "concurrent updates use compare-and-swap; unknown projects cannot create memory",
        async () => {
          const a = await store.load(projectId);
          const b = await store.load(projectId);
          await store.save(a, a);
          await assert.rejects(store.save(b, b), /another request/);
          await assert.rejects(store.load(randomUUID()), /Project not found/);
          const foreign = randomUUID();
          await database
            .collection("projects")
            .insertOne({ id: foreign, owner_id: "someone-else", deleted_at: null });
          await assert.rejects(store.load(foreign), /Project not found/);
        },
      );
      await suite.test(
        "in-flight conversation cannot be duplicated or edited underneath a response",
        async () => {
          const result = deferred<EngineReply>();
          const started = deferred<void>();
          const engine = new CollaborationEngine(store, async () => {
            started.resolve();
            return result.promise;
          });
          const running = engine.send(projectId, randomUUID(), "Write with me.");
          await started.promise;
          await assert.rejects(
            engine.send(projectId, randomUUID(), "Another request"),
            /still responding/,
          );
          const state = await store.load(projectId);
          await assert.rejects(engine.undo(projectId, state.revision, "missing"), /Wait for/);
          result.resolve(fixture());
          await running;
        },
      );
      await suite.test(
        "scene draft adoption is explicit, recoverable, and idempotent",
        async () => {
          const engine = new CollaborationEngine(store, async () => ({
            answer: "Here is a scene.",
            proposals: [],
            draft: {
              title: "The letter",
              brief: "A trusting reunion; keep the betrayal private.",
              text: "She left the letter on the table.\n\nHe brought her a cup of tea.",
              reviewNotes: ["The cup of tea is a new detail."],
            },
          }));
          const id = randomUUID();
          const state = await engine.send(projectId, id, "Draft their reunion.");
          assert.equal(await database.collection("scenes").countDocuments({}), 0);
          const adopted = await engine.adoptDraft(projectId, state.revision, id);
          const again = await engine.adoptDraft(projectId, state.revision, id);
          assert.equal(again.sceneId, adopted.sceneId);
          assert.equal(await database.collection("scenes").countDocuments({}), 1);
          assert.equal(await database.collection("scene_revisions").countDocuments({}), 1);
          assert.equal((await store.load(projectId)).turns.at(-1)!.draft!.status, "adopted");
        },
      );
      await suite.test(
        "interrupted scene finalization resumes without duplicate manuscript writes",
        async () => {
          let interrupt = true;
          class InterruptedStore extends EngineStore {
            override async save(previous: EngineState, next: EngineState) {
              if (interrupt && next.turns.at(-1)?.draft?.status === "adopted") {
                interrupt = false;
                throw new Error("Simulated lost connection during finalization");
              }
              return super.save(previous, next);
            }
          }
          const engine = new CollaborationEngine(new InterruptedStore(database), async () => ({
            answer: "A draft.",
            proposals: [],
            draft: {
              title: "A second meeting",
              brief: "A reunion",
              text: "She knocked.",
              reviewNotes: [],
            },
          }));
          const id = randomUUID();
          const state = await engine.send(projectId, id, "Draft another scene.");
          await assert.rejects(engine.adoptDraft(projectId, state.revision, id), /Simulated/);
          const interrupted = await store.load(projectId);
          const draft = interrupted.turns.at(-1)!.draft!;
          assert.equal(draft.status, "adopting");
          await assert.rejects(
            engine.send(projectId, randomUUID(), "Change direction"),
            /pending scene/,
          );
          const recovered = await engine.adoptDraft(projectId, interrupted.revision, id);
          assert.equal(recovered.state.turns.at(-1)!.draft!.status, "adopted");
          assert.equal(await database.collection("scenes").countDocuments({ id: draft.id }), 1);
          assert.equal(
            await database.collection("chapters").countDocuments({ id: draft.chapterId }),
            1,
          );
          assert.equal(
            await database.collection("scene_revisions").countDocuments({ scene_id: draft.id }),
            1,
          );
        },
      );
      await suite.test("changed book direction prevents adopting an outdated draft", async () => {
        const engine = new CollaborationEngine(store, async () => ({
          ...fixture(),
          draft: {
            title: "An old direction",
            brief: "A reunion",
            text: "He smiled.",
            reviewNotes: [],
          },
        }));
        const id = randomUUID();
        const state = await engine.send(projectId, id, "Draft a scene and suggest a change.");
        const updated = await engine.review(
          projectId,
          state.revision,
          id,
          state.turns.at(-1)!.proposals.map((p) => p.id),
          "adopt",
        );
        await assert.rejects(
          engine.adoptDraft(projectId, updated.revision, id),
          /direction has changed/,
        );
        assert.equal(
          await database.collection("scenes").countDocuments({ id: state.turns.at(-1)!.draft!.id }),
          0,
        );
      });
      await suite.test(
        "a late response cannot overwrite the result of a recovered attempt",
        async () => {
          const pending = deferred<EngineReply>();
          const started = deferred<void>();
          const slow = new CollaborationEngine(store, async () => {
            started.resolve();
            return pending.promise;
          });
          const id = randomUUID();
          const running = slow.send(projectId, id, "Recover this message.");
          await started.promise;
          const state = await store.load(projectId);
          const expired = structuredClone(state);
          expired.turns.at(-1)!.startedAt = new Date(0).toISOString();
          await store.save(state, expired);
          const fresh = new CollaborationEngine(store, async () => ({
            ...fixture(),
            answer: "Recovered response",
          }));
          await fresh.send(projectId, id, "Recover this message.");
          pending.resolve({ ...fixture(), answer: "Obsolete response" });
          await running;
          const final = await store.load(projectId);
          assert.equal(final.turns.at(-1)!.answer, "Recovered response");
          assert.equal(final.turns.filter((t) => t.id === id).length, 1);
        },
      );
    } finally {
      // Only the uniquely created test database is removed; the user's storymatic database is untouched.
      await database.dropDatabase();
      await client.close();
    }
  },
);
