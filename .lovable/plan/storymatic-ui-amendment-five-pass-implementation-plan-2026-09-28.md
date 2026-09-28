# Storymatic UI amendment — five-pass implementation plan

## Goal
Reframe Storymatic around three connected modes of one project:

```text
Develop  →  Book  →  Manuscript
think       organize   write
```

The work is a UI and information-architecture amendment. It will preserve the current engine model, MongoDB persistence, server functions, manuscript editor, autosave, local recovery, revisions, proposal review/adoption, stale-state checks, retry, and latest-change undo.

## Pass 1 — Establish one project shell
- Create a reusable compact project header shared by Develop and Manuscript.
- Add stable **Develop · Book · Manuscript** navigation, the Storymatic/home link, project title and switcher, and a quiet project menu for export and secondary actions.
- Keep the current scene deep link when moving to Manuscript; give Book its own deep-linkable mode under the existing book route.
- Replace the manuscript header’s competing Outline / Story / Assist hierarchy with the shared modes plus local writing tools.
- Keep Outline, scene details, revisions, scoped manuscript questions, selection revision, continuation, and the older analysis tools available as Manuscript-only actions.
- Remove the standalone “Develop this book” sidebar card while preserving the chapter/scene tree and its create, rename, reorder, trash, restore, and project-switching behavior.
- Make the same mental model work on laptop and narrow screens without horizontal overflow.

## Pass 2 — Refine Develop
- Keep the existing durable conversation and all current server mutations; reorganize only their presentation.
- Present author messages on a soft secondary surface and Storymatic replies as readable editorial prose rather than matching chat bubbles.
- Add the empty conversation invitation and three quiet starting examples from the brief, with no questionnaire or required metadata.
- Make the multiline composer easy to return to, support Cmd/Ctrl+Enter, and clearly show saved, working, failed, retry, and blocked-adoption states.
- Keep proposal groups attached to the response that produced them. Show kind, commitment, origin, rationale, source quote, and reviewed status with the exact actions **Keep in book** and **Set aside**.
- Refine scene proposals into a literary reading surface with the banner **Scene proposal — outside the manuscript**, expandable direction/review notes, stale-draft explanation, and the existing **Add to manuscript**, **Finish adding scene**, and open-scene flows.
- Replace the current exhaustive right rail with **Book at a glance**: brief first, then intended direction/open possibilities, people/relationships, story shape, private intentions/questions, source-conversation links, latest undo, and **Open full book**.
- On narrow screens, move the glance view into an accessible sheet or Book mode rather than placing it beneath a long conversation.

## Pass 3 — Create Book
- Add an organized Book mode sourced only from adopted `EngineState.items`.
- Structure it as **Foundation** (brief, voice/direction, open questions), **Story** (outline, plot/subplots, world), **People** (characters, relationships), and **Private** (private intentions).
- Make the opening Book screen answer “What is this book becoming?” with the brief, consequential intended choices, strongest open possibilities, and useful next steps—not statistics or nine equal tabs.
- Show title, body, commitment, provenance, and source conversation for every item; expose versions only where useful.
- Provide **Discuss or change this** by returning to the originating Develop conversation; do not add direct item editing that bypasses versioned proposals.
- Add a small Recent changes area and offer undo only for the latest live change, matching the existing engine rule.
- Use conversational empty states that lead back to Develop instead of forms.
- Move the existing fourteen-tab Story Space behind a clearly secondary Manuscript entry such as **Evidence and analysis (legacy)**, with explicit copy that it is manuscript-derived and not synchronized with developing-book memory.
- Do not merge the older analysis records into engine state or portray future evidence, reader-knowledge, or character-knowledge capabilities as complete.

## Pass 4 — Align entry pages and copy
- Update project cards so the title opens Develop and a secondary **Manuscript** action opens the writing room.
- Replace “No genre set” prominence with available, truthful project metadata only; do not invent decision or scene counts.
- Rename **Start an empty project** to **Start a book**, use the brief’s permissive starting copy, and label the action **Start developing**.
- Preserve import behavior: imported work opens Manuscript, where Develop is immediately visible in the shared shell; do not imply analysis has occurred.
- Keep the sample explicitly described as a sample manuscript, without fabricated conversation or book-memory claims.
- Rewrite the landing page around creative partnership: explain a rough story, see the book take shape, and write together. Avoid claims of perfect continuity, complete memory, completed knowledge tracking, or guaranteed spoiler prevention.
- Give every content route complete, distinct title, description, Open Graph text, `og:type`, and Twitter card metadata.

## Pass 5 — Polish and verify
- Verify the representative journey from a rough idea through proposal review, Book distinctions, scene proposal, manuscript adoption, direct editing, autosave, and revisions.
- Exercise empty and imported projects, long conversations, many proposals, long scene prose, failures, retry from the same saved message, interrupted adoption, stale drafts, latest undo, refresh, and deep links.
- Check keyboard order, focus visibility, screen-reader status announcements, Escape behavior, reduced motion, and narrow-screen layouts.
- Validate that state distinctions never rely on color alone and that consequential creative actions retain visible text labels.
- Run targeted engine tests, TypeScript checks, scoped lint, and the production build. Resolve the current missing auth-client package/typecheck blocker without changing authentication behavior.
- Use browser checks at desktop and narrow widths to confirm the three modes remain visibly one project and the manuscript editor remains unchanged in behavior.

## Technical boundaries
- Reuse `getBookEngine`, `sendBookMessage`, `reviewBookChanges`, `undoBookChange`, and `adoptBookDraft`; refresh React Query state after mutations.
- Keep `/book/$projectId` as the Develop/Book surface and `/p/$projectId` as Manuscript; preserve TanStack route IDs and `scene` search state.
- Extract focused shell and Book/Develop presentation components instead of broadly rewriting the large manuscript route.
- Make no schema migration and no parallel client-owned book state for this amendment.
- Keep the legacy Story Space code and data intact, but secondary and accurately labelled.
- Record the shared-shell architecture decision in project guidance when implementation begins.

## Completion criteria
The result is complete when an author can immediately begin with an untidy story explanation, distinguish proposed versus kept versus intended material, understand that a generated scene is outside the manuscript until added, move clearly among Develop, Book, and Manuscript, and retain every existing writing, recovery, revision, retry, adoption, undo, import, export, and deep-link behavior without overstating unfinished intelligence features.
