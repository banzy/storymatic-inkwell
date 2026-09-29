import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProjectShell } from "@/components/studio/project-shell";
import { BookAtGlance, BookMemory } from "@/components/studio/book-memory";
import {
  getBookEngine,
  sendBookMessage,
  reviewBookChanges,
  undoBookChange,
  adoptBookDraft,
} from "@/lib/engine.functions";
import { itemKindLabels, type EngineState } from "@/lib/engine/model";

export const Route = createFileRoute("/_authenticated/book/$projectId")({
  validateSearch: (search: Record<string, unknown>): { view?: "book" } =>
    search["view"] === "book" ? { view: "book" } : {},
  component: BookConversation,
  head: ({ search }) => {
    const title = search.view === "book" ? "Your developing book — Storymatic" : "Develop your book — Storymatic";
    const description = search.view === "book" ? "Explore the directions, people and open possibilities you have kept in your book." : "Develop your book in conversation with Storymatic, one idea at a time.";
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
});

function BookConversation() {
  const { projectId } = Route.useParams();
  const { view } = Route.useSearch();
  const client = useQueryClient();
  const get = useServerFn(getBookEngine);
  const send = useServerFn(sendBookMessage);
  const review = useServerFn(reviewBookChanges);
  const undo = useServerFn(undoBookChange);
  const adopt = useServerFn(adoptBookDraft);
  const queryKey = ["book-engine", projectId];
  const book = useQuery({
    queryKey,
    queryFn: () => get({ data: { projectId } }),
    refetchInterval: 3000,
  });
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pendingMessage = useRef<{ requestId: string; message: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const state = book.data?.state;
  const [now, setNow] = useState(Date.now);
  const hasProcessingTurn = state?.turns.some((turn) => turn.status === "processing");
  useEffect(() => {
    if (!hasProcessingTurn) return;
    const timer = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(timer);
  }, [hasProcessingTurn]);
  const update = (next: EngineState) => {
    client.setQueryData(queryKey, (previous: typeof book.data) =>
      previous ? { ...previous, state: next } : previous,
    );
    void client.invalidateQueries({ queryKey: ["workspace", projectId] });
  };
  const operation = useMutation({
    mutationFn: (task: () => Promise<EngineState>) => task(),
    onSuccess: (next) => {
      update(next);
      setError(null);
    },
    onError: (reason) => {
      setError(
        reason instanceof Error
          ? reason.message
          : "That operation did not finish. Please try again.",
      );
      void book.refetch();
    },
  });
  const sendMutation = useMutation({
    mutationFn: (request: { requestId: string; message: string }) =>
      send({ data: { projectId, ...request } }),
    onSuccess: (next, request) => {
      update(next);
      pendingMessage.current = null;
      setText((current) => (current.trim() === request.message ? "" : current));
      setError(null);
    },
    onError: (reason) => {
      setError(
        reason instanceof Error
          ? reason.message
          : "The response was interrupted. Retry to check the saved message.",
      );
      void book.refetch();
    },
  });
  useEffect(() => {
    if (view !== "book" && state?.turns.length) end.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [state?.turns.length, view]);
  const processing = state?.turns.some(
    (turn) => turn.status === "processing" && now - Date.parse(turn.startedAt) < 120000,
  );
  const adopting = state?.turns.some((turn) => turn.draft?.status === "adopting");
  const busy = operation.isPending || sendMutation.isPending || processing;
  const latestChange = state?.changes.filter((change) => !change.undoneAt).at(-1);

  const submit = () => {
    if (!text.trim() || busy || adopting) return;
    const request =
      pendingMessage.current?.message === text.trim()
        ? pendingMessage.current
        : { requestId: crypto.randomUUID(), message: text.trim() };
    pendingMessage.current = request;
    sendMutation.mutate(request);
  };
  const undoLast = () => {
    if (!latestChange || !state) return;
    operation.mutate(() => undo({ data: { projectId, revision: state.revision, changeId: latestChange.id } }));
  };
  const exportMemory = () => {
    if (!book.data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(book.data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "storymatic-book-memory.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (book.isLoading)
    return (
      <main className="p-8" role="status">
        Opening your book…
      </main>
    );
  if (!book.data || !state)
    return (
      <main className="p-8">
        <p>Couldn’t open this book.</p>
        <Button onClick={() => void book.refetch()}>Try again</Button>
      </main>
    );

  return (
    <ProjectShell projectId={projectId} projectTitle={book.data.project.title} mode={view === "book" ? "book" : "develop"} onExport={exportMemory} status={<span className="text-xs text-muted-foreground" role="status">{busy ? "Working…" : adopting ? "Scene addition needs finishing" : "Saved"}</span>}>
      {view === "book" ? <div className="min-h-0 flex-1 overflow-y-auto"><BookMemory state={state} projectId={projectId} onUndo={undoLast} undoDisabled={busy || Boolean(adopting)} />{error && <p role="alert" className="mx-auto max-w-5xl px-8 pb-6 text-sm text-destructive">{error}</p>}</div> : <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,3fr)_minmax(290px,1fr)]">
        <main className="mx-auto w-full max-w-3xl space-y-8 px-5 py-8 sm:px-8 sm:py-12">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Develop</p>
            <h1 className="mt-2 font-serif text-4xl">Let’s develop your book.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Bring fragments, a scene you can imagine, a contradiction, or an ending you haven’t
              decided. We can start there.
            </p>
          </div>
          {state.turns.length === 0 && <section className="space-y-5 border-t border-border pt-8" aria-label="Ways to begin">
            <p className="font-serif text-xl leading-relaxed">Tell me the story as it exists in your head. Fragments, contradictions and half-made decisions are welcome.</p>
            <div className="flex flex-wrap gap-2">
              {["I have a story about…", "I can see one scene clearly…", "I know the ending, but not how we arrive there…"].map((example) => <Button key={example} variant="outline" size="sm" onClick={() => { setText(example.replace("…", "")); document.getElementById("book-message")?.focus(); }}>{example}</Button>)}
            </div>
          </section>}
          <div className="lg:hidden"><Sheet><SheetTrigger asChild><Button variant="outline" size="sm">Book at a glance</Button></SheetTrigger><SheetContent side="right" className="w-[min(90vw,370px)] overflow-y-auto p-6"><SheetHeader><SheetTitle className="sr-only">Book at a glance</SheetTitle></SheetHeader><BookAtGlance state={state} projectId={projectId} onUndo={undoLast} undoDisabled={busy || Boolean(adopting)} /></SheetContent></Sheet></div>
          <div className="space-y-8" aria-label="Book conversation">
            {state.turns.map((turn) => {
              const pending = turn.proposals.filter((proposal) => proposal.status === "pending");
              const expired =
                turn.status === "processing" && now - Date.parse(turn.startedAt) >= 120000;
              return (
                <article key={turn.id} id={`turn-${turn.id}`} className="space-y-4">
                   <div className="border-l-2 border-border bg-secondary/40 px-4 py-3">
                    <p className="mb-2 text-xs font-semibold">You</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{turn.text}</p>
                  </div>
                  {turn.answer && (
                    <div>
                      <p className="mb-2 text-xs font-semibold">Storymatic</p>
                       <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed">{turn.answer}</p>
                    </div>
                  )}
                  {turn.status === "processing" && !expired && (
                    <p role="status" className="text-sm text-muted-foreground">
                      Your idea is saved. Storymatic is considering it…
                    </p>
                  )}
                  {(turn.status === "failed" || expired) && (
                    <div role="status" className="space-y-2 text-sm">
                       <p>{turn.error ?? "The response was interrupted."} Your message is saved.</p>
                      <Button
                        variant="outline"
                        disabled={busy || adopting}
                        onClick={() =>
                          sendMutation.mutate({ requestId: turn.id, message: turn.text })
                        }
                      >
                        Retry response
                      </Button>
                    </div>
                  )}
                  {turn.proposals.length > 0 && (
                     <section
                       className="space-y-3 border-l-2 border-primary/40 pl-4"
                      aria-label="Proposed book changes"
                    >
                      <h3 className="font-medium">Proposed book changes</h3>
                      <p className="text-xs text-muted-foreground">
                        Keeping an idea in the book does not make it an event in the manuscript.
                        Open possibilities stay open.
                      </p>
                      {turn.proposals.map((proposal) => (
                        <details key={proposal.id} className="rounded border p-3">
                          <summary className="cursor-pointer text-sm">
                            {proposal.title}{" "}
                            <span className="text-xs text-muted-foreground">
                              · {itemKindLabels[proposal.kind]} ·{" "}
                              {proposal.commitment === "tentative"
                                ? "Open possibility"
                                : "Intended"}{" "}
                               · {proposal.origin === "author" ? "From your words" : "Storymatic suggestion"} · {proposal.status === "pending" ? "Proposed" : proposal.status === "adopted" ? "Kept in book" : proposal.status === "dismissed" ? "Set aside" : "Undone"}
                            </span>
                          </summary>
                          <p className="mt-3 whitespace-pre-wrap text-sm">{proposal.body}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{proposal.rationale}</p>
                          {proposal.sourceQuote && (
                            <blockquote className="mt-2 border-l-2 pl-3 text-xs">
                              From your message: “{proposal.sourceQuote}”
                            </blockquote>
                          )}
                          {proposal.status === "pending" && (
                            <div className="mt-3 flex gap-2">
                              <Button
                                size="sm"
                                disabled={busy || adopting}
                                onClick={() =>
                                  operation.mutate(() =>
                                    review({
                                      data: {
                                        projectId,
                                        revision: state.revision,
                                        turnId: turn.id,
                                        ids: [proposal.id],
                                        action: "adopt",
                                      },
                                    }),
                                  )
                                }
                              >
                                Keep in book
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busy || adopting}
                                onClick={() =>
                                  operation.mutate(() =>
                                    review({
                                      data: {
                                        projectId,
                                        revision: state.revision,
                                        turnId: turn.id,
                                        ids: [proposal.id],
                                        action: "dismiss",
                                      },
                                    }),
                                  )
                                }
                              >
                                Set aside
                              </Button>
                            </div>
                          )}
                        </details>
                      ))}
                      {pending.length > 1 && (
                        <Button
                          disabled={busy || adopting}
                          onClick={() =>
                            operation.mutate(() =>
                              review({
                                data: {
                                  projectId,
                                  revision: state.revision,
                                  turnId: turn.id,
                                  ids: pending.map((p) => p.id),
                                  action: "adopt",
                                },
                              }),
                            )
                          }
                        >
                          Keep all {pending.length} changes
                        </Button>
                      )}
                    </section>
                  )}
                  {turn.draft && (
                    <section
                      className="space-y-3 rounded-md border p-4"
                      aria-label="Proposed scene"
                    >
                       <p className="text-xs font-medium text-primary">
                        {turn.draft.status === "adopted"
                          ? "Added to manuscript"
                           : "Scene proposal — outside the manuscript"}
                      </p>
                       <h3 className="font-serif text-2xl">{turn.draft.title}</h3>
                      <details>
                        <summary className="cursor-pointer text-sm">
                          Scene direction and review notes
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap text-sm">{turn.draft.brief}</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                          {turn.draft.reviewNotes.map((note, i) => (
                            <li key={i}>{note}</li>
                          ))}
                        </ul>
                      </details>
                      <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed">
                        {turn.draft.text}
                      </p>
                      {turn.draft.status === "adopted" ? (
                        <Link
                          to="/p/$projectId"
                          params={{ projectId }}
                          search={{ scene: turn.draft.id }}
                          className="text-sm underline"
                        >
                           Open scene in manuscript
                        </Link>
                      ) : (
                        <Button
                          disabled={
                            busy ||
                            (turn.draft.status === "proposed" &&
                              turn.draft.sourceBookVersion !== state.bookVersion)
                          }
                          onClick={() =>
                            operation.mutate(
                              async () =>
                                (
                                  await adopt({
                                    data: { projectId, revision: state.revision, turnId: turn.id },
                                  })
                                ).state,
                            )
                          }
                        >
                          {turn.draft.status === "adopting"
                            ? "Finish adding scene"
                             : "Add to manuscript"}
                        </Button>
                      )}
                       {turn.draft.status === "proposed" && turn.draft.sourceBookVersion === state.bookVersion && <p className="text-xs text-muted-foreground">Adds a new chapter and scene. You can edit the prose there afterward.</p>}
                      {turn.draft.status === "proposed" &&
                        turn.draft.sourceBookVersion !== state.bookVersion && (
                          <p className="text-xs text-muted-foreground">
                             The book direction changed after this draft was written. Ask Storymatic to revise it using the current book.
                          </p>
                        )}
                    </section>
                  )}
                </article>
              );
            })}
          </div>
          <div ref={end} />
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label htmlFor="book-message" className="text-sm font-medium">
              Tell Storymatic what is in your mind
            </label>
            <Textarea
              id="book-message"
              value={text}
              maxLength={30000}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); } }}
              disabled={sendMutation.isPending}
              className="min-h-36"
              placeholder="Tell me the story as it exists in your head…"
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Your conversation and book decisions are saved in this project.
              </p>
              <Button type="submit" disabled={busy || adopting || !text.trim()}>
                {busy ? "Working…" : "Continue conversation"}
              </Button>
            </div>
          </form>
        </main>
        <aside className="hidden border-l border-border bg-secondary/20 p-6 lg:block" aria-label="Book at a glance"><div className="sticky top-6 max-h-[calc(100vh-10rem)] overflow-y-auto"><BookAtGlance state={state} projectId={projectId} onUndo={undoLast} undoDisabled={busy || Boolean(adopting)} /></div></aside>
      </div>}
    </ProjectShell>
  );
}
