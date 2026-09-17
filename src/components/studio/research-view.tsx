import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResearchNote } from "@/lib/research.functions";

export type ResearchDraft = {
  id: string | null;
  title: string;
  body: string;
  link: string | null;
  tags: string[];
  kind: "note" | "source";
};

function NoteForm(props: {
  note: ResearchNote | null;
  onSave: (draft: ResearchDraft) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(props.note?.title ?? "");
  const [body, setBody] = useState(props.note?.body ?? "");
  const [link, setLink] = useState(props.note?.link ?? "");
  const [tags, setTags] = useState((props.note?.tags ?? []).join(", "));
  const [kind, setKind] = useState<"note" | "source">(
    (props.note?.kind as "note" | "source") ?? "note",
  );

  return (
    <form
      className="space-y-3 rounded-md border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        props.onSave({
          id: props.note?.id ?? null,
          title,
          body,
          link: link.trim() || null,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 12),
          kind,
        });
      }}
    >
      <div>
        <Label htmlFor="research-title">What it's about</Label>
        <Input
          id="research-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Canal locks in winter"
        />
      </div>
      <div>
        <Label htmlFor="research-body">The note itself</Label>
        <Textarea
          id="research-body"
          rows={6}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Anything you want to keep to hand while writing."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="research-link">Where it came from (optional)</Label>
          <Input
            id="research-link"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="A link, book or person"
          />
        </div>
        <div>
          <Label htmlFor="research-tags">Labels (optional)</Label>
          <Input
            id="research-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="city, trade, winter"
          />
        </div>
      </div>
      <fieldset className="flex items-center gap-4 text-sm">
        <legend className="sr-only">Kind of note</legend>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={kind === "note"}
            onChange={() => setKind("note")}
            name="research-kind"
          />
          A note of my own
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={kind === "source"}
            onChange={() => setKind("source")}
            name="research-kind"
          />
          Something I found
        </label>
      </fieldset>
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

function NoteCard(props: {
  note: ResearchNote;
  onEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const { note } = props;
  return (
    <article className="rounded-md border border-border bg-card p-4">
      <header className="flex flex-wrap items-baseline gap-2">
        <h4 className="font-serif text-lg text-foreground">{note.title}</h4>
        <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
          {note.kind === "source" ? "Something you found" : "Your note"}
        </span>
      </header>
      {note.body.trim() && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{note.body}</p>
      )}
      {note.link && (
        <p className="mt-2 break-all text-xs text-muted-foreground">
          <span className="text-foreground/70">From:</span> {note.link}
        </p>
      )}
      {note.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-sm bg-secondary/60 px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="ghost" className="-ml-2" onClick={props.onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => props.onDelete(note.id)}>
          Remove
        </Button>
      </div>
    </article>
  );
}

/**
 * Research and notes, kept deliberately outside the story: nothing written here
 * is ever read as something the book establishes.
 */
export function ResearchView(props: {
  notes: ResearchNote[];
  loading: boolean;
  onSave: (draft: ResearchDraft) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (props.loading) return <p className="text-sm text-muted-foreground">Fetching your notes…</p>;

  const editing = props.notes.find((note) => note.id === editingId) ?? null;

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        Everything here is outside the story. Storymatic never treats a note as something your book
        establishes, and never quotes it back as fact.
      </p>

      {adding || editing ? (
        <NoteForm
          note={editing}
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
          Add a note
        </Button>
      )}

      {props.notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — anything you want to hand while writing can live here.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {props.notes
            .filter((note) => note.id !== editingId)
            .map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={() => {
                  setAdding(false);
                  setEditingId(note.id);
                }}
                onDelete={props.onDelete}
              />
            ))}
        </div>
      )}
    </div>
  );
}
