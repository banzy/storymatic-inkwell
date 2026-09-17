import { useState } from "react";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ThemeNote } from "@/lib/themes.functions";

export type ThemeDraft = {
  id: string | null;
  title: string;
  body: string;
  whyItMatters: string | null;
  sceneId: string | null;
};

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

function ThemeForm(props: {
  initial: ThemeDraft;
  scenes: { id: string; title: string }[];
  onSave: (draft: ThemeDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(props.initial.title);
  const [body, setBody] = useState(props.initial.body);
  const [why, setWhy] = useState(props.initial.whyItMatters ?? "");
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
          whyItMatters: why.trim() || null,
          sceneId: sceneId || null,
        });
      }}
    >
      <div>
        <Label htmlFor="theme-title" className="text-xs">
          In a few words
        </Label>
        <Input
          id="theme-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What keeps coming back"
        />
      </div>
      <div>
        <Label htmlFor="theme-body" className="text-xs">
          What it is
        </Label>
        <Textarea
          id="theme-body"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="theme-why" className="text-xs">
          Why it matters to you (optional)
        </Label>
        <Textarea
          id="theme-why"
          rows={2}
          value={why}
          onChange={(event) => setWhy(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="theme-scene" className="text-xs">
          Most clearly in (optional)
        </Label>
        <select
          id="theme-scene"
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
 * Themes and motifs stay observations: a reading you can agree with, set aside,
 * or ignore. Nothing here becomes something the book establishes.
 */
export function ThemesView(props: {
  themes: ThemeNote[];
  scenes: { id: string; title: string }[];
  sceneTitles: Map<string, string>;
  onSave: (draft: ThemeDraft) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, status: "open" | "intentional" | "dismissed") => void;
  onOpenScene: (sceneId: string) => void;
  onOpenEvidence: (sceneId: string, quote: string) => void;
}) {
  const { themes, scenes, sceneTitles, onSave, onDelete, onStatus, onOpenScene, onOpenEvidence } =
    props;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAside, setShowAside] = useState(false);

  const live = themes.filter((row) => row.status !== "dismissed");
  const aside = themes.filter((row) => row.status === "dismissed");
  const shown = showAside ? aside : live;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 max-w-prose flex-1 text-sm text-muted-foreground">
          What your scenes keep returning to. Every reading here stays a reading — none of it is
          treated as what your book means, and nothing in the draft is changed.
        </p>
        {aside.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setShowAside(!showAside)}>
            {showAside ? `Live (${live.length})` : `Set aside (${aside.length})`}
          </Button>
        )}
        {!adding && !showAside && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            Note a theme
          </Button>
        )}
      </div>

      {adding && (
        <ThemeForm
          initial={{ id: null, title: "", body: "", whyItMatters: null, sceneId: null }}
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
          {showAside
            ? "Nothing set aside."
            : "Nothing yet. Press “Read for themes” once a couple of scenes are written, or note one of your own."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((row) =>
            editing === row.id ? (
              <li key={row.id}>
                <ThemeForm
                  initial={{
                    id: row.id,
                    title: row.title,
                    body: row.body,
                    whyItMatters: row.why_it_matters,
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
                        ? "You agreed with this"
                        : "Storymatic's reading"}
                  </span>
                  {row.scene_id && (
                    <span className="text-xs text-muted-foreground">
                      {sceneTitles.get(row.scene_id) ?? ""}
                    </span>
                  )}
                </div>
                {row.body && <p className="mt-1.5 text-sm leading-relaxed">{row.body}</p>}
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
                      <Button size="sm" variant="ghost" onClick={() => onStatus(row.id, "intentional")}>
                        Yes, that's in there
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onStatus(row.id, "dismissed")}>
                        Set aside
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => onStatus(row.id, "open")}>
                      {row.status === "dismissed" ? "Bring it back" : "Still unsure"}
                    </Button>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
