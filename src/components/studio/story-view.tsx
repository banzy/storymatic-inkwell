import { useState } from "react";
import { Loader2, Quote, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoryClaim, StoryEntity } from "@/lib/story.functions";

const TRUTH_LABEL: Record<string, string> = {
  canonical: "Established in the draft",
  inferred: "Storymatic's reading",
  possible: "Possible",
  planned: "Planned — not in the draft",
  rejected: "You set this aside",
  contradicted: "Contradicted elsewhere",
};

const BASIS_LABEL: Record<string, string> = {
  explicit: "Stated on the page",
  inferred: "Read between the lines",
  speculative: "A guess",
};

const KNOWLEDGE_LABEL: Record<string, string> = {
  knows: "knows",
  believes: "believes",
  suspects: "suspects",
  misunderstands: "misunderstands",
  does_not_know: "doesn't know",
};

const KIND_HEADING: Record<string, string> = {
  character: "People",
  location: "Places",
  object: "Objects",
  faction: "Groups",
  thread: "Threads",
};

function TruthBadge({ claim }: { claim: StoryClaim }) {
  const planned = claim.truth_type === "planned";
  const canonical = claim.truth_type === "canonical";
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-xs ${
        planned
          ? "bg-planned text-planned-foreground"
          : canonical
            ? "bg-primary/10 text-foreground"
            : "bg-secondary text-secondary-foreground"
      }`}
    >
      {TRUTH_LABEL[claim.truth_type] ?? claim.truth_type}
    </span>
  );
}

function ClaimCard(props: {
  claim: StoryClaim;
  sceneTitle: string | null;
  onOpenEvidence: (sceneId: string, quote: string) => void;
  onAction: (id: string, action: "confirm" | "reject" | "reopen") => void;
}) {
  const { claim, sceneTitle, onOpenEvidence, onAction } = props;
  const evidence = Array.isArray(claim.evidence)
    ? (claim.evidence as { scene_id: string; quote: string }[])
    : [];
  const settled = claim.author_confirmed;
  return (
    <article
      className={`rounded-md border border-border bg-card p-3 ${
        claim.truth_type === "rejected" ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <TruthBadge claim={claim} />
        <span className="text-xs text-muted-foreground">
          {BASIS_LABEL[claim.basis] ?? claim.basis}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed">
        {claim.knowledge_holder ? (
          <>
            <span className="font-medium">{claim.knowledge_holder}</span>{" "}
            {KNOWLEDGE_LABEL[claim.knowledge_state ?? ""] ?? claim.knowledge_state ?? "knows"}:{" "}
            {claim.assertion}
          </>
        ) : (
          <>
            <span className="font-medium">{claim.subject}</span> — {claim.assertion}
          </>
        )}
      </p>
      {sceneTitle && <p className="mt-1.5 text-xs text-muted-foreground">From {sceneTitle}</p>}
      {evidence.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {evidence.map((item, index) => (
            <li key={index}>
              <button
                type="button"
                className="flex w-full items-start gap-1.5 rounded-sm bg-secondary px-2 py-1.5 text-left text-xs hover:bg-accent"
                onClick={() => onOpenEvidence(item.scene_id, item.quote)}
              >
                <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                <span className="font-serif">“{item.quote}”</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {!settled && (
          <>
            <Button variant="outline" size="sm" onClick={() => onAction(claim.id, "confirm")}>
              That's right
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onAction(claim.id, "reject")}>
              Not so
            </Button>
          </>
        )}
        {settled && (
          <Button variant="ghost" size="sm" onClick={() => onAction(claim.id, "reopen")}>
            Undo
          </Button>
        )}
      </div>
    </article>
  );
}

export function StoryView(props: {
  entities: StoryEntity[];
  claims: StoryClaim[];
  sceneTitles: Record<string, string>;
  loading: boolean;
  analysing: boolean;
  canAnalyse: boolean;
  sceneTitle: string | null;
  message: string | null;
  onAnalyse: () => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
  onClaimAction: (id: string, action: "confirm" | "reject" | "reopen") => void;
}) {
  const {
    entities,
    claims,
    sceneTitles,
    loading,
    analysing,
    canAnalyse,
    sceneTitle,
    message,
    onAnalyse,
    onOpenEvidence,
    onClaimAction,
  } = props;

  const nonCharacters = entities.filter((entity) => entity.kind !== "character");
  const worldClaims = claims.filter((claim) => !claim.knowledge_holder);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        What your manuscript establishes so far. Nothing here becomes fact until you say so.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={!canAnalyse || analysing} onClick={onAnalyse}>
          {analysing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden="true" />
          )}
          {analysing ? "Reading this scene…" : "Read this scene"}
        </Button>
        {sceneTitle && <span className="text-xs text-muted-foreground">{sceneTitle}</span>}
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && entities.length === 0 && claims.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Storymatic hasn't read any of this manuscript yet. Open a scene and choose “Read this
          scene”, and what it finds will appear here with the passages that support it.
        </p>
      )}

      {nonCharacters.length > 0 && (
        <div className="space-y-3">
          {["location", "object", "faction", "thread"].map((kind) => {
            const rows = nonCharacters.filter((entity) => entity.kind === kind);
            if (rows.length === 0) return null;
            return (
              <section key={kind}>
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {KIND_HEADING[kind]}
                </h3>
                <ul className="mt-2 space-y-2">
                  {rows.map((entity) => (
                    <li key={entity.id} className="rounded-md border border-border bg-card p-3">
                      <p className="text-sm font-medium">{entity.name}</p>
                      {entity.identity && (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {entity.identity}
                        </p>
                      )}
                      {!entity.author_confirmed && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Storymatic's reading, not confirmed
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {worldClaims.length > 0 && (
        <section className="border-t border-border pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            What the draft establishes
          </h3>
          <div className="mt-2 space-y-2">
            {worldClaims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                sceneTitle={claim.scene_id ? (sceneTitles[claim.scene_id] ?? null) : null}
                onOpenEvidence={onOpenEvidence}
                onAction={onClaimAction}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function CharactersView(props: {
  entities: StoryEntity[];
  claims: StoryClaim[];
  sceneTitles: Record<string, string>;
  loading: boolean;
  storyPosition: number | null;
  sceneTitle: string | null;
  onOpenEvidence: (sceneId: string, quote: string) => void;
  onClaimAction: (id: string, action: "confirm" | "reject" | "reopen") => void;
  onSaveEntity: (
    id: string,
    fields: { identity: string | null; currentState: string | null; notes: string | null },
  ) => void;
}) {
  const {
    entities,
    claims,
    sceneTitles,
    loading,
    storyPosition,
    sceneTitle,
    onOpenEvidence,
    onClaimAction,
    onSaveEntity,
  } = props;

  const characters = entities.filter((entity) => entity.kind === "character");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [upToHere, setUpToHere] = useState(true);
  const selected = characters.find((row) => row.id === selectedId) ?? characters[0] ?? null;
  const [draft, setDraft] = useState<{ identity: string; currentState: string; notes: string } | null>(
    null,
  );

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (characters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No people yet. When Storymatic reads a scene, the characters it finds appear here — with what
        each of them knows at a chosen point in the story, rather than one timeless profile.
      </p>
    );
  }

  const matches = (claim: StoryClaim) => {
    if (!selected) return false;
    const name = selected.name.toLowerCase();
    const subject = claim.subject.toLowerCase();
    const holder = (claim.knowledge_holder ?? "").toLowerCase();
    const linked = claim.entity_id === selected.id;
    return linked || subject.includes(name) || holder.includes(name);
  };
  const withinPosition = (claim: StoryClaim) =>
    !upToHere ||
    storyPosition === null ||
    claim.story_position === null ||
    claim.story_position <= storyPosition;

  const mine = claims.filter((claim) => matches(claim) && withinPosition(claim));
  const knowledge = mine.filter((claim) => claim.knowledge_holder);
  const about = mine.filter((claim) => !claim.knowledge_holder);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {characters.map((character) => (
          <Button
            key={character.id}
            variant={selected?.id === character.id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setSelectedId(character.id);
              setDraft(null);
            }}
          >
            {character.name}
          </Button>
        ))}
      </div>

      {selected && (
        <>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={upToHere}
              onChange={(event) => setUpToHere(event.target.checked)}
            />
            Only what the story has reached by {sceneTitle ?? "this point"}
          </label>

          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="character-identity">Who they are</Label>
              <Textarea
                id="character-identity"
                rows={3}
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
              <Label htmlFor="character-state">Where they are now</Label>
              <Textarea
                id="character-state"
                rows={3}
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
            <div className="grid gap-2">
              <Label htmlFor="character-notes">Your notes</Label>
              <Textarea
                id="character-notes"
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
            {!selected.author_confirmed && (
              <p className="text-xs text-muted-foreground">
                Drawn from your manuscript and not yet confirmed. Saving makes it yours.
              </p>
            )}
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
              Save
            </Button>
          </div>

          <section className="border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              What {selected.name} knows here
            </h3>
            {knowledge.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing recorded yet at this point in the story.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {knowledge.map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    sceneTitle={claim.scene_id ? (sceneTitles[claim.scene_id] ?? null) : null}
                    onOpenEvidence={onOpenEvidence}
                    onAction={onClaimAction}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              What the draft says about {selected.name}
            </h3>
            {about.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {about.map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    sceneTitle={claim.scene_id ? (sceneTitles[claim.scene_id] ?? null) : null}
                    onOpenEvidence={onOpenEvidence}
                    onAction={onClaimAction}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
