"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUpRight, Bot, Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildTelegramBotStartUrl, getTelegramBotUsername } from "@/lib/claw-urls";
import { cn } from "@/lib/utils";

export interface TelegramPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  startParam: string;
  /** Command the bot listens to, shown as hint (e.g. "/image", "/video", "/schedule"). */
  telegramCommand?: string;
  /** Pre-filled prompt text. */
  defaultPrompt?: string;
  /** Placeholder for the prompt textarea. */
  promptPlaceholder?: string;
  /** Whether the flow needs a prompt input. If false, only shows the action button. */
  requiresPrompt?: boolean;
  /** Label for the primary action button. */
  actionLabel?: string;
}

export function TelegramPromptDialog({
  open,
  onOpenChange,
  title,
  description,
  startParam,
  telegramCommand,
  defaultPrompt = "",
  promptPlaceholder = "Describe what you want to create…",
  requiresPrompt = true,
  actionLabel = "Send to Telegram",
}: TelegramPromptDialogProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [sent, setSent] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const botUsername = getTelegramBotUsername();

  useEffect(() => {
    if (open) {
      setPrompt(defaultPrompt);
      setSent(false);
      setCopyError(false);
    }
  }, [open, defaultPrompt]);

  const trimmedPrompt = prompt.trim();
  const canSubmit = !requiresPrompt || trimmedPrompt.length > 0;

  const commandPrefix = telegramCommand?.trim() || "";
  const clipboardText =
    requiresPrompt && trimmedPrompt
      ? commandPrefix
        ? `${commandPrefix} ${trimmedPrompt}`
        : trimmedPrompt
      : "";

  const handleSend = async () => {
    const telegramUrl = buildTelegramBotStartUrl(startParam);
    if (clipboardText) {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(clipboardText);
        } else {
          throw new Error("Clipboard API unavailable");
        }
        setCopyError(false);
      } catch {
        setCopyError(true);
      }
    }
    setSent(true);
    window.open(telegramUrl, "_blank", "noreferrer");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[71] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-3xl border border-white/[0.08] bg-zinc-950/95 p-6 md:p-7",
            "shadow-[0_28px_90px_-28px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.07)]",
            "ring-1 ring-inset ring-white/[0.04]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-teal-400/25 bg-teal-950/50 text-teal-200 ring-1 ring-inset ring-white/[0.05]">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-base font-semibold leading-tight tracking-tight text-white md:text-lg">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>
            <DialogPrimitive.Close
              className="-mr-1 -mt-1 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {requiresPrompt && (
            <div className="mt-5">
              <label
                htmlFor="telegram-prompt"
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
              >
                Your prompt
              </label>
              <Textarea
                id="telegram-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={promptPlaceholder}
                rows={4}
                className="mt-2 min-h-[112px] resize-none rounded-xl border-white/[0.08] bg-black/40 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 ring-1 ring-inset ring-white/[0.04] focus-visible:ring-teal-500/30"
              />
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500">
                <Copy className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                <span>
                  We&apos;ll copy{" "}
                  {commandPrefix ? (
                    <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[10.5px] text-teal-200/90">{commandPrefix} your prompt</code>
                  ) : (
                    "your prompt"
                  )}{" "}
                  to your clipboard. After the bot opens, paste it as your next message and send.
                </span>
              </p>
            </div>
          )}

          {telegramCommand && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-black/30 px-3.5 py-2.5 ring-1 ring-inset ring-white/[0.04]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Bot command</span>
              <code className="text-[12px] font-medium text-teal-200/90">{telegramCommand}</code>
              <span className="text-[11px] text-zinc-500">· opens {botUsername}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
            <Button
              type="button"
              onClick={handleSend}
              disabled={!canSubmit}
              className={cn(
                "h-11 flex-1 rounded-xl border border-teal-400/30 bg-gradient-to-b from-teal-400 to-teal-600 text-sm font-semibold text-teal-950 shadow-md shadow-teal-950/20 transition duration-300 hover:brightness-110",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
              )}
            >
              {sent ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {requiresPrompt ? (copyError ? "Telegram opened" : "Copied & opened") : "Telegram opened"}
                </>
              ) : (
                <>
                  {actionLabel}
                  <ArrowUpRight className="ml-2 h-4 w-4 opacity-80" />
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl border-white/[0.1] bg-black/35 text-sm font-semibold text-zinc-200 transition duration-300 hover:bg-white/[0.06] sm:flex-none"
            >
              {sent ? "Close" : "Cancel"}
            </Button>
          </div>

          {sent && (
            <div className="mt-4 rounded-xl border border-teal-400/20 bg-teal-950/35 px-3.5 py-2.5 text-[12px] leading-relaxed text-teal-100/90 ring-1 ring-inset ring-teal-400/10">
              {requiresPrompt ? (
                copyError ? (
                  <>
                    We couldn&apos;t copy automatically. Copy{" "}
                    {commandPrefix ? (
                      <code className="font-mono text-teal-200">{commandPrefix} {trimmedPrompt || "your prompt"}</code>
                    ) : (
                      <code className="font-mono text-teal-200">{trimmedPrompt || "your prompt"}</code>
                    )}{" "}
                    and paste it in Telegram after the bot opens.
                  </>
                ) : (
                  <>
                    {commandPrefix ? (
                      <>
                        Copied <code className="font-mono text-teal-200">{commandPrefix} {trimmedPrompt}</code> to your clipboard. Paste it in Telegram and press send — the bot will run the command directly.
                      </>
                    ) : (
                      <>Prompt copied. Paste it in Telegram and press send.</>
                    )}
                  </>
                )
              ) : (
                <>Telegram should have opened in a new tab. Complete the flow there.</>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
