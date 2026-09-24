/** Opt-in live smoke test: two real AI calls, synthetic story, isolated temporary database. */
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { EngineStore } from "../src/lib/engine/store.server";
import { CollaborationEngine } from "../src/lib/engine/service.server";

const client = new MongoClient(process.env["MONGODB_URI"] ?? "mongodb://localhost:27017", {
  serverSelectionTimeoutMS: 5000,
});
const database = client.db(`storymatic_engine_smoke_${randomUUID().replaceAll("-", "")}`);
const projectId = randomUUID();
try {
  await database.collection("projects").insertOne({
    id: projectId,
    owner_id: "local",
    title: "Synthetic reunion smoke test",
    deleted_at: null,
  });
  const engine = new CollaborationEngine(new EngineStore(database));
  let state = await engine.send(
    projectId,
    randomUUID(),
    "Help me shape a short novel. Alba returns to her village and her brother Pau. She believes their mother died. Privately, I have decided the mother is alive; reveal this only in the final chapter. Pau knows but should seem sincerely kind in the opening. I am considering either forgiveness or permanent separation at the end; keep both possibilities open. Please propose a concise brief, two characters, a three-part outline, and the private reveal rule. No prose yet.",
  );
  let turn = state.turns.at(-1)!;
  assert.equal(turn.status, "complete", turn.error ?? "Initial response failed");
  assert.ok(turn.proposals.length > 0);
  console.log(
    JSON.stringify({
      stage: "scaffold",
      proposalCount: turn.proposals.length,
      proposalKinds: turn.proposals.map((p) => p.kind),
      commitments: turn.proposals.map((p) => ({ title: p.title, commitment: p.commitment })),
    }),
  );
  state = await engine.review(
    projectId,
    state.revision,
    turn.id,
    turn.proposals.map((p) => p.id),
    "adopt",
  );
  state = await engine.send(
    projectId,
    randomUUID(),
    "Draft only a short opening scene, about 150 words, in close third person through Alba. The siblings meet at the kitchen table. Alba trusts Pau. He offers her tea. No sinister hints, no revelation about the mother. Do not propose any book changes in this response.",
  );
  turn = state.turns.at(-1)!;
  assert.equal(turn.status, "complete", turn.error ?? "Draft response failed");
  assert.ok(turn.draft?.text);
  const adopted = await engine.adoptDraft(projectId, state.revision, turn.id);
  const reopened = await new EngineStore(database).load(projectId);
  assert.equal(reopened.turns.at(-1)?.draft?.status, "adopted");
  console.log(
    JSON.stringify({
      stage: "draft",
      sceneId: adopted.sceneId,
      text: turn.draft.text,
      reviewNotes: turn.draft.reviewNotes,
      persistedTurns: reopened.turns.length,
    }),
  );
} finally {
  await database.dropDatabase();
  await client.close();
}
