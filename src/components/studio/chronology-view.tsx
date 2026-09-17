import { useState } from "react";
import { ArrowDown, ArrowUp, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoryEvent } from "@/lib/timeline.functions";

export type EventDraft = {
  id: string | null;
  summary: string;
  whenText: string | null;
  sceneId: string | null;
  certainty: "clear" | "roughly" | "unclear";
};

const CERTAINTY_LABEL: Record<string, string> = {
  clear: "The draft says so",
  roughly: "Worked out from the draft",
  unclear: "Order only implied",
};

function EventForm(props: {
  event: StoryEvent | null;
  scenes: { id: string; title: string }[];
  onSave: (draft: EventDraft) => void;
  onCancel: () => void;
}) {
  const [summary, setSummary] = useState(props.event?.summary ?? "");
  const [whenText, setWhenText] = useState(props.event?.when_text ?? "");
  const [sceneId, setSceneId] = useState(props.event?.scene_id ?? "");
  const [certainty, setCertainty] = useState<"clear" | "roughly" | "unclear">(
    (props.event?.certainty as "clear" | "roughly" | "unclear") ?? "clear",
  );

  return (
    <form
      className="space-y-3 rounded-md border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!summary.trim()) return;
        props.onSave({
          id: props.event?.id ?? null,
          summary,
          whenText: whenText.trim() || null,
          sceneId: sceneId || null,
          certainty,
        });
      }}
    >
      <div>
        <Label htmlFor="event-summary">What happens</Label>
        <Textarea
          id="event-summary"
          rows={2}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Marcus leaves the district before the bells"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="event-when">When, in your own words (optional)</Label>
          <Input
            id="event-when"
            value={whenText}
            onChange={(event) => setWhenText(event.target.value)}
            placeholder="that night"
          />
        </div>
        <div>
          <Label htmlFor="event-scene">Shown in (optional)</Label>
          <select
            id="event-scene"
            className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm"
            value={sceneId}
            onChange={(event) => setSceneId(event.target.value)}
          >
            <option value="">Not shown on the page</option>
            {props.scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="event-certainty">How settled is the timing</Label>
        <select
          id="event-certainty"
          className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm sm:w-72"
          value={certainty}
          onChange={(event) =>
            setCertainty(event.target.value as "clear" | "roughly" | "unclear")
          }
        >
          <option value="clear">Settled</option>
          <option value="roughly">Roughly</option>
          <option value="unclear">Still open</option>
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

function EventRow(props: {
  event: StoryEvent;
  index: number;
  first: boolean;
  last: boolean;
  sceneTitles: Map<string, string>;
  onEdit: () => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onJudge: (id: string, confirmed: boolean) => void;
  onDelete: (id: string) => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { event } = props;
  const evidence = Array.isArray(event.evidence) ? event.evidence : [];
  const sceneTitle = event.scene_id ? props.sceneTitles.get(event.scene_id) : null;

  return (
    <li className="flex gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <span className="text-xs text-muted-foreground">{props.index + 1}</span>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          disabled={props.first}
          aria-label="Earlier in the story"
          onClick={() => props.onMove(event.id, "up")}
        >
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          disabled={props.last}
          aria-label="Later in the story"
          onClick={() => props.onMove(event.id, "down")}
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm text-foreground">{event.summary}</p>
          {event.when_text && (
            <span className="font-serif text-sm italic text-muted-foreground">
              {event.when_text}
            </span>
          )}
          <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {event.author_confirmed ? "Yours" : "Storymatic's reading"}
          </span>
          {event.certainty !== "clear" && (
            <span className="rounded-sm bg-planned px-1.5 py-0.5 text-xs text-planned-foreground">
              {CERTAINTY_LABEL[event.certainty] ?? event.certainty}
            </span>
          )}
        </div>

        {evidence.slice(0, 1).map((item, index) => (
          <button
            key={index}
            type="button"
            className="mt-1.5 flex w-full items-start gap-1.5 rounded-sm bg-secondary/60 px-2 py-1 text-left text-xs hover:bg-secondary"
            onClick={() => props.onOpenEvidence(item.scene_id, item.quote)}
          >
            <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span className="font-serif italic">{item.quote}</span>
          </button>
        ))}

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {sceneTitle && (
            <Button
              size="sm"
              variant="ghost"
              className="-ml-2"
              onClick={() => props.onOpenScene(event.scene_id!)}
            >
              {sceneTitle}
            </Button>
          )}
          {event.origin === "analysis" && !event.author_confirmed ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => props.onJudge(event.id, true)}>
                That's right
              </Button>
              <Button size="sm" variant="ghost" onClick={() => props.onJudge(event.id, false)}>
                Not this
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={props.onEdit}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => props.onDelete(event.id)}>
                Remove
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * The story's own chronology: what happens when inside the book, in an order the
 * author controls, independent of the order the scenes are read in. Vague timings
 * stay vague — nothing is turned into a date the draft never gave.
 */
export function ChronologyView(props: {
  events: StoryEvent[];
  scenes: { id: string; title: string; story_time: string | null }[];
  sceneTitles: Map<string, string>;
  loading: boolean;
  onSave: (draft: EventDraft) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onJudge: (id: string, confirmed: boolean) => void;
  onDelete: (id: string) => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (props.loading) return <p className="text-sm text-muted-foreground">Reading the order…</p>;

  const editing = props.events.find((event) => event.id === editingId) ?? null;
  const untimed = props.scenes.filter((scene) => !scene.story_time?.trim());

  return (
    <div className="space-y-5">
      <p className="max-w-prose text-sm text-muted-foreground">
        When things happen in the story, not the order you read them in. Anything the draft leaves
        vague stays vague, and you can move an event earlier or later yourself.
      </p>

      {adding || editing ? (
        <EventForm
          event={editing}
          scenes={props.scenes.map((scene) => ({ id: scene.id, title: scene.title }))}
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
          Note something that happens
        </Button>
      )}

      {props.events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing on the chronology yet. Press “Read the chronology” and Storymatic works out the
          order from your scenes, or note something yourself.
        </p>
      ) : (
        <ul className="space-y-2">
          {props.events
            .filter((event) => event.id !== editingId)
            .map((event, index, list) => (
              <EventRow
                key={event.id}
                event={event}
                index={index}
                first={index === 0}
                last={index === list.length - 1}
                sceneTitles={props.sceneTitles}
                onEdit={() => {
                  setAdding(false);
                  setEditingId(event.id);
                }}
                onMove={props.onMove}
                onJudge={props.onJudge}
                onDelete={props.onDelete}
                onOpenScene={props.onOpenScene}
                onOpenEvidence={props.onOpenEvidence}
              />
            ))}
        </ul>
      )}

      {untimed.length > 0 && (
        <section>
          <h3 className="font-serif text-lg text-foreground">Scenes with no story time yet</h3>
          <p className="text-sm text-muted-foreground">
            Left unplaced rather than guessed at.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1">
            {untimed.map((scene) => (
              <li key={scene.id}>
                <Button size="sm" variant="ghost" onClick={() => props.onOpenScene(scene.id)}>
                  {scene.title}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
