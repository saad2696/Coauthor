"use client";

import { AlertTriangle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | undefined
>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending],
  );

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              {pending.danger && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle size={18} />
                </span>
              )}
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  {pending.title}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {pending.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="rounded-lg border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                autoFocus
                onClick={() => close(true)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition ${
                  pending.danger
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-neutral-900 hover:bg-neutral-700"
                }`}
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
