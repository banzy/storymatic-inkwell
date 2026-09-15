import { useEffect, useRef, useState } from "react";
import { Loader2, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type AskScope = "selection" | "scene" | "chapter" | "project";

export type AskTurn =
  | { role: "user"; text: string; scope: AskScope }
  | {
      role: "assistant";
      text: string;
      basis: string;
      sources: { sceneId: string; quote: string }[];
    }
  | { role: "error"; text: string };

const BASIS_LABEL: Record<string, string> = {
  evidence: "From the manuscript",
  interpretation: "Interpretation",
  suggestion: "A suggestion, not in the story yet",
  insufficient: "Not enough in the manuscript to say",
};

const SUGGESTIONS = [
  "What does Elena know at this point?",
  "Where did I first suggest Marcus was hiding something?",
  "Which threads are still unresolved?",
];

export function AskView(props: {
  turns: AskTurn[];
  loading: boolean;
  scope: AskScope;
  hasSelection: boolean;
  onScopeChange: (scope: AskScope) => void;
  onAsk: (question: string) => void;
  onOpenSource: (sceneId: string, quote: string) => void;
}) {
  const { turns, loading, scope, hasSelection, onScopeChange, onAsk, onOpenSource } = props;
  const [question, setQuestion] = useState("");
  const bottom = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [turns.length, loading]);

  const send = (text: string) => {
    if (!text.trim() || loading) return;
    onAsk(text.trim());
    setQuestion("");
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="ask-scope">Storymatic is reading</Label>
        <select
          id="ask-scope"
          className="rounded-md border border-input bg-card px-2 py-1.5 text-sm"
          value={scope}
          onChange={(event) => onScopeChange(event.target.value as AskScope)}
        >
          <option value="selection" disabled={!hasSelection}>
            The selected passage
          </option>
          <option value="scene">This scene</option>
          <option value="chapter">This chapter</option>
          <option value="project">The whole project</option>
        </select>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {turns.length === 0 && (
          <div className="rounded-md border border-border bg-card p-3 text-sm">
            <p className="text-muted-foreground">Ask about the book you are writing.</p>
            <ul className="mt-2 space-y-1.5">
              {SUGGESTIONS.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="text-left underline decoration-dotted underline-offset-2 hover:text-primary"
                    onClick={() => send(item)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {turns.map((turn, index) =>
          turn.role === "user" ? (
            <div key={index} className="rounded-md bg-secondary px-3 py-2 text-sm">
              <p>{turn.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Read: {turn.scope === "project" ? "whole project" : turn.scope}
              </p>
            </div>
          ) : turn.role === "error" ? (
            <p key={index} className="rounded-md border border-dashed border-border p-3 text-sm">
              {turn.text}
            </p>
          ) : (
            <div key={index} className="space-y-2 px-1">
              <p className="text-xs text-muted-foreground">
                {BASIS_LABEL[turn.basis] ?? "Interpretation"}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{turn.text}</p>
              {turn.sources.length > 0 && (
                <ul className="space-y-1.5">
                  {turn.sources.map((source, sourceIndex) => (
                    <li key={sourceIndex}>
                      <button
                        type="button"
                        className="flex w-full items-start gap-1.5 rounded-sm bg-secondary px-2 py-1.5 text-left text-xs hover:bg-accent"
                        onClick={() => onOpenSource(source.sceneId, source.quote)}
                      >
                        <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                        <span className="font-serif">“{source.quote}”</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}
        {loading && (
          <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Reading your manuscript…
          </p>
        )}
        <div ref={bottom} />
      </div>

      <form
        className="space-y-2 border-t border-border pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(question);
        }}
      >
        <Label htmlFor="ask-question" className="sr-only">
          Your question
        </Label>
        <Textarea
          id="ask-question"
          rows={3}
          value={question}
          placeholder="What changes if Elena discovers the betrayal here?"
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send(question);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Answers never change your manuscript.</p>
          <Button type="submit" size="sm" disabled={loading || !question.trim()}>
            Ask
          </Button>
        </div>
      </form>
    </div>
  );
}
