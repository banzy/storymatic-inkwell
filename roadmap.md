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
- [ ] Dynamic Synopsis at story/act/chapter/scene/character/thread levels, editable+lockable.
- [ ] Scenes/Corkboard: inferred cards, drag reorder, consequence analysis on move.
- [ ] Living characters: identity vs current state vs timeline arc; character knowledge
      states (knows/believes/suspects/misunderstands/doesn't know).
- [ ] Relationships: evolving trajectories, human-readable (no scores in UI).
- [ ] Plot threads: setups/payoffs/promises/unresolved, written vs planned vs inferred.
- [ ] Timeline: story chronology separate from reading order, uncertainty preserved.
- [ ] World / story bible: locations, factions, rules, recurring objects.
- [ ] Themes & motifs as observations only.
- [ ] Research & Notes, clearly outside story canon.
- [ ] Story dashboard: calm editorial overview.
- [ ] Increment 4 — Possibilities (bounded exploration, selective adoption).
- [ ] Writer types: no setup wizard; new project can start with nothing.

## Blocked / waiting
- Real sign-in restoration awaits user's go-ahead.
