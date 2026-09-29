import { createFileRoute, Link } from "@tanstack/react-router";
import { Feather, BookOpen, Compass } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Storymatic — develop and write your book in conversation" },
      {
        name: "description",
        content:
          "Bring fragments, scenes, endings and contradictions. Storymatic helps shape them into a book and writes with you when asked.",
      },
      { property: "og:title", content: "Storymatic — develop and write your book in conversation" },
      {
        property: "og:description",
        content:
          "Explain the story in your head, shape what belongs in the book, and move together into an editable manuscript.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
            to="/studio"
            className="rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open the studio
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10">
         <p className="text-sm tracking-wide text-muted-foreground uppercase">Your book, developed in conversation</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
           Tell Storymatic the story in your head. Shape it into a book together.
        </h1>
        <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-muted-foreground">
           Bring fragments, scenes, endings, inspirations and contradictions. Storymatic helps turn
           them into a coherent book, writes with you when asked, and remembers what you decide as
           the manuscript grows. You remain the creative director.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/studio"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Feather className="size-4" aria-hidden="true" />
             Start a book
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
             title: "Begin with conversation",
             body: "No forms or complete outline required. Start with the fragments, scenes or ending already in your head.",
          },
          {
            icon: BookOpen,
             title: "See the book take shape",
             body: "Brief, people, plots, questions and private intentions remain organized and traceable to your conversation.",
          },
          {
            icon: Compass,
             title: "Write together",
             body: "Move from direction to a proposed scene, then add it to the editable manuscript with revision history intact.",
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
