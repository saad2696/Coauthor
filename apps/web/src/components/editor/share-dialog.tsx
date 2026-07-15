"use client";

import type { ShareRole } from "@coauthor/shared";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";

interface Picked {
  userId: string;
  email: string;
}

export function ShareDialog({
  docId,
  onClose,
}: {
  docId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [selected, setSelected] = useState<Picked | null>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const sharesKey = ["shares", docId];

  const { data: sharesData } = useQuery({
    queryKey: sharesKey,
    queryFn: () => api.listShares(docId),
  });

  const collaboratorIds = useMemo(
    () => new Set((sharesData?.collaborators ?? []).map((c) => c.userId)),
    [sharesData],
  );

  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["userSearch", debouncedQuery],
    queryFn: ({ pageParam }) => api.searchUsers(debouncedQuery, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });

  const people = useMemo(
    () =>
      (pages?.pages ?? [])
        .flatMap((p) => p.users)
        .filter((u) => !collaboratorIds.has(u.userId)),
    [pages, collaboratorIds],
  );

  // Infinite scroll: load more when the sentinel scrolls into view.
  const sentinel = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, people.length]);

  const addShare = useMutation({
    mutationFn: () => api.createShare(docId, selected!.email, role),
    onSuccess: () => {
      setSelected(null);
      setQuery("");
      queryClient.invalidateQueries({ queryKey: sharesKey });
      queryClient.invalidateQueries({ queryKey: ["userSearch"] });
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : "Failed to share."),
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => api.deleteShare(docId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharesKey });
      queryClient.invalidateQueries({ queryKey: ["userSearch"] });
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : "Failed to revoke access."),
  });

  async function onRevoke(userId: string, email: string) {
    const ok = await confirm({
      title: "Revoke access",
      message: `${email} will no longer be able to open this document.`,
      confirmLabel: "Revoke",
      danger: true,
    });
    if (ok) revoke.mutate(userId);
  }

  const emptyList = !isFetching && people.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Share document</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            placeholder="Search people by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
          />
        </div>

        {/* User directory (click to select) */}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-neutral-200">
          {emptyList ? (
            <p className="px-3 py-6 text-center text-sm text-neutral-400">
              {query
                ? "No registered user matches. They need to sign up first."
                : "No other users yet."}
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {people.map((u) => {
                const isSel = selected?.userId === u.userId;
                return (
                  <li key={u.userId}>
                    <button
                      onClick={() =>
                        setSelected(isSel ? null : { userId: u.userId, email: u.email })
                      }
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-neutral-50"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isSel
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-300"
                        }`}
                      >
                        {isSel && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[11px] font-semibold uppercase text-white">
                        {(u.displayName || u.email).charAt(0)}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        {u.displayName && (
                          <span className="truncate font-medium text-neutral-900">
                            {u.displayName}
                          </span>
                        )}
                        <span className="truncate text-neutral-500">{u.email}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {(isFetching || hasNextPage) && (
                <li
                  ref={sentinel}
                  className="px-3 py-3 text-center text-xs text-neutral-400"
                >
                  Loading…
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Role + share action */}
        <div className="mt-3 flex items-center gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-900"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={() => addShare.mutate()}
            disabled={!selected || addShare.isPending}
            className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40"
          >
            {addShare.isPending
              ? "Sharing…"
              : selected
                ? `Share with ${selected.email}`
                : "Select a person to share"}
          </button>
        </div>

        {/* Current collaborators */}
        <div className="mt-5 border-t border-neutral-100 pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            People with access
          </h3>
          {sharesData && sharesData.collaborators.length > 0 ? (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {sharesData.collaborators.map((c) => (
                <li
                  key={c.userId}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="truncate">{c.email}</span>
                  <span className="flex items-center gap-3">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs uppercase text-neutral-600">
                      {c.role}
                    </span>
                    <button
                      onClick={() => onRevoke(c.userId, c.email)}
                      disabled={revoke.isPending}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400">Not shared with anyone yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
