# Storymatic — creative partnership action plan

Date: 24 September 2026  
Status: Accepted direction; first engine increment implemented.
Basis: The author's conversations in this task and inspection of the current repository.

### Implementation update — 24 September 2026

The author confirmed that engine development comes first, existing UI should be
reused, and persistence must use local MongoDB (`localhost:27017`, database
`storymatic`). The prior Supabase migration has been replaced with the local
MongoDB adapter. References to Supabase below describe the original inspection,
not the chosen persistence architecture.

The first increment provides persistent creative conversations, structured book
proposals with provenance and uncertainty, explicit adoption and undo, proposed
scene drafts, and recoverable adoption into the existing manuscript. It also
serializes scene autosaves so an older request cannot overwrite newer writing.
See [the engine guide](./STORYMATIC_ENGINE.md) for its boundaries and verification.

This starts phases 0–1; it does not complete the full roadmap. Next priorities are
evidence-backed understanding of manuscript revisions, explicit character/reader
knowledge at each scene, and independent disclosure review. Those are necessary
to substantiate the defining promise of a novel that develops its understanding
as it is written. Full planning integration with the existing Story Space and
novel-scale context retrieval also remain open.

## 1. The product we are building

Storymatic turns an author's conversations, fragments, inspirations, and judgments into a developing book. The AI contributes substantial creative craft: organizing, proposing structure, inventing within the author's direction, drafting scenes, and reconsidering the work as it grows. The author directs through conversation and can write or edit directly at any time.

The defining loop is:

**Explain → develop a shared understanding → propose or update the book → write together → discover what the writing changes → continue.**

Success means that a short session advances the same coherent book without making the author reconstruct context or maintain separate records.

### Product commitments

- Work begins before a manuscript exists. Uncertainty and contradictions are valid input.
- Conversation creates persistent, inspectable results in the book, not only replies.
- The AI does the organizational work; the author is not required to complete forms.
- Characters emerge through acts, speech, relationships, and circumstances. Moral labels are interpretations, not default character definitions.
- Private intentions, established fictional background, manuscript evidence, character beliefs, and reader disclosure remain distinct.
- A possibility stays a possibility until adopted. Repetition by the AI does not turn it into a decision.
- The AI may invent and draft substantially within the request. Consequential inventions are recognizable and reversible.
- The outline can change when the writing reveals a better story.
- Voice and originality are learned through examples and feedback. Organization must preserve unusual ideas, ambiguity, and intentional irregularity.
- The writer can continue without AI availability. Their manuscript and creative history remain exportable.

## 2. Current structure and the conceptual gap

The current application contains useful foundations, but its default direction is manuscript → analysis. The proposed product needs conversation → working book → manuscript → revised understanding as well.

| Area | Observed implementation | Decision |
| --- | --- | --- |
| Application stack | React, TanStack Start/Router/Query, Supabase, Tiptap, Tailwind/Radix | Keep. There is no identified product benefit in replacing the stack. |
| Workspace | A 2,356-line project route coordinates the editor, queries, AI actions, outline, and Story Space | Gradually extract three product surfaces and shared services. Avoid a broad rewrite before the first useful milestone. |
| Conversation | `askTurns` lives in React state; the client sends the last six turns. The server's Ask prompt is primarily manuscript Q&A | Replace as the primary collaboration flow with persistent conversations, decisions, and structured changes. Retain scoped manuscript Q&A as a capability. |
| Starting a book | Project creation makes an empty chapter and scene. Most reading features need existing prose | Let a new project begin in conversation, with an emerging book brief. Existing drafting entry remains available. |
| Outline | Planned beats and written scenes already have separate representations | Keep and extend with relationships, revisions, and conversational updates. |
| Story understanding | Entities, claims, relationships, events, threads, promises, observations | Reuse domain records, but separate meanings currently grouped into `truth_type` and add provenance and temporal knowledge. |
| Story views | Fourteen tabs plus outline and contextual panels | Regroup as views of the same book. Remove duplicate maintenance paths as shared updates replace them. |
| Writing assistance | Selection edits and continuation; instructions prohibit introducing unestablished facts | Preserve faithful editing. Add a distinct creative drafting operation that can invent within a scene brief. |
| Possibilities | Bounded scene alternatives; adopted status does not apply prose | Extend to book-level alternatives and coherent change proposals. Keep alternatives isolated from accepted state. |
| AI processing | Feature-specific prompts and direct calls; several analyses use only the first ten scene excerpts | Introduce shared context selection, revision checks, and resumable processing. Replace independent rereading with common story updates. |
| Documentation | README is largely the original brief; roadmap retains stale sign-in status and historical completion claims | Preserve as historical context. After product direction is accepted, update the active brief and roadmap to reflect the new contract. |

### Important source locations

- `src/routes/_authenticated/p.$projectId.tsx`: workspace state, temporary chat, orchestration, proposal acceptance.
- `src/components/studio/ask-view.tsx`: current manuscript-question interface.
- `src/components/studio/story-space.tsx`: fourteen-tab information architecture.
- `src/lib/assist.functions.ts`: context assembly, manuscript Q&A, passage proposals.
- `src/lib/outline.functions.ts`: planned beats versus written scenes.
- `src/lib/story.functions.ts`: entity and claim extraction.
- `src/lib/storybrain.functions.ts`: synopsis, relationship, and discovery operations.
- `src/lib/{threads,promises,timeline,world,themes,contradictions}.functions.ts`: specialized readings.
- `src/components/studio/use-scene-autosave.ts` and `src/lib/manuscript.functions.ts`: writing persistence and revisions.
- `src/lib/ai.server.ts`: existing AI transport boundary.

The prior assessment in this task established that build and TypeScript passed, lint was overwhelmingly blocked by formatting, and no automated test suite was found. Isolated checks reproduced save races and formatted-quotation matching failures. These checks have not been represented as authenticated browser verification.

There is also a repository/deployment consistency question: generated types and code reference `story_threads` and `story_thread_beats`, but their creation was not found in the checked-in migrations. The checked-in observation-kind constraint allows discovery/theme while application code also uses question. Reconcile this against the deployed schema before migration work; do not assume production is missing the tables or modify it blindly.

## 3. The author experience

### Three connected surfaces

**Conversation** is the main entrance for developing a book. It supports long, messy explanations, concise exchanges, pasted notes, and eventually voice. Replies can include a proposed scene, an updated outline section, or a small summary of what changed. There is no mandatory interview before useful work starts.

**Book** shows the current creative brief, outline, characters and relationships, threads, world, chronology, inspirations, unresolved choices, and alternatives. These remain editable, but conversation maintains them. The overview answers “What is this book becoming?” rather than leading with production statistics.

**Manuscript** preserves the calm editor. Conversation can sit beside a scene with its relevant direction and evidence. The author can ask for a complete draft, change a passage, or write unaided. The current writing position survives navigation between surfaces.

Review is contextual: changes appear beside the response or affected work. An optional history collects earlier decisions and revisions. A permanent queue of facts awaiting approval must not become a second job.

### Examples of intended behavior

| Author says | Storymatic does |
| --- | --- |
| “Here are the fragments I have…” | Saves the raw material; offers a provisional brief, a meaningful story shape, and a few questions only where needed. |
| “What if her brother knew?” | Explores an alternative without changing the active book. |
| “I've decided he knew all along.” | Updates the private intention, identifies affected plans and scenes, and explains consequences. |
| “Make that change throughout the outline.” | Applies a grouped, versioned outline update and preserves an undo path. |
| “I like the uncomfortable affection in that film.” | Records the desired quality and asks for clarification only if needed; does not import the film's plot as fact. |
| “Write their reunion. She must still trust him.” | Produces a scene using relevant knowledge, voice, and disclosure constraints, then presents meaningful inventions or concerns. |
| “Where were we?” | Gives a short return brief with the latest decisions, open choices, and useful next step. |

### Defaults for creative authority

- Save raw conversation and refresh derived summaries automatically.
- Apply clear author instructions to planning records with a visible change summary and undo.
- Keep ambiguous statements tentative; ask a focused question when competing interpretations would materially change the book.
- Present AI-originated consequential changes as proposals. The author can adopt them conversationally or in a grouped review.
- Generate requested prose as a draft; adoption into the active manuscript is explicit. Requested edits can be applied through the existing review pattern with reliable recovery.
- Do not rewrite accepted scenes because an outline changed unless the author requested those revisions.
- Do not treat silence, a later topic change, or an AI summary as approval.

## 4. The shared understanding of the book

Use existing relational story objects where possible. Add the missing records around them; do not introduce a generic graph database or rewrite every domain table first.

| Record or relationship | Purpose |
| --- | --- |
| Conversations and messages | Preserve the author's original material across sessions, including source language and transcript corrections. |
| Creative brief | Maintain the current premise, emotional center, tone, narrative approach, voice examples, and intentionally open choices. |
| Decisions and intentions | Record what was chosen, considered, rejected, or superseded, with source message and rationale. |
| Proposed change sets | Group typed additions/updates across existing book objects, with before/after versions, origin, and application status. |
| Existing book objects | Reuse outline beats, entities, relationships, threads, events, directions, and possibilities as the organized work. |
| Manuscript revisions and evidence | Preserve exact source versions and passage anchors; keep derived readings traceable to accepted prose. |
| Character knowledge and disclosure | Express who knows, believes, suspects, or conceals something, and when narration may expose it. |
| Dependencies and analysis runs | Track which decisions or passages informed an output, and whether that output is still current. |

Do not overload a single “truth” status. Keep these dimensions separate:

1. Origin: author statement, AI proposal, imported reference, or manuscript evidence.
2. Commitment: tentative, adopted, rejected, or superseded.
3. Basis: explicitly stated, inferred, or speculative.
4. Applicability: private fictional background, future intention, depicted event, character belief, or reader interpretation.
5. Position: story chronology, manuscript reading order, and project revision/version.
6. Visibility: who can know it, what a narrator can express, and intended disclosure conditions.
7. Validity: current, stale, disputed, or requiring review.

An adopted hidden background fact can be true in the intended fictional world without appearing in the draft. A character's lie is evidence that they said something, not proof that it happened. An author's agreement with an interpretation does not manufacture supporting prose.

Use stable scene IDs for positions and links. Derive reading order from chapter and scene order; numeric scene positions alone are insufficient across chapters and rearrangements. Unknown chronology stays unknown.

Preserve original messages and revisions even when summaries are compacted. Summaries are useful retrieval aids, not replacement evidence. Preferences learned for one novel stay scoped to that novel unless the author explicitly makes them general.

## 5. The collaboration engine

The “committee of experts” is a set of responsibilities behind one collaborator. Start with a bounded workflow in the current application. Add separate specialist calls only when evaluations show a benefit.

### Conversation to book

1. Persist the message and identify its project, intent, and relevant objects.
2. Retrieve the current brief, relevant decisions, selected alternatives, and source passages/messages.
3. Produce a helpful reply and typed proposed changes. Distinguish an instruction, exploration, correction, and request to draft.
4. Validate structure, ownership, referenced IDs, expected versions, and allowed operations server-side.
5. Apply authorized changes together in a transaction. Repeated delivery of a message cannot duplicate them.
6. Refresh affected views and expose a concise result, including unresolved conflicts.

The model never receives arbitrary database-write authority. Model output is a proposal to a constrained application operation. Failed processing must leave the original conversation recoverable and retryable.

### Book to scene

Build a scene brief from purpose, participants, location, viewpoint, voice, active intentions, relevant prior events, and what may be revealed. The AI can infer a brief when the author has supplied enough; do not require a form for every scene.

Separate faithful editing from creative drafting. Editing preserves meaning unless directed otherwise. Drafting can create dialogue, action, imagery, and connective material while respecting the brief. A new central motive or backstory is surfaced as a consequential invention.

### Protecting surprise

- Planning can use the private outline and future intentions.
- Drafting gets only the background needed for causal coherence, plus clear limits on narrative disclosure. Do not blindly include every future synopsis in every request.
- When a character's hidden motive is necessary to write their behavior, include it as private motivation with viewpoint-specific expression constraints. Simply removing all secrets would produce incoherent behavior.
- A review step considers direct spoilers, suspicious narrative tone, premature inner thoughts, and accidental emphasis. It also checks whether restraint made the scene vague or implausible.
- A reader-oriented assessment sees the manuscript available up to that point, without the private plan. Its likely-reader inference is an interpretation, never certainty.
- A secret-aware check can compare that assessment and draft against intended disclosure. Keep repair attempts bounded and make unresolved concerns visible.
- Never promise perfect spoiler prevention. Evaluate repeated generations and preserve the author's ability to inspect and decide.

### Manuscript to new understanding

After adopting or editing a scene, analyze its exact revision. Extract events, actions, beliefs, relationship changes, and evidence. Compare what the prose expresses with the intended scene purpose. Update dependent views and surface only consequential differences.

New understanding may suggest changing the outline. It must not silently convert an inference into a decision or train future drafts on rejected alternatives.

Use revision checks both when analysis begins and when it publishes. Deleting a source, moving a reveal, or replacing a passage must invalidate affected outputs, including character summaries and relationship views—not only claims containing a removed quote.

### Novel-length context

Combine a short project brief, scene/chapter summaries, exact relevant passages, decisions, and dependency links. Search across the entire project rather than taking the first N scenes. Use semantic retrieval if it improves measured recall; it cannot replace knowledge or disclosure filters.

Run expensive background work as resumable, deduplicated jobs in the existing backend, with timeouts, cancellation, bounded retries, and usage accounting. Record what was actually processed and communicate gaps when relevant. Provider and model choices remain behind `ai.server.ts` and are evaluated against the same book tasks.

## 6. Delivery plan and exit gates

These phases are ordered by dependency, not calendar promises. A phase is complete when its author-facing outcome works and its exit gate passes. Exact effort should be estimated after the first working slice and deployment constraints are known.

### Phase 0 — establish the contract and safe foundation

Deliver the agreed creative behavior, small evaluation fixtures, a reproducible schema baseline, and the persistence/versioning required by the new loop. Address save races and pre-edit recovery as prerequisites to putting a real book into the prototype. Extract only the route responsibilities necessary for the new surfaces.

**Exit gate:** existing projects remain readable/editable; a fresh database can reproduce the schema; recovery and revision tests pass; proposed records cannot cross project ownership boundaries. The original README remains available as historical guidance.

### Phase 1 — prove the complete partnership in a small book

Deliver persistent conversation, an emerging Book view, a minimal brief/outline/cast, conversational decisions, a private reveal constraint, one scene draft, adoption, and a return brief. Use text first for the reasoning loop. Voice capture can follow the same message path as soon as persistence is stable.

**Demonstration:** give the app a messy premise with a secret and two possible endings. Obtain useful scaffolding without writing any prose. Change one motivation. Draft an early scene without disclosing the secret. Adopt it, close the project, and return with the decision history and alternatives intact.

**Exit gate:** the author recognizes their idea, understands the AI's additions, and can redirect it without maintaining forms. Exploratory remarks remain uncommitted. The private plan has not become manuscript fact or character knowledge. This is the first major product milestone.

### Phase 2 — develop a whole book through conversation

Expand planning into acts or other appropriate structures, chapters, scene purposes, subplots, relationships, world rules, and thematic possibilities. No mandatory three-act template. Add meaningful alternatives, inspiration notes, learned voice preferences, targeted questions, and grouped changes across the outline and cast.

**Exit gate:** a changed central intention produces a coherent proposal across affected planning objects; unaffected author choices survive. Undo restores the prior state. The author can inspect where an idea originated. An alternative ending does not contaminate the active book.

### Phase 3 — establish an excellent scene-writing partner

Add full scene and bounded sequence drafting, dialogue revision, voice calibration from accepted examples, character-specific speech, viewpoint control, and nuanced reveal reviews. Improve passage application to cover formatted and repeated text. Introduce a short review of meaningful new inventions, without listing every decorative detail.

**Exit gate:** multi-scene samples preserve voice and causal continuity; early scenes avoid premature knowledge while remaining vivid; a scene can be revised safely after its brief changes. Human review judges tone, humor, originality, and usefulness alongside automated checks.

### Phase 4 — make understanding evolve across the novel

Replace fragmented rereading with shared revision-aware analysis. Support changing beliefs, unreliable narration, directional relationships, flashbacks, reader disclosure, and consequences across distant chapters. Distinguish an inconsistency from an intentional mystery or a possible new direction.

**Exit gate:** changing a late revelation identifies affected earlier material; changing or deleting evidence retires dependent readings; writing chapter twenty before chapter two does not leak later knowledge into chapter two. Relevant late-book passages are retrieved even in a long manuscript.

### Phase 5 — make the partnership practical for a complete book

Mature voice capture and transcript correction, long-session continuity, return briefs, research handling, larger revision passes, project snapshots, manuscript and planning export, and reliable background processing. Test with one of the author's actual projects and a separate long-manuscript fixture. Improve accessibility and narrow-screen conversation capture.

**Exit gate:** several short sessions advance the same book without repeated explanation; interrupted work resumes; long-manuscript latency and cost are measured; export preserves prose, structure, decisions, and source links in usable forms. No autonomous publication is part of this workflow.

Voice is an important input method, not a reason to defer the creative engine. Start with record/transcribe/edit/send and the same durable message path. Evaluate live spoken back-and-forth after it is clear that transcription quality, turn taking, and corrections serve the author's workflow.

## 7. First implementation backlog

Once this plan is accepted, start with these coherent changes rather than all phases at once:

1. Reconcile schema history; establish fixtures for messy input, private secrets, and competing endings. Fix the demonstrated save/recovery hazards needed by the first scene workflow.
2. Add persistent conversations/messages and versioned book decisions/change sets. Enforce project ownership, idempotency, and grouped transactional updates.
3. Extract a project shell with Conversation, Book, and Manuscript. Let the new-project path open conversation; retain existing manuscripts and deep links.
4. Implement message → provisional brief/outline/cast → visible change summary. Original messages remain linked; inferred choices are not misrepresented as author decisions.
5. Implement a conversational correction that updates the intended plan and shows effects without rewriting prose.
6. Implement a small scene brief and draft operation with private knowledge and disclosure constraints; adopt with a pre-change revision.
7. Reopen the project and reconstruct a concise return brief from durable state. Run the complete demonstration with the author before expanding features.

Initial backend modules can live under `src/lib/collaboration/`, `src/lib/book/`, and `src/lib/writing/`. These are responsibility boundaries, not new services. Keep existing server functions as adapters during migration. Avoid moving every file for architectural neatness.

## 8. Evaluation and quality standards

| Test | Required behavior |
| --- | --- |
| Messy initial explanation | Produces useful structure without inventing certainty or demanding a questionnaire. |
| “What if” versus “I decided” | Preserves the first as exploration and applies the second to the intended plan. |
| Private betrayal | An early scene stays plausible and does not disclose the betrayal through narration or tone. |
| Later moral interpretation | Earlier genuine kindness is not automatically rewritten as calculated deceit. |
| Wrong character belief | A false belief remains distinct from fictional world truth and other characters' knowledge. |
| Alternative ending | Exploring or rejecting it leaves the active plan and accepted prose intact. |
| Changed source | Stale work cannot publish as current; dependent interpretations are reconsidered. |
| Out-of-order drafting | The active scene uses the correct narrative position regardless of when it was written. |
| Long manuscript | Relevant evidence beyond the first ten scenes is found; incomplete coverage is disclosed. |
| Return after a gap | Important decisions, voice preferences, and open questions are recovered with sources. |
| Failed save or AI request | Writing, raw ideas, and adopted decisions are preserved; retries do not duplicate updates. |
| Manual author edit | Direct changes participate in the same versioning, dependency, and review rules as conversational edits. |

Deterministic tests cover state transitions, ownership, atomic updates, passage application, and persistence. Scenario evaluations cover decision extraction, retrieval, and disclosure across multiple generations. The author judges literary quality: voice, humor, emotional credibility, distinctiveness, and whether revisions save effort.

Track correction burden, repeated explanations, unintended commitments, spoiler leakage, retrieval coverage, response time, and AI cost per useful session. Establish baselines on the first slice before choosing numeric product targets. Do not use a fabricated creativity score as a substitute for judgment.

## 9. Migration and release approach

- Keep the current application and primary database. Use additive migrations and a project-level rollout switch for the new experience.
- Backfill legacy records with explicit legacy provenance. Do not invent conversation history or treat all author-confirmed records as evidence-backed facts.
- Preserve scene IDs, manuscript content, revisions, and existing author notes. Recompute only derived views where necessary and label processing status.
- Add schema constraints tying related IDs to the same project; ownership of individual rows is not the only consistency requirement.
- Apply accepted changes atomically with expected-version checks. If concurrent edits conflict, preserve both inputs and ask for a focused resolution.
- Treat undo as a versioned reverse change; if later edits depend on it, show the consequence rather than blindly overwriting them.
- Stage first on a dedicated development project/database or safe isolated test data. Verify restore/export and migration compatibility before a connected-branch rollout.
- Preserve Lovable history: no force pushes or rewriting published commits. Deployment is a separate concrete step after implementation and validation.
- Update documentation as each capability becomes real. Historical checkboxes are not evidence that the new acceptance gates passed.

## 10. Deliberate scope choices

The ambition is the depth of the partnership. Early work should concentrate there.

Defer billing, marketplaces, covers, audiobook production, multiplayer editing, elaborate graphs, autonomous agent teams, full parallel manuscript branches, and one-click unattended novel generation. Preserve an expansion path without making these prerequisites.

The exact names of the surfaces, preferred level of automatic planning updates, live voice priority, and ideal session length can be refined while evaluating the first slice. The proposed defaults above are sufficient to start; there is no need for a long questionnaire before progress.

The first milestone succeeds when the author can say: **“I explained the story as it exists in my head. Storymatic gave it a useful shape, wrote a scene with me, protected what should remain unknown, and remembered what we decided.”**
