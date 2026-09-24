import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveScene } from "@/lib/manuscript.functions";
import { countWords, docToPlainText, type ProseDoc } from "@/lib/prose";
import { SaveQueue } from "@/lib/save-queue";

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";
export type LocalDraft = { sceneId: string; content: ProseDoc; plainText: string; savedAt: string };
const draftKey = (sceneId: string) => `storymatic:draft:${sceneId}`;
function readLocalDraft(sceneId: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(sceneId));
    return raw ? (JSON.parse(raw) as LocalDraft) : null;
  } catch {
    return null;
  }
}

export function useSceneAutosave(options: {
  sceneId: string | null;
  serverPlainText: string;
  onSaved?: () => void;
}) {
  const { sceneId } = options;
  const save = useServerFn(saveScene);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<LocalDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef({ ...options, save });
  current.current = { ...options, save };
  const dirty = useRef(false);

  const queue = useMemo(
    () =>
      new SaveQueue<ProseDoc>(async (doc) => {
        if (!sceneId) return;
        const active = () => current.current.sceneId === sceneId;
        if (active()) setStatus("saving");
        const plainText = docToPlainText(doc);
        try {
          const result = await current.current.save({
            data: { sceneId, content: doc, plainText, wordCount: countWords(plainText) },
          });
          // Never remove a newer recovery document when an older request completes.
          try {
            const draft = readLocalDraft(sceneId);
            if (draft && JSON.stringify(draft.content) === JSON.stringify(doc))
              localStorage.removeItem(draftKey(sceneId));
          } catch {
            /* Remote persistence succeeded; unavailable local storage is not a save failure. */
          }
          if (active()) {
            setLastSavedAt(result.savedAt);
            setErrorMessage(null);
            current.current.onSaved?.();
          }
        } catch (error) {
          if (active()) {
            setStatus("error");
            setErrorMessage(error instanceof Error ? error.message : "Couldn't save");
          }
          throw error;
        }
      }),
    [sceneId],
  );

  useEffect(() => {
    dirty.current = false;
    setStatus("idle");
    setErrorMessage(null);
    setLastSavedAt(null);
    // A server refresh must never reset the pending queue. Formatting-only drafts count too.
    setRecovery(sceneId ? readLocalDraft(sceneId) : null);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [sceneId]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const ok = await queue.flush();
    if (ok && current.current.sceneId === sceneId && dirty.current) {
      dirty.current = false;
      setStatus("saved");
    }
    return ok;
  }, [queue, sceneId]);

  const change = useCallback(
    (doc: ProseDoc) => {
      if (!sceneId) return;
      dirty.current = true;
      queue.enqueue(doc);
      setStatus("unsaved");
      try {
        localStorage.setItem(
          draftKey(sceneId),
          JSON.stringify({
            sceneId,
            content: doc,
            plainText: docToPlainText(doc),
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        /* The queue still saves when local storage is unavailable. */
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 1000);
    },
    [queue, sceneId, flush],
  );
  const retry = useCallback(() => void flush(), [flush]);
  const hasUnsaved = status === "unsaved" || status === "saving" || status === "error";
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  const dismissRecovery = useCallback(() => {
    // Restore calls change() before this method, so a restored pending draft survives.
    if (sceneId && !dirty.current) {
      try {
        localStorage.removeItem(draftKey(sceneId));
      } catch {
        /* Unavailable storage. */
      }
    }
    setRecovery(null);
  }, [sceneId]);
  return {
    status,
    lastSavedAt,
    errorMessage,
    hasUnsaved,
    change,
    flush,
    retry,
    recovery,
    dismissRecovery,
  };
}
