"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Clock3,
  Coins,
  Compass,
  LayoutGrid,
  Layers,
  Link2,
  Package2,
  Rocket,
  Search,
  ShieldCheck,
  TimerReset,
  Video,
  Workflow,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useClawLink } from "@/hooks/use-claw-link";
import { ASSET_BASE } from "@/lib/assets";
import { fetchClawState, type ClawRecentJob, type ClawScheduledJob } from "@/lib/claw-state";
import { listPersistedStudioGenerations, type PersistedStudioGeneration } from "@/lib/studio-generations";
import {
  buildClawWorkflowStartParam,
  buildClawWorkflowStudioHref,
  buildClawWorkflowTelegramCommand,
  CLAW_WORKFLOWS,
  CLAW_WORKFLOW_SECTIONS,
  type ClawWorkflowDefinition,
  type ClawWorkflowSection,
} from "@/lib/claw-workflows";
import { buildTelegramBotStartUrl, getTelegramBotUrl, getTelegramBotUsername } from "@/lib/claw-urls";
import {
  ClawBackdropHub,
  clawCardClass,
  clawCardInteractiveClass,
  clawHeroPanelClass,
  clawInsetClass,
  clawPageBgClass,
  clawWorkflowCardClass,
  clawWorkflowEnterClass,
} from "@/components/claw/claw-primitives";
import { ClawSubNav } from "@/components/claw/claw-subnav";
import { TelegramPromptDialog } from "@/components/claw/telegram-prompt-dialog";

/* ─── constants ─── */

interface ScheduledJob extends ClawScheduledJob {}

type Category = "all" | "image" | "video";
type LibraryView = "sections" | "flat";

const WORKFLOW_SECTION_META: Record<
  ClawWorkflowSection,
  { badge: string; badgeGlass: string }
> = {
  core: {
    badge: "Core",
    badgeGlass: "border-cyan-400/30 bg-cyan-950/85 text-cyan-100",
  },
  commerce: {
    badge: "Commerce",
    badgeGlass: "border-cyan-400/30 bg-cyan-950/85 text-cyan-100",
  },
  motion: {
    badge: "Motion",
    badgeGlass: "border-sky-400/30 bg-sky-950/85 text-sky-100",
  },
};

const WORKFLOW_BACKDROP_MAP: Record<string, string> = {
  "fast-concept-board": `${ASSET_BASE}/capabilities/capabilities2.png`,
  "style-variation-burst": `${ASSET_BASE}/capabilities/capabilities4.png`,
  "creator-launch-pack": `${ASSET_BASE}/capabilities/capabilities6.png`,
  "product-mockup-generator": `${ASSET_BASE}/capabilities/capabilities3.png`,
  "background-scene-swap": `${ASSET_BASE}/capabilities/capabilities10.png`,
  "product-campaign-pack": `${ASSET_BASE}/capabilities/capabilities12.png`,
  "multi-variant-ad-generation": `${ASSET_BASE}/capabilities/capabilities14.png`,
  "costume-change-studio": `${ASSET_BASE}/capabilities/capabilities11.png`,
  "merch-try-on-lookbook": `${ASSET_BASE}/capabilities/capabilities9.png`,
  "product-motion-teaser": `${ASSET_BASE}/capabilities/capabilities8.png`,
  "before-after-reveal-reel": `${ASSET_BASE}/capabilities/capabilities13.png`,
};

const formatRelativeTime = (value?: string) => {
  if (!value) return "No timestamp";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "No timestamp";
  const diffMs = time - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) return formatter.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
};

const statusTone = (status: string) => {
  if (status === "completed" || status === "active")
    return "border-cyan-400/25 bg-cyan-950/50 text-cyan-100/95 ring-1 ring-inset ring-cyan-400/10";
  if (status === "failed" || status === "cancelled" || status === "permanently_failed")
    return "border-rose-400/25 bg-rose-950/45 text-rose-100/95 ring-1 ring-inset ring-rose-400/10";
  if (status === "paused")
    return "border-sky-400/25 bg-sky-950/45 text-sky-100/95 ring-1 ring-inset ring-sky-400/10";
  return "border-cyan-400/20 bg-cyan-950/40 text-cyan-100/90 ring-1 ring-inset ring-cyan-400/10";
};

/* ─── page ─── */

export default function ClawHubPage() {
  const { user } = useAuth();
  const { link, isLinked, loading: linkLoading } = useClawLink();
  const telegramBotUrl = getTelegramBotUrl();
  const telegramBotUsername = getTelegramBotUsername();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [libraryView, setLibraryView] = useState<LibraryView>("sections");
  const [recentJobs, setRecentJobs] = useState<ClawRecentJob[]>([]);
  const [studioGenerations, setStudioGenerations] = useState<PersistedStudioGeneration[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [telegramDialogConfig, setTelegramDialogConfig] = useState<{
    title: string;
    description?: string;
    startParam: string;
    telegramCommand?: string;
    defaultPrompt?: string;
    promptPlaceholder?: string;
    requiresPrompt?: boolean;
    actionLabel?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRecentJobs([]);
      setScheduledJobs([]);
      return;
    }
    const loadData = () => {
      user
        .getIdToken()
        .then((idToken) => fetchClawState(idToken))
        .then((state) => {
          if (cancelled) return;
          setRecentJobs(state.recentJobs);
          setScheduledJobs(state.scheduledJobs);
          setCreditBalance(state.creditBalance ?? 0);
          setGenerationCount(state.generationCount ?? 0);
        })
        .catch(() => {});
    };
    loadData();
    const intervalId = setInterval(loadData, 4000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    if (!user?.uid) {
      setStudioGenerations([]);
      return;
    }
    let cancelled = false;
    listPersistedStudioGenerationSafe(user.uid).then((items) => {
      if (!cancelled) setStudioGenerations(items.slice(0, 4));
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const filteredWorkflows = useMemo(() => {
    const text = search.toLowerCase().trim();
    return CLAW_WORKFLOWS.filter((workflow) => {
      const matchesSearch =
        !text ||
        workflow.title.toLowerCase().includes(text) ||
        workflow.summary.toLowerCase().includes(text) ||
        workflow.tags.some((tag) => tag.toLowerCase().includes(text));
      const matchesCategory = activeCategory === "all" || workflow.mediaType === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, search]);

  const flatWorkflowsSorted = useMemo(
    () => [...filteredWorkflows].sort((a, b) => a.title.localeCompare(b.title)),
    [filteredWorkflows]
  );

  const workflowsBySection = useMemo(
    () =>
      CLAW_WORKFLOW_SECTIONS.map((section) => ({
        ...section,
        workflows: filteredWorkflows.filter((workflow) => workflow.section === section.id),
      })),
    [filteredWorkflows]
  );

  const jobStats = useMemo(() => {
    const total = recentJobs.length;
    const completed = recentJobs.filter((j) => j.status === "completed").length;
    const failed = recentJobs.filter((j) => j.status === "failed" || j.status === "cancelled").length;
    const running = total - completed - failed;
    return { total, completed, failed, running };
  }, [recentJobs]);

  const scheduleStats = useMemo(() => {
    const active = scheduledJobs.filter((j) => j.status === "active").length;
    const paused = scheduledJobs.filter((j) => j.status === "paused").length;
    return { active, paused };
  }, [scheduledJobs]);

  const nextScheduledRun = useMemo(() => {
    return scheduledJobs.find((j) => j.status === "active" && j.nextRunAt)?.nextRunAt;
  }, [scheduledJobs]);

  const commerceWorkflows = workflowsBySection.find((s) => s.id === "commerce")?.workflows ?? [];
  const coreWorkflows = workflowsBySection.find((s) => s.id === "core")?.workflows ?? [];
  const motionWorkflows = workflowsBySection.find((s) => s.id === "motion")?.workflows ?? [];

  return (
    <div className={clawPageBgClass}>
      <ClawBackdropHub />

      <div className="relative mx-auto max-w-[1280px] px-4 pb-28 pt-24 md:px-8 md:pb-36 md:pt-28">
        <ClawSubNav className="mb-8" />

        <section className={cn(clawHeroPanelClass, "p-6 md:p-10 lg:p-11")}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent"
            aria-hidden
          />
          <div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-cyan-500/[0.05] blur-3xl" aria-hidden />

          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300 ring-1 ring-inset ring-cyan-500/10">
                <Workflow className="h-3 w-3 text-cyan-400" />
                Claw Hub
              </div>
              <h1 className="mt-5 text-[1.75rem] font-bold leading-[1.15] tracking-tight text-white md:text-5xl md:leading-[1.08]">
                Workflow control,{" "}
                <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-300 bg-clip-text text-transparent">
                  one place.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400 md:text-base">
                Route creations between Studio and Telegram, schedule recurring jobs, and launch guided workflows from a single command center.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button
                asChild
                className="h-11 rounded-xl border border-white/12 bg-white px-6 text-sm font-semibold text-zinc-950 shadow-[0_1px_0_0_rgba(255,255,255,0.45)_inset] transition duration-300 hover:bg-zinc-100"
              >
                <Link href="/studio">
                  Open Studio
                  <ArrowRight className="ml-2 h-4 w-4 opacity-70" />
                </Link>
              </Button>
              <Button
                asChild
                className="h-11 rounded-xl border border-cyan-400/30 bg-gradient-to-b from-cyan-400 to-cyan-600 px-6 text-sm font-semibold text-cyan-950 shadow-lg shadow-cyan-950/20 transition duration-300 hover:brightness-110"
              >
                <a href={telegramBotUrl} target="_blank" rel="noreferrer">
                  <Bot className="mr-2 h-4 w-4" />
                  Telegram Bot
                </a>
              </Button>
            </div>
          </div>

          <div className="relative mt-10 h-px w-full bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />

          <div className="relative mt-8 rounded-2xl border border-white/[0.06] bg-black/30 p-3 ring-1 ring-inset ring-white/[0.04] md:p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatusChip
                icon={isLinked ? ShieldCheck : Link2}
                label={linkLoading ? "Checking…" : isLinked ? "Paired" : "Not paired"}
                detail={isLinked ? `Linked via ${link?.channelType || "telegram"}` : "Run /pair in Telegram"}
                tone={isLinked ? "emerald" : "zinc"}
                href="/claw/pair"
              />
              <StatusChip
                icon={Coins}
                label={creditBalance > 0 ? `${creditBalance} credits` : "No credits"}
                detail={generationCount > 0 ? `${generationCount} generations made` : "Top up at /pricing"}
                tone={creditBalance > 100 ? "teal" : creditBalance > 0 ? "amber" : "zinc"}
                href="/pricing"
              />
              <StatusChip
                icon={Rocket}
                label={`${jobStats.total} jobs logged`}
                detail={jobStats.running > 0 ? `${jobStats.running} running now` : "All quiet"}
                tone={jobStats.running > 0 ? "teal" : "zinc"}
              />
            </div>
          </div>
        </section>

        {/* ── Quick Actions → Telegram Bot ── */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "🖼️",
              label: "Image Gen",
              desc: "Generate any image from text",
              action: "/image [prompt]",
              dialog: {
                title: "Image Gen in Telegram",
                description: "Write your image prompt below. We'll copy it to your clipboard and open the bot so you can paste it as your first message.",
                startParam: "image",
                telegramCommand: "/image",
                promptPlaceholder: "A cinematic neon-lit alley after rain, shot on 35mm, moody lighting",
                actionLabel: "Send to Telegram",
                requiresPrompt: true,
              },
            },
            {
              icon: "🎬",
              label: "Video Gen",
              desc: "Create cinematic AI videos",
              action: "/video [prompt]",
              dialog: {
                title: "Video Gen in Telegram",
                description: "Describe the video you want. We'll copy it to your clipboard and open the bot so you can paste it as your first message.",
                startParam: "video",
                telegramCommand: "/video",
                promptPlaceholder: "Slow cinematic orbit around a luxury perfume bottle on black velvet, dramatic rim light",
                actionLabel: "Send to Telegram",
                requiresPrompt: true,
              },
            },
            {
              icon: "💰",
              label: "Credits",
              desc: creditBalance > 0 ? `${creditBalance} available` : "Check balance",
              action: "/credits",
              dialog: {
                title: "Check credits in Telegram",
                description: "Open the bot and it'll report your current credit balance.",
                startParam: "credits",
                telegramCommand: "/credits",
                actionLabel: "Open Telegram",
                requiresPrompt: false,
              },
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setTelegramDialogConfig(item.dialog)}
              className={cn(
                clawCardClass,
                "group relative flex flex-col gap-3 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-500/25 hover:shadow-[0_20px_56px_-22px_rgba(0,0,0,0.55),0_0_0_1px_rgba(6,182,212,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{item.icon}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 transition-all duration-300 group-hover:text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-snug text-zinc-500">{item.desc}</p>
              </div>
              <code className="mt-auto rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-1.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-white/[0.03]">
                {item.action}
              </code>
            </button>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_min(100%,380px)]">
          <div className={cn(clawCardClass, clawCardInteractiveClass, "flex flex-col overflow-hidden p-0 md:p-0")}>
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-6 pb-5 pt-6 md:px-8 md:pt-8">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white md:text-xl">Recent activity</h2>
                <p className="mt-1 text-xs text-zinc-500">Latest jobs from your linked channels</p>
              </div>
              <Badge className="shrink-0 border-white/[0.08] bg-black/40 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400 ring-1 ring-inset ring-white/[0.06]">
                {recentJobs.length} jobs
              </Badge>
            </div>
            <div className="px-4 pb-6 pt-5 md:px-8 md:pb-8">
              <ActivityFeed jobs={recentJobs} />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className={cn(clawCardClass, clawCardInteractiveClass, "p-6 md:p-8")}>
              <div className="border-b border-white/[0.06] pb-5">
                <h2 className="text-lg font-semibold tracking-tight text-white">Automation</h2>
                <p className="mt-1 text-xs text-zinc-500">Live scheduler snapshot</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniStat label="Active" value={scheduleStats.active} tone="emerald" />
                <MiniStat label="Paused" value={scheduleStats.paused} tone="amber" />
                <MiniStat label="Completed" value={jobStats.completed} tone="teal" />
                <MiniStat label="Failed" value={jobStats.failed} tone="rose" />
              </div>
              <Button
                asChild
                variant="outline"
                className="mt-6 h-10 w-full rounded-xl border-white/[0.1] bg-black/30 text-sm font-semibold text-zinc-200 transition duration-300 hover:border-white/[0.14] hover:bg-white/[0.05]"
              >
                <Link href="/claw/schedule">
                  <Clock3 className="mr-2 h-3.5 w-3.5 opacity-70" />
                  View scheduler
                </Link>
              </Button>
            </div>

            <div className={cn(clawCardClass, clawCardInteractiveClass, "p-6 md:p-8")}>
              <div className="border-b border-white/[0.06] pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Telegram</p>
                <div className="mt-3 flex items-center gap-3.5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-950/45 text-cyan-200 ring-1 ring-inset ring-white/[0.05]">
                    <Bot className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{telegramBotUsername}</p>
                    <p className="text-xs text-zinc-500">
                      {isLinked ? "Linked" : "Not linked"} · Telegram
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 border-0 text-[11px] font-medium capitalize",
                      isLinked
                        ? "bg-cyan-950/55 text-cyan-100 ring-1 ring-inset ring-cyan-400/15"
                        : "bg-zinc-900/90 text-zinc-400 ring-1 ring-inset ring-white/[0.08]"
                    )}
                  >
                    {isLinked ? "Live" : "Pending"}
                  </Badge>
                </div>
              </div>
              <div className="mt-5 flex gap-2.5">
                <Button
                  asChild
                  className="h-10 flex-1 rounded-xl border border-cyan-400/25 bg-gradient-to-b from-cyan-400 to-cyan-600 text-xs font-semibold text-cyan-950 shadow-md transition duration-300 hover:brightness-110"
                >
                  <a href={telegramBotUrl} target="_blank" rel="noreferrer">
                    Open bot
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 flex-1 rounded-xl border-white/[0.1] bg-black/35 text-xs font-semibold text-zinc-200 transition duration-300 hover:bg-white/[0.06]"
                >
                  <Link href="/claw/pair">{isLinked ? "Re-link" : "Pair"}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-16 md:mt-24">
          <div className="relative rounded-[1.65rem] border border-white/[0.08] bg-gradient-to-b from-zinc-900/55 via-zinc-950/35 to-zinc-950/20 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-inset ring-white/[0.05] md:p-9">
          <div className="flex flex-col gap-8 border-b border-white/[0.06] pb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400/70">Library</p>
              <h2 className="mt-2 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent md:text-4xl">
                Workflows
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
                Search, filter, and open any flow in Studio or Telegram.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-black/35 p-1 ring-1 ring-inset ring-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => setLibraryView("sections")}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-300",
                      libraryView === "sections"
                        ? "bg-white/[0.14] text-white shadow-sm ring-1 ring-white/10"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <Layers className="h-3.5 w-3.5 opacity-80" />
                    By section
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryView("flat")}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-300",
                      libraryView === "flat"
                        ? "bg-white/[0.14] text-white shadow-sm ring-1 ring-white/10"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5 opacity-80" />
                    All workflows
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search workflows…"
                    className="h-11 w-full min-w-[200px] rounded-xl border-white/[0.08] bg-black/40 pl-10 text-sm text-zinc-100 placeholder:text-zinc-600 ring-1 ring-inset ring-white/[0.05] transition focus-visible:ring-cyan-500/30 sm:w-[260px]"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.07] bg-black/35 p-1 ring-1 ring-inset ring-white/[0.04]">
                {(["all", "image", "video"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "rounded-lg px-3.5 py-2 text-xs font-semibold capitalize transition-all duration-300",
                      activeCategory === cat
                        ? "bg-white/[0.14] text-white shadow-sm ring-1 ring-white/10"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {libraryView === "flat" && (
            <div className="mt-10">
              <p className="mb-6 text-sm text-zinc-500">
                Showing{" "}
                <span className="font-medium text-zinc-300">{flatWorkflowsSorted.length}</span>{" "}
                {flatWorkflowsSorted.length === 1 ? "workflow" : "workflows"} (A–Z)
              </p>
              {flatWorkflowsSorted.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {flatWorkflowsSorted.map((w, i) => (
                    <WorkflowCard
                      key={w.id}
                      workflow={w}
                      staggerIndex={i}
                      onOpenTelegram={setTelegramDialogConfig}
                    />
                  ))}
                </div>
              ) : (
                <EmptyWorkflows search={search} />
              )}
            </div>
          )}

          {libraryView === "sections" && (
            <>
              {commerceWorkflows.length > 0 && (
                <div className="mt-12">
                  <WorkflowSectionIntro sectionId="commerce" icon={Package2} count={commerceWorkflows.length} tone="emerald" />
                  <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {commerceWorkflows.map((w, i) => (
                      <WorkflowCard
                        key={w.id}
                        workflow={w}
                        staggerIndex={i}
                        onOpenTelegram={setTelegramDialogConfig}
                      />
                    ))}
                  </div>
                </div>
              )}

              {coreWorkflows.length > 0 && (
                <div className="mt-16 md:mt-20">
                  <WorkflowSectionIntro sectionId="core" icon={Compass} count={coreWorkflows.length} tone="teal" />
                  <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {coreWorkflows.map((w, i) => (
                      <WorkflowCard
                        key={w.id}
                        workflow={w}
                        staggerIndex={i}
                        onOpenTelegram={setTelegramDialogConfig}
                      />
                    ))}
                  </div>
                </div>
              )}

              {motionWorkflows.length > 0 && (
                <div className="mt-16 md:mt-20">
                  <WorkflowSectionIntro sectionId="motion" icon={Video} count={motionWorkflows.length} tone="amber" />
                  <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {motionWorkflows.map((w, i) => (
                      <WorkflowCard
                        key={w.id}
                        workflow={w}
                        staggerIndex={i}
                        onOpenTelegram={setTelegramDialogConfig}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredWorkflows.length === 0 && <EmptyWorkflows search={search} />}
            </>
          )}
          </div>
        </section>
      </div>

      <TelegramPromptDialog
        open={telegramDialogConfig !== null}
        onOpenChange={(open) => {
          if (!open) setTelegramDialogConfig(null);
        }}
        title={telegramDialogConfig?.title ?? ""}
        description={telegramDialogConfig?.description}
        startParam={telegramDialogConfig?.startParam ?? ""}
        telegramCommand={telegramDialogConfig?.telegramCommand}
        defaultPrompt={telegramDialogConfig?.defaultPrompt}
        promptPlaceholder={telegramDialogConfig?.promptPlaceholder}
        requiresPrompt={telegramDialogConfig?.requiresPrompt ?? true}
        actionLabel={telegramDialogConfig?.actionLabel}
      />
    </div>
  );
}

function EmptyWorkflows({ search }: { search: string }) {
  return (
    <div
      className={cn(
        clawInsetClass,
        "mt-6 border-dashed border-white/[0.1] px-8 py-16 text-center text-sm text-zinc-500"
      )}
    >
      No workflows match &ldquo;{search}&rdquo;. Try a different keyword or filter.
    </div>
  );
}

function ActivityFeed({ jobs }: { jobs: ClawRecentJob[] }) {
  if (jobs.length === 0) {
    return (
      <div
        className={cn(
          clawInsetClass,
          "border-dashed border-white/[0.08] px-6 py-14 text-center text-sm text-zinc-500"
        )}
      >
        No activity yet. Create something from Telegram or Studio.
      </div>
    );
  }

  const slice = jobs.slice(0, 5);

  return (
    <>
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20 ring-1 ring-inset ring-white/[0.04]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-black/30 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <th className="px-4 py-3 font-medium">Prompt</th>
                <th className="hidden w-[120px] px-3 py-3 font-medium xl:table-cell">Model</th>
                <th className="hidden w-[100px] px-3 py-3 font-medium lg:table-cell">Time</th>
                <th className="w-[100px] px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-white/[0.04] transition-colors duration-300 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="max-w-0 px-4 py-3">
                    <p className="truncate font-medium text-zinc-100" title={job.prompt}>
                      {job.prompt}
                    </p>
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-zinc-500 xl:table-cell">{job.model || "—"}</td>
                  <td className="hidden px-3 py-3 text-xs tabular-nums text-zinc-500 lg:table-cell">
                    {formatRelativeTime(job.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge className={cn("border-0 capitalize shadow-none", statusTone(job.status))}>{job.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2.5 md:hidden">
        {slice.map((job) => (
          <div
            key={job.id}
            className={cn(
              clawInsetClass,
              "flex flex-col gap-2 px-4 py-3.5 transition-[border-color,background-color] duration-300 hover:border-white/[0.1] hover:bg-white/[0.03]"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-medium leading-snug text-zinc-100">{job.prompt}</p>
              <Badge className={cn("shrink-0 border-0 capitalize shadow-none", statusTone(job.status))}>{job.status}</Badge>
            </div>
            <p className="text-xs text-zinc-500">
              {job.model || "Model pending"} · {formatRelativeTime(job.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

async function listPersistedStudioGenerationSafe(uid: string) {
  try {
    return await listPersistedStudioGenerations(uid);
  } catch {
    return [];
  }
}

function StatusChip({
  icon: Icon,
  label,
  detail,
  tone,
  href,
}: {
  icon: typeof ShieldCheck;
  label: string;
  detail: string;
  tone: "emerald" | "teal" | "amber" | "zinc";
  href?: string;
}) {
  const toneClass = {
    emerald: "border-cyan-500/15 bg-cyan-950/30",
    teal: "border-cyan-500/15 bg-cyan-950/30",
    amber: "border-sky-500/15 bg-sky-950/30",
    zinc: "border-white/[0.07] bg-zinc-950/40",
  }[tone];
  const iconTone = {
    emerald: "text-cyan-300/90",
    teal: "text-cyan-300/90",
    amber: "text-sky-300/90",
    zinc: "text-zinc-500",
  }[tone];
  const accentBar = {
    emerald: "bg-cyan-400/60",
    teal: "bg-cyan-400/60",
    amber: "bg-sky-400/60",
    zinc: "bg-zinc-500/50",
  }[tone];

  const inner = (
    <div
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-3 ring-1 ring-inset ring-white/[0.04] transition-[transform,border-color,background-color] duration-300 hover:border-white/[0.12] hover:bg-white/[0.03] md:px-4 md:py-3.5",
        toneClass
      )}
    >
      <span className={cn("absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-90", accentBar)} aria-hidden />
      <Icon className={cn("relative ml-1 h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-105", iconTone)} />
      <div className="min-w-0 flex-1 pl-1">
        <p className="text-sm font-semibold text-zinc-100">{label}</p>
        <p className="mt-0.5 text-xs leading-snug text-zinc-500">{detail}</p>
      </div>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060708]"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "teal" | "rose" }) {
  const toneClass = {
    emerald: "border-cyan-500/12 bg-cyan-950/35 text-cyan-100/90",
    amber: "border-sky-500/12 bg-sky-950/35 text-sky-100/90",
    teal: "border-cyan-500/12 bg-cyan-950/35 text-cyan-100/90",
    rose: "border-rose-500/12 bg-rose-950/35 text-rose-100/90",
  }[tone];

  return (
    <div className={cn("rounded-2xl border px-3.5 py-3.5 ring-1 ring-inset ring-white/[0.04]", toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</p>
    </div>
  );
}

const SECTION_THEME: Record<
  "teal" | "emerald" | "amber",
  { bar: string; icon: string; badge: string; wash: string }
> = {
  teal: {
    bar: "from-cyan-400/90 via-cyan-500/40 to-transparent",
    icon: "border-cyan-400/30 bg-cyan-950/50 text-cyan-100 shadow-[0_0_20px_-6px_rgba(6,182,212,0.35)]",
    badge: "border-cyan-400/20 bg-cyan-950/55 text-cyan-100 ring-cyan-400/15",
    wash: "from-cyan-500/[0.07] to-transparent",
  },
  emerald: {
    bar: "from-cyan-400/90 via-cyan-500/40 to-transparent",
    icon: "border-cyan-400/30 bg-cyan-950/50 text-cyan-100 shadow-[0_0_20px_-6px_rgba(6,182,212,0.3)]",
    badge: "border-cyan-400/20 bg-cyan-950/55 text-cyan-100 ring-cyan-400/15",
    wash: "from-cyan-500/[0.07] to-transparent",
  },
  amber: {
    bar: "from-sky-400/90 via-sky-500/40 to-transparent",
    icon: "border-sky-400/30 bg-sky-950/50 text-sky-100 shadow-[0_0_20px_-6px_rgba(56,189,248,0.28)]",
    badge: "border-sky-400/20 bg-sky-950/55 text-sky-100 ring-sky-400/15",
    wash: "from-sky-500/[0.07] to-transparent",
  },
};

function WorkflowSectionIntro({
  sectionId,
  icon: Icon,
  count,
  tone,
}: {
  sectionId: ClawWorkflowSection;
  icon: typeof Compass;
  count: number;
  tone: "teal" | "emerald" | "amber";
}) {
  const meta = CLAW_WORKFLOW_SECTIONS.find((s) => s.id === sectionId);
  const theme = SECTION_THEME[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-950/50 ring-1 ring-inset ring-white/[0.04]">
      <div
        className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90", theme.wash)}
        aria-hidden
      />
      <div className={cn("absolute left-0 top-0 h-full w-1 bg-gradient-to-b", theme.bar)} aria-hidden />
      <div className="relative z-10 flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4 pl-1 sm:flex-row sm:items-start sm:gap-5 sm:pl-2">
          <span
            className={cn(
              "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ring-1 ring-inset ring-white/[0.06]",
              theme.icon
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{meta?.title ?? sectionId}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{meta?.description}</p>
          </div>
        </div>
        <Badge
          className={cn(
            "h-fit shrink-0 border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider shadow-none ring-1 ring-inset",
            theme.badge
          )}
        >
          {count} {count === 1 ? "workflow" : "workflows"}
        </Badge>
      </div>
    </div>
  );
}

interface TelegramDialogConfig {
  title: string;
  description?: string;
  startParam: string;
  telegramCommand?: string;
  defaultPrompt?: string;
  promptPlaceholder?: string;
  requiresPrompt?: boolean;
  actionLabel?: string;
}

function WorkflowCard({
  workflow,
  staggerIndex,
  onOpenTelegram,
}: {
  workflow: ClawWorkflowDefinition;
  staggerIndex: number;
  onOpenTelegram: (config: TelegramDialogConfig) => void;
}) {
  const sectionMeta = WORKFLOW_SECTION_META[workflow.section];
  const studioHref = buildClawWorkflowStudioHref(workflow);
  const backdrop = WORKFLOW_BACKDROP_MAP[workflow.id] || `${ASSET_BASE}/capabilities/capabilities3.png`;
  const mediaBadge =
    workflow.mediaType === "video"
      ? "border-sky-400/35 bg-sky-950/90 text-sky-50"
      : "border-cyan-400/35 bg-cyan-950/90 text-cyan-50";

  return (
    <article
      className={cn(clawWorkflowCardClass, clawWorkflowEnterClass)}
      style={{ animationDelay: `${Math.min(staggerIndex, 12) * 28}ms` }}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-zinc-900">
        <img
          src={backdrop}
          alt={workflow.title}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          loading="lazy"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0b0e] via-[#0a0b0e]/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />

        <div className="absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ring-white/10",
                sectionMeta.badgeGlass
              )}
            >
              {sectionMeta.badge}
            </span>
            <span className={cn("inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ring-white/10", mediaBadge)}>
              {workflow.mediaType}
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col px-5 pb-5 pt-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        <h3 className="text-[1.0625rem] font-semibold leading-snug tracking-tight text-white">{workflow.title}</h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-zinc-400">{workflow.summary}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
          <div className={cn(clawInsetClass, "rounded-xl px-3 py-2.5")}>
            <dt className="font-medium uppercase tracking-wider text-zinc-600">Model</dt>
            <dd className="mt-1 truncate font-medium text-zinc-300" title={workflow.model}>
              {workflow.model}
            </dd>
          </div>
          <div className={cn(clawInsetClass, "rounded-xl px-3 py-2.5")}>
            <dt className="font-medium uppercase tracking-wider text-zinc-600">Input</dt>
            <dd className="mt-1 truncate font-medium text-zinc-300" title={workflow.inputLabel}>
              {workflow.inputLabel}
            </dd>
          </div>
        </dl>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button
            asChild
            size="sm"
            className="h-10 w-full rounded-xl border border-white/18 bg-white text-xs font-semibold tracking-wide text-zinc-900 shadow-[0_1px_0_0_rgba(255,255,255,0.45)_inset] transition duration-300 hover:bg-zinc-100"
          >
            <Link href={studioHref} className="inline-flex w-full items-center justify-center gap-2">
              Studio
              <ArrowRight className="h-3.5 w-3.5 opacity-55" />
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onOpenTelegram({
                title: `${workflow.title} in Telegram`,
                description: workflow.summary,
                startParam: buildClawWorkflowStartParam(workflow),
                telegramCommand: buildClawWorkflowTelegramCommand(workflow),
                defaultPrompt: workflow.studioPrompt,
                promptPlaceholder: "Describe what you want to create…",
                requiresPrompt: true,
                actionLabel: "Send to Telegram",
              })
            }
            className="h-10 w-full rounded-xl border-white/[0.14] bg-black/50 text-xs font-semibold tracking-wide text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition duration-300 hover:border-cyan-500/30 hover:bg-cyan-950/30"
          >
            <span className="inline-flex w-full items-center justify-center gap-2">
              Telegram
              <ArrowUpRight className="h-3.5 w-3.5 opacity-55" />
            </span>
          </Button>
        </div>
      </div>
    </article>
  );
}
