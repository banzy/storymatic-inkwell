import { createFileRoute, Link } from "@tanstack/react-router";
import { Feather, BookOpen, Compass } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Storymatic V3 — a quiet writing studio for novelists" },
      {
        name: "description",
        content:
          "Write your novel in a calm room. Storymatic builds an evidence-based understanding of your characters, events and intentions as you draft.",
      },
      { property: "og:title", content: "Storymatic V3 — a quiet writing studio for novelists" },
      {
        property: "og:description",
        content:
          "A writing room connected to a grounded understanding of your story. You decide what becomes part of the book.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-serif text-lg tracking-tight">Storymatic</span>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/auth"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/studio"
            className="rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open the studio
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10">
        <p className="text-sm tracking-wide text-muted-foreground uppercase">The writing room</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
          Write the novel. Let the understanding of it keep up with you.
        </h1>
        <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-muted-foreground">
          Storymatic is a calm place to draft, with a grounded reading of your manuscript beside it —
          who knows what, when, and where you first suggested it. Every observation points back to
          the passage it came from. You stay the author: contradict the plan, keep the ambiguity,
          break the advice.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/studio"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Feather className="size-4" aria-hidden="true" />
            Start writing
          </Link>
          <Link
            to="/studio"
            search={{ sample: true }}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            <BookOpen className="size-4" aria-hidden="true" />
            Open the sample manuscript
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          {
            icon: Feather,
            title: "Quiet Room",
            body: "One column of serif prose, adjustable type, focus mode, autosave you can trust, and revisions you can restore.",
          },
          {
            icon: BookOpen,
            title: "Story Brain",
            body: "Characters, events and threads assembled from what the manuscript actually says — with the passage attached.",
          },
          {
            icon: Compass,
            title: "Your direction",
            body: "Unwritten plans stay visibly separate from what is established in the draft. Nothing becomes canon without you.",
          },
        ].map((item) => (
          <article key={item.title} className="rounded-lg border border-border bg-card p-5">
            <item.icon className="size-4 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
