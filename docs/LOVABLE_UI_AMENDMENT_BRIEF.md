# Storymatic UI amendment brief for Lovable

Date: 28 September 2026  
Status: Product direction accepted; engine foundation implemented; UI amendment requested.

## Read this first

Storymatic has changed from a manuscript editor with many AI analysis tools into a
conversation-led environment for developing and writing a complete novel with AI.
The existing manuscript editor remains valuable, but it is now one part of a larger
creative partnership.

This is not a conventional “AI writes a book from a prompt” product, and it is not a
traditional writing database with AI buttons added to it. The author talks through a
story as they would with an excellent ghostwriter: fragments, scenes, plot turns,
inspirations, doubts, contradictions, desired effects, and corrections. Storymatic
organizes that material into a developing book, proposes creative structure, drafts
prose when asked, remembers decisions, and gradually learns from what is actually
written.

The UI must make that operating model obvious. The primary loop is:

> Explain → develop a shared understanding → choose what belongs in the book →
> draft together → learn from the manuscript → continue.

The immediate work is a UI and information-architecture amendment around the engine
that already exists. Preserve its data semantics and safety behavior. Do not replace
the engine, manuscript persistence, editor, or autosave system as part of this task.

## The product promise

An author should be able to arrive with a story that is incomplete and disorganized,
describe it naturally, and leave a session with a clearer book and useful writing.
They should not have to populate a large set of forms before Storymatic helps.

Storymatic may contribute substantial creative work. It can suggest an outline,
characters, relationships, subplots, a scene structure, dialogue, and complete prose.
The author remains the creative director: they decide what becomes part of the active
book and what enters the manuscript.

The most distinctive long-term promise is that the book becomes self-aware as it is
written. A character is not labelled “bad” in advance. Their nature emerges from
their words, actions, relationships, and consequences. A secret known to the planner
must not appear prematurely in narration, tone, or another character's knowledge.
What the author knows, what is planned, what has occurred in the manuscript, what a
character believes, and what the reader has learned are different states.

The current engine establishes the first part of this promise: persistent
conversation, structured book memory, uncertainty, provenance, adoption, undo, scene
drafting, and manuscript adoption. Full evidence-based character and reader knowledge
is the next engine milestone. The UI must leave room for it without falsely claiming
that it exists today.

## The conceptual shift

The old experience was primarily:

> Create or import a manuscript → write scenes → run separate AI readings → inspect
> many Story Space tabs.

The new experience is:

> Start a book through conversation or import an existing manuscript → build a shared
> creative understanding → move naturally between developing, reviewing the book,
> and writing → let future story intelligence learn from revisions.

This changes the hierarchy of the application:

1. **Develop** is where the author and Storymatic think together.
2. **Book** is the current organized understanding produced by that work.
3. **Manuscript** is where scenes become actual prose and remain directly editable.

These are three views of one project, not three separate products. Every project
should have a consistent shell and an obvious way to move between them.

## What already exists and must remain functional

The repository already contains:

- `/studio`: project list, new project, sample, and manuscript import.
- `/book/$projectId`: the new durable conversation and developing-book prototype.
- `/p/$projectId`: the mature manuscript workspace, Tiptap scene editor, outline,
  focus mode, autosave, recovery, revisions, contextual assistance, and Story Space.
- A warm literary visual system in `src/styles.css`: ivory surfaces, moss-green
  primary color, Instrument Sans for interface text, Newsreader for literary text,
  restrained radii and shadows.
- Shared Radix-based UI components under `src/components/ui`.
- Engine server functions in `src/lib/engine.functions.ts`.
- Engine state and exact domain terms in `src/lib/engine/model.ts`.
- Existing manuscript functions in `src/lib/manuscript.functions.ts`.

Preserve the visual system. Evolve it; do not replace it with a generic dark AI
dashboard, neon gradients, glass panels, oversized marketing cards, or a messaging
application aesthetic. Storymatic should feel like a quiet editorial room: calm,
literary, intelligent, and serious enough for long work.

Preserve these behaviors:

- Scene content and IDs, chapter structure, revisions, and existing project data.
- The Tiptap editor and its formatting, focus mode, autosave, local recovery, and
  revision behavior.
- Message persistence before AI generation.
- Retry of failed or interrupted AI responses using the same saved message.
- Explicit adoption of AI proposals and scene drafts.
- Version checks and stale-draft protection.
- Undo of the latest adopted book change.
- Import, export, sample project, project deletion, and deep links to scenes.
- Keyboard focus, accessible labels, reduced-motion support, and visible status text.

Do not rewrite published Git history. Do not force-push, rebase, amend, or squash
commits that have already been pushed because this repository is connected to
Lovable.

## The state model the UI must communicate

The UI cannot collapse all information into “AI content” or “canon.” These meanings
are part of the product contract.

### Book proposal versus book memory

An AI response can contain proposed changes. Each proposal has:

- a kind: book brief, character, relationship, outline, plot/subplot, world, voice
  and direction, private intention, or open question;
- a commitment: `tentative` or `decided`;
- an origin: grounded in the author's current words or invented by Storymatic;
- a rationale and, for author-originated material, an exact source quotation;
- a status: pending, adopted, dismissed, or undone.

Pending proposals are outside the active book. **Keep in book** adopts them. Adoption
does not change a tentative proposal into a decision. “What if she leaves?” can be
kept as a live possibility without becoming the ending. “I have decided she leaves”
can be represented as intended.

An adopted planning item is still not evidence that an event appears in the
manuscript. Avoid words such as “canon,” “established,” or “happened” for planning
items. Recommended labels are:

| Engine value | User-facing meaning |
| --- | --- |
| `tentative` | Open possibility |
| `decided` | Intended |
| `origin: author` | From your words |
| `origin: suggestion` | Adopted Storymatic suggestion |
| `pending` | Proposed |
| `adopted` | Kept in book |
| `dismissed` | Set aside |
| `undone` | Undone |

Do not rely only on color to express these distinctions.

### Private intentions

The `secret` item kind is labelled **Private intention**. It is planner knowledge,
not necessarily character knowledge or reader knowledge. Give it a discreet visual
treatment and a short explanation. Do not render it as a dramatic spoiler warning
throughout the UI.

### Scene proposals

A generated scene is a proposal outside the manuscript until explicitly adopted.
The scene contains:

- title;
- brief: purpose, point of view, allowed knowledge, and reveal limits;
- prose;
- review notes: meaningful inventions or unresolved risks;
- status: proposed, adopting, or adopted.

The primary action is **Add to manuscript**. The current backend adds the scene as a
new chapter and scene. State that clearly; do not offer placement controls until the
backend supports them. If book direction changes after the draft was generated, the
draft is stale and adoption is disabled. Explain that the author should request an
updated version.

### Conversation status

An author message is saved before generation. Show this explicitly while Storymatic
is working. A failure must never look like the idea was lost. Use language such as:

- “Your idea is saved. Storymatic is considering it…”
- “The response was interrupted. Your message is saved.”
- “Retry response.”

If scene adoption is interrupted, the project enters a recoverable `adopting` state.
Show **Finish adding scene** prominently and prevent conflicting book changes until
it completes.

### Future evidence states

The older Story Space has labels such as established, inferred, possible, planned,
rejected, and contradicted. Those records are not yet synchronized with the new book
memory. Do not merge or relabel them as if they were one source of truth.

Reserve future UI vocabulary for these distinctions:

- **Author intention**: what the author wants or is considering.
- **Manuscript evidence**: an action, statement, or event supported by a passage.
- **Storymatic reading**: an interpretation derived from evidence.
- **Character belief**: what a particular character believes at a point in the story.
- **Reader knowledge**: what the text has disclosed by a point in reading order.
- **Private knowledge**: information available to planning but not yet disclosed.

For this amendment, use future-facing empty space or restrained explanatory copy if
helpful, but do not render fabricated knowledge records or imply that automatic
scene analysis is complete.

## New global project shell

Create a consistent project shell shared conceptually by `/book/$projectId` and
`/p/$projectId`. It may be implemented as reusable components while the two routes
remain separate.

The shell needs:

- Storymatic/home link;
- project title and project switcher;
- three primary modes: **Develop**, **Book**, **Manuscript**;
- a quiet project menu for export and secondary operations;
- persistent status relevant to the current surface, such as manuscript save status;
- narrow-screen navigation that remains understandable without horizontal overflow.

Recommended navigation behavior:

- **Develop** opens `/book/$projectId` in conversation mode.
- **Book** opens the organized book view using the same engine state. This may use a
  validated `view=book` search parameter or an accessible in-route mode; keep a deep
  linkable URL if practical.
- **Manuscript** opens `/p/$projectId` and preserves the existing `scene` search
  parameter.

The mode selector should be visually stable across the two routes. It is the main
mental model of the application, so it should not be hidden in the manuscript
sidebar or represented by unrelated buttons such as “Story,” “Outline,” and
“Develop this book.”

On desktop, use a compact top bar. On narrow screens, use a compact menu or a
three-item navigation that remains visible. Do not turn all secondary manuscript
tools into top-level navigation.

## Surface 1: Develop

Develop is the main entrance to the partnership. It should feel like an editorial
working session rather than a customer-support chat.

### Desktop layout

Use a restrained two-pane layout:

- The main pane is the conversation, with a comfortable reading measure.
- The right pane is **Book at a glance**, a compact summary of adopted book memory.
- The right pane may collapse, but the conversation composer should remain generous.
- Keep the working area centered and avoid excessive card nesting.

The current `/book/$projectId` route is a valid functional prototype and should be
refined rather than discarded.

### Conversation presentation

Author messages can use a soft secondary surface. Storymatic replies should read as
editorial prose on the page, not as symmetrical chat bubbles. Clearly identify the
speaker without avatars, fake human portraits, or playful bot branding.

Each completed turn can contain three layers:

1. The author’s saved message.
2. Storymatic’s reply.
3. Optional work produced by that reply: proposed book changes and/or a scene draft.

Keep proposals visually attached to the response that produced them. The author
should understand cause, source, and effect without opening a separate review queue.

For a group of proposals, show a compact summary such as “6 proposed book changes,”
then list concise rows or cards. Each proposal should expose:

- title and kind;
- Open possibility or Intended;
- From your words or Storymatic suggestion;
- body and rationale;
- exact author quote when present;
- **Keep in book** and **Set aside** while pending;
- reviewed status afterward.

Keep-all is useful, but individual review remains available. Never preselect all
changes or imply that reading a response accepts them.

### Composer

The composer belongs at the bottom of the work area and should be easy to return to
after a long response. A sticky composer is acceptable if it does not obscure
content. It needs:

- a large multiline field;
- clear send action;
- `Cmd/Ctrl + Enter` as an optional accessible shortcut;
- disabled and working states;
- reassurance that conversation and decisions are saved;
- room for long, messy input rather than a one-line chat field.

Suggested initial prompt:

> Tell me the story as it exists in your head. Fragments, contradictions and half-made
> decisions are welcome.

When the project has no turns, provide three quiet starting examples rather than an
onboarding questionnaire:

- “I have a story about…”
- “I can see one scene clearly…”
- “I know the ending, but not how we arrive there…”

Do not require genre, character sheets, templates, or a step-by-step wizard before
the first useful response.

### Book at a glance

The side panel is a digest, not nine equal accordions competing for attention.
Prioritize:

1. Book brief.
2. Intended direction and live open possibilities.
3. Main characters and relationships.
4. Outline and plot/subplot.
5. Private intentions and open questions.

Show only a few items in each group and provide **Open full book**. Items retain the
correct provenance and commitment labels. The current “Original conversation” anchor
is valuable and should remain available.

Show **Undo last book change** near the most recent change or in a small change
history area. Do not present undo as a destructive warning dialog; the backend keeps
version history and enforces correct order.

### Scene draft presentation

Scene drafts deserve more reading space than planning proposals. Use literary
typography and a clear banner: **Scene proposal — outside the manuscript**.

Show the scene direction and review notes in an expandable section. The prose itself
must be readable without editing controls in this iteration. Actions:

- **Add to manuscript** for a proposed current draft;
- **Finish adding scene** for interrupted adoption;
- **Open scene in manuscript** after adoption.

When stale, disable adoption and show: “The book direction changed after this draft
was written. Ask Storymatic to revise it using the current book.”

### Mobile Develop layout

Use one column. Conversation comes first. **Book at a glance** becomes a drawer,
sheet, or separate Book mode rather than appearing below an arbitrarily long thread.
Keep the composer reachable, support the on-screen keyboard, and do not use a fixed
height that traps scrolling inside several nested containers.

## Surface 2: Book

Book answers one question: **What is this book becoming?** It is the organized,
editable understanding produced through conversation. It is not a statistics
dashboard and not a collection of AI analyses.

Use the adopted `EngineState.items` as the current source for this view. Organize the
nine backend kinds into a smaller human hierarchy:

### Foundation

- Book brief
- Voice and direction
- Open questions

### Story

- Outline
- Plot and subplots
- World

### People

- Characters
- Relationships

### Private

- Private intentions

The first screen should show the brief, the most consequential intended choices,
the strongest open possibilities, and useful next steps. Allow the author to drill
into each group. Avoid a permanent nine-tab row.

Each item needs title, body, status, provenance, source conversation, and version if
version detail is exposed. The current backend updates book items through proposals;
do not add direct inline editing that bypasses versioned engine changes. A visible
**Discuss or change this** action may return to Develop with a composed reference or
anchor. If pre-filling the composer is not implemented safely, link to the source
conversation and let the author continue there.

Show empty states as invitations expressed through conversation:

> No relationships have been kept in the book yet. Tell Storymatic how these people
> affect one another.

Do not respond to empty data with nine “Add” forms.

Add a small **Recent changes** section with the latest applied groups and available
undo. The current engine only supports undoing the latest live group; the UI must not
offer arbitrary historical rollback.

### Relationship to the older Story Space

The manuscript route currently exposes fourteen Story Space tabs: overview,
synopsis, scenes, people, plot, promises, timeline, relationships, world, research,
themes, questions, discoveries, and possibilities. They come from older data paths
and are not synchronized with the new engine.

Do not delete their code or data during this amendment. Remove them from the primary
project hierarchy. Place the existing Story Space behind a clearly secondary entry
such as **Manuscript insights (legacy)** or **Evidence and analysis**, with copy that
does not claim synchronization with the developing-book memory. This can remain in
the manuscript workspace until the evidence engine unifies it.

Do not show the same concept twice at equal prominence—for example, a new Book
“People” area beside the old Story Space “People” tab—without explaining that one is
intent and one is manuscript-derived analysis.

## Surface 3: Manuscript

The manuscript remains the calm writing room. Preserve its strong characteristics:

- chapter and scene outline;
- centered serif prose;
- editable scene title;
- save state and word count;
- focus mode;
- formatting controls;
- local draft recovery;
- revisions;
- selection-based writing proposals;
- direct author editing at all times.

Amend its hierarchy rather than redesigning the editor itself.

### Manuscript header

Replace the unrelated `Outline`, `Story`, and `Assist` hierarchy with the shared
project mode navigation plus local manuscript tools. Within Manuscript, local tools
can include:

- Outline;
- Scene details;
- Revisions;
- Ask about this scene/passage;
- Continue or revise selected prose;
- Evidence and analysis (the older Story Space, secondary for now).

Do not merge the old transient `AskView` into the durable Develop conversation. They
currently use different data paths and have different purposes:

- **Develop** changes the organized book through persistent proposals.
- **Ask about this passage/scene** is a scoped manuscript-reading tool and does not
  change book memory or manuscript prose.
- **Proposed passage** is an editable local prose replacement that enters the scene
  only after acceptance.

Make those differences legible in labels and help text.

### Sidebar

Keep the chapter/scene tree, project switcher, rename, move, add, and trash actions.
Remove the large standalone **Develop this book** card once Develop is present in the
shared top navigation. On narrow screens, the outline can be a drawer.

### AI writing actions

Use language that describes the effect:

- **Discuss the book** → Develop mode.
- **Ask about this scene** → scoped reading panel.
- **Revise selection** → proposed passage.
- **Continue scene** → proposed continuation.

Acceptance of prose must remain explicit. Preserve stale-passage protection and the
revision history message. Do not automatically apply generated prose while it is
streaming or immediately after generation.

## Studio and project entry

The project list should reflect the new workflow.

### Existing project card

Clicking the main project title should open **Develop**, because it is the project’s
return point and can eventually provide the return brief. Add a secondary
**Manuscript** action for authors who want to go directly to the last scene. For an
imported manuscript with no conversation, Develop should explain that Storymatic can
help understand and continue the imported work; the manuscript remains immediately
available.

Project metadata should avoid “No genre set” as the most prominent fallback. Better
secondary information is last edited date and, when available, a compact status such
as “No conversation yet,” “3 book decisions,” or “12 scenes.” Do not manufacture
counts unless provided by existing queries.

### New project

Rename **Start an empty project** to **Start a book**. A working title is enough. The
successful action already opens Develop and should continue to do so.

Suggested copy:

> Start with whatever you have: a premise, an ending, a character, or one scene. You
> can change the title and direction later.

Primary action: **Start developing**.

### Import

Keep manuscript import. After a successful import, open Manuscript as it does today,
but make Develop immediately visible in the shared shell. Do not imply that importing
has already analyzed the book.

### Sample

The current sample demonstrates the older manuscript model. Keep it clearly labelled.
Do not use it to claim that the new conversation engine has completed an author’s
creative brief unless corresponding engine state actually exists.

## Landing page message

The current landing page leads with “Write the novel. Let the understanding of it
keep up with you,” which captures the older manuscript-first product. Rewrite it to
lead with creative partnership while retaining the quiet, literary tone.

Recommended direction:

**Eyebrow:** Your book, developed in conversation  
**Headline:** Tell Storymatic the story in your head. Shape it into a book together.  
**Body:** Bring fragments, scenes, endings, inspirations and contradictions.
Storymatic helps turn them into a coherent book, writes with you when asked, and
remembers what you decide as the manuscript grows.  
**Primary action:** Start a book  
**Secondary action:** Open the sample manuscript

The three supporting ideas should be:

1. **Begin with conversation** — no forms or complete outline required.
2. **See the book take shape** — brief, people, plots, questions, and private
   intentions remain organized and traceable.
3. **Write together** — move from direction to scene draft to editable manuscript,
   preserving decisions and revision history.

Do not market unimplemented guarantees such as perfect continuity, complete novel
memory, automatic character knowledge, or guaranteed spoiler prevention. It is fair
to say the product is designed to distinguish planning from what has been revealed.

## Interaction and copy principles

- Prefer plain editorial language over software and AI terminology.
- Say what an action changes: **Keep in book**, **Set aside**, **Add to manuscript**.
- Avoid `Save`, `Apply`, or `Accept` when the object is ambiguous.
- Never use “approved by AI,” “AI truth,” “canonized,” or “AI-generated content.”
- Keep author and Storymatic origins visible without making every card look like an
  audit log.
- Preserve ambiguity. Open possibilities should look alive, not incomplete or
  erroneous.
- Do not turn every inferred detail into a notification or approval task.
- Use progressive disclosure for rationale, provenance, review notes, and history.
- Show destructive project deletion separately and clearly; adoption and undo are
  normal creative operations.
- Use quiet success feedback. Avoid celebratory confetti, streaks, scores, gamified
  progress, and “book completion” percentages.
- Do not add word-generation quotas or token language to the creative flow.

## Visual direction

Keep the existing warm ivory, moss green, typography, and manuscript measure. Improve
hierarchy mainly through space, type, subtle surfaces, and border weight.

Recommended visual roles:

- Newsreader: project titles, scene titles, generated prose, and major literary
  headings.
- Instrument Sans: navigation, statuses, provenance, actions, and explanations.
- Green primary: forward author actions, active mode, and focus.
- Warm planned tone: open possibilities and unwritten intentions.
- Neutral secondary: author messages, supporting metadata, and inactive surfaces.
- Destructive red: actual deletion or failure requiring attention, not ordinary
  rejection of a creative suggestion.

Avoid a dense admin dashboard. Avoid icon-only controls for consequential creative
actions. Use icons as support, with text labels where meaning matters.

On desktop, the application can be spatial and editorial. On mobile, prioritize one
task at a time. Minimum target sizes, keyboard navigation, screen-reader status
announcements, and color-independent state labels remain required.

## Implementation constraints

This amendment may extract shared layout components and reorganize existing UI code.
It must not replace the backend model or silently create a second client-side version
of book state.

Use these existing functions:

| Need | Existing function |
| --- | --- |
| Load developing book | `getBookEngine` |
| Send durable author message | `sendBookMessage` |
| Keep or set aside proposals | `reviewBookChanges` |
| Undo latest book change | `undoBookChange` |
| Add proposed scene to manuscript | `adoptBookDraft` |
| Project list/create/delete/import | `src/lib/manuscript.functions.ts` |
| Manuscript workspace and scene operations | Existing manuscript server functions |

Do not mutate `EngineState` locally as an authority. After server mutations, update
or invalidate the React Query cache. Preserve revision values supplied to mutations.
Do not remove polling/recovery behavior without replacing it with equivalent durable
status handling.

Do not add direct CRUD for engine items. The current safe update path is conversation
→ proposal → explicit review. Do not invent placement support for adopted scene
drafts. Do not merge older Story Space records into `EngineState` on the client.

Avoid a broad rewrite of `src/routes/_authenticated/p.$projectId.tsx` during the
first UI pass. It coordinates substantial mature behavior. Extract the shared shell
and change visible hierarchy in small, reviewable steps.

Generated route files may change through the normal TanStack process. Preserve
working deep links and query parameters. Keep source files formatted and ensure the
production build and TypeScript checks pass.

## Recommended implementation sequence

### Pass 1: establish one project

- Create the reusable project shell and primary Develop / Book / Manuscript modes.
- Apply it to the conversation and manuscript routes.
- Remove the standalone “Develop this book” sidebar card.
- Keep manuscript local tools accessible without competing with project modes.
- Verify desktop and narrow-screen navigation.

### Pass 2: refine Develop

- Improve the empty state and composer.
- Refine response, proposal, failure, retry, stale-draft, and adopting states.
- Turn the right panel into Book at a glance with a full Book entry.
- Preserve all current engine actions and provenance.

### Pass 3: create Book

- Add the organized Foundation / Story / People / Private view from adopted engine
  items.
- Add source conversation links, open/tentative labels, recent changes, and latest
  undo.
- Add empty states that route the author back to conversation.
- Keep old Story Space secondary and explicitly separate.

### Pass 4: align entry pages and copy

- Update `/studio` cards, new project language, default existing-project navigation,
  and secondary Manuscript action.
- Update landing-page promise and supporting content.
- Check imported and sample projects without fabricated engine state.

### Pass 5: polish and verify

- Test long conversations, many proposals, long scene prose, empty projects, failures,
  retries, interrupted adoption, stale scene drafts, and latest undo.
- Test keyboard use, focus order, status announcements, reduced motion, narrow screens,
  and browser refresh.
- Run typecheck, scoped lint, automated tests, and production build.
- Do not change engine behavior merely to make a mockup easier.

## Acceptance criteria for this UI amendment

The amendment is successful when:

1. A new user understands within one screen that they may begin by explaining a
   rough story rather than writing a manuscript or filling forms.
2. Every project has clearly connected Develop, Book, and Manuscript modes.
3. An author can distinguish a proposal, an adopted open possibility, an intended
   plan, a private intention, and an adopted manuscript scene.
4. A long AI response remains readable and proposed changes are reviewable without
   turning the interface into an approval inbox.
5. An AI scene is unmistakably outside the manuscript until the author adds it.
6. Failure, retry, stale state, interrupted adoption, and undo behavior remain clear
   and functional.
7. The manuscript editor retains its calm writing experience, autosave, revisions,
   recovery, outline, and selection-based assistance.
8. The older Story Space remains accessible but no longer defines the primary
   product or masquerades as synchronized with the new book memory.
9. Existing and imported projects remain usable, and no data migration is required
   for the visual amendment.
10. The interface remains accessible and useful on laptop and narrow screens.
11. TypeScript, engine tests, and the production build pass.
12. The UI does not claim that the future evidence/knowledge engine is already
    complete.

## One representative journey

Use this journey to evaluate the result:

1. The author creates a project called “The Brother at the Lighthouse.”
2. Develop opens with an invitation to describe whatever they know.
3. The author sends an untidy paragraph containing a premise, two characters, a
   possible betrayal, and two competing endings.
4. Storymatic replies with useful creative thinking and six proposed book changes.
5. The author keeps the premise, characters, and betrayal as a private intended
   direction, while keeping both endings as open possibilities.
6. Book shows those distinctions without implying that any event has been written.
7. The author asks for an early reunion scene in which the betrayed character still
   trusts her brother.
8. The scene proposal is readable, shows its direction and meaningful inventions,
   and does not appear in the manuscript yet.
9. The author adds it to the manuscript and opens the resulting scene.
10. The author edits the prose directly; autosave and revisions behave as before.
11. Develop, Book, and Manuscript remain one obvious project throughout the journey.

If the UI makes this journey natural, the new operating idea is visible. If it still
feels like a manuscript editor with a separate chatbot and a collection of AI tabs,
the amendment has not gone far enough.

## Reference documents

- `docs/STORYMATIC_ACTION_PLAN.md`: accepted product direction and roadmap.
- `docs/STORYMATIC_ENGINE.md`: implemented engine behavior, tests, and limitations.
- `src/lib/engine/model.ts`: authoritative current engine state.
- `src/routes/_authenticated/book.$projectId.tsx`: functional Develop prototype.
- `src/routes/_authenticated/p.$projectId.tsx`: manuscript workspace.
- `src/components/studio/story-space.tsx`: older multi-tab Story Space.
- `src/styles.css`: current visual design system.

