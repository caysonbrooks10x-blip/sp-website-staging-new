"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useClawLink } from "@/hooks/use-claw-link";
import { ProtectedRoute } from "@/components/protected-route";
import { Loader2, CheckCircle2, XCircle, Bot, Link2, ArrowRight, ShieldCheck, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const telegramBotUrl = useMemo(() => "https://t.me/StudioXCbot?start=pair", []);
  
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
    <div className="relative min-h-screen overflow-hidden bg-[#050607] px-4 pt-36 pb-12 md:pt-44 md:pb-16">
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-140px] h-[360px] w-[620px] -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:84px_84px] opacity-30" />
      </div>

      <div className="relative mx-auto max-w-lg">
        {/* header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
            <Link2 className="h-3.5 w-3.5" />
            Account Pairing
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white md:text-3xl">Link your Telegram bot</h1>
          <p className="mt-2 text-sm text-zinc-400">Pair once to route creations between web and chat.</p>
        </div>

        {/* card */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          {/* steps */}
          {step === "enter" && (
            <div className="space-y-5">
              {/* how it works */}
              <div className="space-y-2">
                {[
                  { num: "1", text: "Open @StudioXCbot in Telegram" },
                  { num: "2", text: "Send /pair to get a 6-digit code" },
                  { num: "3", text: "Enter the code below" },
                ].map((item) => (
                  <div key={item.num} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-xs font-semibold text-cyan-100">
                      {item.num}
                    </span>
                    <p className="text-sm text-zinc-200">{item.text}</p>
                  </div>
                ))}
              </div>

              {/* form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-zinc-500">Pairing Code</label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="ABC123"
                    maxLength={6}
                    className="h-14 rounded-xl border-white/12 bg-white/[0.03] text-center text-2xl tracking-[0.3em] font-mono text-white placeholder:text-zinc-600"
                    autoFocus
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="h-10 w-full rounded-xl border-white/12 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]"
                >
                  <a href={telegramBotUrl} target="_blank" rel="noreferrer">
                    <Bot className="mr-2 h-4 w-4" />
                    Open Telegram Bot
                  </a>
                </Button>

                <Button
                  type="submit"
                  disabled={code.length < 6}
                  className="h-11 w-full rounded-xl bg-cyan-300 text-black hover:bg-cyan-200"
                >
                  Link Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-zinc-400">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                Code expires in 10 minutes and is tied to your account.
              </div>
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-200" />
              <p className="text-sm text-zinc-300">Verifying pairing…</p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">Account linked</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Connected to <span className="capitalize text-cyan-200">{channelInfo?.channelType ?? "Telegram"}</span>
                </p>
              </div>
              <div className="flex w-full gap-2">
                <Button asChild variant="outline" className="h-10 flex-1 rounded-xl border-white/12 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]">
                  <a href={telegramBotUrl} target="_blank" rel="noreferrer">Return to Bot</a>
                </Button>
                <Button onClick={() => router.push("/studio")} className="h-10 flex-1 rounded-xl bg-cyan-300 text-black hover:bg-cyan-200">
                  Open Studio
                </Button>
              </div>
              <button onClick={() => { setCode(""); setStep("enter"); }} className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline">
                Link another channel
              </button>
            </div>
          )}

          {step === "relink" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-300/10">
                <ShieldCheck className="h-8 w-8 text-emerald-300" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">Already linked</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Connected to <span className="capitalize text-cyan-200">{channelInfo?.channelType ?? "Telegram"}</span>
                  {channelInfo?.channelUserId ? ` (${channelInfo.channelUserId})` : ""}
                </p>
              </div>
              <div className="flex w-full gap-2">
                <Button asChild variant="outline" className="h-10 flex-1 rounded-xl border-white/12 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]">
                  <a href={telegramBotUrl} target="_blank" rel="noreferrer">Open Telegram</a>
                </Button>
                <Button onClick={() => router.push("/studio")} className="h-10 flex-1 rounded-xl bg-cyan-300 text-black hover:bg-cyan-200">
                  Open Studio
                </Button>
              </div>
              <button onClick={() => { setCode(""); setStep("enter"); }} className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline">
                Link another channel
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-300/30 bg-rose-300/10">
                <XCircle className="h-8 w-8 text-rose-300" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">Pairing failed</p>
                <p className="mt-1 text-sm text-zinc-400">{errorMsg}</p>
              </div>
              <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3.5 py-2.5 text-center text-xs text-rose-200">
                Generate a new /pair code in Telegram and submit within 10 minutes.
              </div>
              <Button onClick={() => { setStep("enter"); setErrorMsg(""); }} className="h-10 w-full rounded-xl bg-cyan-300 text-black hover:bg-cyan-200">
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
