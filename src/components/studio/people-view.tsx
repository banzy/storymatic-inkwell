import { useState } from "react";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OutlineScene } from "@/lib/outline.functions";
import type { StoryClaim, StoryEntity } from "@/lib/story.functions";

const KNOWLEDGE_HEADING: Record<string, string> = {
  knows: "Knows",
  believes: "Believes",
  suspects: "Suspects",
  misunderstands: "Has it wrong",
  does_not_know: "Doesn't know",
};

const KNOWLEDGE_ORDER = ["knows", "believes", "suspects", "misunderstands", "does_not_know"];

const TRUTH_LABEL: Record<string, string> = {
  canonical: "Established in the draft",
  inferred: "Storymatic's reading",
  possible: "Possible",
  planned: "Planned — not in the draft",
  rejected: "You set this aside",
  contradicted: "Contradicted elsewhere",
};

function Badge({ children, tone }: { children: string; tone?: "quiet" | "planned" | "canonical" }) {
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-xs ${
        tone === "planned"
          ? "bg-planned text-planned-foreground"
          : tone === "canonical"
            ? "bg-primary/10 text-foreground"
            : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function Evidence(props: {
  claim: StoryClaim;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const evidence = Array.isArray(props.claim.evidence) ? props.claim.evidence : [];
  if (evidence.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {evidence.slice(0, 2).map((item, index) => (
        <li key={index}>
          <button
            type="button"
            className="flex w-full items-start gap-1.5 rounded-sm bg-secondary/60 px-2 py-1 text-left text-xs hover:bg-secondary"
            onClick={() => props.onOpenEvidence(item.scene_id, item.quote)}
          >
            <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span className="font-serif italic">{item.quote}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ClaimRow(props: {
  claim: StoryClaim;
  sceneTitle: string | null;
  onOpenEvidence: (sceneId: string, quote: string) => void;
  onClaimAction: (id: string, action: "confirm" | "reject" | "reopen") => void;
}) {
  const { claim, sceneTitle, onOpenEvidence, onClaimAction } = props;
  return (
    <li
      className={`rounded-md border border-border bg-card p-3 ${
        claim.truth_type === "rejected" ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          tone={
            claim.truth_type === "planned"
              ? "planned"
              : claim.truth_type === "canonical"
                ? "canonical"
                : "quiet"
          }
        >
          {TRUTH_LABEL[claim.truth_type] ?? claim.truth_type}
        </Badge>
        {claim.validity === "needs_review" && <Badge>Worth another look</Badge>}
        {sceneTitle && <span className="text-xs text-muted-foreground">{sceneTitle}</span>}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed">{claim.assertion}</p>
      {claim.validity === "needs_review" && (
        <p className="mt-1 text-xs text-muted-foreground">
          The wording this rested on has changed since it was read.
        </p>
      )}
      <Evidence claim={claim} onOpenEvidence={onOpenEvidence} />
      <div className="mt-2 flex flex-wrap gap-2">
        {!claim.author_confirmed ? (
          <>
            <Button variant="outline" size="sm" onClick={() => onClaimAction(claim.id, "confirm")}>
              That's right
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onClaimAction(claim.id, "reject")}>
              Not so
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onClaimAction(claim.id, "reopen")}>
            Undo
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * A character as a living thing: who they are, where they stand at a chosen point
 * in the story, what they know there, and the moments that changed them.
 */
export function PeopleView(props: {
  entities: StoryEntity[];
  claims: StoryClaim[];
  scenes: OutlineScene[];
  loading: boolean;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
  onClaimAction: (id: string, action: "confirm" | "reject" | "reopen") => void;
  onSaveEntity: (
    id: string,
    fields: { identity: string | null; currentState: string | null; notes: string | null },
  ) => void;
}) {
  const { entities, claims, scenes, loading, onOpenScene, onOpenEvidence, onClaimAction, onSaveEntity } =
    props;

  const characters = entities.filter((entity) => entity.kind === "character");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [upTo, setUpTo] = useState<string>("all");
  const [draft, setDraft] = useState<{ identity: string; currentState: string; notes: string } | null>(
    null,
  );

  const selected = characters.find((row) => row.id === selectedId) ?? characters[0] ?? null;
  const sceneTitle = (id: string | null) =>
    id ? (scenes.find((scene) => scene.id === id)?.title ?? null) : null;

  if (loading) return <p className="text-sm text-muted-foreground">Gathering your people…</p>;

  if (characters.length === 0) {
    return (
      <p className="max-w-prose text-sm text-muted-foreground">
        No one here yet. Choose “Read the scenes” above, and the people in your draft appear with what
        each of them knows at a chosen point in the story — not one timeless profile.
      </p>
    );
  }

  const upToScene = upTo === "all" ? null : (scenes.find((scene) => scene.id === upTo) ?? null);
  const limit = upToScene?.position ?? null;

  const mine = claims.filter((claim) => {
    if (!selected) return false;
    const name = selected.name.toLowerCase();
    const linked = claim.entity_id === selected.id;
    const about = claim.subject.toLowerCase().includes(name);
    const holder = (claim.knowledge_holder ?? "").toLowerCase().includes(name);
    if (!linked && !about && !holder) return false;
    if (limit === null || claim.story_position === null) return true;
    return claim.story_position <= limit;
  });

  const knowledge = mine.filter((claim) => claim.knowledge_holder);
  const about = mine.filter((claim) => !claim.knowledge_holder);
  const arc = mine
    .filter((claim) => claim.scene_id)
    .slice()
    .sort((a, b) => (a.story_position ?? 9999) - (b.story_position ?? 9999));

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label="People" className="flex flex-wrap gap-1 lg:flex-col lg:items-stretch">
        {characters.map((character) => (
          <Button
            key={character.id}
            size="sm"
            variant={selected?.id === character.id ? "secondary" : "ghost"}
            className="lg:justify-start"
            aria-current={selected?.id === character.id ? "true" : undefined}
            onClick={() => {
              setSelectedId(character.id);
              setDraft(null);
            }}
          >
            {character.name}
          </Button>
        ))}
      </nav>

      {selected && (
        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <h2 className="font-serif text-2xl tracking-tight">{selected.name}</h2>
              {!selected.author_confirmed && (
                <p className="text-xs text-muted-foreground">
                  Drawn from your draft, and yours to change.
                </p>
              )}
            </div>
            <div className="ml-auto">
              <Label htmlFor="people-position" className="text-xs text-muted-foreground">
                As of
              </Label>
              <select
                id="people-position"
                className="mt-1 block rounded-md border border-border bg-card px-2 py-1.5 text-sm"
                value={upTo}
                onChange={(event) => setUpTo(event.target.value)}
              >
                <option value="all">the whole draft</option>
                {scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    the end of {scene.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="people-identity">Who they are</Label>
              <Textarea
                id="people-identity"
                rows={4}
                placeholder="The things that don't change."
                value={draft?.identity ?? selected.identity ?? ""}
                onChange={(event) =>
                  setDraft({
                    identity: event.target.value,
                    currentState: draft?.currentState ?? selected.current_state ?? "",
                    notes: draft?.notes ?? selected.notes ?? "",
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="people-state">
                Where they stand {upToScene ? `by ${upToScene.title}` : "now"}
              </Label>
              <Textarea
                id="people-state"
                rows={4}
                placeholder="Where the draft has left them."
                value={draft?.currentState ?? selected.current_state ?? ""}
                onChange={(event) =>
                  setDraft({
                    identity: draft?.identity ?? selected.identity ?? "",
                    currentState: event.target.value,
                    notes: draft?.notes ?? selected.notes ?? "",
                  })
                }
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="people-notes">Your notes</Label>
              <Textarea
                id="people-notes"
                rows={2}
                value={draft?.notes ?? selected.notes ?? ""}
                onChange={(event) =>
                  setDraft({
                    identity: draft?.identity ?? selected.identity ?? "",
                    currentState: draft?.currentState ?? selected.current_state ?? "",
                    notes: event.target.value,
                  })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                size="sm"
                disabled={!draft}
                onClick={() =>
                  draft &&
                  onSaveEntity(selected.id, {
                    identity: draft.identity.trim() || null,
                    currentState: draft.currentState.trim() || null,
                    notes: draft.notes.trim() || null,
                  })
                }
              >
                Keep this
              </Button>
              {draft && (
                <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              )}
            </div>
          </section>

          <section className="border-t border-border pt-5">
            <h3 className="font-serif text-lg">
              What {selected.name} knows {upToScene ? `by ${upToScene.title}` : "across the draft"}
            </h3>
            {knowledge.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing recorded at this point in the story.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {KNOWLEDGE_ORDER.map((state) => {
                  const rows = knowledge.filter((claim) => claim.knowledge_state === state);
                  if (rows.length === 0) return null;
                  return (
                    <div key={state}>
                      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {KNOWLEDGE_HEADING[state]}
                      </h4>
                      <ul className="mt-2 space-y-2">
                        {rows.map((claim) => (
                          <ClaimRow
                            key={claim.id}
                            claim={claim}
                            sceneTitle={sceneTitle(claim.scene_id)}
                            onOpenEvidence={onOpenEvidence}
                            onClaimAction={onClaimAction}
                          />
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {knowledge.some((claim) => !KNOWLEDGE_ORDER.includes(claim.knowledge_state ?? "")) && (
                  <ul className="space-y-2">
                    {knowledge
                      .filter((claim) => !KNOWLEDGE_ORDER.includes(claim.knowledge_state ?? ""))
                      .map((claim) => (
                        <ClaimRow
                          key={claim.id}
                          claim={claim}
                          sceneTitle={sceneTitle(claim.scene_id)}
                          onOpenEvidence={onOpenEvidence}
                          onClaimAction={onClaimAction}
                        />
                      ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section className="border-t border-border pt-5">
            <h3 className="font-serif text-lg">Their arc</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              The moments in the draft that moved them, in story order.
            </p>
            {arc.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing gathered yet.</p>
            ) : (
              <ol className="mt-3 space-y-2 border-l border-border pl-4">
                {arc.map((claim) => (
                  <li key={`arc-${claim.id}`}>
                    <button
                      type="button"
                      className="text-left text-xs text-muted-foreground hover:underline"
                      onClick={() => claim.scene_id && onOpenScene(claim.scene_id)}
                    >
                      {sceneTitle(claim.scene_id) ?? "A scene"}
                    </button>
                    <p className="text-sm leading-relaxed">
                      {claim.knowledge_holder
                        ? `${claim.knowledge_holder} — ${claim.assertion}`
                        : claim.assertion}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="border-t border-border pt-5">
            <h3 className="font-serif text-lg">What the draft says about {selected.name}</h3>
            {about.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {about.map((claim) => (
                  <ClaimRow
                    key={claim.id}
                    claim={claim}
                    sceneTitle={sceneTitle(claim.scene_id)}
                    onOpenEvidence={onOpenEvidence}
                    onClaimAction={onClaimAction}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
