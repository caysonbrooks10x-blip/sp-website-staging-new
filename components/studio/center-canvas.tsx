"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Download, Loader2, Maximize2, Share, Sparkles, Wand2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadModal } from "@/components/upload-modal";
import { MediaRenderer } from "@/components/media-renderer";
import { ASSET_BASE } from "@/lib/assets";

export interface GenerationItem {
    id: string;
    type: "image" | "video";
    src?: string;
    srcs?: string[];
    creationId?: string;
    creationIds?: string[];
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
    mode: "image" | "video" | "templates";
    isGenerating: boolean;
    aspectRatio: string;
    onOpenPanel?: () => void;
}

export function StudioCenterCanvas({ activeGeneration, mode, isGenerating, aspectRatio, onOpenPanel }: StudioCenterCanvasProps) {
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishTarget, setPublishTarget] = useState<{ url: string; type: "image" | "video"; prompt: string; creationId?: string } | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

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

    const handlePublishSingle = (url: string, creationId: string | undefined, type: "image" | "video", prompt: string) => {
        setPublishTarget({ url, type, prompt, creationId });
        setShowPublishModal(true);
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

    const currentRatio = activeGeneration?.settings?.size || activeGeneration?.settings?.aspect_ratio || activeGeneration?.settings?.aspectRatio || aspectRatio;
    const isMultiImage = (activeGeneration?.srcs && activeGeneration.srcs.length > 0) || (activeGeneration?.settings?.n > 1 && activeGeneration?.status !== "completed");

    let maxWidthStyle = "850px";
    if (isMultiImage) {
        maxWidthStyle = "min(1600px, 100%)";
    } else if (currentRatio === "9:16" || currentRatio === "16:21") {
        maxWidthStyle = "min(420px, 90%, calc((100vh - 160px) * 9 / 16))";
    } else if (currentRatio === "2:3" || currentRatio === "3:4") {
        maxWidthStyle = "min(500px, 90%, calc((100vh - 140px) * 2 / 3))";
    } else if (currentRatio === "1:1") {
        maxWidthStyle = "min(650px, 98%, calc(100vh - 120px))";
    } else if (currentRatio === "4:3" || currentRatio === "3:2") {
        maxWidthStyle = "min(850px, 98%, calc((100vh - 120px) * 4 / 3))";
    } else if (currentRatio === "21:9") {
        maxWidthStyle = "min(1400px, 98%, calc((100vh - 120px) * 21 / 9))";
    } else {
        maxWidthStyle = "min(1200px, 98%, calc((100vh - 120px) * 16 / 9))";
    }

    const getGridClass = (count: number) => {
        if (count === 1) return "grid-cols-1 max-w-[1000px]";
        if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-[1400px] gap-12 md:gap-16 pb-32";
        return "grid-cols-1 md:grid-cols-2 max-w-[1700px] gap-8 md:gap-12 pb-40";
    };

    return (
        <div className="w-full h-full flex flex-col items-center p-0 md:p-4 relative">
            {}
            <div className="lg:hidden w-full flex justify-center py-4 shrink-0 z-50 pointer-events-auto">
                <button
                    onClick={onOpenPanel}
                    className="group bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-3 active:scale-95 shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all hover:bg-zinc-800"
                >
                    <Settings2 className="w-4 h-4 text-violet-400 group-hover:rotate-90 transition-transform duration-500" />
                    <span className="text-[11px] font-black tracking-[0.2em] uppercase text-white/95">Open Creator Panel</span>
                </button>
            </div>

            <div className="flex-1 w-full min-h-0 relative bg-black/5">
                <div 
                    className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar touch-pan-y pointer-events-auto"
                    data-lenis-prevent="true"
                >
                    <div className="w-full flex flex-col items-center min-h-full pb-20 lg:pb-32 px-4 sm:px-0">
                        {activeGeneration?.status === "completed" && isMultiImage ? (
                            <div
                                className="w-full px-4 sm:px-6 py-12 md:py-20 self-start transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                style={{ maxWidth: maxWidthStyle }}
                            >
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
                                            <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-10 flex items-center gap-4">
                                                <div className="bg-black/60 backdrop-blur-3xl text-white/90 text-[10px] font-black tracking-[0.25em] uppercase px-4 py-2 rounded-2xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                                    {idx + 1} / {activeGeneration.srcs!.length}
                                                </div>
                                                {idx === 0 && (
                                                    <div className="bg-indigo-500/90 backdrop-blur-3xl text-white text-[9px] font-black tracking-[0.25em] uppercase px-4 py-2 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.4)] border border-white/30 animate-in fade-in zoom-in duration-1000">
                                                        Primary Masterpiece
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 flex items-center justify-between gap-1 opacity-100 lg:opacity-0 lg:group-hover/card:opacity-100 transition-all duration-300 z-10 w-full overflow-hidden">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const remixUrl = `/studio?mode=remix&previewUrl=${encodeURIComponent(src)}&prompt=${encodeURIComponent(activeGeneration.prompt)}&remixType=image&creationId=${activeGeneration.creationIds?.[idx] || activeGeneration.id}&aspectRatio=${encodeURIComponent(activeGeneration.settings?.aspectRatio || activeGeneration.settings?.size || "1:1")}&model=${encodeURIComponent(activeGeneration.model || activeGeneration.settings?.model || "gpt-image-1.5")}`;
                                                        window.history.pushState({}, '', remixUrl);
                                                        window.dispatchEvent(new PopStateEvent('popstate'));
                                                    }}
                                                    className="bg-black/70 hover:bg-black/90 text-white backdrop-blur-2xl h-9.5 w-9.5 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shadow-2xl border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 group/rbtn"
                                                    title="Remix"
                                                >
                                                    <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 group-hover/rbtn:-translate-y-[1px] transition-transform" />
                                                </button>
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
                                                            handlePublishSingle(
                                                                src,
                                                                activeGeneration.creationIds?.[idx] || activeGeneration.creationId,
                                                                activeGeneration.type,
                                                                activeGeneration.prompt
                                                            );
                                                        }}
                                                        title="Publish"
                                                        className="bg-white hover:bg-zinc-100 text-black px-2.5 sm:px-4 h-9.5 sm:h-10 rounded-lg sm:rounded-xl shadow-xl shadow-white/10 flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 group/pbtn"
                                                    >
                                                        <Share className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover/pbtn:-translate-y-[1px] transition-transform" />
                                                        <span className="font-bold tracking-tight text-[10px] sm:text-[11px] whitespace-nowrap">Publish</span>
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
                                    "w-full rounded-[24px] sm:rounded-[32px] relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-center justify-center shrink-0",
                                    getAspectRatioClass(currentRatio),
                                    activeGeneration?.status === "completed"
                                        ? "shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/[0.05] bg-black"
                                        : "border border-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.6)] group bg-[#0a0a0c]/40 backdrop-blur-3xl"
                                )}
                                style={{ maxWidth: maxWidthStyle, maxHeight: "100%" }}
                            >
                                {activeGeneration?.status !== "completed" && (
                                    <div className="absolute inset-0 z-0">
                                        <div
                                            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[40s] ease-linear group-hover:scale-110 scale-100 opacity-60 mix-blend-screen"
                                            style={{ backgroundImage: `url('${ASSET_BASE}/studio/studio1.jpeg')` }}
                                        />
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] mix-blend-overlay" />
                                    </div>
                                )}
                                <div className="absolute inset-0 z-10 pointer-events-none rounded-[24px] sm:rounded-[32px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_40px_rgba(255,255,255,0.02)]" />
                                <div className="absolute inset-0 z-10 transition-all duration-700 ease-out flex items-center justify-center">
                                    {!activeGeneration ? (
                                        <div className="flex flex-col items-center gap-6 sm:gap-8 group p-8">
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/[0.03] border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.02)] flex items-center justify-center relative overflow-hidden backdrop-blur-3xl transition-all duration-700 group-hover:scale-110 group-hover:border-white/20 group-hover:shadow-[0_0_80px_rgba(255,255,255,0.05)]">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 via-transparent to-cyan-500/20 animate-pulse" />
                                                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 relative z-10 animate-pulse" />
                                            </div>
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-[11px] sm:text-[12px] font-black text-white/40 tracking-[0.4em] uppercase drop-shadow-md text-center">StudioX Canvas</span>
                                                <span className="text-[9px] font-medium text-zinc-600 tracking-[0.2em] uppercase">Ready for creation</span>
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
                                                    onClick={() => {
                                                        const remixUrl = `/studio?mode=remix&previewUrl=${encodeURIComponent(activeGeneration.src || "")}&prompt=${encodeURIComponent(activeGeneration.prompt)}&remixType=${activeGeneration.type}&creationId=${activeGeneration.creationId || activeGeneration.id}`;
                                                        window.history.pushState({}, '', remixUrl);
                                                        window.dispatchEvent(new PopStateEvent('popstate'));
                                                    }}
                                                    className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-2xl h-10 w-10 sm:h-12 sm:w-12 lg:h-11 lg:w-11 rounded-xl sm:rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                    title="Remix Result"
                                                >
                                                    <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                                </button>
                                                <button
                                                    onClick={() => handlePublishSingle(
                                                        activeGeneration.src || "",
                                                        activeGeneration.creationId,
                                                        activeGeneration.type,
                                                        activeGeneration.prompt
                                                    )}
                                                    className="bg-white hover:bg-zinc-100 text-black px-4 sm:px-6 lg:px-5 h-10 sm:h-12 lg:h-11 rounded-xl sm:rounded-2xl shadow-xl shadow-white/10 flex items-center gap-1.5 sm:gap-2 pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                >
                                                    <Share className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                                    <span className="font-bold tracking-tight text-xs sm:text-sm lg:text-[13px]">Publish</span>
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
                        creationId: publishTarget.creationId
                    }}
                />
            )}
        </div>
    );
}
