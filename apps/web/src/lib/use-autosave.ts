"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave (~800 ms) for a value of type T (editor content, title,
 * …). Tracks save state, and flushes any pending save on tab-hide / unload so
 * edits are not dropped mid-debounce (risk R5).
 */
export function useAutosave<T>(
  save: (value: T) => Promise<unknown>,
  delay = 800,
) {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!pending.current) return;
    const { value } = pending.current;
    pending.current = null;
    setState("saving");
    try {
      await saveRef.current(value);
      setState("saved");
    } catch {
      // Keep the value pending so retry can re-send it.
      pending.current = { value };
      setState("error");
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  const retry = useCallback(() => {
    void flush();
  }, [flush]);

  // Flush on tab-hide and unload so debounced edits are not lost.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [flush]);

  return { state, schedule, flush, retry };
}
