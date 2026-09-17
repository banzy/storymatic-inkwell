# Storymatic V3 — Roadmap

Original brief: writing room + evidence-based Story Brain, director-led AI.
Amendment (accepted): traditional authoring views (outline, synopsis, corkboard,
characters, relationships, plot, timeline, world, research, themes) are **views of
the same evolving story system**, maintained by the Story Brain from the manuscript,
manually editable, never requiring duplicate data entry.

## Done
- [x] Increment 1 — writing room: design system, app shell, sample manuscript
      (The City of Ashes), Tiptap editor, chapters/scenes, focus mode, autosave +
      save states, revision history, import/export. Verified in browser.
- [x] Temporary guest access (login skipped on request) — restore real sign-in later.
- [x] Increment 2 — directed assistance: selection menu (rewrite/tension/tighten/
      expand/dialogue/clarify/rhythm/preserve voice/custom), proposal review with
      accept-only-this-passage + stale protection + revision history, Continue this
      scene, Ask Storymatic with scope, evidence/interpretation labelling and source
      links. Server-side AI, honest unavailable states. Verified in browser.


## Navigation target (amendment §20)
Write · Outline · Story (Synopsis, Scenes, Plot, Timeline, Themes) · Characters
(incl. Relationships) · World · Research. Story Brain stays invisible.

## Open

- [x] Increment 3a — story model foundation: story_entities + story_claims tables,
      per-scene reading (server-side AI) with verbatim-quote verification (unbacked
      readings dropped), truth types + basis labelling, Story view (places, objects,
      threads, what the draft establishes) and Characters view (identity, current
      state, notes, what a character knows up to the open scene), confirm/set-aside
      per claim. Verified in browser on the sample.
- [ ] Increment 3b — Director/author intent surfacing, quiet observations →
      Discoveries, contradiction + needs-review handling across scenes.
- [x] Dynamic Outline: two-lane view (Planned / As written), planned steps with intent,
      reorder and set aside, author or inferred links to scenes, quiet divergence notes
      (not in the draft yet, not in the plan, happens earlier than planned), "Compare
      with the draft" review whose readings stay unconfirmed until the author agrees.
      Verified in browser on the sample.
- [x] Dynamic Synopsis (story + chapter, editable and lockable): written from the draft,
      locked wording never overwritten, empty until the draft gives it something.
      Verified in browser on the sample. Still open: act/scene/character/thread scopes.
- [x] Story space (Scenes · Plot · Timeline): scene cards from the manuscript, author-
      editable, "Fill in the blanks" fills only empty fields; keyboard-reachable reorder
      with consequence notes after a move (never a rewrite); plot threads with backing
      passages; story-time timeline leaving untimed scenes unplaced. Verified in browser.
      Still open there: pointer drag-and-drop for cards.
- [x] Living characters — People view in the Story space: who they are, where they
      stand at a chosen point ("as of" any scene), what they know there grouped by
      knows/believes/suspects/has it wrong/doesn't know, their arc in story order,
      "Read the scenes" to gather from the whole draft. Verified in browser.
- [x] Needs-another-look: on save, claims whose backing wording has changed are
      marked for review instead of being kept or deleted silently.
- [x] Quiet observer: once writing settles (2 min idle, at most every 10 min),
      Storymatic looks across the scenes on its own; findings wait in Discoveries.
- [x] Relationships: directional, human-readable (no scores), "where it stands" plus the
      moments that moved it with backing quotes; readings stay unconfirmed until the
      author agrees; author wording is never overwritten. Verified in browser.
- [x] Discoveries: quiet cross-scene notes with passages, why it might matter and
      uncertainty; intentional / set aside / bring back. Verified in browser.
      Background observer runs now happen quietly after writing settles.
- [x] Promises & payoffs: what the draft sets up, where it pays off, what's still owed;
      author-noted or read from the draft, each with the manuscript passage behind it;
      readings stay unconfirmed until the author agrees. Verified in browser.
- [ ] Plot threads, deeper: subplots, mysteries, reveals as first-class, planned vs written.
- [x] Timeline, deeper: story chronology in its own order (story_events), timings kept in the
      draft's own words, certainty preserved, author reorder / confirm / decline, own entries.
      Verified in browser.

- [x] World / story bible: places, recurring objects, groups and the rules the draft
      establishes, each with the passage behind it; author wording never overwritten.
      Verified in browser on the sample.
- [ ] Themes & motifs as observations only.
- [x] Research & Notes: your own notes and sources, kept clearly outside story canon and
      never read back as something the book establishes. Verified in browser.
- [x] Story dashboard: calm editorial Overview tab — where the draft stands, what was touched
      last, what's still owed, a few things worth a look, loose ends. Verified in browser.

- [x] Increment 4 — Possibilities: bounded per-scene explorations (story_possibilities) with
      premise, concrete changes, consequences (clear/possible), author-noted or explored, and
      exploring / taking up / set aside. Nothing is written to the draft. Verified in browser.

- [ ] Writer types: no setup wizard; new project can start with nothing.

## Blocked / waiting
- Real sign-in restoration awaits user's go-ahead.
