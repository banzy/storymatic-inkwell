import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type Proposal = {
  sceneId: string;
  action: string;
  actionLabel: string;
  instruction: string | null;
  original: string;
  proposed: string;
  explanation: string;
  /** True when the passage is appended rather than replacing a selection. */
  append: boolean;
};

export function ProposalView(props: {
  proposal: Proposal | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
  onEdit: (text: string) => void;
  onAccept: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
}) {
  const { proposal, loading, error, stale, onEdit, onAccept, onRegenerate, onDiscard } = props;

  if (loading && !proposal) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Reading the passage…
      </p>
    );
  }

  if (error && !proposal) {
    return (
      <div className="space-y-3">
        <p className="rounded-md border border-dashed border-border p-4 text-sm">{error}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onRegenerate}>
            Try again
          </Button>
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a passage in the manuscript to ask for a change, or use “Continue this scene”.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Your instruction
        </h3>
        <p className="mt-1.5 text-sm">
          {proposal.actionLabel}
          {proposal.instruction ? ` — “${proposal.instruction}”` : ""}
        </p>
      </div>

      {!proposal.append && (
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Original passage
          </h3>
          <p className="mt-1.5 max-h-40 overflow-y-auto rounded-md bg-secondary p-3 font-serif text-sm leading-relaxed whitespace-pre-wrap">
            {proposal.original}
          </p>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {proposal.append ? "Proposed continuation" : "Proposed passage"}
        </h3>
        <Textarea
          aria-label="Proposed passage, editable"
          className="mt-1.5 min-h-40 font-serif text-sm leading-relaxed"
          value={proposal.proposed}
          onChange={(event) => onEdit(event.target.value)}
        />
      </div>

      {proposal.explanation && (
        <p className="text-sm leading-relaxed text-muted-foreground">{proposal.explanation}</p>
      )}

      {stale && (
        <p className="rounded-md bg-planned px-3 py-2 text-xs text-planned-foreground">
          The passage in the manuscript has changed since this was proposed, so accepting it could
          overwrite newer writing. Ask again to work from the current text.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button size="sm" onClick={onAccept} disabled={stale || loading}>
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={onRegenerate} disabled={loading}>
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden="true" />
          )}
          Regenerate
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Accepting changes only this passage and keeps the previous version in revision history.
      </p>
    </div>
  );
}
