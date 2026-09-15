import { useEffect, useRef, useState } from "react";
import type { EditAction } from "@/lib/assist.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const QUICK_ACTIONS: { action: EditAction; label: string }[] = [
  { action: "rewrite", label: "Rewrite" },
  { action: "tension", label: "More tension" },
  { action: "tighten", label: "Tighten" },
  { action: "expand", label: "Expand" },
  { action: "dialogue", label: "Adjust dialogue" },
  { action: "clarify", label: "Clarify" },
  { action: "rhythm", label: "Change rhythm" },
  { action: "voice", label: "Preserve voice" },
];

/**
 * Contextual menu for the current selection. Appears only while text is selected,
 * and is reachable from the keyboard (the trigger button focuses it).
 */
export function SelectionMenu(props: {
  position: { top: number; left: number } | null;
  words: number;
  busy: boolean;
  onAction: (action: EditAction, instruction?: string) => void;
  onAsk: () => void;
  onDismiss: () => void;
}) {
  const { position, words, busy, onAction, onAsk, onDismiss } = props;
  const [custom, setCustom] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!position) {
      setCustomOpen(false);
      setCustom("");
    }
  }, [position]);

  if (!position) return null;

  return (
    <div
      ref={container}
      role="dialog"
      aria-label="Assistance for the selected passage"
      className="fixed z-40 w-[19rem] rounded-md border border-border bg-card p-2 shadow-md motion-safe:transition-opacity"
      style={{ top: position.top, left: position.left }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onDismiss();
        }
      }}
    >
      <p className="px-1.5 pb-1.5 text-xs text-muted-foreground">
        {words} {words === 1 ? "word" : "words"} selected
      </p>
      <div className="flex flex-wrap gap-1">
        {QUICK_ACTIONS.map((item) => (
          <Button
            key={item.action}
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onAction(item.action)}
          >
            {item.label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" disabled={busy} onClick={onAsk}>
          Ask about this
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setCustomOpen((v) => !v)}>
          Custom instruction
        </Button>
      </div>
      {customOpen && (
        <form
          className="mt-2 space-y-2 border-t border-border pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!custom.trim()) return;
            onAction("custom", custom.trim());
          }}
        >
          <Textarea
            autoFocus
            rows={2}
            aria-label="Your instruction for this passage"
            placeholder="Make this more guarded without changing its meaning."
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={busy || !custom.trim()}>
            Propose a change
          </Button>
        </form>
      )}
    </div>
  );
}
