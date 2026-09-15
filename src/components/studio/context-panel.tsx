import { useState, type ReactNode } from "react";
import { CircleAlert, Quote, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PanelView =
  | "ask"
  | "proposal"
  | "scene"
  | "director"
  | "observations"
  | "revisions"
  | "story"
  | "characters"
  | "possibilities"
  | "settings";


export type DirectionRow = {
  id: string;
  scope: string;
  scene_id: string | null;
  chapter_id: string | null;
  subject: string | null;
  body: string;
  kind: string;
  status: string;
  is_inferred: boolean;
  confirmed: boolean;
};

export type ObservationRow = {
  id: string;
  scene_id: string | null;
  title: string;
  body: string;
  why_it_matters: string | null;
  uncertainty: string | null;
  status: string;
  origin: string;
  evidence: unknown;
};

export type RevisionRow = {
  id: string;
  created_at: string;
  word_count: number;
  source: string;
  label: string | null;
  plain_text: string;
};

export type SceneMeta = {
  id: string;
  title: string;
  summary: string | null;
  pov: string | null;
  location: string | null;
  story_time: string | null;
  word_count: number;
};

const VIEW_TITLES: Record<PanelView, string> = {
  ask: "Ask Storymatic",
  proposal: "Suggested change",

  scene: "Scene context",
  director: "Your direction",
  observations: "Observations",
  revisions: "Revision history",
  story: "Story",
  characters: "Characters",
  possibilities: "Possibilities",
  settings: "Project settings",
};

function NotYetAvailable({ what, when }: { what: string; when: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{what} isn't available yet.</p>
      <p className="mt-1.5 leading-relaxed">{when}</p>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const planned = kind === "planned";
  return (
    <span
      className={`rounded-sm px-1.5 py-0.5 text-xs ${
        planned ? "bg-planned text-planned-foreground" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {planned ? "Planned — not in the draft" : kind === "exception" ? "Scene exception" : "Standing"}
    </span>
  );
}

export function ContextPanel(props: {
  view: PanelView;
  onClose: () => void;
  onSelectView: (view: PanelView) => void;
  scene: SceneMeta | null;
  sceneDirections: DirectionRow[];
  directions: DirectionRow[];
  observations: ObservationRow[];
  revisions: RevisionRow[];
  revisionsLoading: boolean;
  projectTitle: string;
  isSample: boolean;
  onSaveSceneMeta: (meta: {
    summary: string | null;
    pov: string | null;
    location: string | null;
    storyTime: string | null;
  }) => void;
  onAddDirection: (body: string, kind: "standing" | "planned" | "exception", sceneScoped: boolean) => void;
  onRetireDirection: (id: string, status: "active" | "retired") => void;
  onObservationStatus: (id: string, status: "open" | "intentional" | "dismissed") => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
  onRestoreRevision: (revisionId: string) => void;
  onResetSample: () => void;
  onExport: () => void;
}) {
  const {
    view,
    onClose,
    scene,
    sceneDirections,
    directions,
    observations,
    revisions,
    revisionsLoading,
    projectTitle,
    isSample,
    onSaveSceneMeta,
    onAddDirection,
    onRetireDirection,
    onObservationStatus,
    onOpenEvidence,
    onRestoreRevision,
    onResetSample,
    onExport,
  } = props;

  const [meta, setMeta] = useState<SceneMeta | null>(scene);
  const [metaSceneId, setMetaSceneId] = useState<string | null>(scene?.id ?? null);
  if ((scene?.id ?? null) !== metaSceneId) {
    setMetaSceneId(scene?.id ?? null);
    setMeta(scene);
  }


  const [newDirection, setNewDirection] = useState("");
  const [newKind, setNewKind] = useState<"standing" | "planned" | "exception">("standing");
  const [sceneScoped, setSceneScoped] = useState(false);
  const [previewRevision, setPreviewRevision] = useState<RevisionRow | null>(null);

  return (
    <aside
      className="flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-panel"
      aria-label={VIEW_TITLES[view]}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{VIEW_TITLES[view]}</h2>
        <Button variant="ghost" size="icon" aria-label="Close panel" onClick={onClose}>
          <X className="size-4" aria-hidden="true" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {view === "ask" && (
          <div className="space-y-4">
            <NotYetAvailable
              what="Ask Storymatic"
              when="It arrives with directed writing assistance in the next increment, together with selection-based rewrites. Nothing here will invent an answer in the meantime."
            />
            <div className="rounded-md border border-border bg-card p-4 text-sm">
              <p className="font-medium">Questions it will answer</p>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li>What does Elena know at this point?</li>
                <li>Where did I first suggest Marcus was hiding something?</li>
                <li>What changes if Elena discovers the betrayal here?</li>
              </ul>
            </div>
          </div>
        )}

        {view === "scene" && meta && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="scene-summary">What happens</Label>
              <Textarea
                id="scene-summary"
                rows={3}
                value={meta.summary ?? ""}
                onChange={(event) => setMeta({ ...meta, summary: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="scene-pov">Point of view</Label>
                <Input
                  id="scene-pov"
                  value={meta.pov ?? ""}
                  onChange={(event) => setMeta({ ...meta, pov: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scene-location">Place</Label>
                <Input
                  id="scene-location"
                  value={meta.location ?? ""}
                  onChange={(event) => setMeta({ ...meta, location: event.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scene-time">When in the story</Label>
              <Input
                id="scene-time"
                value={meta.story_time ?? ""}
                onChange={(event) => setMeta({ ...meta, story_time: event.target.value })}
              />
            </div>
            <Button
              size="sm"
              onClick={() =>
                onSaveSceneMeta({
                  summary: meta.summary?.trim() || null,
                  pov: meta.pov?.trim() || null,
                  location: meta.location?.trim() || null,
                  storyTime: meta.story_time?.trim() || null,
                })
              }
            >
              Save scene context
            </Button>

            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Active direction here
              </h3>
              {sceneDirections.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No direction applies to this scene yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {sceneDirections.map((direction) => (
                    <li key={direction.id} className="rounded-md border border-border bg-card p-3">
                      <KindBadge kind={direction.kind} />
                      <p className="mt-2 text-sm leading-relaxed">{direction.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {view === "director" && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Your instructions to Storymatic. Planned intentions stay separate from what the draft
              establishes.
            </p>
            <ul className="space-y-2">
              {directions.length === 0 && (
                <li className="text-sm text-muted-foreground">No direction written yet.</li>
              )}
              {directions.map((direction) => (
                <li
                  key={direction.id}
                  className={`rounded-md border border-border bg-card p-3 ${
                    direction.status === "retired" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <KindBadge kind={direction.kind} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onRetireDirection(
                          direction.id,
                          direction.status === "retired" ? "active" : "retired",
                        )
                      }
                    >
                      {direction.status === "retired" ? "Reinstate" : "Retire"}
                    </Button>
                  </div>
                  {direction.subject && (
                    <p className="mt-2 text-xs text-muted-foreground">About {direction.subject}</p>
                  )}
                  <p className="mt-1 text-sm leading-relaxed">{direction.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {direction.scene_id ? "This scene" : "Whole project"}
                    {direction.is_inferred && " · interpretation, not confirmed"}
                  </p>
                </li>
              ))}
            </ul>

            <form
              className="space-y-3 border-t border-border pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newDirection.trim()) return;
                onAddDirection(newDirection.trim(), newKind, sceneScoped);
                setNewDirection("");
              }}
            >
              <Label htmlFor="new-direction">Add a direction</Label>
              <Textarea
                id="new-direction"
                rows={3}
                value={newDirection}
                placeholder="Preserve Elena's fragmented voice."
                onChange={(event) => setNewDirection(event.target.value)}
              />
              <div className="grid gap-2">
                <Label htmlFor="direction-kind">Kind</Label>
                <select
                  id="direction-kind"
                  className="rounded-md border border-input bg-card px-2 py-1.5 text-sm"
                  value={newKind}
                  onChange={(event) => setNewKind(event.target.value as typeof newKind)}
                >
                  <option value="standing">Standing preference</option>
                  <option value="planned">Planned — not written yet</option>
                  <option value="exception">Intentional exception</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sceneScoped}
                  onChange={(event) => setSceneScoped(event.target.checked)}
                />
                Apply to the current scene only
              </label>
              <Button type="submit" size="sm" disabled={!newDirection.trim()}>
                Save direction
              </Button>
            </form>
          </div>
        )}

        {view === "observations" && (
          <div className="space-y-3">
            {isSample && (
              <p className="flex items-start gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
                <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Sample insights, written by hand for this manuscript. They are not live analysis.
              </p>
            )}
            {observations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing waiting. Observations appear here quietly; they never interrupt your writing.
              </p>
            )}
            {observations.map((observation) => {
              const evidence = Array.isArray(observation.evidence)
                ? (observation.evidence as { scene_id: string; quote: string }[])
                : [];
              return (
                <article
                  key={observation.id}
                  className={`rounded-md border border-border bg-card p-4 ${
                    observation.status === "open" ? "" : "opacity-60"
                  }`}
                >
                  <h3 className="text-sm font-semibold">{observation.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed">{observation.body}</p>
                  {observation.why_it_matters && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Why it might matter: {observation.why_it_matters}
                    </p>
                  )}
                  {observation.uncertainty && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {observation.uncertainty}
                    </p>
                  )}
                  {evidence.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {evidence.map((item, index) => (
                        <li key={index}>
                          <button
                            type="button"
                            className="flex w-full items-start gap-1.5 rounded-sm bg-secondary px-2 py-1.5 text-left text-xs hover:bg-accent"
                            onClick={() => onOpenEvidence(item.scene_id, item.quote)}
                          >
                            <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                            <span className="font-serif">“{item.quote}”</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onObservationStatus(observation.id, "intentional")}
                    >
                      Mark intentional
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onObservationStatus(observation.id, "dismissed")}
                    >
                      Dismiss
                    </Button>
                    {observation.status !== "open" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onObservationStatus(observation.id, "open")}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {view === "revisions" && (
          <div className="space-y-3">
            {revisionsLoading && <p className="text-sm text-muted-foreground">Loading history…</p>}
            {!revisionsLoading && revisions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No saved revisions for this scene yet. One is kept each time you pause writing.
              </p>
            )}
            {revisions.map((revision) => (
              <article key={revision.id} className="rounded-md border border-border bg-card p-3">
                <p className="text-sm font-medium">
                  {new Date(revision.created_at).toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {revision.word_count} words · {revision.label ?? revision.source}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPreviewRevision(previewRevision?.id === revision.id ? null : revision)
                    }
                  >
                    {previewRevision?.id === revision.id ? "Hide preview" : "Preview"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onRestoreRevision(revision.id)}>
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Restore
                  </Button>
                </div>
                {previewRevision?.id === revision.id && (
                  <p className="mt-3 max-h-64 overflow-y-auto border-t border-border pt-3 font-serif text-sm leading-relaxed whitespace-pre-wrap">
                    {revision.plain_text}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        {view === "story" && (
          <NotYetAvailable
            what="The Story view"
            when="Events, threads, places and objects are assembled from the manuscript in the story-context increment. Until they are, Storymatic won't guess at them."
          />
        )}

        {view === "characters" && (
          <NotYetAvailable
            what="Character views"
            when="They arrive with the story model, so that what a character knows can be shown at a chosen point in the manuscript rather than as one timeless profile."
          />
        )}

        {view === "possibilities" && (
          <NotYetAvailable
            what="Possibilities"
            when="Exploring alternative directions comes last, and will reuse the same proposal and revision protections as ordinary AI edits."
          />
        )}

        {view === "settings" && (
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold">{projectTitle}</h3>
              <p className="mt-1 text-muted-foreground">
                Your projects are private to your account. Deleted scenes and chapters can be restored
                from the outline.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onExport}>
              Export the manuscript as Markdown
            </Button>
            {isSample && (
              <div className="border-t border-border pt-4">
                <p className="text-muted-foreground">
                  Resetting rebuilds The City of Ashes exactly as it shipped. Your other projects are
                  untouched.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={onResetSample}>
                  Reset the sample project
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
