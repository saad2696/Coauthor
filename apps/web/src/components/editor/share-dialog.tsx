"use client";

import type { ShareRole } from "@coauthor/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";

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

  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const sharesKey = ["shares", docId];

  const { data: sharesData } = useQuery({
    queryKey: sharesKey,
    queryFn: () => api.listShares(docId),
  });

  const { data: searchData, isFetching } = useQuery({
    queryKey: ["userSearch", debouncedQuery],
    queryFn: () => api.searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  // Existing collaborators to exclude from the search dropdown.
  const collaboratorIds = useMemo(
    () => new Set((sharesData?.collaborators ?? []).map((c) => c.userId)),
    [sharesData],
  );
  const results = (searchData?.users ?? []).filter(
    (u) => !collaboratorIds.has(u.userId),
  );

  const addShare = useMutation({
    mutationFn: (email: string) => api.createShare(docId, email, role),
    onSuccess: () => {
      setQuery("");
      queryClient.invalidateQueries({ queryKey: sharesKey });
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : "Failed to share."),
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => api.deleteShare(docId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sharesKey }),
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

  const showDropdown = debouncedQuery.length >= 2;
  const noMatches = showDropdown && !isFetching && results.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
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

        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
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

            {showDropdown && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg">
                {isFetching && (
                  <p className="px-3 py-2 text-sm text-neutral-400">Searching…</p>
                )}
                {!isFetching &&
                  results.map((u) => (
                    <button
                      key={u.userId}
                      onClick={() => addShare.mutate(u.email)}
                      disabled={addShare.isPending}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <span className="flex flex-col">
                        {u.displayName && (
                          <span className="font-medium text-neutral-900">
                            {u.displayName}
                          </span>
                        )}
                        <span className="text-neutral-500">{u.email}</span>
                      </span>
                      <UserPlus size={15} className="text-neutral-500" />
                    </button>
                  ))}
                {noMatches && (
                  <p className="px-3 py-2 text-sm text-neutral-500">
                    No registered user matches. They need to sign up first.
                  </p>
                )}
              </div>
            )}
          </div>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-900"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        <p className="mt-2 text-xs text-neutral-400">
          You can only share with people who already have a Coauthor account.
        </p>

        <div className="mt-5">
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
                  <span>{c.email}</span>
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
            <p className="text-sm text-neutral-400">
              Not shared with anyone yet.
            </p>
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
