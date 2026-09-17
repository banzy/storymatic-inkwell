import { useState } from "react";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PromiseRow } from "@/lib/promises.functions";

export type PromiseDraft = {
  id: string | null;
  title: string;
  promise: string;
  subject: string | null;
  setupSceneId: string | null;
  payoffSceneId: string | null;
  status: "open" | "paid" | "dropped";
};

type SceneRef = { id: string; title: string };

const STATUS_LABEL: Record<string, string> = {
  open: "Still owed",
  paid: "Paid off",
  dropped: "Set aside",
};

function Evidence(props: {
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

function PromiseForm(props: {
  scenes: SceneRef[];
  initial: PromiseDraft;
  onSave: (draft: PromiseDraft) => void;
  onCancel: () => void;
}) {
  const { scenes, initial, onSave, onCancel } = props;
  const [title, setTitle] = useState(initial.title);
  const [promise, setPromise] = useState(initial.promise);
  const [subject, setSubject] = useState(initial.subject ?? "");
  const [setupSceneId, setSetupSceneId] = useState(initial.setupSceneId ?? "");
  const [payoffSceneId, setPayoffSceneId] = useState(initial.payoffSceneId ?? "");
  const [status, setStatus] = useState(initial.status);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div>
        <Label htmlFor="promise-title" className="text-xs">
          In a few words
        </Label>
        <Input
          id="promise-title"
          value={title}
          placeholder="The letter must reach Kesk"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="promise-body" className="text-xs">
          What the reader is led to expect
        </Label>
        <Textarea
          id="promise-body"
          rows={3}
          value={promise}
          onChange={(event) => setPromise(event.target.value)}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="promise-subject" className="text-xs">
            Who or what it concerns
          </Label>
          <Input
            id="promise-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="promise-status" className="text-xs">
            Where it stands
          </Label>
          <select
            id="promise-status"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as PromiseDraft["status"])}
          >
            <option value="open">Still owed</option>
            <option value="paid">Paid off</option>
            <option value="dropped">Set aside</option>
          </select>
        </div>
        <div>
          <Label htmlFor="promise-setup" className="text-xs">
            Planted in
          </Label>
          <select
            id="promise-setup"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={setupSceneId}
            onChange={(event) => setSetupSceneId(event.target.value)}
          >
            <option value="">Not in the draft yet</option>
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="promise-payoff" className="text-xs">
            Paid off in
          </Label>
          <select
            id="promise-payoff"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={payoffSceneId}
            onChange={(event) => setPayoffSceneId(event.target.value)}
          >
            <option value="">Not yet</option>
            {scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!title.trim()}
          onClick={() =>
            onSave({
              id: initial.id,
              title: title.trim(),
              promise: promise.trim(),
              subject: subject.trim() || null,
              setupSceneId: setupSceneId || null,
              payoffSceneId: payoffSceneId || null,
              status,
            })
          }
        >
          Keep
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PromiseCard(props: {
  row: PromiseRow;
  sceneTitles: Map<string, string>;
  onEdit: (row: PromiseRow) => void;
  onJudge: (id: string, confirmed: boolean) => void;
  onDelete: (id: string) => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { row, sceneTitles, onEdit, onJudge, onDelete, onOpenScene, onOpenEvidence } = props;
  const reading = !row.author_confirmed && row.origin === "analysis";

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-serif text-base leading-snug">{row.title}</h3>
        <span
          className={`rounded-sm px-1.5 py-0.5 text-xs ${
            row.status === "paid"
              ? "bg-primary/10 text-foreground"
              : row.status === "dropped"
                ? "bg-secondary text-secondary-foreground"
                : "bg-planned text-planned-foreground"
          }`}
        >
          {STATUS_LABEL[row.status] ?? row.status}
        </span>
      </div>
      {row.subject && <p className="mt-0.5 text-xs text-muted-foreground">{row.subject}</p>}
      {row.promise && <p className="mt-2 text-sm leading-relaxed">{row.promise}</p>}
      {reading && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          Storymatic's reading — yours to confirm.
        </p>
      )}

      <div className="mt-3 space-y-2">
        <div>
          <p className="text-xs text-foreground/70">
            Planted{" "}
            {row.setup_scene_id ? (
              <button
                type="button"
                className="hover:underline"
                onClick={() => onOpenScene(row.setup_scene_id!)}
              >
                in {sceneTitles.get(row.setup_scene_id) ?? "a scene"}
              </button>
            ) : (
              <span className="italic text-muted-foreground">not in the draft yet</span>
            )}
          </p>
          {row.setup_scene_id && row.setup_quote && (
            <Evidence
              quote={row.setup_quote}
              sceneId={row.setup_scene_id}
              onOpenEvidence={onOpenEvidence}
            />
          )}
        </div>
        <div>
          <p className="text-xs text-foreground/70">
            Paid off{" "}
            {row.payoff_scene_id ? (
              <button
                type="button"
                className="hover:underline"
                onClick={() => onOpenScene(row.payoff_scene_id!)}
              >
                in {sceneTitles.get(row.payoff_scene_id) ?? "a scene"}
              </button>
            ) : (
              <span className="italic text-muted-foreground">still owed</span>
            )}
          </p>
          {row.payoff_scene_id && row.payoff_quote && (
            <Evidence
              quote={row.payoff_quote}
              sceneId={row.payoff_scene_id}
              onOpenEvidence={onOpenEvidence}
            />
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {reading ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => onJudge(row.id, true)}>
              That's right
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onJudge(row.id, false)}>
              Not this
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)}>
              Remove
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

export function PromisesView(props: {
  promises: PromiseRow[];
  scenes: SceneRef[];
  sceneTitles: Map<string, string>;
  loading: boolean;
  onSave: (draft: PromiseDraft) => void;
  onJudge: (id: string, confirmed: boolean) => void;
  onDelete: (id: string) => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { promises, scenes, sceneTitles, loading, onSave, onJudge, onDelete } = props;
  const [form, setForm] = useState<PromiseDraft | null>(null);

  const blank: PromiseDraft = {
    id: null,
    title: "",
    promise: "",
    subject: null,
    setupSceneId: null,
    payoffSceneId: null,
    status: "open",
  };

  const owed = promises.filter((row) => row.status === "open");
  const settled = promises.filter((row) => row.status !== "open");

  if (loading) return <p className="text-sm text-muted-foreground">Gathering the promises…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">
        Something set up, something promised, something still owed. An open promise isn't a
        mistake — it's simply not paid yet.
      </p>

      {form ? (
        <PromiseForm
          scenes={scenes}
          initial={form}
          onSave={(draft) => {
            onSave(draft);
            setForm(null);
          }}
          onCancel={() => setForm(null)}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setForm(blank)}>
          Note a promise
        </Button>
      )}

      {promises.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet. Note one yourself, or read the draft and Storymatic will list what it
          finds planted.
        </p>
      ) : (
        <>
          <section>
            <h2 className="font-serif text-lg">Still owed</h2>
            {owed.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Nothing is outstanding.</p>
            ) : (
              <div className="mt-2 space-y-3">
                {owed.map((row) => (
                  <PromiseCard
                    key={row.id}
                    row={row}
                    sceneTitles={sceneTitles}
                    onEdit={(edit) =>
                      setForm({
                        id: edit.id,
                        title: edit.title,
                        promise: edit.promise,
                        subject: edit.subject,
                        setupSceneId: edit.setup_scene_id,
                        payoffSceneId: edit.payoff_scene_id,
                        status: (edit.status as PromiseDraft["status"]) ?? "open",
                      })
                    }
                    onJudge={onJudge}
                    onDelete={onDelete}
                    onOpenScene={props.onOpenScene}
                    onOpenEvidence={props.onOpenEvidence}
                  />
                ))}
              </div>
            )}
          </section>

          {settled.length > 0 && (
            <section>
              <h2 className="font-serif text-lg">Paid off and set aside</h2>
              <div className="mt-2 space-y-3">
                {settled.map((row) => (
                  <PromiseCard
                    key={row.id}
                    row={row}
                    sceneTitles={sceneTitles}
                    onEdit={(edit) =>
                      setForm({
                        id: edit.id,
                        title: edit.title,
                        promise: edit.promise,
                        subject: edit.subject,
                        setupSceneId: edit.setup_scene_id,
                        payoffSceneId: edit.payoff_scene_id,
                        status: (edit.status as PromiseDraft["status"]) ?? "open",
                      })
                    }
                    onJudge={onJudge}
                    onDelete={onDelete}
                    onOpenScene={props.onOpenScene}
                    onOpenEvidence={props.onOpenEvidence}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
