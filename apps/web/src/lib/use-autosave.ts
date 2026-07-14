"use client";

import type { TiptapDoc } from "@coauthor/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave (~800 ms) for editor content (spec: Autosave). Tracks save
 * state, flushes any pending save on tab-hide / unload so edits are not dropped
 * mid-debounce (risk R5).
 */
export function useAutosave(
  save: (content: TiptapDoc) => Promise<unknown>,
  delay = 800,
) {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<TiptapDoc | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const content = pending.current;
    if (content === null) return;
    pending.current = null;
    setState("saving");
    try {
      await saveRef.current(content);
      setState("saved");
    } catch {
      // Keep the content pending so retry can re-send it.
      pending.current = content;
      setState("error");
    }
  }, []);

  const schedule = useCallback(
    (content: TiptapDoc) => {
      pending.current = content;
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

  return { state, schedule, retry };
}
