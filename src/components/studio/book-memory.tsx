import { Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { itemKindLabels, type BookItem, type EngineState } from "@/lib/engine/model";

const groups = [
  { title: "Foundation", kinds: ["brief", "direction", "question"], subtitle: "The heart, voice and open questions of this book." },
  { title: "Story", kinds: ["outline", "thread", "world"], subtitle: "Where the story may go, and the world it moves through." },
  { title: "People", kinds: ["character", "relationship"], subtitle: "Who is here, and what moves between them." },
  { title: "Private", kinds: ["secret"], subtitle: "Intentions for the author, not necessarily for a character or reader." },
] as const;

function sourceLink(projectId: string, item: BookItem) {
  return <Link to="/book/$projectId" params={{ projectId }} search={{}} hash={`turn-${item.sourceTurnId}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline">Discuss or change this <ArrowRight className="size-3" aria-hidden="true" /></Link>;
}

function MemoryItem({ item, projectId, compact = false }: { item: BookItem; projectId: string; compact?: boolean }) {
  return <article className="border-b border-border py-4 last:border-0">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h4 className="font-serif text-lg leading-snug">{item.title}</h4>
      <span className="text-xs text-muted-foreground">{itemKindLabels[item.kind]} · {item.commitment === "tentative" ? "Open possibility" : "Intended"} · {item.origin === "author" ? "From your words" : "Adopted Storymatic suggestion"}</span>
    </div>
    <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${compact ? "line-clamp-3" : ""}`}>{item.body}</p>
    <div className="mt-3">{sourceLink(projectId, item)}</div>
  </article>;
}

export function BookAtGlance({ state, projectId, onUndo, undoDisabled }: { state: EngineState; projectId: string; onUndo: () => void; undoDisabled: boolean }) {
  const latest = state.changes.filter((change) => !change.undoneAt).at(-1);
  return <div className="space-y-6">
    <div><h2 className="font-serif text-2xl">Book at a glance</h2><p className="mt-1 text-xs text-muted-foreground">Your working intentions, separate from the manuscript.</p></div>
    {state.items.length === 0 && <p className="text-sm leading-relaxed text-muted-foreground">As you talk, choose what belongs in the book. Nothing needs to be decided before you start.</p>}
    {groups.map((group) => {
      const items = state.items.filter((item) => group.kinds.some((kind) => kind === item.kind)).sort((a, b) => Number(b.kind === "brief") - Number(a.kind === "brief") || Number(b.commitment === "decided") - Number(a.commitment === "decided")).slice(0, group.title === "Foundation" ? 3 : 2);
      return items.length ? <section key={group.title}><h3 className="text-xs font-semibold uppercase text-muted-foreground">{group.title}</h3>{items.map((item) => <MemoryItem key={item.id} item={item} projectId={projectId} compact />)}</section> : null;
    })}
    <Link to="/book/$projectId" params={{ projectId }} search={{ view: "book" }} className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">Open full book <ArrowRight className="size-4" aria-hidden="true" /></Link>
    {latest && <div className="border-t border-border pt-4"><p className="mb-2 text-xs text-muted-foreground">Latest book change · {new Date(latest.createdAt).toLocaleDateString()}</p><Button variant="outline" size="sm" disabled={undoDisabled} onClick={onUndo}><RotateCcw className="size-3.5" /> Undo last book change</Button></div>}
  </div>;
}

export function BookMemory({ state, projectId, onUndo, undoDisabled }: { state: EngineState; projectId: string; onUndo: () => void; undoDisabled: boolean }) {
  const latest = state.changes.filter((change) => !change.undoneAt).at(-1);
  return <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
    <p className="text-xs font-semibold uppercase text-muted-foreground">The developing book</p>
    <h1 className="mt-3 font-serif text-4xl">What is this book becoming?</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Only ideas you have kept appear here. An intention is not evidence that something has happened in the manuscript.</p>
    {state.items.length === 0 && <div className="mt-10 max-w-xl border-t border-border pt-8"><h2 className="font-serif text-2xl">It begins in conversation.</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Tell Storymatic what you have so far. You can keep possibilities open, make decisions later, and begin writing whenever you like.</p><Link to="/book/$projectId" params={{ projectId }} search={{}} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline">Start developing <ArrowRight className="size-4" /></Link></div>}
    {state.items.length > 0 && <div className="mt-10 grid gap-x-14 gap-y-10 md:grid-cols-2">
      {groups.map((group) => {
        const items = state.items.filter((item) => group.kinds.some((kind) => kind === item.kind));
        return <section key={group.title} className="border-t border-border pt-5" aria-label={group.title}>
          <h2 className="font-serif text-2xl">{group.title}</h2><p className="mt-1 text-xs text-muted-foreground">{group.subtitle}</p>
          {items.length ? items.map((item) => <MemoryItem key={item.id} item={item} projectId={projectId} />) : <p className="mt-5 text-sm leading-relaxed text-muted-foreground">No {group.title === "People" ? "people or relationships" : group.title === "Private" ? "private intentions" : group.title === "Story" ? "story shape" : "foundation"} kept in the book yet. <Link to="/book/$projectId" params={{ projectId }} search={{}} className="text-primary underline-offset-4 hover:underline">Talk it through in Develop.</Link></p>}
        </section>;
      })}
    </div>}
    {state.changes.length > 0 && <section className="mt-12 border-t border-border pt-6" aria-label="Recent changes"><h2 className="font-serif text-xl">Recent changes</h2><ul className="mt-3 space-y-2">{state.changes.slice(-4).reverse().map((change) => <li key={change.id} className="flex flex-wrap justify-between gap-2 text-sm"><span>{change.after.map((item) => item.title).join(", ") || "Book direction updated"} {change.undoneAt && <span className="text-muted-foreground">· Undone</span>}</span><Link to="/book/$projectId" params={{ projectId }} search={{}} hash={`turn-${change.turnId}`} className="text-primary underline-offset-4 hover:underline">Conversation</Link></li>)}</ul>{latest && <Button className="mt-4" variant="outline" size="sm" disabled={undoDisabled} onClick={onUndo}><RotateCcw className="size-3.5" /> Undo last book change</Button>}</section>}
    <p className="mt-12 border-t border-border pt-5 text-xs text-muted-foreground">Manuscript-derived insights are available separately in the writing room. They are not synchronized with this developing-book memory.</p>
  </main>;
}
