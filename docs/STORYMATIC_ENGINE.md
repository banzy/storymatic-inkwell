# Storymatic conversation engine

This first increment connects conversation to durable book planning and the existing
manuscript editor. It preserves the author’s raw input, records proposed changes,
and lets the author adopt useful directions without converting uncertainty into fact.

## Run it

Start local MongoDB and configure `.env` or `.env.local`:

```dotenv
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=storymatic
OPENAI_API_KEY=your-server-side-key
STORYMATIC_MODEL=gpt-6-astra
```

Then run `npm run dev` and open the studio. A newly created book opens its
conversation at `/book/<projectId>`. For an existing book, open its manuscript and
choose **Develop this book** in the outline sidebar.

Describe a story in ordinary language. The response can propose a brief,
characters, relationships, outline, threads, world details, directions, secrets,
and open questions. **Keep in book** adopts one or several proposals; it preserves
each proposal’s tentative/decided status. Dismiss leaves it in the conversation
history. The latest adopted group can be undone. Corrections can be requested in
conversation, with previous versions retained in the change history.

Ask for a scene when ready. The proposed prose includes a brief and review notes.
**Add as a new chapter and scene** explicitly saves it into the existing editor.
Each adoption currently creates a new chapter, rather than choosing an outline slot.
If the book direction changes after drafting, request an updated draft before adoption.

Export book memory downloads the conversations, planning items and change history
as JSON. Manuscript export remains in the existing editor. These are separate
exports; neither is a complete database backup or a tested round-trip import.

## What is implemented

- Messages are saved before requesting AI output. Failed/interrupted turns remain
  available for retry. Request IDs prevent repeated completed requests from
  generating duplicate turns; a timeout recovery uses a new attempt ID so an old
  response cannot replace the recovered response.
- The AI returns a validated reply, proposals and an optional scene draft. Author
  attribution requires an exact quote from the current message. This verifies the
  quote’s presence, not the correctness of the model’s interpretation.
- Suggestions remain separate from adopted planning. Even an adopted plan is not
  evidence of what has happened in the manuscript.
- All adopted planning is included in AI context. Recent conversation, relevant
  older turns and selected manuscript excerpts are included with coverage notes.
  Earlier proposed drafts are available for follow-up revisions.
- Atomic version checks prevent competing engine updates from silently replacing
  one another. Proposal target versions reject obsolete changes. Undo restores
  prior values while retaining new version numbers.
- Scene adoption records its intent before writing the chapter, scene and initial
  revision. Stable IDs and insert-only upserts allow a retry after interruption
  without duplicate scenes. This works with standalone MongoDB; no replica set or
  multi-document transaction is required. An interrupted adoption must be resumed
  before another conversation or planning change.
- Existing manuscript autosaves run sequentially, flush waits for newer queued
  writing, and a failed older save cannot replace the latest queued document.
  Local recovery content is removed only if it matches the saved document.

## Architecture

`src/lib/engine/` contains the typed model and reducers, MongoDB store, context
builder, provider adapter and orchestration service. `src/lib/engine.functions.ts`
exposes validated server functions. `/book/<projectId>` is a small conversation
surface using the existing UI components. The existing manuscript route and
collections are retained.

`book_engines` uses one versioned aggregate document per project to make
conversation, planning adoption and provenance atomic on standalone MongoDB.
An 8 MiB application limit leaves room below MongoDB’s document limit; exceeding
it rejects the update and preserves existing state. This is an initial storage
design, not the final design for years of novel development. Before that scale,
split immutable conversation and revisions into separate collections and introduce
bounded, versioned context assembly.

The provider uses OpenAI’s Responses API with strict structured output, a 90-second
request timeout and `store: false`. The model is configurable. See the official
[Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs).
Local persistence does not mean local inference: author messages, adopted planning
and selected conversation/manuscript excerpts are sent to OpenAI. `store: false`
is a request setting, not a claim about all provider retention policies.

The older manuscript AI actions still use `src/lib/ai.server.ts` and its
`LOVABLE_API_KEY`. They are not migrated to the new provider or shared context yet.
Existing Story Space tables are also not synchronized with the new planning
aggregate. Use the conversation’s developing-book view for this engine’s planning
state; those older views retain their existing data and behavior.

## Boundaries and next work

The central product promise—learning from the book as it develops—is only partly
implemented. This engine remembers adopted directions and consults selected prose.
It does not yet extract and reconcile evidence after every manuscript edit.

Private motives and future reveals are represented as secret planning items, and
the collaborator prompt distinguishes private knowledge from permissible narration.
There is no independent disclosure reviewer, per-character knowledge ledger, or
formal reveal boundary yet. A successful scene test demonstrates a useful example,
not a guarantee against spoilers across a novel.

Retrieval currently ranks by word overlap: eight recent completed turns, up to four
relevant older turns, and up to six scene excerpts. Excerpts are truncated and the
AI is explicitly told coverage is partial. There is no semantic search, full-book
continuity guarantee or automatic ingestion of every older Story Space record.
Draft staleness checks cover engine planning versions, not edits made concurrently
in the legacy manuscript editor. Large planning sets also need token budgeting.

Next, connect manuscript revisions to evidence-backed observations; model who knows
what and what the reader has seen at each scene; separate the planner’s complete
knowledge from scene-writing context; and independently review proposed prose for
leaks. Then unify the existing planning views around that shared state.

## Verification

```sh
npm run typecheck
npm test
STORYMATIC_TEST_MONGODB_URI=mongodb://localhost:27017 npm test
npm run build
```

The default test command runs deterministic tests and skips the real-MongoDB
integration suite unless the test URI is set. Integration tests create and delete
only a uniquely named `storymatic_engine_test_*` database. They cover persistence,
idempotency, failures, attribution, conflicts, adoption, undo, interrupted scene
finalization, stale drafts and recovered AI attempts, without calling an AI provider.

Optional live smoke test (two billable AI requests, synthetic story):

```sh
node --env-file=.env --import tsx scripts/smoke-engine.ts
```

It creates and removes a uniquely named temporary database. It exercises scaffold
creation, proposal adoption, scene generation and manuscript adoption. Inspect the
printed synthetic prose for disclosure and voice quality; automated assertions
check the workflow, not literary quality. A two-call run completed successfully
during implementation. Browser interaction verification was blocked by the browser
tool’s policy-verification failure, so the UI still needs a manual smoke check.
