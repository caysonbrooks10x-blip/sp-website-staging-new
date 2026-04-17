"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Bot, Download, Loader2, Maximize2, Package, Share, Sparkles, Wand2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadModal } from "@/components/upload-modal";
import { MediaRenderer } from "@/components/media-renderer";
import { ASSET_BASE } from "@/lib/assets";
import { buildExportPackHref } from "@/lib/export-pack";
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
    "Portrait in renaissance oil painting style, dramatic chiaroscuro lighting",
    "Minimalist product shot on marble surface, soft studio lighting",
    "Surreal underwater garden with bioluminescent coral and jellyfish",
    "Abstract geometric art, metallic gold and deep navy, clean lines",
    "Cozy Japanese café interior, warm afternoon light through paper screens",
];

const VIDEO_SUGGESTIONS = [
    "Slow cinematic orbit around a luxury perfume bottle on black velvet",
    "Dancer in slow motion under a single dramatic spotlight",
    "Aerial drone shot gliding over misty mountain ridges at sunrise",
    "Time-lapse of city streets from day to night, light trails streaking",
    "Ocean waves crashing in ultra slow motion, backlit by golden sun",
    "Smoke tendrils rising and curling through a beam of light",
];

const MODE_TIPS: Record<string, string> = {
    "image": "Describe lighting, mood, style, and composition — specificity drives quality",
    "video": "Start with a strong opening frame. Mention camera movement for cinematic results",
    "remix": "Upload a reference and describe what you want changed — the model preserves the core",
};

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

    const handlePublishWorkflowSingle = (
        url: string,
        creationId: string | undefined,
        type: "image" | "video"
    ) => {
        if (!activeGeneration) return;

        const workflowPayload = buildStudioTemplateSharePayload({
            name: activeGeneration.settings?.templateName || `${activeGeneration.model || "StudioX"} Workflow`,
            description: "Reusable workflow published from Studio.",
            mode:
                activeGeneration.settings?.creationMode === "remix"
                    ? "remix"
                    : type === "video"
                        ? "video"
                        : "image",
            model: activeGeneration.model || activeGeneration.settings?.model,
            provider: activePlatform,
            prompt: activeGeneration.settings?.originalPrompt || activeGeneration.prompt,
            aspectRatio: activeGeneration.settings?.aspectRatio || activeGeneration.settings?.size,
            resolution: activeGeneration.settings?.resolution,
            duration: activeGeneration.settings?.duration,
            imageCount: activeGeneration.settings?.n,
            remixStrength: activeGeneration.settings?.image_weight
                ? Math.round(Number(activeGeneration.settings.image_weight) * 100)
                : activeGeneration.settings?.remixStrength,
            outputFormat: activeGeneration.settings?.output_format,
            videoStyle: activeGeneration.settings?.style,
            videoMode: activeGeneration.settings?.mode,
            negativePrompt: activeGeneration.settings?.negative_prompt,
            storyboard: activeGeneration.settings?.storyboard,
            soundEnabled: activeGeneration.settings?.sound,
            generateAudio: activeGeneration.settings?.generate_audio,
            characterOrientation: activeGeneration.settings?.character_orientation,
            cameraMovement: activeGeneration.settings?.cameraMovement,
            effectPreset: activeGeneration.settings?.effectPreset,
            audioDirection: activeGeneration.settings?.audioDirection,
            characterLock: activeGeneration.settings?.characterLock,
            sharedFrom: "generation",
        });

        setPublishTarget({
            url,
            type,
            prompt: activeGeneration.prompt,
            creationId,
            parentCreationId: activeGeneration.settings?.originalCreationId,
            rootCreationId: activeGeneration.settings?.rootCreationId,
            remixDepth: activeGeneration.settings?.remixDepth,
            sourcePostId: activeGeneration.settings?.sourcePostId,
            campaign: buildCampaignMeta(),
            generationPlatform: `${activePlatform}-template`,
            taskId: activeGeneration.taskId || creationId,
            defaultTitle: `${workflowPayload.name || "Studio Workflow"} Template`,
            defaultDescription: `Reusable Studio workflow for ${workflowPayload.prompt}`,
            defaultTags: ["community", "template", "workflow", activePlatform, type],
            templatePack: encodeStudioTemplatePack(workflowPayload),
            templateShareUrl: buildStudioTemplateShareUrl(workflowPayload, typeof window !== "undefined" ? window.location.origin : undefined),
            workflowMode: workflowPayload.mode,
        });
        setShowPublishModal(true);
    };

    const buildCampaignMeta = (): CommunityCampaignMeta | undefined => {
        const campaign = activeGeneration?.settings?.campaign;
        if (!campaign) return undefined;
        return { ...campaign };
    };

    const openExportPack = (url: string, type: "image" | "video", creationId?: string) => {
        const campaign = buildCampaignMeta();
        const href = buildExportPackHref({
            assetUrl: url,
            type,
            prompt: activeGeneration?.prompt,
            title: activeGeneration?.prompt || "StudioX Export",
            model: activeGeneration?.model || activeGeneration?.settings?.model,
            aspect: activeGeneration?.settings?.aspectRatio || activeGeneration?.settings?.size || aspectRatio,
            creationId,
            generationPlatform: activePlatform,
            campaign,
            presetIds: campaign?.presetIds,
            autoDownload: Boolean(campaign?.directed),
        });
        window.open(href, "_blank");
    };

    const openBatchExportPack = (urls: string[], creationIds?: string[]) => {
        if (urls.length === 0) return;
        const campaign = buildCampaignMeta();
        const assets = urls.map((url, index) => ({
            url,
            creationId: creationIds?.[index] || undefined,
        }));
        const href = buildExportPackHref({
            assetUrl: urls[0] || "",
            assets,
            type: activeGeneration?.type || "image",
            prompt: activeGeneration?.prompt,
            title: activeGeneration?.prompt || "StudioX Export",
            model: activeGeneration?.model || activeGeneration?.settings?.model,
            aspect: activeGeneration?.settings?.aspectRatio || activeGeneration?.settings?.size || aspectRatio,
            creationId: creationIds?.[0] || activeGeneration?.creationId,
            generationPlatform: activePlatform,
            campaign,
            presetIds: campaign?.presetIds,
            autoDownload: Boolean(campaign?.directed),
        });
        window.open(href, "_blank");
    };

    const openClawHub = (url: string, creationId?: string) => {
        const params = new URLSearchParams();
        if (activeGeneration?.prompt) params.set("prompt", activeGeneration.prompt);
        if (url) params.set("assetUrl", url);
        if (creationId) params.set("creationId", creationId);
        if (activeGeneration?.taskId) params.set("taskId", activeGeneration.taskId);
        if (activePlatform) params.set("generationPlatform", activePlatform);
        window.location.href = `/claw/hub?${params.toString()}`;
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

    // Empty state: scale up the card so it fills more of the canvas on large screens
    if (!activeGeneration) {
        if (currentRatio === "9:16" || currentRatio === "16:21") {
            maxWidthStyle = "min(500px, 90%, calc((100vh - 160px) * 9 / 16))";
        } else if (currentRatio === "2:3" || currentRatio === "3:4") {
            maxWidthStyle = "min(600px, 90%, calc((100vh - 140px) * 2 / 3))";
        } else if (currentRatio === "1:1") {
            maxWidthStyle = "min(800px, 98%, calc(100vh - 120px))";
        } else if (currentRatio === "4:3" || currentRatio === "3:2") {
            maxWidthStyle = "min(1000px, 98%, calc((100vh - 120px) * 4 / 3))";
        } else if (currentRatio === "21:9") {
            maxWidthStyle = "min(1600px, 98%, calc((100vh - 120px) * 21 / 9))";
        } else {
            maxWidthStyle = "min(1400px, 98%, calc((100vh - 120px) * 16 / 9))";
        }
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
                    <div className={cn(
                        "w-full flex flex-col items-center px-4 sm:px-0",
                        !activeGeneration
                            ? "min-h-full justify-center py-6 lg:py-10"
                            : "min-h-full pb-20 lg:pb-32"
                    )}>
                        {activeGeneration?.status === "completed" && isMultiImage ? (
                            <div
                                className="w-full px-4 sm:px-6 py-12 md:py-20 self-start transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                style={{ maxWidth: maxWidthStyle }}
                            >
                                <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm text-zinc-300">
                                        Campaign set ready: <span className="font-semibold text-white">{activeGeneration.srcs?.length || 0} outputs</span>
                                    </div>
                                    <button
                                        onClick={() => openBatchExportPack(activeGeneration.srcs || [], activeGeneration.creationIds)}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-400/30 bg-lime-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-200 hover:bg-lime-400/20 transition-colors"
                                    >
                                        <Package className="w-3.5 h-3.5" />
                                        Export Full Campaign Pack
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
                                                        const remixUrl = `/studio?mode=remix&previewUrl=${encodeURIComponent(src)}&prompt=${encodeURIComponent(activeGeneration.prompt)}&remixType=image&creationId=${activeGeneration.creationIds?.[idx] || activeGeneration.id}&rootCreationId=${activeGeneration.settings?.rootCreationId || activeGeneration.settings?.originalCreationId || activeGeneration.creationIds?.[idx] || activeGeneration.id}&remixDepth=${(activeGeneration.settings?.remixDepth || 0) + 1}&sourcePostId=${activeGeneration.settings?.sourcePostId || ""}&taskId=${encodeURIComponent(activeGeneration.taskId || activeGeneration.creationIds?.[idx] || activeGeneration.creationId || "")}&generationPlatform=${encodeURIComponent(activePlatform)}&aspectRatio=${encodeURIComponent(activeGeneration.settings?.aspectRatio || activeGeneration.settings?.size || "1:1")}&model=${encodeURIComponent(activeGeneration.model || activeGeneration.settings?.model || "gpt-image-1.5")}`;
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
                                                            openExportPack(src, activeGeneration.type, activeGeneration.creationIds?.[idx] || activeGeneration.creationId);
                                                        }}
                                                        title="Export Campaign Pack"
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
                                                        className="bg-white hover:bg-zinc-100 text-black px-2.5 sm:px-4 h-9.5 sm:h-10 rounded-lg sm:rounded-xl shadow-xl shadow-white/10 flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 group/pbtn"
                                                    >
                                                        <Share className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover/pbtn:-translate-y-[1px] transition-transform" />
                                                        <span className="font-bold tracking-tight text-[10px] sm:text-[11px] whitespace-nowrap">Publish</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePublishWorkflowSingle(
                                                                src,
                                                                activeGeneration.creationIds?.[idx] || activeGeneration.creationId,
                                                                activeGeneration.type
                                                            );
                                                        }}
                                                        title="Publish Workflow"
                                                        className="bg-[#c5a44e]/10 hover:bg-[#c5a44e]/15 text-[#f1ddb1] px-2.5 sm:px-4 h-9.5 sm:h-10 rounded-lg sm:rounded-xl shadow-xl border border-[#c5a44e]/20 flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 shrink-0 group/tbtn"
                                                    >
                                                        <Wand2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover/tbtn:-translate-y-[1px] transition-transform" />
                                                        <span className="font-bold tracking-tight text-[10px] sm:text-[11px] whitespace-nowrap">Workflow</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openClawHub(src, activeGeneration.creationIds?.[idx] || activeGeneration.creationId);
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
                                        <div className="flex flex-col items-center gap-6 sm:gap-8 p-6 sm:p-8 max-w-2xl w-full pointer-events-auto">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                                                    <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white/60" />
                                                </div>
                                                <span className="text-[11px] sm:text-sm font-semibold text-white/40 tracking-wide">What will you create?</span>
                                            </div>

                                            {/* Prompt suggestions */}
                                            <div className="w-full grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2">
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

                                            {/* Contextual tip */}
                                            <div className="w-full flex items-start gap-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] px-3.5 py-2.5">
                                                <Wand2 className="w-3.5 h-3.5 text-[#c5a44e]/60 shrink-0 mt-0.5" />
                                                <span className="text-[10px] sm:text-[11px] leading-relaxed text-zinc-500">
                                                    {MODE_TIPS[mode] || MODE_TIPS["image"]}
                                                </span>
                                            </div>

                                            {/* Keyboard shortcut hint */}
                                            <span className="text-[9px] text-zinc-700 tracking-wide">
                                                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-500 font-mono">⌘</kbd>
                                                {" + "}
                                                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-500 font-mono">Enter</kbd>
                                                <span className="ml-1.5 text-zinc-600">to generate</span>
                                            </span>
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
                                                        const remixUrl = `/studio?mode=remix&previewUrl=${encodeURIComponent(activeGeneration.src || "")}&prompt=${encodeURIComponent(activeGeneration.prompt)}&remixType=${activeGeneration.type}&creationId=${activeGeneration.creationId || activeGeneration.id}&rootCreationId=${activeGeneration.settings?.rootCreationId || activeGeneration.settings?.originalCreationId || activeGeneration.creationId || activeGeneration.id}&remixDepth=${(activeGeneration.settings?.remixDepth || 0) + 1}&sourcePostId=${activeGeneration.settings?.sourcePostId || ""}&taskId=${encodeURIComponent(activeGeneration.taskId || activeGeneration.creationId || activeGeneration.id)}&generationPlatform=${encodeURIComponent(activePlatform)}`;
                                                        window.history.pushState({}, '', remixUrl);
                                                        window.dispatchEvent(new PopStateEvent('popstate'));
                                                    }}
                                                    className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-2xl h-10 w-10 sm:h-12 sm:w-12 lg:h-11 lg:w-11 rounded-xl sm:rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                    title="Remix Result"
                                                >
                                                    <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                                </button>
                                                <button
                                                    onClick={() => openExportPack(activeGeneration.src || "", activeGeneration.type, activeGeneration.creationId)}
                                                    className="bg-black/60 hover:bg-black/80 text-white backdrop-blur-2xl h-10 w-10 sm:h-12 sm:w-12 lg:h-11 lg:w-11 rounded-xl sm:rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                    title="Export Campaign Pack"
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
                                                    className="bg-white hover:bg-zinc-100 text-black px-4 sm:px-6 lg:px-5 h-10 sm:h-12 lg:h-11 rounded-xl sm:rounded-2xl shadow-xl shadow-white/10 flex items-center gap-1.5 sm:gap-2 pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                >
                                                    <Share className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                                    <span className="font-bold tracking-tight text-xs sm:text-sm lg:text-[13px]">Publish</span>
                                                </button>
                                                <button
                                                    onClick={() => handlePublishWorkflowSingle(
                                                        activeGeneration.src || "",
                                                        activeGeneration.creationId,
                                                        activeGeneration.type
                                                    )}
                                                    className="bg-[#c5a44e]/10 hover:bg-[#c5a44e]/15 text-[#f1ddb1] px-4 sm:px-6 lg:px-5 h-10 sm:h-12 lg:h-11 rounded-xl sm:rounded-2xl shadow-xl border border-[#c5a44e]/20 flex items-center gap-1.5 sm:gap-2 pointer-events-auto transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/btn"
                                                    title="Publish Workflow"
                                                >
                                                    <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                                    <span className="font-bold tracking-tight text-xs sm:text-sm lg:text-[13px]">Workflow</span>
                                                </button>
                                                <button
                                                    onClick={() => openClawHub(activeGeneration.src || "", activeGeneration.creationId)}
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
