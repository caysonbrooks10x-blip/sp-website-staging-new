"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Loader2,
  Clock,
  Calendar,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
  Video,
  Wand2,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fetchClawState, type ClawScheduledJob } from "@/lib/claw-state";
import {
  ClawBackdropFocus,
  clawCardClass,
  clawCardInteractiveClass,
  clawInsetClass,
  clawPageBgClass,
  clawWorkflowEnterClass,
} from "@/components/claw/claw-primitives";
import { ClawSubNav } from "@/components/claw/claw-subnav";

interface ScheduledJob extends ClawScheduledJob {
  jobId: string;
  skillName: string;
  args: Record<string, string>;
  schedule: { type: "once" | "interval" | "cron"; at?: string; every?: string; cron?: string; timezone?: string };
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

export default function SchedulePage() {
  return (
    <ProtectedRoute>
      <ScheduleContent />
    </ProtectedRoute>
  );
}

function ScheduleContent() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    user
      .getIdToken()
      .then((idToken) => fetchClawState(idToken))
      .then((state) => {
        if (cancelled) return;
        setJobs(
          state.scheduledJobs.map((job) => ({
            jobId: job.jobId,
            skillName: job.skillName || "workflow",
            args: job.args || {},
            schedule: job.schedule || { type: "once" },
            status: job.status,
            retryCount: job.retryCount || 0,
            createdAt: job.createdAt || "",
            lastRunAt: job.lastRunAt,
            nextRunAt: job.nextRunAt,
          }))
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setJobs([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    const active = jobs.filter((j) => j.status === "active").length;
    const paused = jobs.filter((j) => j.status === "paused").length;
    return { active, paused, total: jobs.length };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  return (
    <div className={cn(clawPageBgClass, "px-4 pb-16 pt-24 md:px-6 md:pb-24 md:pt-28")}>
      <ClawBackdropFocus />

      <div className="relative mx-auto max-w-3xl">
        <ClawSubNav className="mb-8" />
        <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/15 bg-teal-950/30 px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.26em] text-teal-200/90 ring-1 ring-inset ring-white/[0.04]">
              <Clock className="h-3 w-3 opacity-80" />
              Scheduler
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Automation timeline
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
              Monitor recurring jobs and scheduled workflows from Telegram.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="Active" value={stats.active} tone="emerald" />
            <StatPill label="Paused" value={stats.paused} tone="amber" />
            <StatPill label="Total" value={stats.total} tone="zinc" />
          </div>
        </div>

        <div className={cn(clawCardClass, clawCardInteractiveClass, "relative mt-10 overflow-hidden p-6 md:p-8")}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent"
            aria-hidden
          />
          <div className="relative flex flex-col gap-5 border-b border-white/[0.06] pb-6 lg:flex-row lg:items-center lg:justify-between">
            <p
              className={cn(
                clawInsetClass,
                "max-w-xl rounded-2xl px-4 py-3 text-xs leading-relaxed text-zinc-400"
              )}
            >
              <span className="font-semibold text-zinc-500">Create via Telegram:</span>{" "}
              <code className="font-mono text-[11px] text-zinc-300">/schedule every 1h generate …</code>
            </p>
            <div className="flex shrink-0 gap-1 rounded-xl border border-white/[0.07] bg-black/35 p-1 ring-1 ring-inset ring-white/[0.04]">
              {(["all", "active", "paused"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-xs font-semibold capitalize transition-all duration-200",
                    statusFilter === f
                      ? "bg-white/[0.14] text-white shadow-sm ring-1 ring-white/10"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-teal-300/70" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-8 space-y-3">
              {filteredJobs.map((job, index) => (
                <JobCard key={job.jobId} job={job} staggerIndex={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "zinc" }) {
  const toneClass = {
    emerald: "border-emerald-500/15 bg-emerald-950/35 text-emerald-100/90 ring-emerald-400/10",
    amber: "border-amber-500/15 bg-amber-950/35 text-amber-100/90 ring-amber-400/10",
    zinc: "border-white/[0.08] bg-black/30 text-zinc-300 ring-white/[0.05]",
  }[tone];

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-4 py-2 ring-1 ring-inset ring-white/[0.03]",
        toneClass
      )}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">{label}</span>
      <span className="text-lg font-semibold tabular-nums tracking-tight text-white">{value}</span>
    </div>
  );
}

function JobCard({ job, staggerIndex }: { job: ScheduledJob; staggerIndex: number }) {
  const scheduleLabel = () => {
    if (job.schedule.type === "once") return `Once at ${new Date(job.schedule.at || "").toLocaleString()}`;
    if (job.schedule.type === "interval") return `Every ${job.schedule.every}`;
    return `Cron: ${job.schedule.cron}`;
  };

  const prompt = job.args["prompt"] ?? job.skillName;
  const isActive = job.status === "active";
  const hasRetry = (job.retryCount || 0) > 0;
  const Icon = job.skillName.includes("video")
    ? Video
    : job.skillName.includes("template")
      ? Wand2
      : job.skillName.includes("image")
        ? ImageIcon
        : Sparkles;

  return (
    <div
      className={cn(
        clawInsetClass,
        clawWorkflowEnterClass,
        "flex items-center gap-4 rounded-2xl px-4 py-4 transition-[transform,border-color,background-color] duration-300 hover:border-white/[0.11] hover:bg-white/[0.04]"
      )}
      style={{ animationDelay: `${Math.min(staggerIndex, 14) * 45}ms` }}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ring-1 ring-inset ring-white/[0.04]",
          isActive
            ? "border-emerald-500/20 bg-emerald-950/35 text-emerald-200/90"
            : "border-amber-500/20 bg-amber-950/35 text-amber-200/90"
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">&ldquo;{prompt}&rdquo;</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3 opacity-70" />
            {scheduleLabel()}
          </span>
          {job.lastRunAt && (
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 opacity-70" />
              Last: {new Date(job.lastRunAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
        {hasRetry && (
          <Badge className="border-0 bg-rose-950/45 text-rose-100/90 ring-1 ring-inset ring-rose-400/15">
            <AlertTriangle className="mr-1 h-3 w-3" />
            {job.retryCount}
          </Badge>
        )}
        <Badge
          className={cn(
            "border-0 capitalize shadow-none",
            isActive
              ? "bg-emerald-950/50 text-emerald-100 ring-1 ring-inset ring-emerald-400/15"
              : "bg-amber-950/45 text-amber-100 ring-1 ring-inset ring-amber-400/15"
          )}
        >
          {isActive ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <PauseCircle className="mr-1 h-3 w-3" />}
          {isActive ? "Active" : "Paused"}
        </Badge>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-400/20 bg-teal-950/35 ring-1 ring-inset ring-teal-400/10">
        <Sparkles className="h-6 w-6 text-teal-200/80" />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-white">No scheduled jobs yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
        Set up recurring generations from Telegram to populate this timeline.
      </p>

      <div className="mx-auto mt-10 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className={cn(
            clawInsetClass,
            "rounded-2xl p-5 text-left transition-[border-color,background-color] hover:border-white/[0.1] hover:bg-white/[0.02]"
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-teal-300/70">Template</p>
          <p className="mt-2 font-medium text-zinc-100">Hourly product shots</p>
          <p className="mt-3 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-500 ring-1 ring-inset ring-white/[0.03]">
            /schedule every 1h generate product hero shot
          </p>
        </div>
        <div
          className={cn(
            clawInsetClass,
            "rounded-2xl p-5 text-left transition-[border-color,background-color] hover:border-white/[0.1] hover:bg-white/[0.02]"
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-teal-300/70">Template</p>
          <p className="mt-2 font-medium text-zinc-100">Daily social variant</p>
          <p className="mt-3 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-500 ring-1 ring-inset ring-white/[0.03]">
            /schedule daily at noon generate social ad
          </p>
        </div>
      </div>
    </div>
  );
}
