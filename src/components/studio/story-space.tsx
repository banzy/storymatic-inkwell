import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Loader2, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OutlineScene } from "@/lib/outline.functions";
import type { StoryClaim, StoryEntity } from "@/lib/story.functions";

export type StorySpaceTab =
  | "overview"
  | "synopsis"
  | "scenes"
  | "people"
  | "plot"
  | "promises"
  | "timeline"
  | "relationships"
  | "world"
  | "research"
  | "themes"
  | "questions"
  | "discoveries"
  | "possibilities";


const TAB_LABELS: Record<StorySpaceTab, string> = {
  overview: "Overview",
  synopsis: "Synopsis",
  scenes: "Scenes",
  people: "People",
  plot: "Plot",
  promises: "Promises",
  timeline: "Timeline",
  relationships: "Relationships",
  world: "World",
  research: "Research",
  themes: "Themes",
  questions: "Questions",
  discoveries: "Discoveries",

  possibilities: "Possibilities",
};

const TAB_BLURBS: Record<StorySpaceTab, string> = {
  overview: "Where the book stands, in a page.",
  synopsis: "A summary that keeps up with the draft, at whatever level you need.",
  scenes: "One card for each scene, filled in from what you've written.",
  people: "Who someone is, where they stand, and what they know at a point in the story.",
  plot: "The threads running through the draft, and where each one is picked up.",
  promises: "What the story sets up, where it pays off, and what's still owed.",
  timeline: "When things happen in the story, not the order you read them in.",
  relationships: "Where each relationship stands by this point in the draft.",
  world: "The places, things, groups and rules your draft has established.",
  research: "Your own notes and sources, kept outside the story.",
  themes: "What the scenes keep returning to — read as a question, never a verdict.",
  questions: "Where two scenes seem to disagree, with both passages beside each other.",
  discoveries: "Quiet notes on what the scenes together seem to say.",

  possibilities: "Ways a scene could go, held beside the draft.",
};





const TRUTH_LABEL: Record<string, string> = {
  canonical: "Established in the draft",
  inferred: "Storymatic's reading",
  possible: "Possible",
  planned: "Planned — not in the draft",
  rejected: "You set this aside",
  contradicted: "Contradicted elsewhere",
};

export type CardPatch = {
  summary: string | null;
  pov: string | null;
  location: string | null;
  storyTime: string | null;
};

function Badge({ truth }: { truth: string }) {
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-xs ${
        truth === "planned"
          ? "bg-planned text-planned-foreground"
          : truth === "canonical"
            ? "bg-primary/10 text-foreground"
            : "bg-secondary text-secondary-foreground"
      }`}
    >
      {TRUTH_LABEL[truth] ?? truth}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="text-foreground/70">{label}</span>{" "}
      {value?.trim() ? value : <span className="italic">not given yet</span>}
    </p>
  );
}

function SceneCard(props: {
  scene: OutlineScene;
  chapterTitle: string | null;
  first: boolean;
  last: boolean;
  onOpenScene: (sceneId: string) => void;
  onMoveScene: (sceneId: string, direction: "up" | "down") => void;
  onSaveCard: (sceneId: string, patch: CardPatch) => void;
  onDropCard: (sceneId: string, targetSceneId: string, before: boolean) => void;
}) {
  const { scene, chapterTitle, first, last, onOpenScene, onMoveScene, onSaveCard, onDropCard } =
    props;
  const [editing, setEditing] = useState(false);
  const [over, setOver] = useState<"before" | "after" | null>(null);
  const [summary, setSummary] = useState(scene.summary ?? "");
  const [pov, setPov] = useState(scene.pov ?? "");
  const [location, setLocation] = useState(scene.location ?? "");
  const [storyTime, setStoryTime] = useState(scene.story_time ?? "");

  return (
    <article
      draggable={!editing}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/storymatic-scene", scene.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("text/storymatic-scene")) return;
        event.preventDefault();
        const box = event.currentTarget.getBoundingClientRect();
        setOver(event.clientY < box.top + box.height / 2 ? "before" : "after");
      }}
      onDragLeave={() => setOver(null)}
      onDrop={(event) => {
        const dragged = event.dataTransfer.getData("text/storymatic-scene");
        const side = over;
        setOver(null);
        if (!dragged || dragged === scene.id) return;
        event.preventDefault();
        onDropCard(dragged, scene.id, side !== "after");
      }}
      className={`flex cursor-grab flex-col rounded-md border bg-card p-3 ${
        over ? "border-primary ring-1 ring-primary" : "border-border"
      }`}
    >
      <p className="text-xs text-muted-foreground">
        {chapterTitle ?? "Chapter"} · {scene.word_count} words
      </p>
      <h3 className="mt-1 font-serif text-base leading-snug">{scene.title}</h3>
      {over && (
        <p className="mt-1 text-xs text-primary">
          {over === "before" ? "Lands before this scene" : "Lands after this scene"}
        </p>
      )}


      {editing ? (
        <div className="mt-2 space-y-2">
          <div>
            <Label htmlFor={`sum-${scene.id}`} className="text-xs">
              What happens
            </Label>
            <Textarea
              id={`sum-${scene.id}`}
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <Label htmlFor={`pov-${scene.id}`} className="text-xs">
                Told by
              </Label>
              <Input
                id={`pov-${scene.id}`}
                value={pov}
                onChange={(event) => setPov(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`loc-${scene.id}`} className="text-xs">
                Place
              </Label>
              <Input
                id={`loc-${scene.id}`}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`time-${scene.id}`} className="text-xs">
                Story time
              </Label>
              <Input
                id={`time-${scene.id}`}
                value={storyTime}
                onChange={(event) => setStoryTime(event.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onSaveCard(scene.id, {
                  summary: summary.trim() || null,
                  pov: pov.trim() || null,
                  location: location.trim() || null,
                  storyTime: storyTime.trim() || null,
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
        <>
          <p className="mt-2 text-sm leading-relaxed">
            {scene.summary?.trim() || (
              <span className="text-muted-foreground">
                {scene.excerpt ? `${scene.excerpt}…` : "Nothing written here yet."}
              </span>
            )}
          </p>
          <div className="mt-2 space-y-0.5">
            <Meta label="Told by" value={scene.pov} />
            <Meta label="Place" value={scene.location} />
            <Meta label="Story time" value={scene.story_time} />
          </div>
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => onOpenScene(scene.id)}>
          Open
        </Button>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Edit card
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          disabled={first}
          aria-label={`Move ${scene.title} earlier`}
          onClick={() => onMoveScene(scene.id, "up")}
        >
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          disabled={last}
          aria-label={`Move ${scene.title} later`}
          onClick={() => onMoveScene(scene.id, "down")}
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

function ClaimLine(props: {
  claim: StoryClaim;
  sceneTitle: string | null;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { claim, sceneTitle, onOpenEvidence } = props;
  const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];
  return (
    <li className="rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge truth={claim.truth_type} />
        {sceneTitle && <span className="text-xs text-muted-foreground">{sceneTitle}</span>}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed">
        <span className="text-muted-foreground">{claim.subject}</span> — {claim.assertion}
      </p>
      {evidence.slice(0, 2).map((item, index) => (
        <button
          key={`${claim.id}-${index}`}
          type="button"
          className="mt-1.5 flex w-full items-start gap-1.5 rounded-sm bg-secondary/60 px-2 py-1 text-left text-xs italic text-muted-foreground hover:bg-secondary"
          onClick={() => onOpenEvidence(item.scene_id, item.quote)}
        >
          <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span>{item.quote}</span>
        </button>
      ))}
    </li>
  );
}

export function StorySpace(props: {
  tab: StorySpaceTab;
  onTabChange: (tab: StorySpaceTab) => void;
  scenes: OutlineScene[];
  chapters: { id: string; title: string; position: number }[];
  entities: StoryEntity[];
  claims: StoryClaim[];
  sceneTitles: Map<string, string>;
  loading: boolean;
  filling: boolean;
  message: string | null;
  moveNotes: { sceneTitle: string; notes: { note: string; certainty: string }[] } | null;
  onDismissMoveNotes: () => void;
  onClose: () => void;
  onFillCards: () => void;
  onOpenScene: (sceneId: string) => void;
  onMoveScene: (sceneId: string, direction: "up" | "down") => void;
  onSaveCard: (sceneId: string, patch: CardPatch) => void;
  onDropCard: (sceneId: string, targetSceneId: string, before: boolean) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
  /** The Synopsis, Relationships and Discoveries bodies, composed by the workspace. */
  extraSlot?: ReactNode;
  /** The action button for whichever tab is open (other than Scenes). */
  headerAction?: ReactNode;
  /** True while the draft has no words yet: every view waits rather than guessing. */
  emptyDraft?: boolean;
}) {
  const {
    tab,
    onTabChange,
    scenes,
    chapters,
    entities,
    claims,
    sceneTitles,
    loading,
    filling,
    message,
    moveNotes,
    onDismissMoveNotes,
    onClose,
    onFillCards,
    onOpenScene,
    onMoveScene,
    onSaveCard,
    onDropCard,
    onOpenEvidence,
    extraSlot,
    headerAction,
    emptyDraft = false,
  } = props;

  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const threads = entities.filter((entity) => entity.kind === "thread");
  const threadClaims = claims.filter(
    (claim) => claim.claim_kind === "thread" || claim.claim_kind === "event",
  );
  const looseThreadClaims = threadClaims.filter(
    (claim) => !claim.entity_id || !threads.some((thread) => thread.id === claim.entity_id),
  );
  const eventClaims = claims
    .filter((claim) => claim.claim_kind === "event")
    .slice()
    .sort((a, b) => (a.story_position ?? 9999) - (b.story_position ?? 9999));

  return (
    <section
      className="absolute inset-0 z-30 flex flex-col bg-background"
      aria-label="Story"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-xl tracking-tight">Story</h1>
          <p className="text-xs text-muted-foreground">{TAB_BLURBS[tab]}</p>
        </div>
        {tab === "scenes" ? (
          <Button variant="outline" size="sm" disabled={filling} onClick={onFillCards}>
            {filling && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
            {filling ? "Reading…" : "Fill in the blanks"}
          </Button>
        ) : (
          headerAction
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back to writing
        </Button>
      </header>

      <nav className="flex gap-1 border-b border-border px-6 py-2" aria-label="Story views">
        {(Object.keys(TAB_LABELS) as StorySpaceTab[]).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={key === tab ? "secondary" : "ghost"}
            aria-current={key === tab ? "page" : undefined}
            onClick={() => onTabChange(key)}
          >
            {TAB_LABELS[key]}
          </Button>
        ))}
      </nav>

      {(message || moveNotes) && (
        <div className="border-b border-border px-6 py-2 text-xs text-muted-foreground">
          {message && <p>{message}</p>}
          {moveNotes && (
            <div className="mt-1">
              <p className="text-foreground">
                What moving “{moveNotes.sceneTitle}” changes
                <Button size="sm" variant="ghost" className="ml-1" onClick={onDismissMoveNotes}>
                  Dismiss
                </Button>
              </p>
              {moveNotes.notes.length === 0 ? (
                <p>Nothing in the draft seems to break because of the move.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {moveNotes.notes.map((item, index) => (
                    <li key={index}>
                      <span className="text-foreground/70">
                        {item.certainty === "clear" ? "Clear:" : "Possibly:"}
                      </span>{" "}
                      {item.note}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 italic">Nothing has been rewritten. The move is yours to keep.</p>
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Gathering your story…</p>
        ) : tab === "synopsis" ||
          tab === "plot" ||
          tab === "people" ||
          tab === "promises" ||
          tab === "world" ||
          tab === "research" ||
          tab === "overview" ||
          tab === "possibilities" ||

          tab === "timeline" ||


          tab === "relationships" ||
          tab === "themes" ||
          tab === "questions" ||
          tab === "discoveries" ? (



          extraSlot
        ) : tab === "scenes" ? (
          scenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scenes yet.</p>
          ) : (
            <>
              <p className="mb-3 max-w-prose text-xs text-muted-foreground">
                Drag a card onto another to move that scene, or use the arrows. Either way the
                writing stays exactly as you left it.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {scenes.map((scene, index) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  chapterTitle={chapterById.get(scene.chapter_id)?.title ?? null}
                  first={index === 0}
                  last={index === scenes.length - 1}
                  onOpenScene={onOpenScene}
                  onMoveScene={onMoveScene}
                  onSaveCard={onSaveCard}
                  onDropCard={onDropCard}
                />
              ))}
              </div>
            </>
          )
        ) : tab === "plot" ? (
          threads.length === 0 && looseThreadClaims.length === 0 ? (
            <p className="max-w-prose text-sm text-muted-foreground">
              No threads yet. Open a scene, choose Story in the side panel and read it — the threads
              Storymatic finds appear here with the passages that carry them.
            </p>
          ) : (
            <div className="space-y-6">
              {threads.map((thread) => {
                const own = threadClaims.filter((claim) => claim.entity_id === thread.id);
                return (
                  <section key={thread.id}>
                    <h2 className="font-serif text-lg">{thread.name}</h2>
                    {thread.identity && (
                      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                        {thread.identity}
                      </p>
                    )}
                    {thread.current_state && (
                      <p className="mt-1 max-w-prose text-sm">
                        <span className="text-muted-foreground">Where it stands:</span>{" "}
                        {thread.current_state}
                      </p>
                    )}
                    {own.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Nothing in the draft is attached to this thread yet.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {own.map((claim) => (
                          <ClaimLine
                            key={claim.id}
                            claim={claim}
                            sceneTitle={claim.scene_id ? (sceneTitles.get(claim.scene_id) ?? null) : null}
                            onOpenEvidence={onOpenEvidence}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
              {looseThreadClaims.length > 0 && (
                <section>
                  <h2 className="font-serif text-lg">Not tied to a thread yet</h2>
                  <ul className="mt-2 space-y-2">
                    {looseThreadClaims.map((claim) => (
                      <ClaimLine
                        key={claim.id}
                        claim={claim}
                        sceneTitle={claim.scene_id ? (sceneTitles.get(claim.scene_id) ?? null) : null}
                        onOpenEvidence={onOpenEvidence}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="font-serif text-lg">Scenes by story time</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Times are taken from the scenes themselves. Where a scene gives none, it stays
                unplaced rather than guessed.
              </p>
              <ol className="mt-3 space-y-2">
                {scenes.map((scene, index) => (
                  <li key={scene.id} className="rounded-md border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">
                      {scene.story_time?.trim() ? (
                        scene.story_time
                      ) : (
                        <span className="italic">No time given in the scene</span>
                      )}{" "}
                      · read {index + 1} of {scenes.length}
                    </p>
                    <button
                      type="button"
                      className="mt-1 text-left font-serif text-base hover:underline"
                      onClick={() => onOpenScene(scene.id)}
                    >
                      {scene.title}
                    </button>
                    {scene.summary && (
                      <p className="mt-1 text-sm text-muted-foreground">{scene.summary}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <h2 className="font-serif text-lg">Events the draft establishes</h2>
              {eventClaims.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  No events recorded yet. Read a scene from the Story panel and they'll gather here.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {eventClaims.map((claim) => (
                    <ClaimLine
                      key={claim.id}
                      claim={claim}
                      sceneTitle={claim.scene_id ? (sceneTitles.get(claim.scene_id) ?? null) : null}
                      onOpenEvidence={onOpenEvidence}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
