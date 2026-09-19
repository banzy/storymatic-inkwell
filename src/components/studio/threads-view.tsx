import { useState } from "react";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ThreadBeatRow, ThreadRow } from "@/lib/threads.functions";

export type ThreadDraft = {
  id: string | null;
  kind: "thread" | "subplot" | "mystery" | "reveal" | "question" | "conflict" | "goal";
  name: string;
  premise: string;
  notes: string | null;
  status: "planned" | "open" | "resolved" | "dropped";
};

type SceneRef = { id: string; title: string };

const KIND_LABEL: Record<string, string> = {
  thread: "Thread",
  subplot: "Subplot",
  mystery: "Mystery",
  reveal: "Reveal",
  question: "Open question",
  conflict: "Conflict",
  goal: "Goal",
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Planned — not in the draft",
  open: "Running",
  resolved: "Closed in the draft",
  dropped: "Set aside",
};

const ROLE_LABEL: Record<string, string> = {
  setup: "Starts here",
  development: "Moves here",
  complication: "Gets harder here",
  reveal: "Something comes out here",
  resolution: "Closes here",
};

function ThreadForm(props: {
  initial: ThreadDraft;
  onSave: (draft: ThreadDraft) => void;
  onCancel: () => void;
}) {
  const { initial, onSave, onCancel } = props;
  const [kind, setKind] = useState(initial.kind);
  const [name, setName] = useState(initial.name);
  const [premise, setPremise] = useState(initial.premise);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [status, setStatus] = useState(initial.status);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="thread-name" className="text-xs">
            In a few words
          </Label>
          <Input
            id="thread-name"
            value={name}
            placeholder="Who the letter is really for"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="thread-kind" className="text-xs">
            What kind of thread
          </Label>
          <select
            id="thread-kind"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={kind}
            onChange={(event) => setKind(event.target.value as ThreadDraft["kind"])}
          >
            {(Object.keys(KIND_LABEL) as ThreadDraft["kind"][]).map((key) => (
              <option key={key} value={key}>
                {KIND_LABEL[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="thread-premise" className="text-xs">
          What it is
        </Label>
        <Textarea
          id="thread-premise"
          rows={3}
          value={premise}
          onChange={(event) => setPremise(event.target.value)}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="thread-notes" className="text-xs">
            Your notes
          </Label>
          <Textarea
            id="thread-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="thread-status" className="text-xs">
            Where it stands
          </Label>
          <select
            id="thread-status"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as ThreadDraft["status"])}
          >
            {(Object.keys(STATUS_LABEL) as ThreadDraft["status"][]).map((key) => (
              <option key={key} value={key}>
                {STATUS_LABEL[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              id: initial.id,
              kind,
              name: name.trim(),
              premise: premise.trim(),
              notes: notes.trim() || null,
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

function BeatRow(props: {
  beat: ThreadBeatRow;
  sceneTitles: Map<string, string>;
  onJudgeBeat: (id: string, confirmed: boolean) => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { beat, sceneTitles, onJudgeBeat, onOpenScene, onOpenEvidence } = props;
  const evidence = Array.isArray(beat.evidence) ? beat.evidence : [];
  return (
    <li className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">
        <span className="text-foreground/70">{ROLE_LABEL[beat.role] ?? beat.role}</span>
        {beat.scene_id && (
          <>
            {" · "}
            <button
              type="button"
              className="hover:underline"
              onClick={() => onOpenScene(beat.scene_id!)}
            >
              {sceneTitles.get(beat.scene_id) ?? "a scene"}
            </button>
          </>
        )}
      </p>
      {beat.note && <p className="mt-1 text-sm leading-relaxed">{beat.note}</p>}
      {evidence.slice(0, 1).map((item, index) => (
        <button
          key={`${beat.id}-${index}`}
          type="button"
          className="mt-1.5 flex w-full items-start gap-1.5 rounded-sm bg-secondary/60 px-2 py-1 text-left text-xs italic text-muted-foreground hover:bg-secondary"
          onClick={() => onOpenEvidence(item.scene_id, item.quote)}
        >
          <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>{item.quote}</span>
        </button>
      ))}
      {!beat.author_confirmed && (
        <div className="mt-1.5 flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onJudgeBeat(beat.id, true)}>
            That's right
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onJudgeBeat(beat.id, false)}>
            Not this
          </Button>
        </div>
      )}
    </li>
  );
}

function ThreadCard(props: {
  thread: ThreadRow;
  beats: ThreadBeatRow[];
  sceneTitles: Map<string, string>;
  onEdit: (thread: ThreadRow) => void;
  onJudge: (id: string, confirmed: boolean) => void;
  onStatus: (id: string, status: ThreadDraft["status"]) => void;
  onDelete: (id: string) => void;
  onJudgeBeat: (id: string, confirmed: boolean) => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { thread, beats, sceneTitles } = props;
  const reading = !thread.author_confirmed && thread.origin === "analysis";

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-serif text-base leading-snug">{thread.name}</h3>
        <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
          {KIND_LABEL[thread.kind] ?? thread.kind}
        </span>
        <span
          className={`rounded-sm px-1.5 py-0.5 text-xs ${
            thread.status === "resolved"
              ? "bg-primary/10 text-foreground"
              : thread.status === "planned"
                ? "bg-planned text-planned-foreground"
                : "bg-secondary text-secondary-foreground"
          }`}
        >
          {STATUS_LABEL[thread.status] ?? thread.status}
        </span>
      </div>
      {thread.premise && <p className="mt-2 text-sm leading-relaxed">{thread.premise}</p>}
      {thread.notes && <p className="mt-1 text-sm text-muted-foreground">{thread.notes}</p>}
      <p className="mt-2 text-xs italic text-muted-foreground">
        {reading ? "Storymatic's reading — yours to confirm." : "Yours."}
      </p>

      <div className="mt-3">
        <p className="text-xs text-foreground/70">Where the draft picks it up</p>
        {beats.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing in the draft is attached to this yet.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {beats.map((beat) => (
              <BeatRow
                key={beat.id}
                beat={beat}
                sceneTitles={sceneTitles}
                onJudgeBeat={props.onJudgeBeat}
                onOpenScene={props.onOpenScene}
                onOpenEvidence={props.onOpenEvidence}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {reading ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => props.onJudge(thread.id, true)}>
              That's right
            </Button>
            <Button size="sm" variant="ghost" onClick={() => props.onJudge(thread.id, false)}>
              Not this
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => props.onEdit(thread)}>
              Edit
            </Button>
            {thread.status !== "resolved" && (
              <Button size="sm" variant="ghost" onClick={() => props.onStatus(thread.id, "resolved")}>
                Closed now
              </Button>
            )}
            {thread.status !== "dropped" ? (
              <Button size="sm" variant="ghost" onClick={() => props.onStatus(thread.id, "dropped")}>
                Set aside
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => props.onStatus(thread.id, "open")}>
                Bring back
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => props.onDelete(thread.id)}>
              Remove
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

export function ThreadsView(props: {
  threads: ThreadRow[];
  beats: ThreadBeatRow[];
  scenes: SceneRef[];
  sceneTitles: Map<string, string>;
  loading: boolean;
  onSave: (draft: ThreadDraft) => void;
  onJudge: (id: string, confirmed: boolean) => void;
  onJudgeBeat: (id: string, confirmed: boolean) => void;
  onStatus: (id: string, status: ThreadDraft["status"]) => void;
  onDelete: (id: string) => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { threads, beats, loading } = props;
  const [form, setForm] = useState<ThreadDraft | null>(null);

  const blank: ThreadDraft = {
    id: null,
    kind: "subplot",
    name: "",
    premise: "",
    notes: null,
    status: "planned",
  };

  const beatsFor = (threadId: string) => beats.filter((beat) => beat.thread_id === threadId);
  const running = threads.filter((row) => row.status === "open" || row.status === "planned");
  const settled = threads.filter((row) => row.status === "resolved" || row.status === "dropped");

  const edit = (thread: ThreadRow) =>
    setForm({
      id: thread.id,
      kind: (thread.kind as ThreadDraft["kind"]) ?? "thread",
      name: thread.name,
      premise: thread.premise,
      notes: thread.notes,
      status: (thread.status as ThreadDraft["status"]) ?? "open",
    });

  if (loading) return <p className="text-sm text-muted-foreground">Gathering the threads…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">
        Subplots, mysteries, open questions, conflicts and goals — what you planned and what the
        draft is actually carrying, side by side. A running thread is never a mistake.
      </p>

      {form ? (
        <ThreadForm
          initial={form}
          onSave={(draft) => {
            props.onSave(draft);
            setForm(null);
          }}
          onCancel={() => setForm(null)}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setForm(blank)}>
          Note a thread
        </Button>
      )}

      {threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet. Note a thread yourself, or read the draft and Storymatic will list what
          the scenes are carrying — each with the passage behind it.
        </p>
      ) : (
        <>
          <section>
            <h2 className="font-serif text-lg">Running</h2>
            {running.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Nothing is open.</p>
            ) : (
              <div className="mt-2 space-y-3">
                {running.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    beats={beatsFor(thread.id)}
                    sceneTitles={props.sceneTitles}
                    onEdit={edit}
                    onJudge={props.onJudge}
                    onStatus={props.onStatus}
                    onDelete={props.onDelete}
                    onJudgeBeat={props.onJudgeBeat}
                    onOpenScene={props.onOpenScene}
                    onOpenEvidence={props.onOpenEvidence}
                  />
                ))}
              </div>
            )}
          </section>

          {settled.length > 0 && (
            <section>
              <h2 className="font-serif text-lg">Closed and set aside</h2>
              <div className="mt-2 space-y-3">
                {settled.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    beats={beatsFor(thread.id)}
                    sceneTitles={props.sceneTitles}
                    onEdit={edit}
                    onJudge={props.onJudge}
                    onStatus={props.onStatus}
                    onDelete={props.onDelete}
                    onJudgeBeat={props.onJudgeBeat}
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
