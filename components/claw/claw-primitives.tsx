import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page shell — avoid `overflow-hidden` so Lenis/body scroll isn’t fighting layout. */
export const clawPageBgClass =
  "relative min-h-screen overflow-x-hidden bg-black font-sans text-zinc-100 antialiased selection:bg-cyan-500/30";

/** Primary surface — solid glass (no heavy backdrop-blur = smoother scroll). */
export const clawCardClass =
  "rounded-3xl border border-white/[0.07] bg-zinc-950/85 shadow-[0_16px_48px_-24px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)]";

export const clawCardInteractiveClass =
  "transition-[box-shadow,transform,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/[0.11] hover:shadow-[0_20px_56px_-22px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

/** Hero — no backdrop-blur on large panels (major scroll cost). */
export const clawHeroPanelClass =
  "relative overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-zinc-900/98 via-zinc-950/95 to-[#07080b] shadow-[0_28px_90px_-28px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.07)]";

export const clawInsetClass =
  "rounded-2xl border border-white/[0.05] bg-black/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]";

/**
 * Workflow tiles — GPU-friendly hover only; no default will-change (saves layers on long pages).
 */
export const clawWorkflowCardClass =
  "group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0b0e] shadow-[0_16px_48px_-24px_rgba(0,0,0,0.65)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-teal-500/30 hover:shadow-[0_22px_56px_-20px_rgba(0,0,0,0.65),0_0_0_1px_rgba(45,212,191,0.1)]";

/** Lightweight enter: fade only (no slide = less compositing during scroll). */
export const clawWorkflowEnterClass =
  "animate-in fade-in fill-mode-both duration-300 ease-out motion-reduce:!animate-none motion-reduce:opacity-100";

export function ClawBackdropHub() {
  return (
    <div
      className="pointer-events-none absolute inset-0 isolate overflow-hidden [contain:paint]"
      aria-hidden
    >
      {/* Fewer, softer blurs — large blur() is expensive on scroll */}
      <div className="absolute -left-[10%] top-[-8%] h-[min(420px,45vw)] w-[min(480px,50vw)] rounded-full bg-teal-400/[0.055] blur-[80px]" />
      <div className="absolute right-[-5%] top-[12%] h-[min(320px,40vw)] w-[min(320px,40vw)] rounded-full bg-amber-200/[0.04] blur-[72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-8%,rgba(45,212,191,0.055),transparent_58%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.006)_1px,transparent_1px)] [background-size:80px_80px] opacity-[0.28]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_85%_at_50%_100%,rgba(0,0,0,0.48),transparent_48%)]" />
    </div>
  );
}

export function ClawBackdropFocus() {
  return (
    <div className="pointer-events-none absolute inset-0 isolate overflow-hidden [contain:paint]" aria-hidden>
      <div className="absolute left-1/2 top-[-180px] h-[380px] w-[min(680px,100vw)] -translate-x-1/2 rounded-full bg-teal-400/[0.045] blur-[90px]" />
      <div className="absolute bottom-[-15%] right-[-8%] h-[280px] w-[280px] rounded-full bg-amber-200/[0.03] blur-[72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_48%_at_50%_0%,rgba(45,212,191,0.045),transparent_52%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.006)_1px,transparent_1px)] [background-size:80px_80px] opacity-[0.26]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.36)_100%)]" />
    </div>
  );
}

export function ClawCard({
  className,
  children,
  interactive,
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <div className={cn(clawCardClass, interactive && clawCardInteractiveClass, className)}>
      {children}
    </div>
  );
}
