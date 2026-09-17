import { useState } from "react";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoryClaim, StoryEntity } from "@/lib/story.functions";

const GROUPS: { kind: string; label: string; blurb: string }[] = [
  { kind: "location", label: "Places", blurb: "Where the story happens." },
  { kind: "object", label: "Things that recur", blurb: "Objects the draft keeps returning to." },
  { kind: "faction", label: "Groups", blurb: "Households, offices, factions." },
];

const TRUTH_LABEL: Record<string, string> = {
  canonical: "Established in the draft",
  inferred: "Storymatic's reading",
  possible: "Possible",
  planned: "Planned — not in the draft",
  rejected: "You set this aside",
  contradicted: "Contradicted elsewhere",
};

function Badge({ truth }: { truth: string }) {
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-xs ${
        truth === "canonical" ? "bg-primary/10 text-foreground" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {TRUTH_LABEL[truth] ?? truth}
    </span>
  );
}

function ClaimRow(props: {
  claim: StoryClaim;
  sceneTitles: Map<string, string>;
  onAction: (id: string, action: "confirm" | "reject" | "reopen") => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { claim } = props;
  const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];
  return (
    <li className="rounded-sm border border-border/70 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-sm text-foreground">{claim.assertion}</p>
        <Badge truth={claim.truth_type} />
        {claim.validity === "needs_review" && (
          <span className="rounded-sm bg-planned px-1.5 py-0.5 text-xs text-planned-foreground">
            Worth another look
          </span>
        )}
      </div>
      {evidence.slice(0, 2).map((item, index) => (
        <button
          key={index}
          type="button"
          className="mt-1.5 flex w-full items-start gap-1.5 rounded-sm bg-secondary/60 px-2 py-1 text-left text-xs hover:bg-secondary"
          onClick={() => props.onOpenEvidence(item.scene_id, item.quote)}
        >
          <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span className="font-serif italic">{item.quote}</span>
          <span className="ml-auto shrink-0 text-muted-foreground">
            {props.sceneTitles.get(item.scene_id) ?? "Open"}
          </span>
        </button>
      ))}
      <div className="mt-1.5 flex gap-1">
        {claim.author_confirmed ? (
          <Button size="sm" variant="ghost" onClick={() => props.onAction(claim.id, "reopen")}>
            Undo
          </Button>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => props.onAction(claim.id, "confirm")}>
              That's right
            </Button>
            <Button size="sm" variant="ghost" onClick={() => props.onAction(claim.id, "reject")}>
              Not so
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function EntityCard(props: {
  entity: StoryEntity;
  claims: StoryClaim[];
  sceneTitles: Map<string, string>;
  onSaveEntity: (id: string, patch: { identity: string | null; currentState: string | null; notes: string | null }) => void;
  onClaimAction: (id: string, action: "confirm" | "reject" | "reopen") => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { entity } = props;
  const [editing, setEditing] = useState(false);
  const [identity, setIdentity] = useState(entity.identity ?? "");
  const [state, setState] = useState(entity.current_state ?? "");
  const [notes, setNotes] = useState(entity.notes ?? "");

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <header className="flex flex-wrap items-baseline gap-2">
        <h4 className="font-serif text-lg text-foreground">{entity.name}</h4>
        <Badge truth={entity.author_confirmed ? "canonical" : entity.truth_type} />
      </header>

      {editing ? (
        <div className="mt-3 space-y-2">
          <div>
            <Label htmlFor={`id-${entity.id}`}>What it is</Label>
            <Textarea id={`id-${entity.id}`} value={identity} onChange={(e) => setIdentity(e.target.value)} rows={2} />
          </div>
          <div>
            <Label htmlFor={`st-${entity.id}`}>How it stands now</Label>
            <Textarea id={`st-${entity.id}`} value={state} onChange={(e) => setState(e.target.value)} rows={2} />
          </div>
          <div>
            <Label htmlFor={`nt-${entity.id}`}>Your notes</Label>
            <Textarea id={`nt-${entity.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                props.onSaveEntity(entity.id, {
                  identity: identity.trim() || null,
                  currentState: state.trim() || null,
                  notes: notes.trim() || null,
                });
                setEditing(false);
              }}
            >
              Keep
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <p>{entity.identity?.trim() || <span className="italic">Nothing written down yet.</span>}</p>
          {entity.current_state?.trim() && (
            <p>
              <span className="text-foreground/70">Now:</span> {entity.current_state}
            </p>
          )}
          {entity.notes?.trim() && <p className="italic">{entity.notes}</p>}
          <Button size="sm" variant="ghost" className="-ml-2" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      )}

      {props.claims.length > 0 && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            What the draft establishes
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {props.claims.map((claim) => (
              <ClaimRow
                key={claim.id}
                claim={claim}
                sceneTitles={props.sceneTitles}
                onAction={props.onClaimAction}
                onOpenEvidence={props.onOpenEvidence}
              />
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/**
 * The world bible, grown from the manuscript: places, recurring objects, groups,
 * and the rules the draft establishes — each with the passage behind it.
 */
export function WorldView(props: {
  entities: StoryEntity[];
  claims: StoryClaim[];
  sceneTitles: Map<string, string>;
  loading: boolean;
  onSaveEntity: (id: string, patch: { identity: string | null; currentState: string | null; notes: string | null }) => void;
  onClaimAction: (id: string, action: "confirm" | "reject" | "reopen") => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  if (props.loading) return <p className="text-sm text-muted-foreground">Gathering the world…</p>;

  const claimsFor = (entityId: string) =>
    props.claims.filter((claim) => claim.entity_id === entityId && claim.truth_type !== "rejected");
  const placed = new Set(props.entities.map((entity) => entity.id));
  const loose = props.claims.filter(
    (claim) =>
      claim.claim_kind === "world" &&
      claim.truth_type !== "rejected" &&
      (!claim.entity_id || !placed.has(claim.entity_id)),
  );

  const groups = GROUPS.map((group) => ({
    ...group,
    items: props.entities.filter((entity) => entity.kind === group.kind),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0 && loose.length === 0) {
    return (
      <p className="max-w-prose text-sm text-muted-foreground">
        Nothing here yet. Press “Read the world” and Storymatic collects the places, objects, groups
        and rules your scenes have already established — each with the line behind it. This grows
        with the draft.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.kind}>
          <h3 className="font-serif text-xl text-foreground">{group.label}</h3>
          <p className="text-sm text-muted-foreground">{group.blurb}</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {group.items.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                claims={claimsFor(entity.id)}
                sceneTitles={props.sceneTitles}
                onSaveEntity={props.onSaveEntity}
                onClaimAction={props.onClaimAction}
                onOpenEvidence={props.onOpenEvidence}
              />
            ))}
          </div>
        </section>
      ))}

      {loose.length > 0 && (
        <section>
          <h3 className="font-serif text-xl text-foreground">Rules and customs</h3>
          <p className="text-sm text-muted-foreground">
            How this world works, according to the draft — not yet tied to one place or group.
          </p>
          <ul className="mt-3 space-y-1.5">
            {loose.map((claim) => (
              <ClaimRow
                key={claim.id}
                claim={claim}
                sceneTitles={props.sceneTitles}
                onAction={props.onClaimAction}
                onOpenEvidence={props.onOpenEvidence}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
