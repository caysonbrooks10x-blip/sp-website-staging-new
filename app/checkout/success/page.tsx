"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebaseClient";
import { doc, onSnapshot } from "firebase/firestore";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

/**
 * Post-checkout success page.
 *
 * Stripe redirects here with ?session_id={CHECKOUT_SESSION_ID} after a
 * successful payment. The /api/stripe/webhook handler increments
 * users/{uid}.tokenBalance asynchronously — webhook delivery typically
 * arrives within 1-3 seconds but is not guaranteed before this page loads.
 *
 * Strategy: subscribe to the user's Firestore doc and wait for
 * lastCreditGrant.sessionId to match the URL session_id. Show a friendly
 * loading state in the meantime. Time out gracefully after 30s with a
 * "we'll grant your credits shortly" fallback — user is safe either way
 * because the webhook is idempotent and Stripe will retry on failure.
 */
export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<
    | { kind: "waiting" }
    | { kind: "granted"; credits: number }
    | { kind: "timeout" }
    | { kind: "no-session" }
  >({ kind: "waiting" });

  useEffect(() => {
    if (!sessionId) {
      setState({ kind: "no-session" });
      return;
    }
    if (authLoading) return;
    if (!user) {
      // Webhook will still grant credits keyed on uid; no harm if user is
      // signed out on this device (different browser, etc).
      router.replace("/?checkout=complete");
      return;
    }

    const ref = doc(db, "users", user.uid);
    const timeoutHandle = setTimeout(() => {
      setState((s) => (s.kind === "waiting" ? { kind: "timeout" } : s));
    }, 30_000);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as { lastCreditGrant?: { sessionId?: string; credits?: number } } | undefined;
        if (data?.lastCreditGrant?.sessionId === sessionId && typeof data.lastCreditGrant.credits === "number") {
          clearTimeout(timeoutHandle);
          setState({ kind: "granted", credits: data.lastCreditGrant.credits });
        }
      },
      (err) => {
        console.error("[checkout-success] snapshot error", err);
      },
    );

    return () => {
      clearTimeout(timeoutHandle);
      unsub();
    };
  }, [sessionId, user, authLoading, router]);

  return (
    <main className="relative min-h-screen bg-black text-white selection:bg-cyan-500/30">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        {state.kind === "waiting" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400" aria-hidden />
            <h1 className="mt-6 text-3xl font-semibold">Confirming your purchase…</h1>
            <p className="mt-3 max-w-md text-sm text-zinc-400">
              Your payment was received. We&apos;re crediting your account now — this
              usually takes just a couple of seconds.
            </p>
          </>
        )}

        {state.kind === "granted" && (
          <>
            <CheckCircle2 className="h-14 w-14 text-emerald-400" aria-hidden />
            <h1 className="mt-6 text-3xl font-semibold">You&apos;re all set</h1>
            <p className="mt-3 max-w-md text-sm text-zinc-300">
              <Sparkles className="mr-1 inline h-4 w-4 text-amber-300" aria-hidden />
              <span className="font-medium text-white">
                {state.credits.toLocaleString()} credits
              </span>{" "}
              just landed in your StudioX account.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/studio"
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500"
              >
                Open Studio
              </Link>
              <Link
                href="/creations"
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
              >
                My Creations
              </Link>
            </div>
          </>
        )}

        {state.kind === "timeout" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-400" aria-hidden />
            <h1 className="mt-6 text-3xl font-semibold">Payment received</h1>
            <p className="mt-3 max-w-md text-sm text-zinc-400">
              Your credits will appear in your account in the next few minutes. You
              can close this page — Stripe is still processing the receipt.
            </p>
            <Link
              href="/studio"
              className="mt-8 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              Go to Studio
            </Link>
          </>
        )}

        {state.kind === "no-session" && (
          <>
            <h1 className="text-3xl font-semibold">Hmm — no checkout session</h1>
            <p className="mt-3 max-w-md text-sm text-zinc-400">
              This page expects a Stripe session id in the URL. Try again from the
              pricing page.
            </p>
            <Link
              href="/pricing"
              className="mt-8 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 hover:bg-white/10"
            >
              Back to Pricing
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
