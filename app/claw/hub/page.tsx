"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Clock3,
  Compass,
  Link2,
  Package2,
  Rocket,
  Search,
  ShieldCheck,
  Send,
  Sparkles,
  TimerReset,
  Video,
  Workflow,
} from "lucide-react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useClawLink } from "@/hooks/use-claw-link";
import { ASSET_BASE } from "@/lib/assets";
import { db } from "@/lib/firebaseClient";
import { fetchClawState, type ClawRecentJob, type ClawScheduledJob } from "@/lib/claw-state";
import { listPersistedStudioGenerations, type PersistedStudioGeneration } from "@/lib/studio-generations";
import {
  buildClawWorkflowStudioHref,
  buildClawWorkflowTelegramCommand,
  buildClawWorkflowTelegramHref,
  CLAW_WORKFLOWS,
  CLAW_WORKFLOW_SECTIONS,
  type ClawWorkflowDefinition,
  type ClawWorkflowSection,
} from "@/lib/claw-workflows";

/* ─── constants ─── */

interface ScheduledJob extends ClawScheduledJob {}

type Category = "all" | "image" | "video";

const LEGACY_TEMPLATE_SLUG_FRAGMENTS = [
  "fire-lava", "firelava", "air-bending", "earth-zoom", "shadow-smoke",
  "animalization", "raven-transform", "train-rush", "mouth-in",
];

const WORKFLOW_SECTION_META: Record<
  ClawWorkflowSection,
  { icon: typeof Compass; badge: string; accent: string }
> = {
  core: { icon: Compass, badge: "Core", accent: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" },
  commerce: { icon: Package2, badge: "Commerce", accent: "border-lime-300/30 bg-lime-300/10 text-lime-100" },
  motion: { icon: Video, badge: "Motion", accent: "border-amber-300/30 bg-amber-300/10 text-amber-100" },
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

const isVideoUrl = (value?: string) => Boolean(value && /(\\.mp4|\\.mov|\\.webm|\\.m3u8)(\\?|$)/i.test(value));

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const cleanText = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();

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
  if (status === "completed" || status === "active") return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  if (status === "failed" || status === "cancelled" || status === "permanently_failed") return "border-rose-300/30 bg-rose-300/10 text-rose-100";
  if (status === "paused") return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  return "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";
};

/* ─── page ─── */

export default function ClawHubPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { link, isLinked, loading: linkLoading } = useClawLink();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [recentJobs, setRecentJobs] = useState<ClawRecentJob[]>([]);
  const [studioGenerations, setStudioGenerations] = useState<PersistedStudioGeneration[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);

  /* ─── data fetching ─── */

  useEffect(() => {
    let cancelled = false;
    if (!user) { setRecentJobs([]); setScheduledJobs([]); return; }
    const loadData = () => {
      user.getIdToken()
        .then((idToken) => fetchClawState(idToken))
        .then((state) => { if (cancelled) return; setRecentJobs(state.recentJobs); setScheduledJobs(state.scheduledJobs); })
        .catch(() => {});
    };
    loadData();
    const intervalId = setInterval(loadData, 4000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [user]);

  useEffect(() => {
    if (!user?.uid) { setStudioGenerations([]); return; }
    let cancelled = false;
    listPersistedStudioGenerationSafe(user.uid).then((items) => {
      if (!cancelled) setStudioGenerations(items.slice(0, 4));
    });
    return () => { cancelled = true; };
  }, [user?.uid]);

  /* ─── memos ─── */

  const filteredWorkflows = useMemo(() => {
    const text = search.toLowerCase().trim();
    return CLAW_WORKFLOWS.filter((workflow) => {
      const matchesSearch = !text ||
        workflow.title.toLowerCase().includes(text) ||
        workflow.summary.toLowerCase().includes(text) ||
        workflow.tags.some((tag) => tag.toLowerCase().includes(text));
      const matchesCategory = activeCategory === "all" || workflow.mediaType === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, search]);

  const workflowsBySection = useMemo(
    () => CLAW_WORKFLOW_SECTIONS.map((section) => ({
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

  /* ─── render ─── */

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050607] text-white">
      {/* background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[4%] h-[360px] w-[360px] rounded-full bg-cyan-400/14 blur-[130px]" />
        <div className="absolute right-[6%] top-[10%] h-[300px] w-[300px] rounded-full bg-amber-300/10 blur-[120px]" />
        <div className="absolute left-[40%] top-[52%] h-[320px] w-[320px] rounded-full bg-lime-300/8 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:84px_84px] opacity-30" />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-4 pb-24 pt-32 md:px-6 md:pb-32 md:pt-40">

        {/* ═══════════ HERO ═══════════ */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                <Workflow className="h-3.5 w-3.5" />
                Claw Hub
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl md:leading-[1.08]">
                Workflow control, automated.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-[15px]">
                Route creations between Studio and Telegram. Schedule recurring jobs. Launch guided workflows.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button asChild className="h-11 rounded-xl bg-white px-5 text-black hover:bg-zinc-200">
                <Link href="/studio">
                  Open Studio
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="h-11 rounded-xl bg-cyan-300 px-5 text-black hover:bg-cyan-200">
                <a href="https://t.me/StudioXCbot" target="_blank" rel="noreferrer">
                  <Bot className="mr-2 h-4 w-4" />
                  Telegram Bot
                </a>
              </Button>
            </div>
          </div>

          {/* status row */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusChip
              icon={isLinked ? ShieldCheck : Link2}
              label={linkLoading ? "Checking…" : isLinked ? "Paired" : "Not paired"}
              detail={isLinked ? `Linked via ${link?.channelType || "telegram"}` : "Run /pair in Telegram"}
              tone={isLinked ? "emerald" : "zinc"}
              href="/claw/pair"
            />
            <StatusChip
              icon={Send}
              label={studioGenerations.length > 0 ? `${studioGenerations.length} generations` : "No outputs yet"}
              detail="Studio handoff"
              tone={studioGenerations.length > 0 ? "cyan" : "zinc"}
              href="/studio"
            />
            <StatusChip
              icon={TimerReset}
              label={scheduleStats.active > 0 ? `${scheduleStats.active} active` : "No automations"}
              detail={nextScheduledRun ? `Next ${formatRelativeTime(nextScheduledRun)}` : "Schedule from Telegram"}
              tone={scheduleStats.active > 0 ? "amber" : "zinc"}
              href="/claw/schedule"
            />
            <StatusChip
              icon={Rocket}
              label={`${jobStats.total} jobs logged`}
              detail={jobStats.running > 0 ? `${jobStats.running} running now` : "All quiet"}
              tone={jobStats.running > 0 ? "cyan" : "zinc"}
            />
          </div>
        </section>

        {/* ═══════════ DASHBOARD GRID ═══════════ */}
        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* recent activity */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-zinc-400">Recent Activity</h2>
              <Badge className="border-white/10 bg-white/[0.04] text-zinc-400">{recentJobs.length} jobs</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {recentJobs.length > 0 ? (
                recentJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3 transition-colors hover:border-white/15">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{job.prompt}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{job.model || "Model pending"} · {formatRelativeTime(job.createdAt)}</p>
                    </div>
                    <Badge className={cn("shrink-0 capitalize", statusTone(job.status))}>{job.status}</Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
                  No activity yet. Create something from Telegram or Studio.
                </div>
              )}
            </div>
          </div>

          {/* sidebar: automation + bot */}
          <div className="space-y-4">
            {/* automation summary */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-zinc-400">Automation</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniStat label="Active" value={scheduleStats.active} tone="emerald" />
                <MiniStat label="Paused" value={scheduleStats.paused} tone="amber" />
                <MiniStat label="Completed" value={jobStats.completed} tone="cyan" />
                <MiniStat label="Failed" value={jobStats.failed} tone="rose" />
              </div>
              <Button asChild variant="outline" className="mt-3 h-9 w-full rounded-xl border-white/12 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]">
                <Link href="/claw/schedule">
                  <Clock3 className="mr-2 h-3.5 w-3.5" />
                  View Scheduler
                </Link>
              </Button>
            </div>

            {/* bot link */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">@StudioXCbot</p>
                  <p className="text-xs text-zinc-500">{isLinked ? "Linked" : "Not linked"} · Telegram</p>
                </div>
                <Badge className={cn("ml-auto shrink-0 capitalize", isLinked ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400")}>
                  {isLinked ? "Live" : "Pending"}
                </Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button asChild className="h-9 flex-1 rounded-xl bg-cyan-300 text-xs text-black hover:bg-cyan-200">
                  <a href="https://t.me/StudioXCbot" target="_blank" rel="noreferrer">Open Bot</a>
                </Button>
                <Button asChild variant="outline" className="h-9 flex-1 rounded-xl border-white/12 bg-white/[0.03] text-xs text-zinc-300 hover:bg-white/[0.08]">
                  <Link href="/claw/pair">{isLinked ? "Re-link" : "Pair"}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ WORKFLOW LIBRARY ═══════════ */}
        <section className="mt-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">Workflows</h2>
              <p className="mt-1 text-sm text-zinc-400">Launch guided generation flows in Studio or Telegram.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search workflows…"
                  className="h-10 w-[240px] rounded-xl border-white/12 bg-white/[0.03] pl-10 text-sm text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "image", "video"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs capitalize transition-all",
                      activeCategory === cat
                        ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Commerce Section */}
          {commerceWorkflows.length > 0 && (
            <div className="mt-6">
              <SectionHeader icon={Package2} label="Commerce" count={commerceWorkflows.length} tone="lime" />
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {commerceWorkflows.map((w) => <WorkflowCard key={w.id} workflow={w} />)}
              </div>
            </div>
          )}

          {/* Core Section */}
          {coreWorkflows.length > 0 && (
            <div className="mt-8">
              <SectionHeader icon={Compass} label="Core" count={coreWorkflows.length} tone="cyan" />
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {coreWorkflows.map((w) => <WorkflowCard key={w.id} workflow={w} />)}
              </div>
            </div>
          )}

          {/* Motion Section */}
          {motionWorkflows.length > 0 && (
            <div className="mt-8">
              <SectionHeader icon={Video} label="Motion" count={motionWorkflows.length} tone="amber" />
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {motionWorkflows.map((w) => <WorkflowCard key={w.id} workflow={w} />)}
              </div>
            </div>
          )}

          {filteredWorkflows.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-zinc-500">
              No workflows match &ldquo;{search}&rdquo;. Try a different keyword.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─── helper: safe list ─── */
async function listPersistedStudioGenerationSafe(uid: string) {
  try { return await listPersistedStudioGenerations(uid); }
  catch { return []; }
}

/* ═══════════ COMPONENTS ═══════════ */

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
  tone: "emerald" | "cyan" | "amber" | "zinc";
  href?: string;
}) {
  const toneClass = {
    emerald: "border-emerald-300/20 bg-emerald-300/[0.06]",
    cyan: "border-cyan-300/20 bg-cyan-300/[0.06]",
    amber: "border-amber-300/20 bg-amber-300/[0.06]",
    zinc: "border-white/10 bg-white/[0.03]",
  }[tone];
  const iconTone = {
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    zinc: "text-zinc-400",
  }[tone];

  const inner = (
    <div className={cn("flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors hover:border-white/20", toneClass)}>
      <Icon className={cn("h-4 w-4 shrink-0", iconTone)} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-zinc-500">{detail}</p>
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "cyan" | "rose" }) {
  const toneClass = {
    emerald: "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200",
    amber: "border-amber-300/20 bg-amber-300/[0.06] text-amber-200",
    cyan: "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-200",
    rose: "border-rose-300/20 bg-rose-300/[0.06] text-rose-200",
  }[tone];

  return (
    <div className={cn("rounded-xl border px-3 py-2.5", toneClass)}>
      <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  tone,
}: {
  icon: typeof Compass;
  label: string;
  count: number;
  tone: "cyan" | "lime" | "amber";
}) {
  const toneClass = {
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    lime: "border-lime-300/25 bg-lime-300/10 text-lime-100",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  }[tone];

  return (
    <div className="flex items-center gap-3">
      <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg border", toneClass)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h3 className="text-lg font-semibold text-white">{label}</h3>
      <Badge className={cn("ml-1", toneClass)}>{count}</Badge>
    </div>
  );
}

function WorkflowCard({ workflow }: { workflow: ClawWorkflowDefinition }) {
  const sectionMeta = WORKFLOW_SECTION_META[workflow.section];
  const studioHref = buildClawWorkflowStudioHref(workflow);
  const telegramHref = buildClawWorkflowTelegramHref(workflow);
  const telegramCommand = buildClawWorkflowTelegramCommand(workflow);
  const backdrop = WORKFLOW_BACKDROP_MAP[workflow.id] || `${ASSET_BASE}/capabilities/capabilities3.png`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c0f] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
      {/* image */}
      <div className="relative h-40 overflow-hidden">
        <img src={backdrop} alt={workflow.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c0f] via-[#0a0c0f]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-base font-semibold leading-tight text-white">{workflow.title}</h3>
        </div>
        <div className="absolute right-3 top-3 flex gap-1.5">
          <Badge className={cn("text-[10px] capitalize backdrop-blur-md", sectionMeta.accent)}>{sectionMeta.badge}</Badge>
          <Badge className={cn(
            "text-[10px] capitalize backdrop-blur-md",
            workflow.mediaType === "video" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
          )}>
            {workflow.mediaType}
          </Badge>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[13px] leading-relaxed text-zinc-400">{workflow.summary}</p>

        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-0.5">{workflow.model}</span>
          <span className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-0.5">{workflow.inputLabel}</span>
        </div>

        <div className="mt-auto flex gap-2 pt-4">
          <Button asChild size="sm" className="h-8 flex-1 rounded-lg bg-white text-xs text-black hover:bg-zinc-200">
            <Link href={studioHref}>
              Studio
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 flex-1 rounded-lg border-white/12 bg-white/[0.03] text-xs text-zinc-300 hover:bg-white/[0.08]">
            <a href={telegramHref} target="_blank" rel="noreferrer">
              Telegram
              <ArrowUpRight className="ml-1.5 h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
