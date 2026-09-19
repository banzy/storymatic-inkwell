import { useState } from "react";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionNote, StaleClaim } from "@/lib/contradictions.functions";

export type QuestionDraft = {
  id: string | null;
  title: string;
  body: string;
  sceneId: string | null;
};

function EvidenceButton(props: {
  quote: string;
  sceneId: string;
  sceneTitle: string | null;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  return (
    <button
      type="button"
      className="mt-1.5 w-full rounded-sm bg-secondary/60 px-2 py-1 text-left hover:bg-secondary"
      onClick={() => props.onOpenEvidence(props.sceneId, props.quote)}
    >
      {props.sceneTitle && (
        <span className="block text-xs text-foreground/70">{props.sceneTitle}</span>
      )}
      <span className="mt-0.5 flex items-start gap-1.5 text-xs italic text-muted-foreground">
        <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        <span>{props.quote}</span>
      </span>
    </button>
  );
}

function QuestionForm(props: {
  initial: QuestionDraft;
  scenes: { id: string; title: string }[];
  onSave: (draft: QuestionDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(props.initial.title);
  const [body, setBody] = useState(props.initial.body);
  const [sceneId, setSceneId] = useState(props.initial.sceneId ?? "");

  return (
    <form
      className="space-y-2 rounded-lg border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        props.onSave({
          id: props.initial.id,
          title: title.trim(),
          body: body.trim(),
          sceneId: sceneId || null,
        });
      }}
    >
      <div>
        <Label htmlFor="question-title" className="text-xs">
          In a few words
        </Label>
        <Input
          id="question-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What you want to come back to"
        />
      </div>
      <div>
        <Label htmlFor="question-body" className="text-xs">
          What's bothering you
        </Label>
        <Textarea
          id="question-body"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="question-scene" className="text-xs">
          Where it shows (optional)
        </Label>
        <select
          id="question-scene"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={sceneId}
          onChange={(event) => setSceneId(event.target.value)}
        >
          <option value="">No particular scene</option>
          {props.scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" type="submit">
          Keep
        </Button>
        <Button size="sm" type="button" variant="ghost" onClick={props.onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Where scenes seem to disagree, and where a reading rested on wording that has
 * since changed. Everything here is a question, never a correction: a
 * disagreement may be a lie, a misremembering, or ambiguity you meant.
 */
export function QuestionsView(props: {
  questions: QuestionNote[];
  stale: StaleClaim[];
  scenes: { id: string; title: string }[];
  sceneTitles: Map<string, string>;
  loading: boolean;
  onSave: (draft: QuestionDraft) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, status: "open" | "intentional" | "dismissed") => void;
  onClaimAction: (id: string, action: "confirm" | "reject" | "reopen") => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const {
    questions,
    stale,
    scenes,
    sceneTitles,
    loading,
    onSave,
    onDelete,
    onStatus,
    onClaimAction,
    onOpenScene,
    onOpenEvidence,
  } = props;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showSettled, setShowSettled] = useState(false);

  const open = questions.filter((row) => row.status === "open");
  const settled = questions.filter((row) => row.status !== "open");
  const shown = showSettled ? settled : open;

  if (loading) return <p className="text-sm text-muted-foreground">Gathering the questions…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 max-w-prose flex-1 text-sm text-muted-foreground">
          Places where two scenes seem to disagree, shown with both passages. A disagreement is not
          a mistake — someone may be lying, misremembering, or kept in the dark, and you may have
          meant the ambiguity.
        </p>
        {settled.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setShowSettled(!showSettled)}>
            {showSettled ? `Open (${open.length})` : `Settled (${settled.length})`}
          </Button>
        )}
        {!adding && !showSettled && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            Note a question
          </Button>
        )}
      </div>

      {adding && (
        <QuestionForm
          initial={{ id: null, title: "", body: "", sceneId: null }}
          scenes={scenes}
          onCancel={() => setAdding(false)}
          onSave={(draft) => {
            onSave(draft);
            setAdding(false);
          }}
        />
      )}

      {shown.length === 0 ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          {showSettled
            ? "Nothing settled yet."
            : "Nothing here. Press “Compare the scenes” once a couple are written, or note a question of your own."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((row) =>
            editing === row.id ? (
              <li key={row.id}>
                <QuestionForm
                  initial={{
                    id: row.id,
                    title: row.title,
                    body: row.body,
                    sceneId: row.scene_id,
                  }}
                  scenes={scenes}
                  onCancel={() => setEditing(null)}
                  onSave={(draft) => {
                    onSave(draft);
                    setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={row.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 flex-1 font-serif text-base">{row.title}</h2>
                  <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                    {row.origin === "author"
                      ? "Yours"
                      : row.status === "intentional"
                        ? "You meant this"
                        : "Storymatic's reading"}
                  </span>
                </div>
                {row.body && <p className="mt-1.5 text-sm leading-relaxed">{row.body}</p>}
                {row.why_it_matters && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Why it might matter: {row.why_it_matters}
                  </p>
                )}
                {(Array.isArray(row.evidence) ? row.evidence : []).slice(0, 2).map((item, index) => (
                  <EvidenceButton
                    key={`${row.id}-${index}`}
                    quote={item.quote}
                    sceneId={item.scene_id}
                    sceneTitle={sceneTitles.get(item.scene_id) ?? null}
                    onOpenEvidence={onOpenEvidence}
                  />
                ))}
                {row.uncertainty && (
                  <p className="mt-2 text-xs italic text-muted-foreground">{row.uncertainty}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {row.scene_id && (
                    <Button size="sm" variant="ghost" onClick={() => onOpenScene(row.scene_id!)}>
                      Open the scene
                    </Button>
                  )}
                  {row.origin === "author" ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(row.id)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)}>
                        Remove
                      </Button>
                    </>
                  ) : row.status === "open" ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onStatus(row.id, "intentional")}
                      >
                        I meant that
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
            ),
          )}
        </ul>
      )}

      <section>
        <h2 className="font-serif text-lg">Worth another look</h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Readings that rested on wording you've since changed. Nothing was kept or thrown away on
          your behalf.
        </p>
        {stale.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing is waiting on you here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stale.map((claim) => (
              <li key={claim.id} className="rounded-md border border-border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 text-sm leading-relaxed">
                    <span className="text-muted-foreground">{claim.subject}</span> —{" "}
                    {claim.assertion}
                  </p>
                  {claim.scene_id && (
                    <span className="text-xs text-muted-foreground">
                      {sceneTitles.get(claim.scene_id) ?? ""}
                    </span>
                  )}
                </div>
                {(Array.isArray(claim.evidence) ? claim.evidence : [])
                  .slice(0, 1)
                  .map((item, index) => (
                    <EvidenceButton
                      key={`${claim.id}-${index}`}
                      quote={item.quote}
                      sceneId={item.scene_id}
                      sceneTitle={sceneTitles.get(item.scene_id) ?? null}
                      onOpenEvidence={onOpenEvidence}
                    />
                  ))}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onClaimAction(claim.id, "confirm")}>
                    Still right
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onClaimAction(claim.id, "reject")}>
                    Not any more
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onClaimAction(claim.id, "reopen")}>
                    Leave it open
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
