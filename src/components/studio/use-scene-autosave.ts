import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveScene } from "@/lib/manuscript.functions";
import { countWords, docToPlainText, type ProseDoc } from "@/lib/prose";

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export type LocalDraft = {
  sceneId: string;
  content: ProseDoc;
  plainText: string;
  savedAt: string;
};

const draftKey = (sceneId: string) => `storymatic:draft:${sceneId}`;

function readLocalDraft(sceneId: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(sceneId));
    return raw ? (JSON.parse(raw) as LocalDraft) : null;
  } catch {
    return null;
  }
}

/**
 * Debounced autosave for a single scene.
 *
 * "Saved" is only shown after the server confirms persistence. If the save
 * fails, the text is kept in a local recovery draft and surfaced for explicit
 * reconciliation instead of being silently dropped.
 */
export function useSceneAutosave(options: {
  sceneId: string | null;
  serverPlainText: string;
  onSaved?: () => void;
}) {
  const { sceneId, serverPlainText, onSaved } = options;
  const save = useServerFn(saveScene);

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<LocalDraft | null>(null);

  const pending = useRef<ProseDoc | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    pending.current = null;
    setStatus("idle");
    setErrorMessage(null);
    if (timer.current) clearTimeout(timer.current);
    if (!sceneId) {
      setRecovery(null);
      return;
    }
    const draft = readLocalDraft(sceneId);
    setRecovery(draft && draft.plainText !== serverPlainText ? draft : null);
    if (draft && draft.plainText === serverPlainText) localStorage.removeItem(draftKey(sceneId));
  }, [sceneId, serverPlainText]);

  const persist = useCallback(async () => {
    if (!sceneId) return;
    const doc = pending.current;
    if (!doc || inFlight.current) return;
    inFlight.current = true;
    pending.current = null;
    setStatus("saving");
    const plainText = docToPlainText(doc);
    try {
      const result = await save({
        data: { sceneId, content: doc, plainText, wordCount: countWords(plainText) },
      });
      localStorage.removeItem(draftKey(sceneId));
      setLastSavedAt(result.savedAt);
      setErrorMessage(null);
      setStatus(pending.current ? "unsaved" : "saved");
      onSaved?.();
    } catch (error) {
      // Keep the text recoverable; never claim it was saved.
      pending.current = doc;
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Couldn't save");
    } finally {
      inFlight.current = false;
    }
  }, [sceneId, save, onSaved]);

  const change = useCallback(
    (doc: ProseDoc) => {
      if (!sceneId) return;
      pending.current = doc;
      setStatus("unsaved");
      try {
        const plainText = docToPlainText(doc);
        localStorage.setItem(
          draftKey(sceneId),
          JSON.stringify({ sceneId, content: doc, plainText, savedAt: new Date().toISOString() }),
        );
      } catch {
        /* storage may be unavailable; the debounced save is still the source of truth */
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(), 1000);
    },
    [sceneId, persist],
  );

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await persist();
  }, [persist]);

  const retry = useCallback(() => void persist(), [persist]);

  const hasUnsaved = status === "unsaved" || status === "saving" || status === "error";

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsaved) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  const dismissRecovery = useCallback(() => {
    if (sceneId) localStorage.removeItem(draftKey(sceneId));
    setRecovery(null);
  }, [sceneId]);

  return useMemo(
    () => ({
      status,
      lastSavedAt,
      errorMessage,
      hasUnsaved,
      change,
      flush,
      retry,
      recovery,
      dismissRecovery,
    }),
    [status, lastSavedAt, errorMessage, hasUnsaved, change, flush, retry, recovery, dismissRecovery],
  );
}
