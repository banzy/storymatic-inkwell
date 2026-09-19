import { useState } from "react";
import { Lock, LockOpen, Loader2, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoryEntity } from "@/lib/story.functions";
import type {
  DiscoveryRow,
  RelationshipBeat,
  RelationshipRow,
  SynopsisRow,
} from "@/lib/storybrain.functions";

export type SynopsisScope = "story" | "chapter" | "scene" | "character" | "thread";

export type SynopsisTarget = { scope: SynopsisScope; targetId: string | null; label: string };

const SCOPE_LABEL: Record<SynopsisScope, string> = {
  story: "The whole story",
  chapter: "By chapter",
  scene: "By scene",
  character: "By person",
  thread: "By thread",
};

const SCOPE_BLURB: Record<SynopsisScope, string> = {
  story: "Everything the draft has reached so far.",
  chapter: "One summary for each chapter.",
  scene: "A line or two for each scene as it stands.",
  character: "One person's part in the story, and where the draft leaves them.",
  thread: "One thread followed through the scenes that carry it.",
};

const READING_LABEL = "Storymatic's reading — yours to confirm";

function EvidenceButton(props: {
  quote: string;
  sceneId: string;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  return (
    <button
      type="button"
      className="mt-1.5 flex w-full items-start gap-1.5 rounded-sm bg-secondary/60 px-2 py-1 text-left text-xs italic text-muted-foreground hover:bg-secondary"
      onClick={() => props.onOpenEvidence(props.sceneId, props.quote)}
    >
      <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
      <span>{props.quote}</span>
    </button>
  );
}

/* -------------------------------------------------------------- synopsis */

function SynopsisCard(props: {
  target: SynopsisTarget;
  row: SynopsisRow | undefined;
  busy: boolean;
  onWrite: (target: SynopsisTarget) => void;
  onSave: (target: SynopsisTarget, body: string, locked: boolean) => void;
}) {
  const { target, row, busy, onWrite, onSave } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row?.body ?? "");
  const locked = row?.locked ?? false;
  const body = row?.body?.trim() ?? "";

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 font-serif text-lg">{target.label}</h2>
        {row && (
          <span className="text-xs text-muted-foreground">
            {locked ? "Locked" : row.source === "author" ? "Yours" : READING_LABEL}
          </span>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <Label htmlFor={`syn-${target.targetId ?? "story"}`} className="text-xs">
            Summary
          </Label>
          <Textarea
            id={`syn-${target.targetId ?? "story"}`}
            rows={6}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onSave(target, draft.trim(), locked);
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
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
          {body || (
            <span className="text-muted-foreground">
              Nothing here yet. This grows with the draft — ask Storymatic to write it, or write it
              yourself.
            </span>
          )}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={busy || locked}
          onClick={() => onWrite(target)}
        >
          {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {body ? "Write it again" : "Write from the draft"}
        </Button>
        {!editing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(body);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        )}
        {row && (
          <Button size="sm" variant="ghost" onClick={() => onSave(target, body, !locked)}>
            {locked ? (
              <LockOpen className="size-3.5" aria-hidden="true" />
            ) : (
              <Lock className="size-3.5" aria-hidden="true" />
            )}
            {locked ? "Unlock" : "Lock this wording"}
          </Button>
        )}
      </div>
    </article>
  );
}

export function SynopsisView(props: {
  targets: SynopsisTarget[];
  synopses: SynopsisRow[];
  busyTarget: string | null;
  onWrite: (target: SynopsisTarget) => void;
  onSave: (target: SynopsisTarget, body: string, locked: boolean) => void;
}) {
  const { targets, synopses, busyTarget, onWrite, onSave } = props;
  const key = (scope: string, targetId: string | null) => `${scope}:${targetId ?? ""}`;
  const rows = new Map(synopses.map((row) => [key(row.scope, row.target_id), row]));

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        A summary that keeps up with the draft. Lock any wording you've settled on and Storymatic
        will leave it exactly as you wrote it.
      </p>
      {targets.map((target) => (
        <SynopsisCard
          key={key(target.scope, target.targetId)}
          target={target}
          row={rows.get(key(target.scope, target.targetId))}
          busy={busyTarget === key(target.scope, target.targetId)}
          onWrite={onWrite}
          onSave={onSave}
        />
      ))}
    </div>
  );
}

/* --------------------------------------------------------- relationships */

function RelationshipCard(props: {
  relationship: RelationshipRow;
  fromName: string;
  toName: string;
  beats: RelationshipBeat[];
  sceneTitles: Map<string, string>;
  onSave: (id: string, nature: string, currentState: string, notes: string) => void;
  onJudge: (id: string, confirmed: boolean) => void;
  onJudgeBeat: (id: string, confirmed: boolean) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const {
    relationship,
    fromName,
    toName,
    beats,
    sceneTitles,
    onSave,
    onJudge,
    onJudgeBeat,
    onOpenEvidence,
  } = props;
  const [editing, setEditing] = useState(false);
  const [nature, setNature] = useState(relationship.nature ?? "");
  const [state, setState] = useState(relationship.current_state ?? "");
  const [notes, setNotes] = useState(relationship.notes ?? "");

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="min-w-0 flex-1 font-serif text-lg">
          {fromName} <span className="text-muted-foreground">towards</span> {toName}
        </h2>
        <span className="text-xs text-muted-foreground">
          {relationship.author_confirmed ? "Yours" : READING_LABEL}
        </span>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <div>
            <Label htmlFor={`nature-${relationship.id}`} className="text-xs">
              What's between them
            </Label>
            <Input
              id={`nature-${relationship.id}`}
              value={nature}
              onChange={(event) => setNature(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`state-${relationship.id}`} className="text-xs">
              Where it stands now
            </Label>
            <Textarea
              id={`state-${relationship.id}`}
              rows={3}
              value={state}
              onChange={(event) => setState(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`notes-${relationship.id}`} className="text-xs">
              Your notes
            </Label>
            <Textarea
              id={`notes-${relationship.id}`}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onSave(relationship.id, nature.trim(), state.trim(), notes.trim());
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
        <>
          {relationship.nature && <p className="mt-2 text-sm leading-relaxed">{relationship.nature}</p>}
          {relationship.current_state && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Where it stands: {relationship.current_state}
            </p>
          )}
          {relationship.notes && (
            <p className="mt-1.5 text-sm leading-relaxed italic">{relationship.notes}</p>
          )}
        </>
      )}

      {beats.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground">
            How it changes through the draft
          </h3>
          <ol className="mt-2 space-y-2">
            {beats.map((beat) => (
              <li key={beat.id} className="text-sm">
                <span className="text-xs text-muted-foreground">
                  {(beat.scene_id && sceneTitles.get(beat.scene_id)) || "Unplaced"}
                </span>
                <p className="leading-relaxed">{beat.change}</p>
                {(Array.isArray(beat.evidence) ? beat.evidence : []).slice(0, 1).map((item, index) => (
                  <EvidenceButton
                    key={`${beat.id}-${index}`}
                    quote={item.quote}
                    sceneId={item.scene_id}
                    onOpenEvidence={onOpenEvidence}
                  />
                ))}
                {!beat.author_confirmed && (
                  <div className="mt-1 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onJudgeBeat(beat.id, true)}>
                      That's right
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onJudgeBeat(beat.id, false)}>
                      Not this
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
        {!relationship.author_confirmed && (
          <>
            <Button size="sm" variant="ghost" onClick={() => onJudge(relationship.id, true)}>
              That's right
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onJudge(relationship.id, false)}>
              Not this
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

export function RelationshipsView(props: {
  relationships: RelationshipRow[];
  beats: RelationshipBeat[];
  entities: StoryEntity[];
  sceneTitles: Map<string, string>;
  onSave: (id: string, nature: string, currentState: string, notes: string) => void;
  onJudge: (id: string, confirmed: boolean) => void;
  onJudgeBeat: (id: string, confirmed: boolean) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { relationships, beats, entities, sceneTitles, ...handlers } = props;
  const names = new Map(entities.map((entity) => [entity.id, entity.name]));

  if (relationships.length === 0) {
    return (
      <p className="max-w-prose text-sm text-muted-foreground">
        Nothing here yet. Once Storymatic knows two of your people, “Read the relationships” traces
        what's between them and where each one stands — with the passages that show it. This grows
        as the draft does.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        Not fixed profiles — where each relationship stands by this point in the draft, and the
        moments that moved it.
      </p>
      {relationships.map((relationship) => (
        <RelationshipCard
          key={relationship.id}
          relationship={relationship}
          fromName={names.get(relationship.from_entity_id) ?? "Someone"}
          toName={names.get(relationship.to_entity_id) ?? "someone"}
          beats={beats.filter((beat) => beat.relationship_id === relationship.id)}
          sceneTitles={sceneTitles}
          {...handlers}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- discoveries */

export function DiscoveriesView(props: {
  discoveries: DiscoveryRow[];
  sceneTitles: Map<string, string>;
  onStatus: (id: string, status: "open" | "intentional" | "dismissed") => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { discoveries, sceneTitles, onStatus, onOpenScene, onOpenEvidence } = props;
  const [showAnswered, setShowAnswered] = useState(false);
  const open = discoveries.filter((row) => row.status === "open");
  const answered = discoveries.filter((row) => row.status !== "open");
  const shown = showAnswered ? answered : open;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 max-w-prose text-sm text-muted-foreground">
          Things Storymatic noticed across your scenes. Nothing here is a verdict, and nothing has
          been changed in your draft.
        </p>
        {answered.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setShowAnswered(!showAnswered)}>
            {showAnswered ? `Open (${open.length})` : `Answered (${answered.length})`}
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          {showAnswered
            ? "Nothing set aside yet."
            : "Nothing to raise. As you write more scenes, Storymatic looks across them and anything worth knowing appears here."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((row) => (
            <li key={row.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 flex-1 font-serif text-base">{row.title}</h2>
                {row.scene_id && (
                  <span className="text-xs text-muted-foreground">
                    {sceneTitles.get(row.scene_id) ?? ""}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed">{row.body}</p>
              {row.why_it_matters && (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Why it might matter: {row.why_it_matters}
                </p>
              )}
              {row.uncertainty && (
                <p className="mt-1.5 text-xs italic text-muted-foreground">{row.uncertainty}</p>
              )}
              {(Array.isArray(row.evidence) ? row.evidence : []).slice(0, 2).map((item, index) => (
                <EvidenceButton
                  key={`${row.id}-${index}`}
                  quote={item.quote}
                  sceneId={item.scene_id}
                  onOpenEvidence={onOpenEvidence}
                />
              ))}
              <div className="mt-2 flex flex-wrap gap-1">
                {row.scene_id && (
                  <Button size="sm" variant="ghost" onClick={() => onOpenScene(row.scene_id!)}>
                    Open the scene
                  </Button>
                )}
                {row.status === "open" ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => onStatus(row.id, "intentional")}>
                      This is intentional
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onStatus(row.id, "dismissed")}>
                      Set aside
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => onStatus(row.id, "open")}>
                    Bring it back
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
