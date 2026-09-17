import { Button } from "@/components/ui/button";
import type { StoryOverview } from "@/lib/overview.functions";

const relative = (iso: string | null) => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
};

function Section(props: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-lg text-foreground">{props.title}</h2>
      {props.note && <p className="text-sm text-muted-foreground">{props.note}</p>}
      <div className="mt-2">{props.children}</div>
    </section>
  );
}

/**
 * One editorial page: where the draft stands, what changed since you last wrote,
 * what's still owed, and a few things worth a look. No charts, no scores.
 */
export function OverviewView(props: {
  overview: StoryOverview | undefined;
  loading: boolean;
  onOpenScene: (sceneId: string) => void;
  onGoToTab: (tab: "promises" | "discoveries" | "timeline" | "people") => void;
  onOpenOutline: () => void;
}) {
  if (props.loading || !props.overview)
    return <p className="text-sm text-muted-foreground">Reading where things stand…</p>;

  const o = props.overview;
  const last = relative(o.lastWrittenAt);

  return (
    <div className="max-w-3xl space-y-7">
      <Section title="Where the draft stands">
        <p className="max-w-prose font-serif text-lg leading-relaxed text-foreground">
          {o.words.toLocaleString()} words across {o.sceneCount} scene
          {o.sceneCount === 1 ? "" : "s"} in {o.chapterCount} chapter
          {o.chapterCount === 1 ? "" : "s"}.
          {o.emptyScenes > 0 && (
            <>
              {" "}
              {o.emptyScenes} scene{o.emptyScenes === 1 ? " is" : "s are"} still waiting for a first
              line.
            </>
          )}
          {last && <> You last wrote {last}.</>}
        </p>
        {o.longestScene && (
          <p className="mt-1 text-sm text-muted-foreground">
            The longest so far is{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => props.onOpenScene(o.longestScene!.id)}
            >
              {o.longestScene.title}
            </button>{" "}
            at {o.longestScene.words.toLocaleString()} words.
          </p>
        )}
      </Section>

      <Section title="What you touched last" note="The scenes with the most recent work in them.">
        {o.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing written yet.</p>
        ) : (
          <ul className="space-y-1">
            {o.recent.map((item) => (
              <li key={item.sceneId} className="text-sm">
                <button
                  type="button"
                  className="text-foreground underline underline-offset-2"
                  onClick={() => props.onOpenScene(item.sceneId)}
                >
                  {item.title}
                </button>
                <span className="text-muted-foreground">
                  {" "}
                  — {relative(item.at)}, {item.words.toLocaleString()} words
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="What's still owed"
        note="Things the draft leads the reader to expect. Not a list of mistakes."
      >
        {o.owed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing is waiting to be paid off — or nothing has been read yet.
          </p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {o.owed.map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="text-foreground">{item.title}</span>
                  {item.promise && (
                    <span className="text-muted-foreground"> — {item.promise}</span>
                  )}
                </li>
              ))}
            </ul>
            {o.owedCount > o.owed.length && (
              <Button
                size="sm"
                variant="ghost"
                className="-ml-2 mt-1"
                onClick={() => props.onGoToTab("promises")}
              >
                All {o.owedCount} in Promises
              </Button>
            )}
          </>
        )}
      </Section>

      <Section
        title="A few things worth a look"
        note="Storymatic's quiet notes. None of it is a verdict."
      >
        {o.worthALook.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting for you.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {o.worthALook.map((item) => (
                <li key={item.id} className="rounded-md border border-border bg-card p-3">
                  <p className="text-sm text-foreground">{item.title}</p>
                  {item.body && (
                    <p className="mt-1 max-w-prose text-sm text-muted-foreground">{item.body}</p>
                  )}
                  {item.sceneId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="-ml-2 mt-1"
                      onClick={() => props.onOpenScene(item.sceneId!)}
                    >
                      Open the scene
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {o.worthALookCount > o.worthALook.length && (
              <Button
                size="sm"
                variant="ghost"
                className="-ml-2 mt-1"
                onClick={() => props.onGoToTab("discoveries")}
              >
                All {o.worthALookCount} in Discoveries
              </Button>
            )}
          </>
        )}
      </Section>

      {(o.needsReview > 0 || o.plannedNotWritten.length > 0 || o.unplacedScenes > 0) && (
        <Section title="Loose ends" note="Nothing here needs doing. It's only for your awareness.">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {o.needsReview > 0 && (
              <li>
                {o.needsReview} reading{o.needsReview === 1 ? " rests" : "s rest"} on wording you've
                since changed.{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => props.onGoToTab("people")}
                >
                  Look again
                </button>
              </li>
            )}
            {o.plannedNotWritten.length > 0 && (
              <li>
                Planned but not in the draft yet:{" "}
                {o.plannedNotWritten.map((beat) => beat.title).join(", ")}.{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={props.onOpenOutline}
                >
                  Open the outline
                </button>
              </li>
            )}
            {o.unplacedScenes > 0 && (
              <li>
                {o.unplacedScenes} scene{o.unplacedScenes === 1 ? " has" : "s have"} no story time
                yet.{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => props.onGoToTab("timeline")}
                >
                  Open the chronology
                </button>
              </li>
            )}
          </ul>
        </Section>
      )}
    </div>
  );
}
