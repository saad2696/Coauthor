import type { ShareRole, TiptapDoc } from "@coauthor/shared";

import { auth } from "./firebase";

/** Access level returned by the API for a document the caller can see. */
export type Access = "owner" | "editor" | "viewer";

/** JSON-serialized document (timestamps are ISO strings over the wire). */
export interface Doc {
  id: string;
  ownerId: string;
  title: string;
  content: TiptapDoc;
  createdAt: string;
  updatedAt: string;
}

export interface SharedDoc extends Doc {
  role: ShareRole;
}

export interface DocumentsList {
  owned: Doc[];
  shared: SharedDoc[];
}

export interface Collaborator {
  userId: string;
  email: string;
  role: ShareRole;
}

/** Error carrying the uniform envelope's code so callers can branch on it. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = auth.currentUser
    ? await auth.currentUser.getIdToken()
    : null;

  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      err?.code ?? "UNKNOWN",
      err?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }

  return data as T;
}

export const api = {
  register: (name: string, email: string) =>
    apiFetch<{ email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email }),
    }),

  syncUser: () => apiFetch<{ user: unknown }>("/auth/sync", { method: "POST" }),

  listDocuments: () => apiFetch<DocumentsList>("/documents"),

  createDocument: (title?: string) =>
    apiFetch<{ document: Doc }>("/documents", {
      method: "POST",
      body: JSON.stringify(title ? { title } : {}),
    }),

  getDocument: (id: string) =>
    apiFetch<{ document: Doc; access: Access }>(`/documents/${id}`),

  updateDocument: (
    id: string,
    patch: { title?: string; content?: TiptapDoc },
  ) =>
    apiFetch<{ document: Doc }>(`/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteDocument: (id: string) =>
    apiFetch<void>(`/documents/${id}`, { method: "DELETE" }),

  importFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<{ id: string }>("/import", {
      method: "POST",
      body: form,
    });
  },

  listShares: (id: string) =>
    apiFetch<{ collaborators: Collaborator[] }>(`/documents/${id}/shares`),

  createShare: (id: string, email: string, role: ShareRole) =>
    apiFetch<{ collaborator: Collaborator }>(`/documents/${id}/shares`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  deleteShare: (id: string, userId: string) =>
    apiFetch<void>(`/documents/${id}/shares/${userId}`, { method: "DELETE" }),
};
