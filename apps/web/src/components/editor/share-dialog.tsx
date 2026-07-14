"use client";

import type { ShareRole } from "@coauthor/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { api, ApiError } from "@/lib/api";

export function ShareDialog({
  docId,
  onClose,
}: {
  docId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [error, setError] = useState<string | null>(null);

  const sharesKey = ["shares", docId];

  const { data, isLoading } = useQuery({
    queryKey: sharesKey,
    queryFn: () => api.listShares(docId),
  });

  const addShare = useMutation({
    mutationFn: () => api.createShare(docId, email.trim(), role),
    onSuccess: () => {
      setEmail("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: sharesKey });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "USER_NOT_FOUND") {
        setError("No registered user with that email. Only registered users can be shared with.");
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to share.");
      }
    },
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => api.deleteShare(docId, userId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sharesKey }),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share document</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-400 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            addShare.mutate();
          }}
          className="mt-4 flex gap-2"
        >
          <input
            type="email"
            required
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={addShare.isPending}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Share
          </button>
        </form>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            People with access
          </h3>
          {isLoading ? (
            <p className="text-sm text-neutral-400">Loading…</p>
          ) : data && data.collaborators.length > 0 ? (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {data.collaborators.map((c) => (
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
                      onClick={() => revoke.mutate(c.userId)}
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
