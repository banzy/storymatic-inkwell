import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getBookEngine,
  sendBookMessage,
  reviewBookChanges,
  undoBookChange,
  adoptBookDraft,
} from "@/lib/engine.functions";
import { itemKindLabels, itemKinds, type EngineState } from "@/lib/engine/model";

export const Route = createFileRoute("/_authenticated/book/$projectId")({
  component: BookConversation,
  head: () => ({ meta: [{ title: "Develop your book — Storymatic" }] }),
});

function BookConversation() {
  const { projectId } = Route.useParams();
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
    end.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [state?.turns.length]);
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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center gap-4 border-b px-6 py-4">
        <Link to="/studio" className="font-serif text-lg">
          Storymatic
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm">{book.data.project.title}</h1>
        <Link
          to="/p/$projectId"
          params={{ projectId }}
          className="text-sm underline underline-offset-4"
        >
          Open manuscript
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(book.data, null, 2)], { type: "application/json" }),
            );
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "storymatic-book-memory.json";
            anchor.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export memory
        </Button>
      </header>
      <div className="grid flex-1 lg:grid-cols-[minmax(0,3fr)_minmax(300px,2fr)]">
        <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
          <div>
            <h2 className="font-serif text-3xl">Let’s develop your book.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Bring fragments, a scene you can imagine, a contradiction, or an ending you haven’t
              decided. We can start there.
            </p>
          </div>
          <div className="space-y-8" aria-label="Book conversation">
            {state.turns.map((turn) => {
              const pending = turn.proposals.filter((proposal) => proposal.status === "pending");
              const expired =
                turn.status === "processing" && now - Date.parse(turn.startedAt) >= 120000;
              return (
                <article key={turn.id} id={`turn-${turn.id}`} className="space-y-4">
                  <div className="rounded-md bg-secondary p-4">
                    <p className="mb-2 text-xs font-semibold">You</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{turn.text}</p>
                  </div>
                  {turn.answer && (
                    <div>
                      <p className="mb-2 text-xs font-semibold">Storymatic</p>
                      <p className="whitespace-pre-wrap leading-relaxed">{turn.answer}</p>
                    </div>
                  )}
                  {turn.status === "processing" && !expired && (
                    <p role="status" className="text-sm text-muted-foreground">
                      Your idea is saved. Storymatic is considering it…
                    </p>
                  )}
                  {(turn.status === "failed" || expired) && (
                    <div role="status" className="space-y-2 text-sm">
                      <p>{turn.error ?? "The response was interrupted. Your message is saved."}</p>
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
                      className="space-y-3 rounded-md border p-4"
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
                              · {proposal.status}
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
                      <h3 className="font-serif text-xl">{turn.draft.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {turn.draft.status === "adopted"
                          ? "Added to manuscript"
                          : "Scene proposal — outside your manuscript"}
                      </p>
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
                          Open this scene
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
                            : "Add as a new chapter and scene"}
                        </Button>
                      )}
                      {turn.draft.status === "proposed" &&
                        turn.draft.sourceBookVersion !== state.bookVersion && (
                          <p className="text-xs text-muted-foreground">
                            Book direction changed since this draft. Ask Storymatic for an updated
                            version before adopting it.
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
              disabled={sendMutation.isPending}
              className="min-h-36"
              placeholder="I have a story about…"
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
        <aside
          className="space-y-6 border-t bg-card/40 p-6 lg:border-t-0 lg:border-l"
          aria-label="Your developing book"
        >
          <div>
            <h2 className="font-serif text-2xl">Your developing book</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Private working intentions, not claims about what a reader already knows.
            </p>
          </div>
          {state.items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              As we talk, proposed foundations appear beside the conversation. Keep what fits; the
              book takes shape here.
            </p>
          )}
          {itemKinds.map((kind) => {
            const items = state.items.filter((item) => item.kind === kind);
            return items.length ? (
              <section key={kind} className="space-y-3">
                <h3 className="text-sm font-semibold">{itemKindLabels[kind]}</h3>
                {items.map((item) => (
                  <details
                    key={item.id}
                    open={kind === "brief"}
                    className="rounded-md border bg-card p-3"
                  >
                    <summary className="cursor-pointer text-sm">{item.title}</summary>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.commitment === "tentative" ? "Open possibility" : "Intended"} ·{" "}
                      {item.origin === "author" ? "From your words" : "An adopted suggestion"}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
                    <a
                      className="mt-3 inline-block text-xs underline"
                      href={`#turn-${item.sourceTurnId}`}
                    >
                      Original conversation
                    </a>
                  </details>
                ))}
              </section>
            ) : null;
          })}
          {latestChange && (
            <Button
              variant="outline"
              disabled={busy || adopting}
              onClick={() =>
                operation.mutate(() =>
                  undo({
                    data: { projectId, revision: state.revision, changeId: latestChange.id },
                  }),
                )
              }
            >
              Undo last book change
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
