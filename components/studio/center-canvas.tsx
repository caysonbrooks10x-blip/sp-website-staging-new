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
    creationId?: string;
    prompt: string;
    status: "queued" | "generating" | "completed" | "failed";
    settings?: any;
    error?: string;
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
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!activeGeneration?.src) return;
        setIsDownloading(true);
        try {
            // Proxied through our backend API route to bypass CORS headers!
            const proxyUrl = `/api/download?url=${encodeURIComponent(activeGeneration.src)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Failed to fetch via proxy");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `StudioX_${activeGeneration.id}.${activeGeneration.type === "video" ? "mp4" : "png"}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback for tricky URLs
            window.open(activeGeneration.src, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    const getAspectRatioClass = (ratio: string) => {
        switch (ratio) {
            case "1:1": return "aspect-square";
            case "4:3": return "aspect-[4/3]";
            case "16:9": return "aspect-video";
            case "9:16": return "aspect-[9/16]";
            default: return "aspect-video";
        }
    };

    const currentRatio = activeGeneration?.settings?.aspectRatio || aspectRatio;
    let maxWidthStyle = "850px";

    // Dynamic max-width logic based on screen size and aspect ratio (Optimized for Large Mobile)
    if (currentRatio === "9:16") {
        maxWidthStyle = "min(480px, 95%, calc((100vh - 120px) * 9 / 16))";
    } else if (currentRatio === "1:1") {
        maxWidthStyle = "min(650px, 98%, calc(100vh - 120px))";
    } else if (currentRatio === "4:3") {
        maxWidthStyle = "min(850px, 98%, calc((100vh - 120px) * 4 / 3))";
    } else {
        maxWidthStyle = "min(1200px, 98%, calc((100vh - 120px) * 16 / 9))";
    }

    return (
        <div className="w-full h-full flex flex-col items-center p-0 md:p-4 relative">
            {/* High-End Mobile Floating Trigger (Replaces overlapping header) */}
            <div className="lg:hidden w-full flex justify-center py-4 shrink-0 z-50 pointer-events-auto">
                <button
                    onClick={onOpenPanel}
                    className="group bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-3 active:scale-95 shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all hover:bg-zinc-800"
                >
                    <Settings2 className="w-4 h-4 text-violet-400 group-hover:rotate-90 transition-transform duration-500" />
                    <span className="text-[11px] font-black tracking-[0.2em] uppercase text-white/95">Open Creator Panel</span>
                </button>
            </div>

            <div className="flex-1 w-full flex items-center justify-center min-h-0 pb-6 md:pb-0">
                <div
                    className={cn(
                        "w-full rounded-[32px] relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-center justify-center shrink-0",
                        getAspectRatioClass(currentRatio),
                        activeGeneration?.status === "completed"
                            ? "shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/[0.05] bg-black"
                            : "border border-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.6)] group bg-[#0a0a0c]/40 backdrop-blur-3xl"
                    )}
                    style={{ maxWidth: maxWidthStyle, maxHeight: "100%" }}
                >
                    {/* Idle Background Image Layer */}
                    {activeGeneration?.status !== "completed" && (
                        <div className="absolute inset-0 z-0">
                            <div
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[40s] ease-linear group-hover:scale-110 scale-100 opacity-60 mix-blend-screen"
                                style={{ backgroundImage: `url('${ASSET_BASE}/studio/studio1.jpeg')` }}
                            />
                            {/* Overlays to make it clean and readable */}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] mix-blend-overlay" />
                        </div>
                    )}

                    {/* Subtle Inner Glow Border */}
                    <div className="absolute inset-0 z-10 pointer-events-none rounded-[32px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_40px_rgba(255,255,255,0.02)]" />

                    <div
                        className="absolute inset-0 z-10 transition-all duration-700 ease-out flex items-center justify-center"
                    >
                        {!activeGeneration ? (
                            <div className="flex flex-col items-center gap-5 transition-transform duration-500 hover:scale-105">
                                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] flex items-center justify-center relative overflow-hidden backdrop-blur-xl">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20" />
                                    <Sparkles className="w-8 h-8 text-white/80 relative z-10" />
                                </div>
                                <span className="text-sm font-bold text-white/70 tracking-widest uppercase drop-shadow-md">Direct Your Vision</span>
                            </div>
                        ) : activeGeneration.status === 'completed' ? (
                            <div className="relative w-full h-full group/image">
                                <MediaRenderer
                                    url={activeGeneration.src || `${ASSET_BASE}/studiox.jpg`}
                                    altText={activeGeneration.prompt}
                                    className="object-cover transition-opacity duration-1000 absolute inset-0 w-full h-full"
                                    fill
                                />
                                {/* Overlay Publish Actions */}
                                <div className="absolute inset-x-0 bottom-0 p-4 lg:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-end gap-3 opacity-100 lg:opacity-0 lg:group-hover/image:opacity-100 transition-opacity duration-300 pointer-events-none">
                                    <button
                                        onClick={handleDownload}
                                        disabled={isDownloading}
                                        title="Download"
                                        className="bg-zinc-900/80 hover:bg-zinc-800 text-white backdrop-blur-2xl h-12 w-12 lg:h-11 lg:w-11 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                    >
                                        {isDownloading ? <Loader2 className="w-4 h-4 text-zinc-300 animate-spin" /> : <Download className="w-5 h-5 text-white/90 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const remixUrl = `/studio?mode=remix&previewUrl=${encodeURIComponent(activeGeneration.src || "")}&prompt=${encodeURIComponent(activeGeneration.prompt)}&remixType=${activeGeneration.type}&creationId=${activeGeneration.creationId || activeGeneration.id}`;
                                            window.history.pushState({}, '', remixUrl);
                                            // Trigger a synthetic popstate or just rely on the component's useEffect if it watches searchParams
                                            window.dispatchEvent(new PopStateEvent('popstate'));
                                        }}
                                        className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-2xl h-12 w-12 lg:h-11 lg:w-11 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                        title="Remix Result"
                                    >
                                        <Wand2 className="w-5 h-5 text-purple-400 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                    </button>
                                    <button
                                        onClick={() => setShowPublishModal(true)}
                                        className="bg-white hover:bg-zinc-100 text-black px-6 lg:px-5 h-12 lg:h-11 rounded-2xl shadow-xl shadow-white/10 flex items-center gap-2 pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                    >
                                        <Share className="w-5 h-5 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                        <span className="font-bold tracking-tight text-sm lg:text-[13px]">Publish</span>
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {isGenerating && activeGeneration?.status !== 'completed' && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505]/70 backdrop-blur-[30px]">
                            <div className="relative flex items-center justify-center mb-6">
                                <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/30 animate-pulse-slow" />
                                <Loader2 className="w-8 h-8 text-white animate-spin relative z-10" />
                            </div>
                            <span className="text-[11px] font-bold tracking-[0.3em] text-white/80 uppercase animate-pulse">
                                Rendering
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Publish Modal Overlay (fixed position outside flow) */}
            {showPublishModal && activeGeneration?.src && (
                <UploadModal
                    isOpen={showPublishModal}
                    onClose={() => setShowPublishModal(false)}
                    initialData={{
                        url: activeGeneration.src,
                        type: activeGeneration.type,
                        prompt: activeGeneration.prompt,
                        creationId: activeGeneration.creationId
                    }}
                />
            )}
        </div>
    );
}
