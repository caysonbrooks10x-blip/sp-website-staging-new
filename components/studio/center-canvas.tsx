"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import JSZip from "jszip";
import { Bot, Download, Loader2, Maximize2, Package, Share, Sparkles, Wand2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { UploadModal } from "@/components/upload-modal";
import { MediaRenderer } from "@/components/media-renderer";
import { ASSET_BASE } from "@/lib/assets";
import { buildExportPackFilename } from "@/lib/export-pack";
import type { CommunityCampaignMeta } from "@/lib/types";
import { buildStudioTemplateSharePayload, buildStudioTemplateShareUrl, encodeStudioTemplatePack } from "@/lib/studio-template-sharing";

export interface GenerationItem {
    id: string;
    type: "image" | "video";
    src?: string;
    srcs?: string[];
    creationId?: string;
    creationIds?: string[];
    taskId?: string;
    generationPlatform?: "poyo" | "apimart" | string;
    thumbnailUrl?: string;
    prompt: string;
    model?: string;
    status: "queued" | "generating" | "completed" | "failed";
    settings?: any;
    error?: string;
    progress?: number;
    completedCount?: number;
    totalCount?: number;
}

interface StudioCenterCanvasProps {
    activeGeneration: GenerationItem | null;
    mode: "image" | "video";
    isGenerating: boolean;
    aspectRatio: string;
    onOpenPanel?: () => void;
    onSuggestionClick?: (prompt: string) => void;
}

const IMAGE_SUGGESTIONS = [
    "A cyberpunk cityscape at golden hour, neon reflections on wet streets",
    "Minimalist product shot on marble surface, soft studio lighting",
];

const VIDEO_SUGGESTIONS = [
    "Slow cinematic orbit around a luxury perfume bottle on black velvet",
    "Aerial drone shot gliding over misty mountain ridges at sunrise",
];

export function StudioCenterCanvas({ activeGeneration, mode, isGenerating, aspectRatio, onOpenPanel, onSuggestionClick }: StudioCenterCanvasProps) {
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishTarget, setPublishTarget] = useState<{
        url: string;
        type: "image" | "video";
        prompt: string;
        creationId?: string;
        parentCreationId?: string;
        rootCreationId?: string;
        remixDepth?: number;
        sourcePostId?: string;
        campaign?: CommunityCampaignMeta;
        generationPlatform?: string;
        taskId?: string;
        defaultTitle?: string;
        defaultDescription?: string;
        defaultTags?: string[];
        templatePack?: string;
        templateShareUrl?: string;
        workflowMode?: "image" | "video" | "remix";
    } | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
    const [ideaInput, setIdeaInput] = useState("");
    const { user } = useAuth();
    const [clawToast, setClawToast] = useState<{ kind: "success" | "pair" | "error"; message: string } | null>(null);
    const [clawSending, setClawSending] = useState(false);

    const submitIdea = () => {
        const trimmed = ideaInput.trim();
        if (!trimmed) return;
        onSuggestionClick?.(trimmed);
        setIdeaInput("");
    };
    const activePlatform = activeGeneration?.generationPlatform || activeGeneration?.settings?.provider || "poyo";

    const getFileExtension = (url: string, type: string): string => {
        try {
            const pathname = new URL(url).pathname.toLowerCase();
            if (pathname.endsWith(".mp4")) return "mp4";
            if (pathname.endsWith(".webm")) return "webm";
            if (pathname.endsWith(".gif")) return "gif";
            if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "jpg";
            if (pathname.endsWith(".webp")) return "webp";
            if (pathname.endsWith(".png")) return "png";
        } catch {}
        return type === "video" ? "mp4" : "png";
    };

    const handleDownload = async () => {
        if (!activeGeneration?.src) return;
        setIsDownloading(true);
        try {
            const proxyUrl = `/api/download?url=${encodeURIComponent(activeGeneration.src)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Failed to fetch via proxy");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `StudioX_${activeGeneration.id}.${getFileExtension(activeGeneration.src, activeGeneration.type)}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(activeGeneration.src, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadSingle = async (url: string, id: string, type: string, index?: number) => {
        if (!url) return;
        if (index !== undefined) setDownloadingIndex(index);
        else setIsDownloading(true);
        try {
            const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Failed to fetch via proxy");
            const blob = await response.blob();
            const objUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objUrl;
            link.download = `StudioX_${id}.${getFileExtension(url, type)}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(objUrl);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(url, "_blank");
        } finally {
            setDownloadingIndex(null);
            setIsDownloading(false);
        }
    };

    const handlePublishSingle = (
        url: string,
        creationId: string | undefined,
        type: "image" | "video",
        prompt: string,
        lineage?: {
            parentCreationId?: string;
            rootCreationId?: string;
            remixDepth?: number;
            sourcePostId?: string;
            campaign?: CommunityCampaignMeta;
            generationPlatform?: string;
            taskId?: string;
        }
    ) => {
        setPublishTarget({ url, type, prompt, creationId, ...lineage });
        setShowPublishModal(true);
    };

    const buildCampaignMeta = (): CommunityCampaignMeta | undefined => {
        const campaign = activeGeneration?.settings?.campaign;
        if (!campaign) return undefined;
        return { ...campaign };
    };

    const fetchBlobViaProxy = async (url: string): Promise<Blob> => {
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        return response.blob();
    };

    const downloadZipInline = async (urls: string[], type: "image" | "video") => {
        if (urls.length === 0) return;
        setIsDownloading(true);
        try {
            const filename = buildExportPackFilename(activeGeneration?.prompt, activeGeneration?.creationId);
            if (urls.length === 1) {
                const blob = await fetchBlobViaProxy(urls[0]);
                const ext = getFileExtension(urls[0], type);
                const objUrl = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = objUrl;
                link.download = `${filename}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(objUrl);
                return;
            }
            const zip = new JSZip();
            const pad = urls.length > 9 ? 2 : 1;
            const blobs = await Promise.all(urls.map((u) => fetchBlobViaProxy(u)));
            blobs.forEach((blob, idx) => {
                const ext = getFileExtension(urls[idx], type);
                const num = String(idx + 1).padStart(pad, "0");
                zip.file(`${filename}-${num}.${ext}`, blob);
            });
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const objUrl = window.URL.createObjectURL(zipBlob);
            const link = document.createElement("a");
            link.href = objUrl;
            link.download = `${filename}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(objUrl);
        } catch (error) {
            console.error("Zip download failed:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadZipSingle = (url: string, type: "image" | "video") => {
        if (!url) return;
        void downloadZipInline([url], type);
    };

    const downloadZipBatch = (urls: string[]) => {
        if (urls.length === 0) return;
        void downloadZipInline(urls, activeGeneration?.type || "image");
    };

    const sendToClaw = async (url: string, _creationId?: string) => {
        if (!url || clawSending) return;
        if (!user) {
            setClawToast({ kind: "error", message: "Please sign in first." });
            setTimeout(() => setClawToast(null), 3500);
            return;
        }
        setClawSending(true);
        try {
            const idToken = await user.getIdToken();
            const mediaType: "image" | "video" = activeGeneration?.type === "video" ? "video" : "image";
            const res = await fetch("/api/claw/send-asset", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    assetUrl: url,
                    mediaType,
                    caption: activeGeneration?.prompt || "",
                }),
            });
            if (res.status === 409) {
                setClawToast({ kind: "pair", message: "Pair your Telegram bot first." });
                setTimeout(() => setClawToast(null), 5000);
                return;
            }
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setClawToast({ kind: "error", message: data?.error || "Delivery failed. Try again." });
                setTimeout(() => setClawToast(null), 4000);
                return;
            }
            setClawToast({ kind: "success", message: "Sent to Telegram" });
            setTimeout(() => setClawToast(null), 3000);
        } catch (e) {
            console.error("[sendToClaw]", e);
            setClawToast({ kind: "error", message: "Network error. Try again." });
            setTimeout(() => setClawToast(null), 4000);
        } finally {
            setClawSending(false);
        }
    };

    const getAspectRatioClass = (ratio: string) => {
        switch (ratio) {
            case "1:1": return "aspect-square";
            case "4:3": return "aspect-[4/3]";
            case "3:4": return "aspect-[3/4]";
            case "16:9": return "aspect-video";
            case "9:16": return "aspect-[9/16]";
            case "2:3": return "aspect-[2/3]";
            case "3:2": return "aspect-[3/2]";
            case "21:9": return "aspect-[21/9]";
            case "16:21": return "aspect-[16/21]";
            default: return "aspect-video";
        }
    };

    const rawRatio = activeGeneration?.settings?.size || activeGeneration?.settings?.aspect_ratio || activeGeneration?.settings?.aspectRatio || aspectRatio;
    // Empty state for video modes mirrors the text-to-image canvas exactly (1:1 framing + sizing)
    const currentRatio = !activeGeneration && mode === "video" ? "1:1" : rawRatio;
    const isMultiImage = (activeGeneration?.srcs && activeGeneration.srcs.length > 0) || (activeGeneration?.settings?.n > 1 && activeGeneration?.status !== "completed");

    const maxWidthStyle = isMultiImage ? "min(1600px, 100%)" : "100%";

    // Fit-to-container: measure the canvas stage and compute the largest
    // width×height rectangle of the requested ratio that fits inside it.
    // Replaces the old `100vh - Npx` calc ladder that ignored surrounding
    // chrome (app nav, studio header, mobile shelf) and clipped at extreme
    // ratios like 21:9.
    const stageRef = useRef<HTMLDivElement | null>(null);
    const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        if (isMultiImage) { setFrameSize(null); return; }
        const el = stageRef.current;
        if (!el) return;

        const parseRatio = (r: string): number => {
            const [a, b] = r.split(":").map(Number);
            if (!a || !b) return 1;
            return a / b;
        };

        const compute = () => {
            const rect = el.getBoundingClientRect();
            // Breathing room so the frame doesn't kiss the edges (keeps the
            // StudioX logo above and the ⌘+Enter hint below visible).
            const padX = 32;
            const padY = 48;
            const availW = Math.max(0, rect.width - padX);
            const availH = Math.max(0, rect.height - padY);
            if (availW <= 0 || availH <= 0) return;
            const r = parseRatio(currentRatio);
            let w: number, h: number;
            if (availW / availH > r) {
                // height-limited
                h = availH;
                w = h * r;
            } else {
                // width-limited
                w = availW;
                h = w / r;
            }
            const FLOOR = 240;
            w = Math.max(FLOOR, w);
            h = Math.max(FLOOR / r, h);
            setFrameSize({ width: Math.round(w), height: Math.round(h) });
        };

        compute();
        const ro = new ResizeObserver(() => compute());
        ro.observe(el);
        return () => ro.disconnect();
    }, [currentRatio, isMultiImage, activeGeneration?.status]);

    const getGridClass = (count: number) => {
        if (count === 1) return "grid-cols-1 max-w-[1000px]";
        if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-[1400px] gap-12 md:gap-16 pb-32";
        return "grid-cols-1 md:grid-cols-2 max-w-[1700px] gap-8 md:gap-12 pb-40";
    };

    return (
        <div className="w-full h-full flex flex-col items-center p-0 md:p-4 relative">
            {/* Canvas cyan gradient backdrop — matches pricing theme */}
            <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.10)_0%,transparent_70%)]" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(6,182,212,0.05)_0%,transparent_70%)]" />
            </div>
            {clawToast ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto">
                    <div
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-xl border shadow-2xl text-sm font-medium",
                            clawToast.kind === "success" && "bg-emerald-500/90 border-emerald-300/40 text-white",
                            clawToast.kind === "pair" && "bg-amber-500/90 border-amber-300/40 text-black",
                            clawToast.kind === "error" && "bg-red-500/90 border-red-300/40 text-white"
                        )}
                    >
                        {clawToast.kind === "success" ? (
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        ) : (
                            <Bot className="w-4 h-4" />
                        )}
                        <span>{clawToast.message}</span>
                        {clawToast.kind === "pair" ? (
                            <a href="/claw/hub" className="underline ml-1">Pair now</a>
                        ) : null}
                    </div>
                </div>
            ) : null}
            <div ref={stageRef} className="flex-1 w-full min-h-0 relative bg-black/5">
                <div
                    className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar touch-pan-y pointer-events-auto"
                    data-lenis-prevent="true"
                >
                    <div className={cn(
                        "w-full flex flex-col items-center px-4 sm:px-0",
                        !activeGeneration
                            ? "min-h-full justify-center py-6 lg:py-10"
                            // 2026-04-22: previously top-aligned while any gen
                            // was active. With concurrent gens we want the
                            // in-flight or completed hero kept centered so
                            // multi-tile stacks don't visually ride the top.
                            // Multi-image completed grids still need more
                            // space so keep them top-aligned.
                            : activeGeneration.status === "completed" && isMultiImage
                                ? "min-h-full pb-20 lg:pb-32"
                                : "min-h-full justify-center py-6 lg:py-10"
                    )}>
                        {activeGeneration?.status === "completed" && isMultiImage ? (
                            <div
                                className="w-full px-4 sm:px-6 py-12 md:py-20 self-start transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                style={{ maxWidth: maxWidthStyle }}
                            >
                                <div className="mb-6 sm:mb-8 flex justify-end">
                                    <button
                                        onClick={() => downloadZipBatch(activeGeneration.srcs || [])}
                                        disabled={isDownloading}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-400/30 bg-lime-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-200 hover:bg-lime-400/20 transition-colors disabled:opacity-60"
                                    >
                                        {isDownloading
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <Download className="w-3.5 h-3.5" />}
                                        Download Zip
                                    </button>
                                </div>
                                <div className={cn(
                                    "grid gap-20 sm:gap-24 w-full mx-auto justify-items-center items-start",
                                    getGridClass(activeGeneration.srcs!.length)
                                )}>
                                    {activeGeneration.srcs!.map((src, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "relative group/card rounded-[32px] sm:rounded-[48px] overflow-hidden bg-[#0a0a0c]/80 border border-white/[0.08] shadow-[0_60px_120px_-20px_rgba(0,0,0,1)] hover:border-white/[0.15] transition-all duration-1000 ease-out w-full border-t border-white/[0.12]",
                                                getAspectRatioClass(currentRatio)
                                            )}
                                        >
                                            <MediaRenderer
                                                url={src}
                                                altText={`${activeGeneration.prompt} - Image ${idx + 1}`}
                                                className="object-cover transition-transform duration-700 group-hover/card:scale-[1.03] absolute inset-0 w-full h-full"
                                                fill
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-100 lg:opacity-0 lg:group-hover/card:opacity-100 transition-opacity duration-400" />
                                            <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover/card:opacity-100 transition-all duration-300 z-10 w-full overflow-hidden">
                                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadSingle(src, activeGeneration.creationIds?.[idx] || `${activeGeneration.id}_${idx}`, activeGeneration.type, idx);
                                                        }}
                                                        disabled={downloadingIndex === idx}
                                                        title="Download"
                                                        className="bg-black/70 hover:bg-black/90 text-white backdrop-blur-2xl h-9.5 w-9.5 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shadow-2xl border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 group/dbtn"
                                                    >
                                                        {downloadingIndex === idx
                                                            ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-300 animate-spin" />
                                                            : <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90 group-hover/dbtn:-translate-y-[1px] transition-transform" />
                                                        }
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            downloadZipSingle(src, activeGeneration.type);
                                                        }}
                                                        title="Download Zip"
                                                        className="bg-black/70 hover:bg-black/90 text-white backdrop-blur-2xl h-9.5 w-9.5 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shadow-2xl border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 group/ebtn"
                                                    >
                                                        <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-lime-300 group-hover/ebtn:-translate-y-[1px] transition-transform" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePublishSingle(
                                                                src,
                                                                activeGeneration.creationIds?.[idx] || activeGeneration.creationId,
                                                                activeGeneration.type,
                                                                activeGeneration.prompt,
                                                                {
                                                                    parentCreationId: activeGeneration.settings?.originalCreationId,
                                                                    rootCreationId: activeGeneration.settings?.rootCreationId,
                                                                    remixDepth: activeGeneration.settings?.remixDepth,
                                                                    sourcePostId: activeGeneration.settings?.sourcePostId,
                                                                    campaign: buildCampaignMeta(),
                                                                    generationPlatform: activePlatform,
                                                                    taskId: activeGeneration.taskId || activeGeneration.creationIds?.[idx] || activeGeneration.creationId,
                                                                }
                                                            );
                                                        }}
                                                        title="Publish"
                                                        className="bg-white hover:bg-zinc-100 text-black h-9.5 w-9.5 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shadow-xl shadow-white/10 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 group/pbtn"
                                                    >
                                                        <Share className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/pbtn:-translate-y-[1px] transition-transform" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            void sendToClaw(src, activeGeneration.creationIds?.[idx] || activeGeneration.creationId);
                                                        }}
                                                        title="Send to Claw"
                                                        className="bg-black/70 hover:bg-black/90 text-white backdrop-blur-2xl h-9.5 w-9.5 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shadow-2xl border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 group/cbtn"
                                                    >
                                                        <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300 group-hover/cbtn:-translate-y-[1px] transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div
                                className={cn(
                                    "rounded-[24px] sm:rounded-[32px] relative overflow-hidden transition-[width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-center justify-center shrink-0",
                                    activeGeneration?.status === "completed"
                                        ? "shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/[0.05] bg-black"
                                        : "border border-cyan-400/10 shadow-[0_20px_60px_rgba(6,182,212,0.15)] group bg-transparent backdrop-blur-3xl"
                                )}
                                style={frameSize
                                    ? { width: `${frameSize.width}px`, height: `${frameSize.height}px` }
                                    : { width: "100%", aspectRatio: currentRatio.replace(":", "/") }}
                            >
                                {activeGeneration?.status !== "completed" && (
                                    <div className="absolute inset-0 z-0">
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1e2a] via-[#050a14] to-[#0a1620]" />
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.18)_0%,transparent_60%)]" />
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12)_0%,transparent_55%)]" />
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.04)_0%,transparent_50%)]" />
                                    </div>
                                )}
                                <div className="absolute inset-0 z-10 pointer-events-none rounded-[24px] sm:rounded-[32px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_40px_rgba(255,255,255,0.02)]" />
                                <div className="absolute inset-0 z-10 transition-all duration-700 ease-out flex items-center justify-center">
                                    {!activeGeneration ? (
                                        <div className="absolute inset-0 overflow-y-auto flex items-start sm:items-center justify-center py-4">
                                          <div className="flex flex-col items-center gap-4 sm:gap-5 p-4 sm:p-6 max-w-2xl w-full pointer-events-auto">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                                                    <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white/60" />
                                                </div>
                                                <span className="studio-display text-lg sm:text-xl italic text-white/70 tracking-tight">What will you create?</span>
                                            </div>

                                            {/* Prompt suggestions */}
                                            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {(mode === "video" ? VIDEO_SUGGESTIONS : IMAGE_SUGGESTIONS).map((suggestion) => (
                                                    <button
                                                        key={suggestion}
                                                        type="button"
                                                        onClick={() => onSuggestionClick?.(suggestion)}
                                                        className="text-left text-[11px] leading-relaxed text-zinc-500 hover:text-zinc-200 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.12] rounded-xl px-3 py-2.5 transition-all duration-200"
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Describe your idea input */}
                                            <form
                                                onSubmit={(e) => { e.preventDefault(); submitIdea(); }}
                                                className="w-full flex items-center gap-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] focus-within:border-[#06b6d4]/40 px-3.5 py-2.5 transition-colors"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 text-[#06b6d4]/60 shrink-0" />
                                                <input
                                                    type="text"
                                                    value={ideaInput}
                                                    onChange={(e) => setIdeaInput(e.target.value)}
                                                    placeholder="Describe your idea"
                                                    className="flex-1 bg-transparent outline-none text-[11px] sm:text-[12px] text-zinc-200 placeholder:text-zinc-500"
                                                />
                                                {ideaInput.trim() && (
                                                    <button
                                                        type="submit"
                                                        className="text-[10px] text-[#06b6d4] hover:text-[#d4b45e] font-medium tracking-wide"
                                                    >
                                                        USE
                                                    </button>
                                                )}
                                            </form>

                                            {/* Keyboard shortcut hint */}
                                            <span className="text-[9px] text-zinc-700 tracking-wide">
                                                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-500 font-mono">⌘</kbd>
                                                {" + "}
                                                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-500 font-mono">Enter</kbd>
                                                <span className="ml-1.5 text-zinc-600">to generate</span>
                                            </span>
                                          </div>
                                        </div>
                                    ) : activeGeneration.status === 'completed' ? (
                                        <div className="relative w-full h-full group/image">
                                            <MediaRenderer
                                                url={activeGeneration.src || `${ASSET_BASE}/studiox.jpg`}
                                                altText={activeGeneration.prompt}
                                                className="object-cover transition-opacity duration-1000 absolute inset-0 w-full h-full"
                                                fill
                                            />
                                            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 lg:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-end gap-2 sm:gap-3 opacity-100 lg:opacity-0 lg:group-hover/image:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                <button
                                                    onClick={handleDownload}
                                                    disabled={isDownloading}
                                                    title="Download"
                                                    className="bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-2xl h-10 w-10 sm:h-12 sm:w-12 lg:h-11 lg:w-11 rounded-xl sm:rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                >
                                                    {isDownloading ? <Loader2 className="w-4 h-4 text-zinc-300 animate-spin" /> : <Download className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />}
                                                </button>
                                                <button
                                                    onClick={() => downloadZipSingle(activeGeneration.src || "", activeGeneration.type)}
                                                    className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-2xl h-10 w-10 sm:h-12 sm:w-12 lg:h-11 lg:w-11 rounded-xl sm:rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                    title="Download Zip"
                                                >
                                                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-lime-300 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                                </button>
                                                <button
                                                    onClick={() => handlePublishSingle(
                                                        activeGeneration.src || "",
                                                        activeGeneration.creationId,
                                                        activeGeneration.type,
                                                        activeGeneration.prompt,
                                                        {
                                                            parentCreationId: activeGeneration.settings?.originalCreationId,
                                                            rootCreationId: activeGeneration.settings?.rootCreationId,
                                                            remixDepth: activeGeneration.settings?.remixDepth,
                                                            sourcePostId: activeGeneration.settings?.sourcePostId,
                                                            campaign: buildCampaignMeta(),
                                                            generationPlatform: activePlatform,
                                                            taskId: activeGeneration.taskId || activeGeneration.creationId,
                                                        }
                                                    )}
                                                    title="Publish"
                                                    className="bg-white hover:bg-zinc-100 text-black h-10 w-10 sm:h-12 sm:w-12 lg:h-11 lg:w-11 rounded-xl sm:rounded-2xl shadow-xl shadow-white/10 flex items-center justify-center pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                >
                                                    <Share className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                                </button>
                                                <button
                                                    onClick={() => void sendToClaw(activeGeneration.src || "", activeGeneration.creationId)}
                                                    className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-2xl h-10 w-10 sm:h-12 sm:w-12 lg:h-11 lg:w-11 rounded-xl sm:rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                    title="Send to Claw"
                                                >
                                                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                {isGenerating && activeGeneration?.status !== 'completed' && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505]/70 backdrop-blur-[30px] rounded-[32px]">
                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="relative mb-6">
                                                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse" />
                                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                </div>
                                            </div>
                                            <div className="text-center space-y-3">
                                                <div className="space-y-1">
                                                    <h3 className="text-[10px] font-black tracking-[0.3em] text-white/50 uppercase">
                                                        {activeGeneration?.completedCount !== undefined ? "Parallel Processing" : "Rendering"}
                                                    </h3>
                                                    <p className="text-white font-bold text-[13px] tracking-wide">
                                                        {activeGeneration?.completedCount !== undefined && activeGeneration?.totalCount !== undefined ? (
                                                            `Completed ${activeGeneration.completedCount} of ${activeGeneration.totalCount}`
                                                        ) : (
                                                            `Generating ${activeGeneration?.settings?.n || 1} Variations`
                                                        )}
                                                    </p>
                                                </div>
                                                {activeGeneration?.totalCount && activeGeneration.totalCount > 1 && (
                                                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                        <div 
                                                            className="h-full bg-indigo-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                                            style={{ width: `${Math.max(8, (activeGeneration.completedCount || 0) / activeGeneration.totalCount * 100)}%` }}
                                                        />
                                                    </div>
                                                )}
                                                <div className="pt-2">
                                                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 opacity-60">
                                                        <div className="w-1 h-1 rounded-full bg-indigo-500 animate-ping" />
                                                        Live Batch Updates
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showPublishModal && publishTarget && (
                <UploadModal
                    isOpen={showPublishModal}
                    onClose={() => { setShowPublishModal(false); setPublishTarget(null); }}
                    initialData={{
                        url: publishTarget.url,
                        type: publishTarget.type,
                        prompt: publishTarget.prompt,
                        creationId: publishTarget.creationId,
                        parentCreationId: publishTarget.parentCreationId,
                        rootCreationId: publishTarget.rootCreationId,
                        remixDepth: publishTarget.remixDepth,
                        sourcePostId: publishTarget.sourcePostId,
                        campaign: publishTarget.campaign,
                        generationPlatform: publishTarget.generationPlatform,
                        taskId: publishTarget.taskId,
                    }}
                />
            )}
        </div>
    );
}
