"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ImageIcon, Video, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ASSET_BASE } from "@/lib/assets";
import type { GenerationItem } from "@/components/studio/center-canvas";

interface GenerationStackProps {
    jobs: GenerationItem[];
    onSwapHero: (jobId: string) => void;
    onDismiss: (jobId: string) => void;
    visibleMax?: number;
}

/**
 * Top-left overlay stack of background in-flight generations.
 * Each tile represents a concurrent generation running alongside
 * the "hero" (center) one. Click body → swap into hero slot.
 * Click X → cancel + remove from stack (slide-shift to next).
 */
export function GenerationStack({
    jobs,
    onSwapHero,
    onDismiss,
    visibleMax = 4,
}: GenerationStackProps) {
    const [showOverflow, setShowOverflow] = useState(false);

    if (!jobs || jobs.length === 0) return null;

    const visible = jobs.slice(0, visibleMax);
    const overflow = jobs.slice(visibleMax);

    return (
        <div className="pointer-events-none absolute top-4 left-4 z-30 flex flex-col gap-2 max-w-[calc(100%-2rem)]">
            <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
                <AnimatePresence initial={false}>
                    {visible.map((job, idx) => (
                        <StackTile
                            key={job.id}
                            job={job}
                            index={idx}
                            onSwap={() => onSwapHero(job.id)}
                            onDismiss={() => onDismiss(job.id)}
                        />
                    ))}
                </AnimatePresence>

                {overflow.length > 0 && (
                    <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => setShowOverflow((v) => !v)}
                        className={cn(
                            "h-[54px] px-3 rounded-2xl flex items-center gap-2 text-[12px] font-bold tracking-tight",
                            "bg-white/[0.08] border border-white/[0.18] backdrop-blur-xl text-white",
                            "hover:bg-white/[0.14] hover:border-white/[0.3] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                        )}
                        aria-expanded={showOverflow}
                    >
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-300" />
                        +{overflow.length}
                    </motion.button>
                )}
            </div>

            <AnimatePresence>
                {showOverflow && overflow.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="pointer-events-auto flex flex-wrap gap-2 p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.1] max-w-[420px]"
                    >
                        {overflow.map((job, idx) => (
                            <StackTile
                                key={job.id}
                                job={job}
                                index={idx}
                                onSwap={() => onSwapHero(job.id)}
                                onDismiss={() => onDismiss(job.id)}
                                compact
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface StackTileProps {
    job: GenerationItem;
    index: number;
    onSwap: () => void;
    onDismiss: () => void;
    compact?: boolean;
}

function StackTile({ job, onSwap, onDismiss, compact }: StackTileProps) {
    // For completed jobs, prefer the actual result. For in-flight, fall back
    // to a preview of the source image (remix/edit cases) or nothing.
    const preview = job.src || job.thumbnailUrl || job.settings?.previewUrl;
    const size = compact ? 44 : 54;
    const progress = typeof job.progress === "number" ? Math.max(0, Math.min(100, job.progress)) : undefined;
    const isInFlight = job.status === "queued" || job.status === "generating";
    const isCompleted = job.status === "completed";
    const isFailed = job.status === "failed";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.7, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.7, x: -20 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative group"
            style={{ width: size, height: size }}
        >
            <button
                onClick={onSwap}
                title={isCompleted ? "Click to view result" : job.prompt || "Click to focus"}
                className={cn(
                    "relative w-full h-full rounded-2xl overflow-hidden border backdrop-blur-xl bg-black/60",
                    "shadow-[0_4px_20px_rgba(0,0,0,0.45)] transition-all duration-300",
                    isCompleted
                        ? "border-emerald-400/70 ring-2 ring-emerald-400/30 hover:ring-emerald-400/60 hover:scale-[1.08]"
                        : isFailed
                            ? "border-red-400/60 hover:scale-[1.06]"
                            : "border-white/[0.18] hover:border-violet-400/60 hover:scale-[1.06]"
                )}
            >
                {preview ? (
                    <Image
                        src={preview}
                        alt={job.prompt || "generation"}
                        fill
                        sizes={`${size}px`}
                        className={cn("object-cover", isCompleted ? "opacity-100" : "opacity-70")}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-indigo-600/30">
                        <div className="absolute inset-0 flex items-center justify-center">
                            {job.type === "video" ? (
                                <Video className="w-4 h-4 text-white/70" />
                            ) : (
                                <ImageIcon className="w-4 h-4 text-white/70" />
                            )}
                        </div>
                    </div>
                )}

                {/* spinner overlay for in-flight */}
                {isInFlight && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Loader2 className="w-4 h-4 animate-spin text-white drop-shadow" />
                    </div>
                )}

                {/* completed badge */}
                {isCompleted && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border border-emerald-200/80 flex items-center justify-center shadow-lg animate-[pulse_1.6s_ease-in-out_infinite]">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                )}

                {/* failed badge */}
                {isFailed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                    </div>
                )}

                {/* progress bar (in-flight only) */}
                {isInFlight && typeof progress === "number" && progress > 0 && progress < 100 && (
                    <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-white/10">
                        <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </button>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                }}
                title="Close"
                className={cn(
                    "absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full",
                    "bg-black/80 border border-white/30 flex items-center justify-center",
                    "opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:border-red-400 transition-all"
                )}
                aria-label="Close this generation"
            >
                <X className="w-2.5 h-2.5 text-white" />
            </button>
        </motion.div>
    );
}

// ESM "ASSET_BASE" is imported to keep paths uniform if future fallback thumbs land in /public/studio.
void ASSET_BASE;
