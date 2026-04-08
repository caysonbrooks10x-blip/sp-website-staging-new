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
    if (!user) { setJobs([]); setLoading(false); return; }

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
      .catch(() => { if (!cancelled) { setJobs([]); setLoading(false); } });

    return () => { cancelled = true; };
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
    <div className="relative min-h-screen overflow-hidden bg-[#050607] px-4 pt-36 pb-12 md:pt-44 md:pb-16">
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-160px] h-[360px] w-[620px] -translate-x-1/2 rounded-full bg-cyan-500/12 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:84px_84px] opacity-30" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-100">
              <Clock className="h-3.5 w-3.5" />
              Scheduler
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-white md:text-3xl">Automation Timeline</h1>
            <p className="mt-1 text-sm text-zinc-400">Monitor recurring jobs and scheduled workflows.</p>
          </div>
          <div className="flex gap-2">
            <StatPill label="Active" value={stats.active} tone="emerald" />
            <StatPill label="Paused" value={stats.paused} tone="amber" />
            <StatPill label="Total" value={stats.total} tone="zinc" />
          </div>
        </div>

        {/* filters + hint */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-1.5 text-xs font-mono text-zinc-400">
              Create via Telegram: <span className="text-zinc-200">/schedule every 1h generate …</span>
            </p>
            <div className="flex gap-1">
              {(["all", "active", "paused"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs capitalize transition-all",
                    statusFilter === f
                      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* job list */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-200" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-4 space-y-2">
              {filteredJobs.map((job) => (
                <JobCard key={job.jobId} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── components ─── */

function StatPill({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "zinc" }) {
  const toneClass = {
    emerald: "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200",
    amber: "border-amber-300/25 bg-amber-300/[0.08] text-amber-200",
    zinc: "border-white/12 bg-white/[0.04] text-zinc-300",
  }[tone];

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", toneClass)}>
      <span className="text-xs opacity-70">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function JobCard({ job }: { job: ScheduledJob }) {
  const scheduleLabel = () => {
    if (job.schedule.type === "once") return `Once at ${new Date(job.schedule.at || "").toLocaleString()}`;
    if (job.schedule.type === "interval") return `Every ${job.schedule.every}`;
    return `Cron: ${job.schedule.cron}`;
  };

  const prompt = job.args["prompt"] ?? job.skillName;
  const isActive = job.status === "active";
  const hasRetry = (job.retryCount || 0) > 0;
  const Icon = job.skillName.includes("video") ? Video : job.skillName.includes("template") ? Wand2 : job.skillName.includes("image") ? ImageIcon : Sparkles;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/15">
      <span className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
        isActive ? "border-emerald-300/25 bg-emerald-300/[0.08]" : "border-amber-300/25 bg-amber-300/[0.08]"
      )}>
        <Icon className="h-3.5 w-3.5 text-zinc-200" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">&ldquo;{prompt}&rdquo;</p>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {scheduleLabel()}
          </span>
          {job.lastRunAt && (
            <span className="inline-flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Last: {new Date(job.lastRunAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {hasRetry && (
          <Badge className="border-rose-300/25 bg-rose-300/[0.08] text-rose-200">
            <AlertTriangle className="mr-1 h-3 w-3" />
            {job.retryCount}
          </Badge>
        )}
        <Badge className={cn(
          isActive ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200" : "border-amber-300/25 bg-amber-300/[0.08] text-amber-200"
        )}>
          {isActive ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <PauseCircle className="mr-1 h-3 w-3" />}
          {isActive ? "Active" : "Paused"}
        </Badge>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10">
        <Sparkles className="h-5 w-5 text-cyan-100" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">No scheduled jobs yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-zinc-400">
        Set up recurring generations from Telegram to start populating this timeline.
      </p>

      <div className="mx-auto mt-6 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition-colors hover:border-white/20">
          <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200">Template</p>
          <p className="mt-1 text-sm font-medium text-white">Hourly Product Shots</p>
          <p className="mt-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-mono text-zinc-400">
            /schedule every 1h generate product hero shot
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition-colors hover:border-white/20">
          <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200">Template</p>
          <p className="mt-1 text-sm font-medium text-white">Daily Social Variant</p>
          <p className="mt-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-mono text-zinc-400">
            /schedule daily at noon generate social ad
          </p>
        </div>
      </div>
    </div>
  );
}
