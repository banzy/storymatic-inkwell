import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Possibility } from "@/lib/possibilities.functions";

export type PossibilityDraft = {
  id: string | null;
  sceneId: string | null;
  name: string;
  premise: string;
  notes: string | null;
};

function PossibilityForm(props: {
  possibility: Possibility | null;
  scenes: { id: string; title: string }[];
  onSave: (draft: PossibilityDraft) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(props.possibility?.name ?? "");
  const [premise, setPremise] = useState(props.possibility?.premise ?? "");
  const [notes, setNotes] = useState(props.possibility?.notes ?? "");
  const [sceneId, setSceneId] = useState(props.possibility?.scene_id ?? "");

  return (
    <form
      className="space-y-3 rounded-md border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        props.onSave({
          id: props.possibility?.id ?? null,
          sceneId: sceneId || null,
          name,
          premise,
          notes: notes.trim() || null,
        });
      }}
    >
      <div>
        <Label htmlFor="poss-name">Call it something</Label>
        <Input
          id="poss-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Marcus never delivers the letter"
        />
      </div>
      <div>
        <Label htmlFor="poss-premise">What it is, in a sentence</Label>
        <Textarea
          id="poss-premise"
          rows={2}
          value={premise}
          onChange={(event) => setPremise(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="poss-notes">Your notes (optional)</Label>
        <Textarea
          id="poss-notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="poss-scene">About which scene (optional)</Label>
        <select
          id="poss-scene"
          className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm sm:w-80"
          value={sceneId}
          onChange={(event) => setSceneId(event.target.value)}
        >
          <option value="">The story as a whole</option>
          {props.scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Keep
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={props.onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Card(props: {
  possibility: Possibility;
  sceneTitles: Map<string, string>;
  onEdit: () => void;
  onStatus: (id: string, status: "exploring" | "adopted" | "discarded") => void;
  onDelete: (id: string) => void;
  onOpenScene: (sceneId: string) => void;
}) {
  const p = props.possibility;
  const changes = Array.isArray(p.changes) ? p.changes : [];
  const consequences = Array.isArray(p.consequences) ? p.consequences : [];
  const sceneTitle = p.scene_id ? props.sceneTitles.get(p.scene_id) : null;

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-serif text-base text-foreground">{p.name}</h3>
        <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
          {p.origin === "author" ? "Yours" : "Storymatic's suggestion"}
        </span>
        {p.status === "adopted" && (
          <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs text-foreground">
            You're taking this up
          </span>
        )}
        {p.status === "discarded" && (
          <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            Set aside
          </span>
        )}
      </div>

      {p.premise && (
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">{p.premise}</p>
      )}

      {changes.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-foreground/70">What would change</p>
          <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            {changes.map((change, index) => (
              <li key={index}>— {change.detail}</li>
            ))}
          </ul>
        </div>
      )}

      {consequences.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-foreground/70">What it would touch elsewhere</p>
          <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            {consequences.map((item, index) => (
              <li key={index}>
                <span className="text-foreground/70">
                  {item.certainty === "clear" ? "Clear:" : "Possibly:"}
                </span>{" "}
                {item.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.notes && (
        <p className="mt-3 max-w-prose whitespace-pre-wrap text-sm text-foreground">{p.notes}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {sceneTitle && (
          <Button
            size="sm"
            variant="ghost"
            className="-ml-2"
            onClick={() => props.onOpenScene(p.scene_id!)}
          >
            {sceneTitle}
          </Button>
        )}
        {p.status !== "adopted" && (
          <Button size="sm" variant="ghost" onClick={() => props.onStatus(p.id, "adopted")}>
            I'm taking this up
          </Button>
        )}
        {p.status !== "discarded" && (
          <Button size="sm" variant="ghost" onClick={() => props.onStatus(p.id, "discarded")}>
            Set aside
          </Button>
        )}
        {p.status !== "exploring" && (
          <Button size="sm" variant="ghost" onClick={() => props.onStatus(p.id, "exploring")}>
            Still thinking
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={props.onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => props.onDelete(p.id)}>
          Remove
        </Button>
      </div>
    </article>
  );
}

/**
 * Ways a scene could go, kept beside the draft rather than in it. Nothing here
 * rewrites anything: taking one up records your decision, and the writing itself
 * stays yours to do, passage by passage.
 */
export function PossibilitiesView(props: {
  possibilities: Possibility[];
  scenes: { id: string; title: string }[];
  sceneTitles: Map<string, string>;
  loading: boolean;
  onSave: (draft: PossibilityDraft) => void;
  onStatus: (id: string, status: "exploring" | "adopted" | "discarded") => void;
  onDelete: (id: string) => void;
  onOpenScene: (sceneId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSetAside, setShowSetAside] = useState(false);

  if (props.loading)
    return <p className="text-sm text-muted-foreground">Gathering what you've been considering…</p>;

  const editing = props.possibilities.find((item) => item.id === editingId) ?? null;
  const live = props.possibilities.filter(
    (item) => item.status !== "discarded" && item.id !== editingId,
  );
  const aside = props.possibilities.filter((item) => item.status === "discarded");

  return (
    <div className="max-w-3xl space-y-5">
      <p className="max-w-prose text-sm text-muted-foreground">
        Ways a scene could go, held beside the draft and never inside it. Nothing here changes a word
        you've written — taking one up just records what you've decided.
      </p>

      {adding || editing ? (
        <PossibilityForm
          possibility={editing}
          scenes={props.scenes}
          onSave={(draft) => {
            props.onSave(draft);
            setAdding(false);
            setEditingId(null);
          }}
          onCancel={() => {
            setAdding(false);
            setEditingId(null);
          }}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          Note a possibility
        </Button>
      )}

      {live.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing under consideration. Open a scene and press “Explore this scene” to see a few ways
          it could go, or note one of your own.
        </p>
      ) : (
        <div className="space-y-3">
          {live.map((item) => (
            <Card
              key={item.id}
              possibility={item}
              sceneTitles={props.sceneTitles}
              onEdit={() => {
                setAdding(false);
                setEditingId(item.id);
              }}
              onStatus={props.onStatus}
              onDelete={props.onDelete}
              onOpenScene={props.onOpenScene}
            />
          ))}
        </div>
      )}

      {aside.length > 0 && (
        <section>
          <Button size="sm" variant="ghost" className="-ml-2" onClick={() => setShowSetAside((v) => !v)}>
            {showSetAside ? "Hide" : `Set aside (${aside.length})`}
          </Button>
          {showSetAside && (
            <div className="mt-2 space-y-3">
              {aside.map((item) => (
                <Card
                  key={item.id}
                  possibility={item}
                  sceneTitles={props.sceneTitles}
                  onEdit={() => setEditingId(item.id)}
                  onStatus={props.onStatus}
                  onDelete={props.onDelete}
                  onOpenScene={props.onOpenScene}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
