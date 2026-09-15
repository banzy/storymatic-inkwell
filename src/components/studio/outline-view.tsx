import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BEAT_KINDS, type BeatKind, type OutlineBeat, type OutlineScene } from "@/lib/outline.functions";

const KIND_LABELS: Record<string, string> = {
  act: "Act",
  chapter: "Chapter",
  beat: "Beat",
  turning_point: "Turning point",
  reveal: "Reveal",
};

export type BeatDraft = {
  id?: string | null;
  kind: BeatKind;
  title: string;
  intent: string | null;
};

function Note({ children, tone = "quiet" }: { children: React.ReactNode; tone?: "quiet" | "planned" }) {
  return (
    <p
      className={`mt-2 rounded-sm px-2 py-1 text-xs leading-relaxed ${
        tone === "planned"
          ? "bg-planned text-planned-foreground"
          : "bg-secondary text-muted-foreground"
      }`}
    >
      {children}
    </p>
  );
}

export function OutlineView(props: {
  beats: OutlineBeat[];
  scenes: OutlineScene[];
  chapters: { id: string; title: string; position: number }[];
  loading: boolean;
  reviewing: boolean;
  message: string | null;
  unplanned: { sceneId: string; note: string }[];
  onClose: () => void;
  onReview: () => void;
  onOpenScene: (sceneId: string) => void;
  onSaveBeat: (draft: BeatDraft) => void;
  onMoveBeat: (id: string, direction: "up" | "down") => void;
  onDeleteBeat: (id: string) => void;
  onSetBeatState: (
    id: string,
    patch: { status?: "planned" | "written" | "dropped"; sceneId?: string | null; confirm?: boolean },
  ) => void;
}) {
  const {
    beats,
    scenes,
    chapters,
    loading,
    reviewing,
    message,
    unplanned,
    onClose,
    onReview,
    onOpenScene,
    onSaveBeat,
    onMoveBeat,
    onDeleteBeat,
    onSetBeatState,
  } = props;

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [intent, setIntent] = useState("");
  const [kind, setKind] = useState<BeatKind>("beat");

  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const noteBySceneId = new Map(unplanned.map((item) => [item.sceneId, item.note]));
  const plannedSceneIds = new Set(
    beats.filter((beat) => beat.scene_id).map((beat) => beat.scene_id as string),
  );

  // Reading order the plan implies, compared with the order the draft actually has.
  const linkedInPlanOrder = beats
    .filter((beat) => beat.scene_id && sceneById.has(beat.scene_id))
    .map((beat) => ({ beat, scene: sceneById.get(beat.scene_id as string)! }));
  const outOfPlanOrder = new Set<string>();
  let highWater = -Infinity;
  for (const item of linkedInPlanOrder) {
    if (item.scene.position < highWater) outOfPlanOrder.add(item.beat.id);
    else highWater = item.scene.position;
  }

  return (
    <section
      className="absolute inset-0 z-30 flex flex-col bg-background"
      aria-label="Outline"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-xl tracking-tight">Outline</h1>
          <p className="text-xs text-muted-foreground">
            What you plan, beside what the draft does. Differences are notes, not mistakes.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={reviewing} onClick={onReview}>
          {reviewing && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {reviewing ? "Comparing…" : "Compare with the draft"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back to writing
        </Button>
      </header>

      {message && (
        <p
          className="border-b border-border bg-secondary px-6 py-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Opening the outline…</p>
        ) : (
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
            {/* ------------------------------------------------------ planned lane */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Planned
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setAdding((value) => !value)}>
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add a step
                </Button>
              </div>

              {adding && (
                <form
                  className="mt-3 space-y-3 rounded-md border border-border bg-card p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!title.trim()) return;
                    onSaveBeat({ kind, title: title.trim(), intent: intent.trim() || null });
                    setTitle("");
                    setIntent("");
                    setAdding(false);
                  }}
                >
                  <div className="grid gap-2">
                    <Label htmlFor="beat-title">What happens</Label>
                    <Input
                      id="beat-title"
                      value={title}
                      placeholder="Elena burns the letter"
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="beat-intent">Why it's there (optional)</Label>
                    <Textarea
                      id="beat-intent"
                      rows={2}
                      value={intent}
                      onChange={(event) => setIntent(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="beat-kind">Kind</Label>
                    <select
                      id="beat-kind"
                      className="rounded-md border border-input bg-card px-2 py-1.5 text-sm"
                      value={kind}
                      onChange={(event) => setKind(event.target.value as BeatKind)}
                    >
                      {BEAT_KINDS.map((value) => (
                        <option key={value} value={value}>
                          {KIND_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={!title.trim()}>
                      Save step
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {beats.length === 0 && !adding && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nothing planned. You can write without a plan — add steps only if they help.
                </p>
              )}

              <ul className="mt-3 space-y-3">
                {beats.map((beat, index) => {
                  const scene = beat.scene_id ? sceneById.get(beat.scene_id) : null;
                  const unconfirmedReading =
                    beat.link_basis === "inferred" && !beat.author_confirmed;
                  return (
                    <li
                      key={beat.id}
                      className={`rounded-md border border-border bg-card p-3 ${
                        beat.status === "dropped" ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                          {KIND_LABELS[beat.kind] ?? "Beat"}
                        </span>
                        <div className="flex shrink-0 gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Move ${beat.title} earlier`}
                            disabled={index === 0}
                            onClick={() => onMoveBeat(beat.id, "up")}
                          >
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Move ${beat.title} later`}
                            disabled={index === beats.length - 1}
                            onClick={() => onMoveBeat(beat.id, "down")}
                          >
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${beat.title} from the plan`}
                            onClick={() => onDeleteBeat(beat.id)}
                          >
                            <X className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>

                      <p className="mt-2 font-serif text-base leading-snug">{beat.title}</p>
                      {beat.intent && (
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {beat.intent}
                        </p>
                      )}

                      {scene ? (
                        <Note>
                          {unconfirmedReading ? "Storymatic reads this as written in " : "Written in "}
                          <button
                            type="button"
                            className="underline underline-offset-2"
                            onClick={() => onOpenScene(scene.id)}
                          >
                            {scene.title}
                          </button>
                          {beat.link_note ? ` — ${beat.link_note}` : "."}
                        </Note>
                      ) : beat.status === "dropped" ? (
                        <Note>Set aside.</Note>
                      ) : (
                        <Note tone="planned">
                          Planned — not in the draft yet
                          {beat.link_note ? ` · ${beat.link_note}` : ""}
                        </Note>
                      )}

                      {outOfPlanOrder.has(beat.id) && (
                        <Note>This happens earlier in the draft than in your plan.</Note>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2">
                        {unconfirmedReading && scene && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSetBeatState(beat.id, { confirm: true })}
                            >
                              That's right
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSetBeatState(beat.id, { sceneId: null })}
                            >
                              Not this scene
                            </Button>
                          </>
                        )}
                        {!scene && beat.status !== "dropped" && (
                          <>
                            <select
                              className="rounded-md border border-input bg-card px-2 py-1 text-xs"
                              aria-label={`Mark where ${beat.title} was written`}
                              value=""
                              onChange={(event) =>
                                event.target.value &&
                                onSetBeatState(beat.id, { sceneId: event.target.value })
                              }
                            >
                              <option value="">Written in…</option>
                              {scenes.map((row) => (
                                <option key={row.id} value={row.id}>
                                  {row.title}
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSetBeatState(beat.id, { status: "dropped" })}
                            >
                              Set aside
                            </Button>
                          </>
                        )}
                        {beat.status === "dropped" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSetBeatState(beat.id, { status: "planned" })}
                          >
                            Bring back
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ------------------------------------------------------- written lane */}
            <div>
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                As written
              </h2>
              {scenes.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  No scenes yet. The draft lane fills itself as you write.
                </p>
              )}
              <ul className="mt-3 space-y-3">
                {scenes.map((scene) => {
                  const chapter = chapterById.get(scene.chapter_id);
                  const inPlan = plannedSceneIds.has(scene.id);
                  return (
                    <li key={scene.id} className="rounded-md border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">
                        {chapter?.title ?? "Chapter"} · {scene.word_count} words
                        {scene.pov ? ` · ${scene.pov}` : ""}
                        {scene.location ? ` · ${scene.location}` : ""}
                        {scene.story_time ? ` · ${scene.story_time}` : ""}
                      </p>
                      <button
                        type="button"
                        className="mt-1 text-left font-serif text-base leading-snug underline-offset-4 hover:underline"
                        onClick={() => onOpenScene(scene.id)}
                      >
                        {scene.title}
                      </button>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {scene.summary ?? (scene.excerpt ? `${scene.excerpt}…` : "Nothing written yet.")}
                      </p>
                      {!inPlan && scene.word_count > 0 && (
                        <Note>
                          Not in the plan
                          {noteBySceneId.get(scene.id) ? ` — ${noteBySceneId.get(scene.id)}` : ""}
                        </Note>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
