# What I'd build next (hybrid: plan and discovery, side by side)

Everything below keeps the same rule: the manuscript is the truth, plans are
intentions, and Storymatic's readings stay readings until you agree. Each item
works whether you planned it first or discovered it while writing.

## 1. Living characters (the biggest gap right now)

A character page in three honest parts instead of one timeless profile:

- Who they are — the things that don't move (name, role, what they want).
- Where they stand now — as of the scene you have open.
- Their arc — the moments in the draft that changed them, each with the line
  that shows it.

Plus what a character knows at this point: knows, believes, suspects,
misunderstands, doesn't know. This is the feature no other writing tool
attempts, and it's what makes reveals and secrets safe to write.

Hybrid fit: you can write a character sheet up front (planned) or let the draft
fill it in (discovered) — both land in the same page, labelled differently.

## 2. Promises and payoffs

Plot threads, but as the reader experiences them: something set up, something
promised, something still owed. Each shows where it was planted, where it paid
off, and whether it's still open. Nothing is called a mistake — an unpaid
promise is just listed.

Hybrid fit: planned payoffs sit next to ones the draft created by accident.

## 3. Your direction, visible where you write

A small always-available place for what you want from this book — tone, pacing,
what must stay ambiguous, what you never want suggested — and a quiet line in
the writing room showing which of it applies to the scene you're in. Every AI
suggestion then respects it, and where your draft goes against your own stated
direction, that's noted quietly, never corrected.

## 4. A quiet observer, instead of you asking

Today you press a button to have the scenes read. Instead, after you stop
typing and a scene has settled, Storymatic looks on its own and holds anything
it finds until you go looking. No pop-ups, no counters, no badge nagging you —
just a calm "a few things to look at" when you next open Discoveries.

## 5. Contradictions and things needing another look

When you revise a scene, anything that was based on the old wording is marked
as needing a look rather than silently kept or silently deleted. And when two
scenes disagree (someone knows something too early, a day doesn't add up), it's
shown as a question with both passages, for you to decide.

## 6. World bible and Research, grown from the draft

Places, factions, objects and rules, collected from what you've already
written, editable, with Research kept clearly outside story canon so notes
never leak into what the book claims is true.

## 7. A calm story page

Not analytics. One editorial page: where the draft stands, what changed since
you last wrote, what's still owed, and three things worth a look.

## 8. Possibilities (later)

"What if Marcus keeps the letter?" — a bounded exploration that shows what
would change and which scenes it would touch, adopted piece by piece through
the same review you already use. No branches, no forked manuscripts.

## Suggested order

1. Living characters + knowledge states
2. Contradictions / needs-another-look after revisions
3. Your direction, visible while writing
4. Promises and payoffs
5. Quiet observer runs
6. World + Research
7. Story page
8. Possibilities

## Technical notes

- Characters: extend `story_entities` with structured identity/current-state
  fields and read arc + knowledge from `story_claims` (`claim_kind` `knowledge`,
  `knowledge_state`, `story_position`) — no new source of truth. New
  `characters` server functions; the existing `CharactersView` becomes a
  full-page view in the Story space with a position selector.
- Promises/payoffs: new `story_threads`-style rows keyed to thread entities with
  `setup_scene_id` / `payoff_scene_id` and quoted evidence, planned vs written.
- Needs-review: on scene save, mark claims whose evidence quote no longer
  appears in the new revision as `validity = 'needs_review'`; surface them in
  Discoveries rather than deleting.
- Author direction: reuse `author_directions`; inject the active ones into the
  assist/ask context builders in `assist.functions.ts`.
- Observer: debounce off the existing autosave signal, run the same
  `findDiscoveries` path server-side, write results with `origin = 'analysis'`,
  `status = 'open'`; no UI interruption.
- Everything keeps RLS via `private.owns_project` and verbatim-quote
  verification; unbacked readings are still dropped.
