"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useClawLink } from "@/hooks/use-claw-link";
import { ProtectedRoute } from "@/components/protected-route";
import { Loader2, CheckCircle2, XCircle, Bot, Link2, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ClawBackdropFocus,
  clawCardClass,
  clawCardInteractiveClass,
  clawInsetClass,
  clawPageBgClass,
} from "@/components/claw/claw-primitives";
import { ClawSubNav } from "@/components/claw/claw-subnav";
import { buildTelegramBotStartUrl, getTelegramBotUsername } from "@/lib/claw-urls";

export default function ClawPairPage() {
  return (
    <ProtectedRoute>
      <PairContent />
    </ProtectedRoute>
  );
}

type Step = "enter" | "loading" | "success" | "error" | "relink";

function PairContent() {
  const { user } = useAuth();
  const { link, isLinked, loading: linkLoading } = useClawLink();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code")?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "");
  const [step, setStep] = useState<Step>("enter");
  const [errorMsg, setErrorMsg] = useState("");
  const [channelInfo, setChannelInfo] = useState<{ channelType: string; channelUserId: string } | null>(null);
  const telegramBotUrl = buildTelegramBotStartUrl("pair");
  const telegramBotUsername = getTelegramBotUsername();

  useEffect(() => {
    if (!linkLoading && isLinked && step === "enter" && !code) {
      setStep("relink");
      setChannelInfo({ channelType: link?.channelType ?? "telegram", channelUserId: link?.channelUserId ?? "" });
    }
  }, [isLinked, linkLoading, code, step, link]);

  useEffect(() => {
    const queryCode = searchParams.get("code");
    if (!queryCode) return;
    const normalized = queryCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (normalized.length > 0) setCode(normalized);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || code.length < 6) return;

    setStep("loading");
    setErrorMsg("");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/claw/pairing/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string; channelType?: string; channelUserId?: string };

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? "Invalid or expired code. Please generate a new one.");
        setStep("error");
        return;
      }

      setChannelInfo({ channelType: data.channelType ?? "telegram", channelUserId: data.channelUserId ?? "" });
      setStep("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    }
  };

  return (
    <div className={cn(clawPageBgClass, "px-4 pb-16 pt-24 md:px-6 md:pb-24 md:pt-28")}>
      <ClawBackdropFocus />

      <div className="relative mx-auto max-w-lg">
        <ClawSubNav className="mb-8" />
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/15 bg-teal-950/30 px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.26em] text-teal-200/90 ring-1 ring-inset ring-white/[0.04]">
            <Link2 className="h-3 w-3 opacity-80" />
            Account pairing
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Link your Telegram bot
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
            Pair once to route creations between the web studio and chat.
          </p>
        </div>

        <div className={cn(clawCardClass, clawCardInteractiveClass, "relative mt-10 overflow-hidden p-6 md:p-8")}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent"
            aria-hidden
          />
          {step === "enter" && (
            <div className="space-y-6">
              <div className="relative space-y-0">
                {[
                  { num: "1", text: `Open ${telegramBotUsername} in Telegram` },
                  { num: "2", text: "Send /pair to get a 6-digit code" },
                  { num: "3", text: "Enter the code below" },
                ].map((item, i) => (
                  <div key={item.num} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < 2 && (
                      <span
                        className="absolute left-[15px] top-9 bottom-0 w-px bg-gradient-to-b from-teal-500/25 to-transparent"
                        aria-hidden
                      />
                    )}
                    <span className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-teal-400/25 bg-teal-950/50 text-xs font-semibold text-teal-200 ring-1 ring-inset ring-white/[0.05]">
                      {item.num}
                    </span>
                    <p className="pt-1 text-sm leading-snug text-zinc-300">{item.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                    Pairing code
                  </label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="••••••"
                    maxLength={6}
                    className="h-16 rounded-2xl border-white/[0.08] bg-black/35 text-center font-mono text-2xl tracking-[0.45em] text-white placeholder:text-zinc-700 ring-1 ring-inset ring-white/[0.04]"
                    autoFocus
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="h-11 w-full rounded-xl border-white/[0.1] bg-black/30 text-sm font-semibold text-zinc-200 hover:bg-white/[0.06]"
                >
                  <a href={telegramBotUrl} target="_blank" rel="noreferrer">
                    <Bot className="mr-2 h-4 w-4 opacity-80" />
                    Open Telegram bot
                  </a>
                </Button>

                <Button
                  type="submit"
                  disabled={code.length < 6}
                  className="h-12 w-full rounded-xl border border-teal-400/25 bg-gradient-to-b from-teal-400 to-teal-600 text-sm font-semibold text-teal-950 shadow-md hover:brightness-110 disabled:opacity-40"
                >
                  Link account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div
                className={cn(
                  clawInsetClass,
                  "flex items-start gap-3 rounded-2xl border-white/[0.05] px-4 py-3 text-xs leading-relaxed text-zinc-500"
                )}
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
                Code expires in 10 minutes and is tied to your account.
              </div>
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="h-9 w-9 animate-spin text-teal-300/80" />
              <p className="text-sm text-zinc-400">Verifying pairing…</p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-950/40 ring-1 ring-inset ring-emerald-400/10">
                <CheckCircle2 className="h-9 w-9 text-emerald-300/90" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-white">Account linked</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Connected to{" "}
                  <span className="font-medium text-teal-200/90 capitalize">{channelInfo?.channelType ?? "Telegram"}</span>
                </p>
              </div>
              <div className="flex w-full gap-2.5">
                <Button
                  asChild
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-white/[0.1] bg-black/30 text-sm font-semibold text-zinc-200 hover:bg-white/[0.06]"
                >
                  <a href={telegramBotUrl} target="_blank" rel="noreferrer">
                    Return to bot
                  </a>
                </Button>
                <Button
                  onClick={() => router.push("/studio")}
                  className="h-11 flex-1 rounded-xl border border-teal-400/25 bg-gradient-to-b from-teal-400 to-teal-600 text-sm font-semibold text-teal-950 shadow-md hover:brightness-110"
                >
                  Open Studio
                </Button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCode("");
                  setStep("enter");
                }}
                className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
              >
                Link another channel
              </button>
            </div>
          )}

          {step === "relink" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-950/40 ring-1 ring-inset ring-emerald-400/10">
                <ShieldCheck className="h-9 w-9 text-emerald-300/90" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-white">Already linked</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Connected to{" "}
                  <span className="font-medium text-teal-200/90 capitalize">{channelInfo?.channelType ?? "Telegram"}</span>
                  {channelInfo?.channelUserId ? ` (${channelInfo.channelUserId})` : ""}
                </p>
              </div>
              <div className="flex w-full gap-2.5">
                <Button
                  asChild
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-white/[0.1] bg-black/30 text-sm font-semibold text-zinc-200 hover:bg-white/[0.06]"
                >
                  <a href={telegramBotUrl} target="_blank" rel="noreferrer">
                    Open Telegram
                  </a>
                </Button>
                <Button
                  onClick={() => router.push("/studio")}
                  className="h-11 flex-1 rounded-xl border border-teal-400/25 bg-gradient-to-b from-teal-400 to-teal-600 text-sm font-semibold text-teal-950 shadow-md hover:brightness-110"
                >
                  Open Studio
                </Button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCode("");
                  setStep("enter");
                }}
                className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
              >
                Link another channel
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl border border-rose-400/25 bg-rose-950/40 ring-1 ring-inset ring-rose-400/10">
                <XCircle className="h-9 w-9 text-rose-300/90" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-white">Pairing failed</p>
                <p className="mt-2 text-sm text-zinc-400">{errorMsg}</p>
              </div>
              <div
                className={cn(
                  clawInsetClass,
                  "w-full rounded-2xl border-rose-500/15 bg-rose-950/25 px-4 py-3 text-center text-xs leading-relaxed text-rose-200/90"
                )}
              >
                Generate a new /pair code in Telegram and submit within 10 minutes.
              </div>
              <Button
                onClick={() => {
                  setStep("enter");
                  setErrorMsg("");
                }}
                className="h-11 w-full rounded-xl border border-teal-400/25 bg-gradient-to-b from-teal-400 to-teal-600 text-sm font-semibold text-teal-950 shadow-md hover:brightness-110"
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
