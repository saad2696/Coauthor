"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";

export default function FinishSignInPage() {
  const { completeSignInFromLink } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    completeSignInFromLink()
      .then((result) => {
        if (result === "completed") {
          router.replace("/");
        } else {
          setError("This link is invalid or has expired.");
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Could not complete sign-in.",
        );
      });
  }, [completeSignInFromLink, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-neutral-500">
      {error ? (
        <>
          <p className="text-red-600">{error}</p>
          <Link href="/signup" className="text-neutral-900 underline">
            Back to signup
          </Link>
        </>
      ) : (
        <p>Finishing sign-in…</p>
      )}
    </div>
  );
}
