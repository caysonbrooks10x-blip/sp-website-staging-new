"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    ChevronDown,
    Sparkles,
    Upload,
    Wand2,
    Settings2,
    Image as ImageIcon,
    Video,
    Frame,
    X,
    Loader2,
    Link2,
    Fingerprint,
    Search,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import {
    IMAGE_MODEL_LIST,
    VIDEO_MODEL_LIST,
    IMAGE_MODELS,
    VIDEO_MODELS,
    type ImageModelConfig,
    type VideoModelConfig,
    type ModelConfig,
} from "@/lib/model-config";
import {
    chooseProvider,
    getProviderRoutingDecision,
    validateStudioExecution,
} from "@/lib/provider-routing";
import { EXPORT_PACK_PRESETS, normalizeExportPresetIds } from "@/lib/export-pack";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import {
    deleteStudioTemplate,
    listStudioTemplates,
    saveStudioTemplate,
    type StudioTemplateRecord,
} from "@/lib/studio-templates";
import {
    deleteStudioCharacterPack,
    listStudioCharacterPacks,
    saveStudioCharacterPack,
    type StudioCharacterPackRecord,
} from "@/lib/studio-character-packs";
import { STUDIO_TEMPLATE_LIBRARY, type StudioTemplatePreset } from "@/lib/studio-template-presets";
import {
    applyStudioPromptEnhancements,
    AUDIO_DIRECTION_PRESETS,
    buildWan26PayloadExtras,
    CINEMA_CAMERA_MOVES,
    HAILUO_23_CAMERA_LABELS,
    isHailuo23Model,
    isWan26Model,
    WAN_EFFECT_PRESETS,
} from "@/lib/studio-enhancements";
import {
    buildStudioTemplateSharePayload,
    buildStudioTemplateShareUrl,
    decodeStudioTemplatePack,
} from "@/lib/studio-template-sharing";
import {
    getSessionProviderHealth,
    mergeProviderHealth,
    type ProviderHealthSnapshot,
} from "@/lib/provider-health";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebaseClient";

import type { StudioMode } from "@/components/studio/sidebar";
import type { GenerationItem } from "@/components/studio/center-canvas";

interface StudioLeftPanelProps {
    onGenerate: (prompt: string, settings: any) => void;
    onCancel?: () => void;
    isGenerating: boolean;
    mode?: "image" | "video" | "templates" | "remix" | string;
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
    studioMode?: StudioMode;
    activeGeneration?: GenerationItem | null;
}

interface ModelItem {
    id: string;
    name: string;
    isNew?: boolean;
    cost?: number;
}

const AI_IMAGE_MODELS: ModelItem[] = IMAGE_MODEL_LIST.map(m => ({
    id: m.id, name: m.name.replace(/\s*\((?:poyo|apimart)\)\s*$/i, "").trim(), isNew: m.isNew, cost: m.baseCost,
}));

const AI_VIDEO_MODELS: ModelItem[] = VIDEO_MODEL_LIST.map(m => ({
    id: m.id, name: m.name.replace(/\s*\((?:poyo|apimart)\)\s*$/i, "").trim(), isNew: m.isNew, cost: m.baseCost,
}));

function getConfig(modelId: string): ModelConfig | undefined {
    return IMAGE_MODELS[modelId] || VIDEO_MODELS[modelId];
}

function estimateTaskCredits(input: {
    modelId: string;
    mode: "image" | "video" | "remix";
    resolution?: string;
    duration?: number;
    imageCount?: number;
    generateAudio?: boolean;
}): number {
    const config = getConfig(input.modelId);
    if (!config) return 0;

    if (config.type === "image") {
        const imageConfig = config as ImageModelConfig;
        const n = imageConfig.supportsN ? Math.max(1, input.imageCount || 1) : 1;
        return imageConfig.getCost({
            resolution: input.resolution || imageConfig.defaultResolution,
            n,
        });
    }

    const videoConfig = config as VideoModelConfig;
    return videoConfig.getCost({
        resolution: videoConfig.supportsResolution ? (input.resolution || videoConfig.defaultResolution) : undefined,
        duration: input.duration || videoConfig.defaultDuration,
        generateAudio: Boolean(input.generateAudio),
    });
}

async function copyTextToClipboard(value: string) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
}

export function StudioLeftPanel({ onGenerate, onCancel, isGenerating, mode: initialMode, aspectRatio, setAspectRatio, studioMode, activeGeneration }: StudioLeftPanelProps) {
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const urlMode = searchParams?.get("mode")?.toLowerCase() || initialMode || "image";
    const urlPrompt = searchParams?.get("prompt") || "";
    const urlPreview = searchParams?.get("previewUrl") || "";
    const urlRemixType = searchParams?.get("remixType")?.toLowerCase() || "image";
    const urlTaskId = searchParams?.get("taskId") || "";
    const urlGenerationPlatform = searchParams?.get("generationPlatform") || "";
    const urlCampaignGoal = searchParams?.get("campaignGoal") || "";
    const urlCampaignPlatform = searchParams?.get("campaignPlatform") || "";
    const urlCampaignStyle = searchParams?.get("campaignStyle") || "";
    const urlCampaignVariationCount = searchParams?.get("campaignVariationCount") || "";
    const urlCampaignBrief = searchParams?.get("campaignBrief") || "";
    const urlCampaignDirected = searchParams?.get("campaignDirected") || "";
    const urlCampaignPresetIds = searchParams?.get("campaignPresetIds") || "";
    const urlAutoExportPack = searchParams?.get("autoExportPack") || "";

    const urlCreationId = searchParams?.get("creationId") || "";
    const urlRootCreationId = searchParams?.get("rootCreationId") || "";
    const urlRemixDepth = searchParams?.get("remixDepth") || "0";
    const urlSourcePostId = searchParams?.get("sourcePostId") || "";
    const [creationMode, setCreationMode] = useState<string>(urlMode);
    const [prompt, setPrompt] = useState(() => {
        if (urlPrompt) return urlPrompt;
        if (typeof window !== 'undefined') return localStorage.getItem("studio_last_prompt") || "";
        return "";
    });
    const [previewUrl, setPreviewUrl] = useState(urlPreview);
    const [creationId, setCreationId] = useState(urlCreationId);
    const [rootCreationId, setRootCreationId] = useState(urlRootCreationId);
    const [remixDepth, setRemixDepth] = useState(() => Number.parseInt(urlRemixDepth, 10) || 0);
    const [sourcePostId, setSourcePostId] = useState(urlSourcePostId);
    const [remixType, setRemixType] = useState<string>(urlRemixType);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [sourceVideo, setSourceVideo] = useState<File | null>(null);
    const [sourceVideoPreview, setSourceVideoPreview] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const startImageRef = useRef<HTMLInputElement>(null);
    const endImageRef = useRef<HTMLInputElement>(null);
    const [startImageFile, setStartImageFile] = useState<File | null>(null);
    const [startImagePreview, setStartImagePreview] = useState<string>("");
    const [endImageFile, setEndImageFile] = useState<File | null>(null);
    const [endImagePreview, setEndImagePreview] = useState<string>("");

    const [imageCount, setImageCount] = useState<number>(() => {
        if (typeof window === 'undefined') return 1;
        const savedN = localStorage.getItem("studio_last_n");
        return savedN ? parseInt(savedN) : 1;
    });
    const [resolution, setResolution] = useState<string>("1K");
    const [duration, setDuration] = useState<number>(5);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
    const [multiShots, setMultiShots] = useState<boolean>(false);
    const [fixedLens, setFixedLens] = useState<boolean>(false);
    const [generateAudio, setGenerateAudio] = useState<boolean>(false);
    const [promptOptimizer, setPromptOptimizer] = useState<boolean>(false);
    const [remixStrength, setRemixStrength] = useState<number>(() => {
        if (typeof window === 'undefined') return 75;
        const saved = localStorage.getItem("studio_remix_strength");
        return saved ? parseInt(saved) : 75;
    });
    const [outputFormat, setOutputFormat] = useState<string>("png");
    const [videoStyle, setVideoStyle] = useState<string>("none");
    const [storyboard, setStoryboard] = useState<boolean>(false);
    const [negativePrompt, setNegativePrompt] = useState<string>("");
    const [videoMode, setVideoMode] = useState<string>("normal");
    const [characterOrientation, setCharacterOrientation] = useState<string>("image");
    const [directorModeEnabled, setDirectorModeEnabled] = useState<boolean>(() =>
        urlCampaignDirected === "1" ||
        Boolean(urlCampaignGoal || urlCampaignPlatform || urlCampaignStyle || urlCampaignVariationCount || urlCampaignBrief || urlCampaignPresetIds)
    );
    const [directorGoal, setDirectorGoal] = useState<string>(urlCampaignGoal);
    const [directorPlatform, setDirectorPlatform] = useState<string>(urlCampaignPlatform || "instagram");
    const [directorStyle, setDirectorStyle] = useState<string>(urlCampaignStyle || "Cinematic");
    const [directorBrief, setDirectorBrief] = useState<string>(urlCampaignBrief || "");
    const [directorVariations, setDirectorVariations] = useState<number>(() => {
        const parsed = Number.parseInt(urlCampaignVariationCount, 10);
        return Number.isNaN(parsed) ? 4 : Math.min(8, Math.max(1, parsed));
    });
    const [directorPresetIds, setDirectorPresetIds] = useState<string[]>(() =>
        normalizeExportPresetIds(urlCampaignPresetIds)
    );
    const [autoExportPack, setAutoExportPack] = useState<boolean>(urlAutoExportPack === "1");

    const [selectedModel, setSelectedModel] = useState(() => {
        if (urlMode === 'video' || (urlMode === 'remix' && urlRemixType === 'video')) return AI_VIDEO_MODELS[0];
        if (typeof window !== 'undefined' && !urlPrompt) {
            const savedModelId = localStorage.getItem("studio_last_model");
            if (savedModelId) {
                const found = AI_IMAGE_MODELS.find(m => m.id === savedModelId) || AI_VIDEO_MODELS.find(m => m.id === savedModelId);
                if (found) return found;
            }
        }
        return AI_IMAGE_MODELS[0];
    });
    const [savedTemplates, setSavedTemplates] = useState<StudioTemplateRecord[]>([]);
    const [templateName, setTemplateName] = useState("");
    const [templateCategoryFilter, setTemplateCategoryFilter] = useState<"all" | StudioTemplatePreset["category"]>("all");
    const [templateSearchQuery, setTemplateSearchQuery] = useState("");
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templateDeckMountNode, setTemplateDeckMountNode] = useState<HTMLElement | null>(null);
    const [characterPacksMountNode, setCharacterPacksMountNode] = useState<HTMLElement | null>(null);
    const [characterPacks, setCharacterPacks] = useState<StudioCharacterPackRecord[]>([]);
    const [characterPacksLoading, setCharacterPacksLoading] = useState(false);
    const [characterPackName, setCharacterPackName] = useState("");
    const [characterPackNotes, setCharacterPackNotes] = useState("");
    const [activeCharacterPackId, setActiveCharacterPackId] = useState<string>("");
    const [isExtractingCharacter, setIsExtractingCharacter] = useState(false);
    const [characterExtractionTaskId, setCharacterExtractionTaskId] = useState<string>("");
    const [characterExtractionMessage, setCharacterExtractionMessage] = useState<string>("");
    const [liveProviderHealth, setLiveProviderHealth] = useState<ProviderHealthSnapshot | null>(null);
    const importedTemplateRef = useRef<string | null>(null);
    const [cameraMovement, setCameraMovement] = useState<string>("none");
    const [effectPreset, setEffectPreset] = useState<string>("none");
    const [audioDirection, setAudioDirection] = useState<string>("none");
    const [characterLock, setCharacterLock] = useState<boolean>(false);

    const hasCharacterReferenceContext = Boolean(
        activeCharacterPackId || sourceFile || startImageFile || sourceVideo || sourceVideoPreview || previewUrl
    );

    const cfg = getConfig(selectedModel.id);

    useEffect(() => {
        const m = searchParams?.get("mode")?.toLowerCase();
        if (m && m !== creationMode) {
            handleModeSwitch(m);
        }
        const p = searchParams?.get("prompt");
        if (p && p !== prompt) {
            setPrompt(p);
        }
        const pre = searchParams?.get("previewUrl");
        if (pre && pre !== previewUrl) {
            setPreviewUrl(pre);
        }
        const rType = searchParams?.get("remixType")?.toLowerCase();
        if (rType && rType !== remixType) {
            setRemixType(rType);
        }
        const cId = searchParams?.get("creationId");
        if (cId && cId !== creationId) {
            setCreationId(cId);
        }
        const rootId = searchParams?.get("rootCreationId");
        if (rootId && rootId !== rootCreationId) {
            setRootCreationId(rootId);
        }
        const remixDepthParam = searchParams?.get("remixDepth");
        if (remixDepthParam) {
            const parsed = Number.parseInt(remixDepthParam, 10);
            if (!Number.isNaN(parsed) && parsed !== remixDepth) {
                setRemixDepth(parsed);
            }
        }
        const sourcePost = searchParams?.get("sourcePostId");
        if (sourcePost && sourcePost !== sourcePostId) {
            setSourcePostId(sourcePost);
        }
        const ar = searchParams?.get("aspectRatio");
        if (ar && ar !== aspectRatio) {
            setAspectRatio(ar);
        }
        const modelId = searchParams?.get("model");
        if (modelId && modelId !== selectedModel.id) {
            const found = AI_IMAGE_MODELS.find(m => m.id === modelId) || AI_VIDEO_MODELS.find(m => m.id === modelId);
            if (found) setSelectedModel(found);
        }
        const res = searchParams?.get("resolution");
        if (res && res !== resolution) {
            setResolution(res);
        }
        const directed = searchParams?.get("campaignDirected");
        if (directed === "1") {
            setDirectorModeEnabled(true);
        }
        const goal = searchParams?.get("campaignGoal");
        if (goal !== null) {
            setDirectorGoal(goal);
        }
        const platform = searchParams?.get("campaignPlatform");
        if (platform !== null && platform.length > 0) {
            setDirectorPlatform(platform);
        }
        const style = searchParams?.get("campaignStyle");
        if (style !== null && style.length > 0) {
            setDirectorStyle(style);
        }
        const brief = searchParams?.get("campaignBrief");
        if (brief !== null) {
            setDirectorBrief(brief);
        }
        const variationText = searchParams?.get("campaignVariationCount");
        if (variationText !== null && variationText.length > 0) {
            const parsedVariation = Number.parseInt(variationText, 10);
            if (!Number.isNaN(parsedVariation)) {
                setDirectorVariations(Math.min(8, Math.max(1, parsedVariation)));
            }
        }
        const presetIds = searchParams?.get("campaignPresetIds");
        if (presetIds !== null) {
            setDirectorPresetIds(normalizeExportPresetIds(presetIds));
        }
        const autoExportParam = searchParams?.get("autoExportPack");
        if (autoExportParam !== null) {
            setAutoExportPack(autoExportParam === "1");
        }
    }, [searchParams]);

    // Sync sidebar mode to creation mode
    useEffect(() => {
        if (!studioMode) return;
        switch (studioMode) {
            case "text-to-image":
                if (creationMode !== "image") handleModeSwitch("image");
                break;
            case "image-to-image":
                if (creationMode !== "image") handleModeSwitch("image");
                break;
            case "text-to-video":
                if (creationMode !== "video") handleModeSwitch("video");
                break;
            case "image-to-video":
                if (creationMode !== "video") handleModeSwitch("video");
                break;
            case "motion-control":
                if (creationMode !== "video") handleModeSwitch("video");
                // Auto-select motion control model
                const mcModel = AI_VIDEO_MODELS.find(m => m.id === "kling-3.0-motion-control");
                if (mcModel) setSelectedModel(mcModel);
                break;
            case "remix":
                if (creationMode !== "remix") handleModeSwitch("remix");
                break;
            case "workflow-templates":
                if (creationMode !== "templates") handleModeSwitch("templates");
                break;
        }
    }, [studioMode]);

    useEffect(() => {
        if (!cfg) return;
        if (cfg.type === "image") {
            const ic = cfg as ImageModelConfig;
            if (!ic.supportsN) setImageCount(1);
            else if (imageCount > ic.maxN) setImageCount(ic.maxN);
            if (ic.supportsResolution && ic.defaultResolution) setResolution(ic.defaultResolution);
            if (!ic.sizeOptions.includes(aspectRatio)) {
                setAspectRatio(ic.sizeOptions[0]);
            }
        }
        if (cfg.type === "video") {
            const vc = cfg as VideoModelConfig;
            if (vc.defaultDuration) setDuration(vc.defaultDuration);
            if (vc.supportsResolution && vc.defaultResolution) setResolution(vc.defaultResolution);
            if (vc.supportsStyle && vc.styleOptions) setVideoStyle(vc.styleOptions[0]);
            if (vc.supportsMode && vc.modeOptions) setVideoMode(vc.modeOptions[0]);
            if (vc.supportsCharacterOrientation && vc.characterOrientationOptions) setCharacterOrientation(vc.characterOrientationOptions[0]);
            if (vc.aspectRatioOptions && !vc.aspectRatioOptions.includes(aspectRatio)) {
                setAspectRatio(vc.aspectRatioOptions[0]);
            }
            setSoundEnabled(false);
            setMultiShots(false);
            setFixedLens(false);
            setGenerateAudio(false);
            setPromptOptimizer(false);
            setStoryboard(false);
            setNegativePrompt("");
        }
    }, [selectedModel.id]);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleModeSwitch = (mode: string) => {
        const newMode = mode.toLowerCase();
        setCreationMode(newMode);
        if (newMode === 'video' || (newMode === 'remix' && remixType === 'video')) {
            setSelectedModel(AI_VIDEO_MODELS[0]);
        } else if (newMode === 'image' || newMode === 'templates' || (newMode === 'remix' && remixType === 'image')) {
            setSelectedModel(AI_IMAGE_MODELS[0]);
        }
    };

    const buildCurrentTemplateShareInput = () => ({
        name: templateName.trim() || `${selectedModel.name} Workflow`,
        description: `Shared from ${creationMode} mode`,
        mode: creationMode === "templates" ? (cfg?.type === "video" ? "video" : "image") : (creationMode as "image" | "video" | "remix"),
        model: selectedModel.id,
        provider: chooseProvider({
            mode: creationMode === "remix" ? "remix" : cfg?.type === "video" ? "video" : "image",
            model: selectedModel.id,
            wantsRemix: creationMode === "remix" || Boolean(creationId),
            hasReferenceImage: Boolean(sourceFile || startImageFile || previewUrl),
            needsCharacterReference: Boolean(characterLock && hasCharacterReferenceContext),
            liveHealth: liveProviderHealth?.status,
        }),
        prompt,
        aspectRatio,
        resolution,
        duration,
        imageCount,
        remixStrength,
        outputFormat,
        videoStyle,
        videoMode,
        negativePrompt,
        storyboard,
        soundEnabled,
        generateAudio,
        characterOrientation,
        directorGoal,
        directorPlatform,
        directorStyle,
        directorBrief,
        directorVariations,
        directorPresetIds,
        autoExportPack,
        cameraMovement,
        effectPreset,
        audioDirection,
        characterLock,
        characterPackId: activeCharacterPackId || undefined,
        characterPackName: characterPackName || undefined,
        characterPackNotes: characterPackNotes || undefined,
    });

    const copyTemplateLink = async (
        template: {
            mode?: "image" | "video" | "remix";
            model?: string;
            prompt?: string;
            name?: string;
            description?: string;
            provider?: string;
            source?: string;
            aspectRatio?: string;
            resolution?: string;
            duration?: number;
            imageCount?: number;
            remixStrength?: number;
            outputFormat?: string;
            videoStyle?: string;
            videoMode?: string;
            negativePrompt?: string;
            storyboard?: boolean;
            soundEnabled?: boolean;
            generateAudio?: boolean;
            characterOrientation?: string;
            directorGoal?: string;
            directorPlatform?: string;
            directorStyle?: string;
            directorBrief?: string;
            directorVariations?: number;
            directorPresetIds?: string[];
            autoExportPack?: boolean;
            cameraMovement?: string;
            effectPreset?: string;
            audioDirection?: string;
            characterLock?: boolean;
            characterPackId?: string;
            characterPackName?: string;
            characterPackNotes?: string;
        }
    ) => {
        try {
            const { source, ...shareableTemplate } = template;
            const shareUrl = buildStudioTemplateShareUrl(
                buildStudioTemplateSharePayload({
                    ...shareableTemplate,
                    mode: template.mode || "image",
                    model: template.model,
                    prompt: template.prompt,
                    sharedFrom: source === "saved" ? "saved-template" : "workflow-template",
                }),
                window.location.origin
            );
            await copyTextToClipboard(shareUrl);
            toast.success("Workflow link copied. Opening it will import this Studio setup instantly.");
        } catch (error) {
            console.error("Failed to copy template link:", error);
            toast.error("Could not generate a share link for this workflow.");
        }
    };

    const uploadReferenceAsset = async (file: File) => {
        if (!user?.uid) throw new Error("Log in first so Studio can save reference packs to your account.");
        const extension = file.name.split(".").pop() || "png";
        const storagePath = `studio-character-packs/${user.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadBytesResumable(storageRef, file);
        return getDownloadURL(uploadResult.ref);
    };

    const applyTemplateConfig = (
        template: (Partial<StudioTemplateRecord> & Partial<StudioTemplatePreset> & { name?: string }) | (Partial<StudioTemplateRecord> & { provider?: string })
    ) => {
        const nextMode = template.mode || "image";
        setTemplateName(template.name || "");
        setCreationMode(nextMode);
        setPrompt(template.prompt || "");
        if (template.aspectRatio) setAspectRatio(template.aspectRatio);
        if (template.resolution) setResolution(template.resolution);
        if (typeof template.duration === "number") setDuration(template.duration);
        if (typeof template.imageCount === "number") setImageCount(template.imageCount);
        if (typeof template.remixStrength === "number") setRemixStrength(template.remixStrength);
        if (template.outputFormat) setOutputFormat(template.outputFormat);
        if (template.videoStyle) setVideoStyle(template.videoStyle);
        if (template.videoMode) setVideoMode(template.videoMode);
        if (typeof template.storyboard === "boolean") setStoryboard(template.storyboard);
        if (typeof template.soundEnabled === "boolean") setSoundEnabled(template.soundEnabled);
        if (typeof template.generateAudio === "boolean") setGenerateAudio(template.generateAudio);
        if (template.negativePrompt !== undefined) setNegativePrompt(template.negativePrompt || "");
        if (template.characterOrientation) setCharacterOrientation(template.characterOrientation);
        if (template.cameraMovement) setCameraMovement(template.cameraMovement);
        if (template.effectPreset) setEffectPreset(template.effectPreset);
        if (template.audioDirection) setAudioDirection(template.audioDirection);
        if (typeof template.characterLock === "boolean") setCharacterLock(template.characterLock);
        setActiveCharacterPackId(template.characterPackId || "");
        setCharacterPackName(template.characterPackName || "");
        setCharacterPackNotes(template.characterPackNotes || "");

        const nextModelId = template.model;
        if (nextModelId) {
            const found =
                AI_IMAGE_MODELS.find((model) => model.id === nextModelId) ||
                AI_VIDEO_MODELS.find((model) => model.id === nextModelId);
            if (found) setSelectedModel(found);
        }

        const wantsDirectorMode =
            Boolean(template.directorGoal || template.directorPlatform || template.directorStyle || template.directorBrief) ||
            Boolean(template.directorPresetIds?.length) ||
            Boolean(template.autoExportPack);

        setDirectorModeEnabled(wantsDirectorMode);
        setDirectorGoal(template.directorGoal || "");
        setDirectorPlatform(template.directorPlatform || "instagram");
        setDirectorStyle(template.directorStyle || "Cinematic");
        setDirectorBrief(template.directorBrief || "");
        if (typeof template.directorVariations === "number") {
            setDirectorVariations(Math.min(8, Math.max(1, template.directorVariations)));
        }
        setDirectorPresetIds(template.directorPresetIds || []);
        setAutoExportPack(Boolean(template.autoExportPack));
    };

    const applyCharacterPack = (pack: StudioCharacterPackRecord) => {
        setActiveCharacterPackId(pack.id);
        setCharacterPackName(pack.name);
        setCharacterPackNotes(pack.notes || "");
        setCharacterLock(true);
        setSourceFile(null);
        setSourceVideo(null);
        setStartImageFile(null);
        setEndImageFile(null);
        setStartImagePreview("");
        setEndImagePreview("");
        setSourceVideoPreview(pack.referenceVideoUrl || "");
        setPreviewUrl(pack.referenceImageUrl || pack.referenceVideoUrl || "");
        toast.success(`Character pack "${pack.name}" is now driving the identity pipeline.`);
    };

    const handleSaveCurrentTemplate = async () => {
        if (!user?.uid) {
            toast.error("Log in first so Studio can save templates to your account.");
            return;
        }

        if (!prompt.trim()) {
            toast.error("Add a prompt before saving a template.");
            return;
        }

        const saved = await saveStudioTemplate(user.uid, {
            name: templateName.trim() || `${selectedModel.name} Template`,
            description: `Saved from ${creationMode} mode`,
            mode: creationMode === "templates" ? (cfg?.type === "video" ? "video" : "image") : (creationMode as "image" | "video" | "remix"),
            model: selectedModel.id,
            provider: chooseProvider({
                mode: creationMode === "remix" ? "remix" : cfg?.type === "video" ? "video" : "image",
                model: selectedModel.id,
                wantsRemix: creationMode === "remix" || Boolean(creationId),
                hasReferenceImage: Boolean(sourceFile || startImageFile || previewUrl),
                needsCharacterReference: Boolean(characterLock && hasCharacterReferenceContext),
                liveHealth: liveProviderHealth?.status,
            }),
            prompt,
            aspectRatio,
            resolution,
            duration,
            imageCount,
            remixStrength,
            outputFormat,
            videoStyle,
            videoMode,
            negativePrompt,
            storyboard,
            soundEnabled,
            generateAudio,
            characterOrientation,
            directorModeEnabled,
            directorGoal,
            directorPlatform,
            directorStyle,
            directorBrief,
            directorVariations,
            directorPresetIds,
            autoExportPack,
            cameraMovement,
            effectPreset,
            audioDirection,
            characterLock,
            characterPackId: activeCharacterPackId || undefined,
            characterPackName: characterPackName || undefined,
            characterPackNotes: characterPackNotes || undefined,
            source: "saved",
        });

        setSavedTemplates((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
        setTemplateName(saved.name);
        toast.success(`Saved template: ${saved.name}`);
    };

    const handleSaveCharacterPack = async () => {
        if (!user?.uid) {
            toast.error("Log in first so Studio can save reference packs to your account.");
            return;
        }

        const currentReferenceImage =
            sourceFile && sourceFile.type.startsWith("image/")
                ? await uploadReferenceAsset(sourceFile)
                : startImageFile
                    ? await uploadReferenceAsset(startImageFile)
                    : previewUrl && !previewUrl.toLowerCase().includes(".mp4") && !previewUrl.toLowerCase().includes(".webm") && !previewUrl.toLowerCase().includes(".mov")
                        ? previewUrl
                        : activeGeneration?.type === "image"
                            ? activeGeneration.src
                            : undefined;

        const currentReferenceVideo =
            sourceVideo
                ? await uploadReferenceAsset(sourceVideo)
                : sourceVideoPreview || (activeGeneration?.type === "video" ? activeGeneration.src : undefined);

        if (!currentReferenceImage && !currentReferenceVideo) {
            toast.error("Attach or generate a reference image or video first so Studio can save the character pack.");
            return;
        }

        const saved = await saveStudioCharacterPack(user.uid, {
            name: characterPackName.trim() || `${selectedModel.name} Character Pack`,
            notes: characterPackNotes.trim() || undefined,
            referenceImageUrl: currentReferenceImage,
            referenceVideoUrl: currentReferenceVideo,
            thumbnailUrl: currentReferenceImage || currentReferenceVideo,
            sourceType: currentReferenceVideo && !currentReferenceImage ? "video" : "image",
        });

        setCharacterPacks((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
        applyCharacterPack(saved);
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!user?.uid) return;
        await deleteStudioTemplate(user.uid, templateId);
        setSavedTemplates((current) => current.filter((item) => item.id !== templateId));
        toast.success("Template removed.");
    };

    const handleDeleteCharacterPack = async (packId: string) => {
        if (!user?.uid) return;
        await deleteStudioCharacterPack(user.uid, packId);
        setCharacterPacks((current) => current.filter((item) => item.id !== packId));
        if (activeCharacterPackId === packId) {
            setActiveCharacterPackId("");
            setCharacterPackName("");
            setCharacterPackNotes("");
        }
        toast.success("Character pack removed.");
    };

    useEffect(() => {
        if (!user?.uid) {
            setSavedTemplates([]);
            return;
        }

        let cancelled = false;
        setTemplatesLoading(true);

        listStudioTemplates(user.uid)
            .then((items) => {
                if (!cancelled) setSavedTemplates(items);
            })
            .finally(() => {
                if (!cancelled) setTemplatesLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) {
            setCharacterPacks([]);
            return;
        }

        let cancelled = false;
        setCharacterPacksLoading(true);

        listStudioCharacterPacks(user.uid)
            .then((items) => {
                if (!cancelled) setCharacterPacks(items);
            })
            .finally(() => {
                if (!cancelled) setCharacterPacksLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    useEffect(() => {
        let mounted = true;

        const readHealth = async () => {
            try {
                const response = await fetch("/api/provider-health", { cache: "no-store" });
                const data = await response.json();
                const provider = chooseProvider({
                    mode: creationMode === "remix" ? "remix" : cfg?.type === "video" ? "video" : "image",
                    model: selectedModel.id,
                    wantsRemix: creationMode === "remix" || Boolean(creationId),
                    hasReferenceImage: Boolean(sourceFile || startImageFile || previewUrl),
                    needsCharacterReference: Boolean(characterLock && hasCharacterReferenceContext),
                });
                const live = data?.providers?.[provider] || null;
                const session = getSessionProviderHealth(provider);
                if (mounted) {
                    setLiveProviderHealth(mergeProviderHealth(live, session));
                }
            } catch (error) {
                if (mounted) {
                    setLiveProviderHealth(getSessionProviderHealth(
                        chooseProvider({
                            mode: creationMode === "remix" ? "remix" : cfg?.type === "video" ? "video" : "image",
                            model: selectedModel.id,
                            wantsRemix: creationMode === "remix" || Boolean(creationId),
                            hasReferenceImage: Boolean(sourceFile || startImageFile || previewUrl),
                            needsCharacterReference: Boolean(characterLock && hasCharacterReferenceContext),
                        })
                    ));
                }
            }
        };

        void readHealth();
        const interval = window.setInterval(readHealth, 45000);
        return () => {
            mounted = false;
            window.clearInterval(interval);
        };
    }, [cfg?.type, creationId, creationMode, previewUrl, searchParams, selectedModel.id, sourceFile, startImageFile, characterLock, hasCharacterReferenceContext]);

    const resolveCharacterExtractionSource = async () => {
        if (sourceFile && sourceFile.type.startsWith("image/")) {
            return uploadReferenceAsset(sourceFile);
        }
        if (startImageFile) {
            return uploadReferenceAsset(startImageFile);
        }
        if (previewUrl && !previewUrl.startsWith("blob:") && !previewUrl.toLowerCase().includes(".mp4") && !previewUrl.toLowerCase().includes(".webm") && !previewUrl.toLowerCase().includes(".mov")) {
            return previewUrl;
        }
        if (activeGeneration?.type === "image" && activeGeneration.src) {
            return activeGeneration.src;
        }
        return null;
    };

    const handleExtractCharacterReference = async () => {
        if (!user?.uid) {
            toast.error("Log in first so Studio can save extracted character packs.");
            return;
        }

        const sourceImageUrl = await resolveCharacterExtractionSource();
        if (!sourceImageUrl) {
            toast.error("Attach or generate an image first, then run character extraction.");
            return;
        }

        try {
            setIsExtractingCharacter(true);
            setCharacterExtractionTaskId("");
            setCharacterExtractionMessage("Starting extraction...");

            const response = await fetch("/api/apimart/character/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: sourceImageUrl,
                    notes: characterPackNotes || undefined,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Character extraction failed.");
            }

            if (data?.taskId) {
                setCharacterExtractionTaskId(data.taskId);
            }

            const extractedImageUrl = data?.extractedImageUrl || sourceImageUrl;
            const saved = await saveStudioCharacterPack(user.uid, {
                name: characterPackName.trim() || `${selectedModel.name} Character Pack`,
                notes: characterPackNotes.trim() || "Auto-extracted with ApiMart identity pipeline.",
                referenceImageUrl: extractedImageUrl,
                thumbnailUrl: extractedImageUrl,
                sourceType: "image",
            });

            setCharacterPacks((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
            applyCharacterPack(saved);
            setCharacterExtractionMessage("Extraction complete.");
            toast.success(`Character reference extracted and saved: ${saved.name}`);
        } catch (error) {
            console.error("Character extraction failed:", error);
            setCharacterExtractionMessage("");
            toast.error(error instanceof Error ? error.message : "Character extraction failed.");
        } finally {
            setIsExtractingCharacter(false);
        }
    };

    useEffect(() => {
        const pack = searchParams?.get("templatePack");
        if (!pack || importedTemplateRef.current === pack) return;

        importedTemplateRef.current = pack;
        const decoded = decodeStudioTemplatePack(pack);
        if (!decoded) {
            toast.error("That workflow link could not be imported.");
            return;
        }

        applyTemplateConfig(decoded);
        toast.success(`Imported workflow${decoded.name ? `: ${decoded.name}` : ""}`);
    }, [searchParams]);

    const handleGenerate = () => {
        let parameters: any = {};
        const previewLooksVideo =
            remixType === "video" ||
            previewUrl.toLowerCase().includes(".mp4") ||
            previewUrl.toLowerCase().includes(".webm") ||
            previewUrl.toLowerCase().includes(".mov");
        const validation = validateStudioExecution({
            mode: creationMode === "templates" ? (cfg?.type === "video" ? "video" : "image") : (creationMode as "image" | "video" | "remix"),
            prompt,
            hasReferenceImage: Boolean(sourceFile || startImageFile || (previewUrl && !previewLooksVideo)),
            hasReferenceVideo: Boolean(sourceVideo || sourceVideoPreview || (previewUrl && previewLooksVideo)),
            capability: cfg
                ? {
                    type: cfg.type,
                    requiresReferenceImage: cfg.type === "image" ? false : cfg.requiresReferenceImage,
                    requiresReferenceVideo: cfg.type === "image" ? false : cfg.requiresReferenceVideo,
                    supportsPrompt: cfg.type === "image" ? true : cfg.supportsPrompt,
                  }
                : undefined,
        });
        if (validation.errors.length > 0) {
            toast.error(validation.errors[0]);
            return;
        }
        if (validation.warnings.length > 0) {
            toast.warning(validation.warnings[0]);
        }

        const urlPresetIds = normalizeExportPresetIds(urlCampaignPresetIds);
        const activeDirectorPresets = directorPresetIds.length > 0 ? directorPresetIds : urlPresetIds;
        const shouldUseDirectorMode =
            directorModeEnabled ||
            urlCampaignDirected === "1" ||
            Boolean(urlCampaignGoal || urlCampaignPlatform || urlCampaignStyle || urlCampaignVariationCount || urlCampaignBrief || activeDirectorPresets.length);
        const resolvedDirectorGoal = directorGoal || urlCampaignGoal || "";
        const resolvedDirectorPlatform = directorPlatform || urlCampaignPlatform || "";
        const resolvedDirectorStyle = directorStyle || urlCampaignStyle || "";
        const resolvedDirectorBrief = directorBrief || urlCampaignBrief || prompt;
        const parsedUrlVariations = Number.parseInt(urlCampaignVariationCount, 10);
        const fallbackVariationCount = Number.isNaN(parsedUrlVariations) ? 4 : parsedUrlVariations;
        const resolvedDirectorVariations = Math.min(8, Math.max(1, directorVariations || fallbackVariationCount));
        const resolvedAutoExportPack = autoExportPack || urlAutoExportPack === "1";
        const effectivePrompt = applyStudioPromptEnhancements({
            prompt,
            model: selectedModel.id,
            cameraMovement,
            effectPreset,
            audioDirection: generateAudio ? audioDirection : undefined,
            characterLock,
            characterReferenceName: characterPackName || undefined,
            characterReferenceNotes: characterPackNotes || undefined,
        });

        if (sourceFile) {
            parameters.sourceFile = sourceFile;
        } else if (previewUrl && !previewUrl.startsWith('blob:')) {
            if (previewLooksVideo) {
                parameters.video_url = previewUrl;
            } else {
                parameters.image_url = previewUrl;
            }
        }

        if (sourceVideo) {
            parameters.sourceVideo = sourceVideo;
        }
        if (startImageFile) {
            parameters.sourceFiles = [startImageFile];
        }
        if (endImageFile) {
            parameters.end_image_file = endImageFile;
        }

        if ((creationMode === "image" || creationMode === "templates") && cfg?.type === "image") {
            const ic = cfg as ImageModelConfig;
            parameters.prompt = effectivePrompt;
            parameters.size = aspectRatio;
            if (ic.supportsN) {
                const directorN = Math.min(ic.maxN, resolvedDirectorVariations);
                parameters.n = shouldUseDirectorMode ? directorN : imageCount;
            }
            if (ic.supportsResolution) parameters.resolution = resolution;
            if (ic.supportsOutputFormat) parameters.output_format = outputFormat;
        }
        else if (creationMode === "remix") {
            const remixModelConfig = cfg?.type === "image" ? (cfg as ImageModelConfig) : null;
            const remixMaxN = remixModelConfig?.supportsN ? remixModelConfig.maxN : 8;
            const remixDirectorN = Math.min(remixMaxN, resolvedDirectorVariations);
            parameters.n = shouldUseDirectorMode ? remixDirectorN : imageCount;
            parameters.prompt = effectivePrompt;
            parameters.image_weight = remixStrength / 100;
            parameters.size = aspectRatio;
            parameters.aspect_ratio = aspectRatio;
            if (previewUrl) {
                parameters.image_url = previewUrl;
            }
            if (cfg?.type === "image") {
                const ic = cfg as ImageModelConfig;
                if (ic.supportsResolution) parameters.resolution = resolution;
                if (ic.supportsOutputFormat) parameters.output_format = outputFormat;
            }
        }
        else if ((creationMode === "video" || creationMode === "templates") && cfg?.type === "video") {
            const vc = cfg as VideoModelConfig;
            if (vc.supportsPrompt) parameters.prompt = effectivePrompt;
            if (vc.aspectRatioOptions) parameters.aspect_ratio = aspectRatio;
            if (vc.durationOptions || vc.durationRange) parameters.duration = duration;
            if (vc.supportsResolution) parameters.resolution = resolution;
            if (vc.supportsSound) parameters.sound = soundEnabled;
            if (vc.supportsMultiShots) parameters.multi_shots = multiShots;
            if (vc.supportsFixedLens) parameters.fixed_lens = fixedLens;
            if (vc.supportsGenerateAudio) parameters.generate_audio = generateAudio;
            if (vc.supportsPromptOptimizer) parameters.prompt_optimizer = promptOptimizer;
            if (vc.supportsStyle && videoStyle !== "none") parameters.style = videoStyle;
            if (vc.supportsStoryboard) parameters.storyboard = storyboard;
            if (vc.supportsNegativePrompt && negativePrompt) parameters.negative_prompt = negativePrompt;
            if (vc.supportsMode) parameters.mode = videoMode;
            if (vc.supportsCharacterOrientation) parameters.character_orientation = characterOrientation;
            if (vc.supportsStartImage && startImageFile) {
                parameters.sourceFiles = [startImageFile];
            }
            if (vc.supportsEndImage && endImageFile) {
                parameters.end_image_file = endImageFile;
            }
            // Wan 2.6 — template is a first-class ApiMart param, not prompt text.
            Object.assign(parameters, buildWan26PayloadExtras(selectedModel.id, effectPreset));
        }

        const providerDecision = getProviderRoutingDecision({
            mode: creationMode === "remix" ? "remix" : (cfg?.type === "video" ? "video" : "image"),
            model: selectedModel.id,
            wantsRemix: creationMode === "remix" || Boolean(creationId),
            hasReferenceImage: Boolean(sourceFile || startImageFile || previewUrl),
            needsCharacterReference: Boolean(characterLock && hasCharacterReferenceContext),
            liveHealth: liveProviderHealth?.status,
            params: {
                aspect_ratio: aspectRatio,
                resolution,
                duration: typeof duration === "number" ? duration : undefined,
                n: imageCount,
                template: isWan26Model(selectedModel.id) && effectPreset !== "none" ? effectPreset : undefined,
                camera_movement: isHailuo23Model(selectedModel.id) && cameraMovement !== "none" ? cameraMovement : undefined,
            },
        });

        const resolvedCreationMode =
            creationMode === "templates"
                ? (cfg?.type === "video" ? "video" : "image")
                : creationMode;

        onGenerate(effectivePrompt, {
            mode: resolvedCreationMode,
            creationMode: resolvedCreationMode,
            model: selectedModel.id,
            originalCreationId: creationId || undefined,
            rootCreationId: rootCreationId || creationId || undefined,
            remixDepth: remixDepth || undefined,
            sourcePostId: sourcePostId || undefined,
            originalTaskId: urlTaskId || undefined,
            provider: urlGenerationPlatform === "apimart" || urlGenerationPlatform === "poyo"
                ? urlGenerationPlatform
                : providerDecision.provider,
            providerHealth: providerDecision.health,
            providerStatus: liveProviderHealth?.status || providerDecision.health,
            providerSignal: liveProviderHealth?.signal,
            providerTelemetryMessage: liveProviderHealth?.message,
            providerNotes: providerDecision.notes,
            providerFallback: providerDecision.fallback,
            needsCharacterReference: Boolean(characterLock && hasCharacterReferenceContext),
            templateName: templateName.trim() || undefined,
            originalPrompt: prompt,
            campaign_brief: shouldUseDirectorMode ? (resolvedDirectorBrief || undefined) : undefined,
            campaign_directed: shouldUseDirectorMode ? "1" : undefined,
            campaign_preset_ids: shouldUseDirectorMode && activeDirectorPresets.length > 0
                ? activeDirectorPresets.join(",")
                : undefined,
            auto_export_pack: shouldUseDirectorMode && resolvedAutoExportPack ? "1" : undefined,
            director_goal: shouldUseDirectorMode ? (resolvedDirectorGoal || undefined) : undefined,
            director_platform: shouldUseDirectorMode ? (resolvedDirectorPlatform || undefined) : undefined,
            director_style: shouldUseDirectorMode ? (resolvedDirectorStyle || undefined) : undefined,
            director_variations: shouldUseDirectorMode ? String(resolvedDirectorVariations) : undefined,
            sourceFile: sourceFile || undefined,
            sourceVideo: sourceVideo || undefined,
            aspectRatio,
            cameraMovement: cameraMovement !== "none" ? cameraMovement : undefined,
            effectPreset: effectPreset !== "none" ? effectPreset : undefined,
            audioDirection: generateAudio && audioDirection !== "none" ? audioDirection : undefined,
            characterLock: characterLock || undefined,
            characterPackId: activeCharacterPackId || undefined,
            characterPackName: characterPackName || undefined,
            characterPackNotes: characterPackNotes || undefined,
            ...parameters
        });

        try {
            localStorage.setItem("studio_last_prompt", prompt);
            localStorage.setItem("studio_last_model", selectedModel.id);
            localStorage.setItem("studio_last_n", imageCount.toString());
            localStorage.setItem("studio_remix_strength", remixStrength.toString());
        } catch (e) {}

        setSourceVideo(null);
        setSourceVideoPreview("");
        setStartImageFile(null);
        setStartImagePreview("");
        setEndImageFile(null);
        setEndImagePreview("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (videoInputRef.current) videoInputRef.current.value = "";
        if (startImageRef.current) startImageRef.current.value = "";
        if (endImageRef.current) endImageRef.current.value = "";
    };

    useEffect(() => {
        if (cfg?.type === "video") {
            const vc = cfg as VideoModelConfig;
            if (vc.supportsMultiShots && multiShots && vc.supportsSound) {
                setSoundEnabled(true);
            }
        }
    }, [multiShots, cfg]);

    useEffect(() => {
        if (cfg?.type === "video") {
            const vc = cfg as VideoModelConfig;
            if (vc.durationConstraints && vc.durationConstraints[resolution]) {
                const allowed = vc.durationConstraints[resolution];
                if (!allowed.includes(duration)) {
                    setDuration(allowed[0]);
                }
            }
        }
    }, [resolution, cfg]);

    useEffect(() => {
        if (cfg?.type !== "video") {
            setCameraMovement("none");
            setEffectPreset("none");
            setAudioDirection("none");
            setCharacterLock(false);
            return;
        }

        const vc = cfg as VideoModelConfig;
        if (!vc.supportsCameraMovement) setCameraMovement("none");
        if (!vc.supportsEffectPreset) setEffectPreset("none");
        if (!vc.supportsAudioDirection) setAudioDirection("none");
        if (!vc.supportsCharacterLock) setCharacterLock(false);
    }, [cfg?.type, selectedModel.id]);

    const isImageMode = cfg?.type === "image";
    const isVideoMode = cfg?.type === "video";
    const imgCfg = isImageMode ? (cfg as ImageModelConfig) : null;
    const vidCfg = isVideoMode ? (cfg as VideoModelConfig) : null;

    const supportsMultiOutput = imgCfg?.supportsN && imgCfg.maxN > 1;
    const isMultiOutputImage = creationMode === "image" || creationMode === "remix";

    const activeModelPool = useMemo(
        () => (creationMode === "video" || (creationMode === "remix" && remixType === "video") ? AI_VIDEO_MODELS : AI_IMAGE_MODELS),
        [creationMode, remixType]
    );

    const workflowTemplateLibrary = useMemo(
        () =>
            STUDIO_TEMPLATE_LIBRARY.filter((template) => {
                const categoryMatches = templateCategoryFilter === "all" || template.category === templateCategoryFilter;
                if (!categoryMatches) return false;
                const query = templateSearchQuery.trim().toLowerCase();
                if (!query) return true;
                const haystack = `${template.name} ${template.description} ${template.category}`.toLowerCase();
                return haystack.includes(query);
            }),
        [templateCategoryFilter, templateSearchQuery]
    );

    const showImageUpload = isImageMode ? imgCfg!.supportsReferenceImage : (isVideoMode ? vidCfg!.supportsReferenceImage : false);
    const showVideoUpload = isVideoMode && vidCfg?.supportsReferenceVideo;
    const showPrompt = isVideoMode ? vidCfg!.supportsPrompt : true;

    const hasAspectRatio = creationMode === 'remix' || (isImageMode) || (isVideoMode && !!vidCfg?.aspectRatioOptions);

    let availableAspectRatios: string[] = [];
    if (isImageMode && imgCfg) {
        availableAspectRatios = imgCfg.sizeOptions;
    } else if (isVideoMode && vidCfg?.aspectRatioOptions) {
        availableAspectRatios = vidCfg.aspectRatioOptions;
    } else {
        availableAspectRatios = ["1:1", "4:3", "16:9", "9:16"];
    }

    const hasDuration = isVideoMode && (!!vidCfg?.durationOptions || !!vidCfg?.durationRange);
    const showResolution = (isImageMode && imgCfg?.supportsResolution) || (isVideoMode && vidCfg?.supportsResolution);
    const showSoundToggle = isVideoMode && vidCfg?.supportsSound;
    const showMultiShotsToggle = isVideoMode && vidCfg?.supportsMultiShots;
    const showFixedLensToggle = isVideoMode && vidCfg?.supportsFixedLens;
    const showGenAudioToggle = isVideoMode && vidCfg?.supportsGenerateAudio;
    const showPromptOptimizerToggle = isVideoMode && vidCfg?.supportsPromptOptimizer;
    const showStyleSelector = isVideoMode && vidCfg?.supportsStyle;
    const showStoryboardToggle = isVideoMode && vidCfg?.supportsStoryboard;
    const showNegativePrompt = isVideoMode && vidCfg?.supportsNegativePrompt;
    const showOutputFormat = isImageMode && imgCfg?.supportsOutputFormat;
    const showModeSelector = isVideoMode && vidCfg?.supportsMode;
    const showCharOrientationSelector = isVideoMode && vidCfg?.supportsCharacterOrientation;
    const showStartImage = isVideoMode && vidCfg?.supportsStartImage;
    const showEndImage = isVideoMode && vidCfg?.supportsEndImage;
    const showMask = isImageMode && imgCfg?.supportsMask && !!previewUrl;
    const showCameraMovement = isVideoMode && vidCfg?.supportsCameraMovement;
    const showEffectPreset = isVideoMode && vidCfg?.supportsEffectPreset;
    const showCharacterLock = isVideoMode && vidCfg?.supportsCharacterLock;
    const showAudioDirection = isVideoMode && vidCfg?.supportsAudioDirection && generateAudio;

    const resOptions = isImageMode ? imgCfg?.resolutionOptions : vidCfg?.resolutionOptions;

    let durationButtons: { value: number; label: string; disabled?: boolean }[] = [];
    if (vidCfg?.durationOptions) {
        durationButtons = vidCfg.durationOptions.map(d => {
            let disabled = false;
            if (vidCfg.durationConstraints && vidCfg.durationConstraints[resolution]) {
                disabled = !vidCfg.durationConstraints[resolution].includes(d.value);
            }
            return { ...d, disabled };
        });
    } else if (vidCfg?.durationRange) {
        for (let d = vidCfg.durationRange.min; d <= vidCfg.durationRange.max; d++) {
            durationButtons.push({ value: d, label: `${d}s` });
        }
    }

    const maxN = imgCfg?.maxN || 4;
    const modelSelectionMode: "image" | "video" =
        creationMode === "video" || (creationMode === "remix" && remixType === "video") ? "video" : "image";
    const currentTaskCredits = estimateTaskCredits({
        modelId: selectedModel.id,
        mode: creationMode as "image" | "video" | "remix",
        resolution,
        duration,
        imageCount,
        generateAudio,
    });

    useEffect(() => {
        if (directorVariations > maxN) {
            setDirectorVariations(maxN);
        }
    }, [directorVariations, maxN]);

    useEffect(() => {
        const syncMountNode = () => {
            setTemplateDeckMountNode(document.getElementById("studio-template-deck-slot"));
            setCharacterPacksMountNode(document.getElementById("studio-character-packs-slot"));
        };
        syncMountNode();
        const observer = new MutationObserver(syncMountNode);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    const templateDeckCard = (
        <div className="space-y-3 rounded-2xl border border-[#1d1d1d] bg-[#0f0f0f] p-4">
            <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-bold text-zinc-300 tracking-[0.15em] uppercase flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5" /> Template Deck
                </label>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={async () => copyTemplateLink(buildCurrentTemplateShareInput())}
                        className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-300 hover:bg-white/[0.06]"
                    >
                        <Link2 className="mr-1.5 h-3.5 w-3.5" />
                        Copy Link
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSaveCurrentTemplate}
                        className="h-8 rounded-lg border border-[#c5a44e]/20 bg-[#c5a44e]/10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a44e] hover:bg-[#c5a44e]/15"
                    >
                        Save Current
                    </Button>
                </div>
            </div>

            <Input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Name this setup for later reuse"
                className="h-10 rounded-xl border-[#222] bg-[#111] text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:border-[#c5a44e]/40 focus-visible:ring-[#c5a44e]/10"
            />

            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                <Input
                    value={templateSearchQuery}
                    onChange={(event) => setTemplateSearchQuery(event.target.value)}
                    placeholder="Search templates"
                    className="h-10 rounded-xl border-[#222] bg-[#111] pl-9 text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:border-[#c5a44e]/40 focus-visible:ring-[#c5a44e]/10"
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Workflow Templates</span>
                    <span className="text-[10px] text-zinc-600">{workflowTemplateLibrary.length} shown</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {([
                        { id: "all", label: "All" },
                        { id: "workflow", label: "Core" },
                        { id: "commerce", label: "Commerce" },
                        { id: "cinema", label: "Motion" },
                        { id: "style", label: "Style" },
                    ] as const).map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setTemplateCategoryFilter(option.id)}
                            className={cn(
                                "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                                templateCategoryFilter === option.id
                                    ? "border-[#c5a44e]/40 bg-[#c5a44e]/10 text-[#c5a44e]"
                                    : "border-[#2a2a2a] bg-[#121212] text-zinc-500 hover:text-zinc-200"
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {workflowTemplateLibrary.map((template) => (
                        <div
                            key={template.id}
                            className="flex items-start gap-2 rounded-xl border border-[#222] bg-[#111] px-3 py-3 transition-all hover:border-[#c5a44e]/35 hover:bg-[#151515]"
                        >
                            <button
                                type="button"
                                onClick={() => applyTemplateConfig(template)}
                                className="min-w-0 flex-1 text-left"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[12px] font-semibold text-zinc-200">{template.name}</p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{template.description}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <span className="rounded-full border border-zinc-600/40 bg-zinc-800/50 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-zinc-300">
                                            ~{estimateTaskCredits({
                                                modelId: template.model,
                                                mode: template.mode,
                                                resolution: template.resolution,
                                                duration: template.duration,
                                                imageCount: template.imageCount,
                                                generateAudio: template.generateAudio,
                                            })} cr
                                        </span>
                                        <span className="rounded-full border border-[#c5a44e]/25 bg-[#c5a44e]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[#c5a44e]">
                                            {template.category}
                                        </span>
                                    </div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => copyTemplateLink(template)}
                                className="rounded-lg border border-white/10 px-2 py-2 text-zinc-400 transition-colors hover:text-white"
                                title="Copy workflow link"
                            >
                                <Link2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                    {workflowTemplateLibrary.length === 0 && (
                        <div className="rounded-xl border border-dashed border-[#222] bg-[#111] px-3 py-4 text-[11px] leading-relaxed text-zinc-500">
                            No templates in this category yet.
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Saved Templates</span>
                    <span className="text-[10px] text-zinc-600">
                        {templatesLoading ? "Loading" : `${savedTemplates.length} saved`}
                    </span>
                </div>
                <div className="space-y-2">
                    {savedTemplates.slice(0, 4).map((template) => (
                        <div
                            key={template.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-[#222] bg-[#111] px-3 py-3"
                        >
                            <button
                                type="button"
                                onClick={() => applyTemplateConfig(template)}
                                className="min-w-0 flex-1 text-left"
                            >
                                <p className="truncate text-[12px] font-semibold text-zinc-200">{template.name}</p>
                                <p className="mt-1 text-[11px] text-zinc-500">
                                    {template.model} • {template.mode}
                                </p>
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => copyTemplateLink(template)}
                                    className="rounded-lg border border-white/10 px-2 py-2 text-zinc-400 transition-colors hover:text-white"
                                    title="Copy workflow link"
                                >
                                    <Link2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-white"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {!templatesLoading && savedTemplates.length === 0 && (
                        <div className="rounded-xl border border-dashed border-[#222] bg-[#111] px-3 py-4 text-[11px] leading-relaxed text-zinc-500">
                            Save any Studio configuration here and it becomes reusable for you across sessions. Shared workflow links will reopen Studio with the exact same setup.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const characterPacksCard = (
        <div className="space-y-3 rounded-2xl border border-[#1d1d1d] bg-[#0f0f0f] p-4">
            <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] font-bold text-zinc-300 tracking-[0.15em] uppercase flex items-center gap-2">
                    <Fingerprint className="w-3.5 h-3.5" /> Character Reference Packs
                </label>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleExtractCharacterReference}
                        disabled={isExtractingCharacter}
                        className="h-8 rounded-lg border border-[#c5a44e]/20 bg-[#c5a44e]/10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a44e] hover:bg-[#c5a44e]/15 disabled:opacity-60"
                    >
                        {isExtractingCharacter ? "Extracting..." : "Extract"}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSaveCharacterPack}
                        className="h-8 rounded-lg border border-[#c5a44e]/20 bg-[#c5a44e]/10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c5a44e] hover:bg-[#c5a44e]/15"
                    >
                        Save Pack
                    </Button>
                </div>
            </div>

            <Input
                value={characterPackName}
                onChange={(event) => setCharacterPackName(event.target.value)}
                placeholder="Name this character identity pack"
                className="h-10 rounded-xl border-[#222] bg-[#111] text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:border-[#c5a44e]/40 focus-visible:ring-[#c5a44e]/10"
            />
            <Textarea
                value={characterPackNotes}
                onChange={(event) => setCharacterPackNotes(event.target.value)}
                placeholder="Identity notes: facial shape, wardrobe, vibe, pose cues..."
                className="min-h-[78px] rounded-xl border-[#222] bg-[#111] text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:border-[#c5a44e]/40 focus-visible:ring-[#c5a44e]/10"
            />
            <p className="px-1 text-[11px] leading-relaxed text-zinc-500">
                Save the current reference image, start frame, remix source, or latest finished result as a reusable character anchor. Studio will reapply it with identity notes and character lock.
            </p>
            {(characterExtractionMessage || characterExtractionTaskId) && (
                <div className="rounded-xl border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                    {characterExtractionMessage && <p>{characterExtractionMessage}</p>}
                    {characterExtractionTaskId && <p className="mt-1 text-zinc-500">Task ID: {characterExtractionTaskId}</p>}
                </div>
            )}

            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Saved Packs</span>
                    <span className="text-[10px] text-zinc-600">
                        {characterPacksLoading ? "Loading" : `${characterPacks.length} saved`}
                    </span>
                </div>
                <div className="space-y-2">
                    {characterPacks.slice(0, 4).map((pack) => (
                        <div key={pack.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#222] bg-[#111] px-3 py-3">
                            <button
                                type="button"
                                onClick={() => applyCharacterPack(pack)}
                                className="min-w-0 flex-1 text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-[12px] font-semibold text-zinc-200">{pack.name}</p>
                                    {activeCharacterPackId === pack.id && (
                                        <span className="rounded-full border border-[#c5a44e]/25 bg-[#c5a44e]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[#c5a44e]">
                                            Active
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-[11px] text-zinc-500">
                                    {pack.sourceType} reference{pack.notes ? ` • ${pack.notes}` : ""}
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteCharacterPack(pack.id)}
                                className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-white"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                    {!characterPacksLoading && characterPacks.length === 0 && (
                        <div className="rounded-xl border border-dashed border-[#222] bg-[#111] px-3 py-4 text-[11px] leading-relaxed text-zinc-500">
                            Character packs turn one strong reference into a reusable identity system for future videos, remixes, and cinematic continuity passes.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );


    return (
        <>
        <div className="w-full h-full flex flex-col glass-card-gold relative z-20 text-zinc-100 overflow-hidden rounded-none border-0">

            {/* Scrollable form content */}
            <div className="flex-1 relative z-10 w-full min-h-0">
                <div
                    className="absolute inset-0 overflow-y-auto overflow-x-hidden studio-scrollbar touch-pan-y pointer-events-auto"
                    data-lenis-prevent="true"
                >
                    <div className="p-5 pb-12 flex flex-col gap-5 w-full">

                        {/* Model Selector */}
                        {(creationMode === 'image' || creationMode === 'video' || creationMode === 'remix' || creationMode === 'templates') && (
                            <div className="space-y-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <div className="w-full h-11 px-3 bg-[#111] hover:bg-[#161616] rounded-lg border border-[#222] hover:border-[#333] transition-all duration-200 cursor-pointer flex items-center justify-between group">
                                            <div className="flex flex-1 items-center justify-between">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-6 h-6 rounded-md bg-[#c5a44e]/10 border border-[#c5a44e]/20 flex items-center justify-center shrink-0">
                                                        {creationMode === 'video' ? <Video className="w-3.5 h-3.5 text-[#c5a44e]" /> : <Sparkles className="w-3.5 h-3.5 text-[#c5a44e]" />}
                                                    </div>
                                                    <span className="text-sm font-medium text-zinc-200 truncate">{selectedModel.name}</span>
                                                    {selectedModel.isNew && (
                                                        <span className="text-[10px] bg-[#c5a44e] text-black px-1.5 py-0.5 rounded font-bold">NEW</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-all group-hover:translate-y-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" sideOffset={8} className="z-[9999] w-[340px] max-w-[calc(100vw-64px)] bg-[#0f0f0f] border border-[#222] shadow-[0_30px_60px_rgba(0,0,0,0.9)] rounded-xl p-0 overflow-hidden">
                                        <div
                                            className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar pointer-events-auto"
                                            onWheel={(e) => e.stopPropagation()}
                                            onTouchMove={(e) => e.stopPropagation()}
                                        >
                                            <div className="space-y-0.5">
                                                {activeModelPool.map((model) => {
                                                    const modelCredits = estimateTaskCredits({
                                                        modelId: model.id,
                                                        mode: modelSelectionMode,
                                                        resolution,
                                                        duration,
                                                        imageCount,
                                                        generateAudio,
                                                    });
                                                    return (
                                                        <DropdownMenuItem
                                                            key={model.id}
                                                            onClick={() => setSelectedModel(model)}
                                                            className="hover:bg-white/[0.05] focus:bg-white/[0.05] cursor-pointer flex items-center justify-between p-3 rounded-xl transition-all group"
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-[#c5a44e] transition-colors" />
                                                                    <span className={cn("text-[13px] font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors truncate")}>{model.name}</span>
                                                                </div>
                                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                                    {modelCredits > 0 && (
                                                                        <span className="bg-zinc-800/80 text-zinc-300 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md border border-zinc-700">
                                                                            ~{modelCredits} cr
                                                                        </span>
                                                                    )}
                                                                    {model.isNew && <span className="bg-[#c5a44e]/10 text-[#c5a44e] text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border border-[#c5a44e]/20">New</span>}
                                                                </div>
                                                            </div>
                                                        </DropdownMenuItem>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {currentTaskCredits > 0 && (
                                    <div className="px-1">
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c5a44e]/30 bg-[#c5a44e]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c5a44e]">
                                            Est. task credits: {currentTaskCredits}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-4 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {!templateDeckMountNode && templateDeckCard}
                            {!characterPacksMountNode && characterPacksCard}
                        </div>

                        {}
                        {showPrompt && (
                            <div className="space-y-2.5 shrink-0">
                                <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2"><Wand2 className="w-3.5 h-3.5 text-zinc-600" /> Directives</div>
                                    {showImageUpload && (
                                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/5 shadow-sm hover:shadow-md">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">Attach</span>
                                        </button>
                                    )}
                                </label>
                                <div className="bg-[#111] rounded-xl border border-[#222] focus-within:border-[#c5a44e]/40 focus-within:shadow-[0_0_0_2px_rgba(197,164,78,0.1)] transition-all duration-300 overflow-hidden flex flex-col group relative">
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Direct your artistic vision..."
                                        className="resize-none min-h-[110px] lg:min-h-[100px] bg-transparent border-none text-white placeholder:text-zinc-700 focus-visible:ring-0 px-5 py-5 text-[14px] lg:text-[13px] font-medium leading-[1.6] tracking-wide"
                                    />

                                    {showImageUpload && previewUrl && (
                                        <div className="px-5 pb-5 pt-2 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="relative group/preview shadow-[0_12px_30px_rgba(0,0,0,0.6)]">
                                                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl transform transition-transform group-hover/preview:scale-105 active:scale-95 duration-500 bg-black">
                                                    {(sourceFile?.type.startsWith('video/') || (previewUrl.includes('.mp4') && !sourceFile)) ? (
                                                        <video src={previewUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                                                    ) : (
                                                        <img src={previewUrl} alt="Source Media" className="object-cover w-full h-full" />
                                                    )}
                                                    
                                                    {}
                                                    {sourceFile && (
                                                        <div className="absolute inset-0 bg-[#c5a44e]/20 backdrop-blur-[2px] flex items-center justify-center animate-pulse">
                                                            <Sparkles className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}

                                                    <button 
                                                        onClick={(e) => { 
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setPreviewUrl(""); 
                                                            setSourceFile(null); 
                                                            setCreationId(""); 
                                                        }} 
                                                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity backdrop-blur-sm"
                                                    >
                                                        <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-lg">Remove</span>
                                                    </button>
                                                </div>
                                                <div className="absolute -bottom-2 -right-2 bg-[#c5a44e] text-black p-1.5 rounded-full shadow-lg border border-[#c5a44e]/40 z-10">
                                                    <Wand2 className="w-3 h-3" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            setPreviewUrl(URL.createObjectURL(file));
                                            setSourceFile(file);
                                            setCreationId("");
                                            e.target.value = ''; 
                                        }
                                    }} />
                                </div>
                            </div>
                        )}

                        {}
                        <div className="space-y-2.5 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2 px-1">
                                <Sparkles className="w-3.5 h-3.5 text-zinc-600" /> Director Mode
                            </label>
                            <div className="rounded-xl border border-[#222] bg-[#111] p-4 space-y-4">
                                <button
                                    onClick={() => setDirectorModeEnabled((prev) => !prev)}
                                    className="w-full flex items-center justify-between rounded-xl border border-[#222] bg-[#0e0e0e] px-3 py-2.5 hover:border-[#333] transition-colors"
                                >
                                    <div className="text-left">
                                        <p className="text-[12px] font-semibold text-zinc-100">Campaign Director</p>
                                        <p className="text-[10px] text-zinc-500">Guides generation + export pack strategy</p>
                                    </div>
                                    <div className={cn("w-10 h-5.5 rounded-full transition-all duration-300 relative", directorModeEnabled ? "bg-[#c5a44e]" : "bg-zinc-700")}>
                                        <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-xl", directorModeEnabled ? "left-[19px]" : "left-[3px]")} />
                                    </div>
                                </button>

                                {directorModeEnabled && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                value={directorGoal}
                                                onChange={(event) => setDirectorGoal(event.target.value)}
                                                placeholder="Goal (e.g. launch teaser)"
                                                className="h-11 rounded-xl border border-[#222] bg-[#0e0e0e] px-3 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#c5a44e]/40"
                                            />
                                            <input
                                                value={directorPlatform}
                                                onChange={(event) => setDirectorPlatform(event.target.value)}
                                                placeholder="Primary platform"
                                                className="h-11 rounded-xl border border-[#222] bg-[#0e0e0e] px-3 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#c5a44e]/40"
                                            />
                                        </div>
                                        <input
                                            value={directorStyle}
                                            onChange={(event) => setDirectorStyle(event.target.value)}
                                            placeholder="Style direction"
                                            className="h-11 w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-3 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#c5a44e]/40"
                                        />
                                        <textarea
                                            value={directorBrief}
                                            onChange={(event) => setDirectorBrief(event.target.value)}
                                            placeholder="Campaign brief (optional)"
                                            className="min-h-[74px] w-full rounded-xl border border-[#222] bg-[#0e0e0e] px-3 py-2.5 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#c5a44e]/40 resize-none"
                                        />

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-[0.16em]">
                                                <span>Director Variations</span>
                                                <span className="text-zinc-300">{directorVariations}</span>
                                            </div>
                                            <Slider
                                                min={1}
                                                max={8}
                                                step={1}
                                                value={[directorVariations]}
                                                onValueChange={(value) => setDirectorVariations(value[0] || 1)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.16em]">Export Presets</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {EXPORT_PACK_PRESETS.map((preset) => {
                                                    const isActive = directorPresetIds.includes(preset.id)
                                                    return (
                                                        <button
                                                            key={preset.id}
                                                            onClick={() =>
                                                                setDirectorPresetIds((prev) =>
                                                                    prev.includes(preset.id)
                                                                        ? prev.filter((id) => id !== preset.id)
                                                                        : [...prev, preset.id]
                                                                )
                                                            }
                                                            className={cn(
                                                                "rounded-xl border px-2.5 py-2 text-left transition-colors",
                                                                isActive
                                                                    ? "border-[#c5a44e]/40 bg-[#c5a44e]/10 text-[#c5a44e]"
                                                                    : "border-[#222] bg-[#0e0e0e] text-zinc-300 hover:border-[#333]"
                                                            )}
                                                        >
                                                            <p className="text-[11px] font-semibold leading-tight">{preset.label}</p>
                                                            <p className="mt-0.5 text-[10px] text-zinc-500">{preset.width}x{preset.height}</p>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setAutoExportPack((prev) => !prev)}
                                            className="w-full flex items-center justify-between rounded-xl border border-[#222] bg-[#0e0e0e] px-3 py-2.5 hover:border-[#333] transition-colors"
                                        >
                                            <div className="text-left">
                                                <p className="text-[12px] font-semibold text-zinc-100">Auto Export Pack</p>
                                                <p className="text-[10px] text-zinc-500">Open export pack immediately after completion</p>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-300 relative", autoExportPack ? "bg-[#c5a44e]" : "bg-zinc-700")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-xl", autoExportPack ? "left-[19px]" : "left-[3px]")} />
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {}
                        {hasAspectRatio && (
                            <div className="space-y-2.5 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2 px-1">
                                    <Frame className="w-3.5 h-3.5 text-zinc-600" /> Framing
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {availableAspectRatios.map((ratio) => (
                                        <button
                                            key={ratio}
                                            onClick={() => setAspectRatio(ratio)}
                                            className={cn(
                                                "py-3 rounded-[12px] text-[12px] font-semibold transition-all duration-300 border flex items-center justify-center",
                                                aspectRatio === ratio
                                                    ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40"
                                                    : "bg-white/[0.02] text-zinc-500 border-[#222] hover:bg-white/[0.04] hover:text-zinc-300 hover:border-[#333]"
                                            )}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {}
                        {(hasDuration || showResolution || isMultiOutputImage || showSoundToggle || showMultiShotsToggle || showFixedLensToggle || showGenAudioToggle || showPromptOptimizerToggle || showStyleSelector || showStoryboardToggle || showNegativePrompt || showOutputFormat || showModeSelector || showCharOrientationSelector || showStartImage || showEndImage || showVideoUpload || showCameraMovement || showEffectPreset || showCharacterLock || showAudioDirection) && (
                            <div className="space-y-2.5 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2 px-1">
                                    <Settings2 className="w-3.5 h-3.5 text-zinc-600" /> Advanced Settings
                                </label>
                                <div className="flex flex-col gap-2">
                                    {(creationMode === "image" || creationMode === "remix") && (
                                        <div className={cn("flex flex-col gap-3 rounded-xl p-4 border transition-colors", supportsMultiOutput ? "bg-[#111] border-[#222] hover:border-[#333]" : "bg-[#0e0e0e] border-[#1a1a1a]")}>
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Image Count {maxN > 4 && <span className="text-zinc-600">({imageCount})</span>}</span>
                                            {maxN <= 4 ? (
                                                <div className="flex gap-2">
                                                    {Array.from({ length: maxN }, (_, i) => i + 1).map(n => {
                                                        const isDisabled = !supportsMultiOutput && n > 1;
                                                        return (
                                                            <button key={n} disabled={isDisabled} onClick={() => setImageCount(n)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border", imageCount === n ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : isDisabled ? "bg-white/[0.01] text-zinc-700 border-white/[0.02] cursor-not-allowed" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>{n}</button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <input type="range" min="1" max={maxN} value={imageCount} onChange={(e) => setImageCount(parseInt(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ background: `linear-gradient(to right, #c5a44e ${((imageCount - 1) / (maxN - 1)) * 100}%, rgba(0,0,0,0.5) ${((imageCount - 1) / (maxN - 1)) * 100}%)` }} />
                                            )}
                                        </div>
                                    )}

                                    {showResolution && resOptions && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Quality (Resolution)</span>
                                            <div className="flex gap-2">
                                                {resOptions.map(r => (
                                                    <button key={r.value} onClick={() => setResolution(r.value)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border", resolution === r.value ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
                                                        {r.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showOutputFormat && imgCfg?.outputFormatOptions && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Output Format</span>
                                            <div className="flex gap-2">
                                                {imgCfg.outputFormatOptions.map(fmt => (
                                                    <button key={fmt} onClick={() => setOutputFormat(fmt)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border uppercase", outputFormat === fmt ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
                                                        {fmt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {hasDuration && durationButtons.length > 0 && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-3 hover:border-[#333] transition-colors">
                                            <span className="text-[11px] font-semibold text-zinc-400">Duration {vidCfg?.durationRange && <span className="text-zinc-600">({duration}s)</span>}</span>
                                            {vidCfg?.durationRange ? (
                                                <input type="range" min={vidCfg.durationRange.min} max={vidCfg.durationRange.max} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ background: `linear-gradient(to right, #c5a44e ${((duration - vidCfg.durationRange.min) / (vidCfg.durationRange.max - vidCfg.durationRange.min)) * 100}%, rgba(0,0,0,0.5) ${((duration - vidCfg.durationRange.min) / (vidCfg.durationRange.max - vidCfg.durationRange.min)) * 100}%)` }} />
                                            ) : (
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {durationButtons.map(d => (
                                                        <button key={d.value} disabled={d.disabled} onClick={() => setDuration(d.value)} className={cn("px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all border", duration === d.value ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : d.disabled ? "bg-white/[0.01] text-zinc-700 border-white/[0.02] cursor-not-allowed opacity-40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
                                                            {d.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {showStyleSelector && vidCfg?.styleOptions && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Style</span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {vidCfg.styleOptions.map(s => (
                                                    <button key={s} onClick={() => setVideoStyle(s)} className={cn("px-3 py-2 rounded-xl text-[11px] font-bold transition-all border capitalize", videoStyle === s ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showCameraMovement && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Camera Movement</span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {(isHailuo23Model(selectedModel.id) ? HAILUO_23_CAMERA_LABELS : CINEMA_CAMERA_MOVES).map(movement => (
                                                    <button key={movement} onClick={() => setCameraMovement(movement)} className={cn("px-3 py-2 rounded-xl text-[11px] font-bold transition-all border capitalize", cameraMovement === movement ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
                                                        {movement}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showEffectPreset && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Effect Preset</span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {WAN_EFFECT_PRESETS.map(effect => (
                                                    <button key={effect} onClick={() => setEffectPreset(effect)} className={cn("px-3 py-2 rounded-xl text-[11px] font-bold transition-all border capitalize", effectPreset === effect ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
                                                        {effect}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showModeSelector && vidCfg?.modeOptions && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Mode</span>
                                            <div className="flex gap-2">
                                                {vidCfg.modeOptions.map(m => (
                                                    <button key={m} onClick={() => setVideoMode(m)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border capitalize", videoMode === m ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showCharOrientationSelector && vidCfg?.characterOrientationOptions && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Character Orientation</span>
                                            <div className="flex gap-2">
                                                {vidCfg.characterOrientationOptions.map(o => (
                                                    <button key={o} onClick={() => setCharacterOrientation(o)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border capitalize", characterOrientation === o ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
                                                        {o}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showCharacterLock && (
                                        <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-xl p-4 cursor-pointer hover:border-[#333] transition-all duration-300 group/item" onClick={() => setCharacterLock(!characterLock)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Character Lock</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Preserve subject identity, wardrobe, and silhouette continuity.</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", characterLock ? "bg-[#c5a44e]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", characterLock ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showSoundToggle && (
                                        <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-xl p-4 cursor-pointer hover:border-[#333] transition-all duration-300 group/item" onClick={() => { if (!(multiShots && vidCfg?.supportsMultiShots)) setSoundEnabled(!soundEnabled); }}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Audio Synthesis</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">{multiShots ? "Required for multi-shots" : "Generate matching soundscape"}</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", soundEnabled ? "bg-[#c5a44e]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", soundEnabled ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showMultiShotsToggle && (
                                        <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-xl p-4 cursor-pointer hover:border-[#333] transition-all duration-300 group/item" onClick={() => setMultiShots(!multiShots)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Multi-Shots</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Dynamic camera cuts & shifts</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", multiShots ? "bg-[#c5a44e]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", multiShots ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showFixedLensToggle && (
                                        <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-xl p-4 cursor-pointer hover:border-[#333] transition-all duration-300 group/item" onClick={() => setFixedLens(!fixedLens)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Fixed Lens</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Maintain consistent focal length</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", fixedLens ? "bg-[#c5a44e]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", fixedLens ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showGenAudioToggle && (
                                        <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-xl p-4 cursor-pointer hover:border-[#333] transition-all duration-300 group/item" onClick={() => setGenerateAudio(!generateAudio)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Audio Synthesis</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">AI generated foley & sound</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", generateAudio ? "bg-[#c5a44e]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", generateAudio ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showAudioDirection && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Audio Direction</span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {AUDIO_DIRECTION_PRESETS.map(direction => (
                                                    <button key={direction} onClick={() => setAudioDirection(direction)} className={cn("px-3 py-2 rounded-xl text-[11px] font-bold transition-all border capitalize", audioDirection === direction ? "bg-[#c5a44e]/15 text-[#c5a44e] border-[#c5a44e]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
                                                        {direction}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showStoryboardToggle && (
                                        <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-xl p-4 cursor-pointer hover:border-[#333] transition-all duration-300 group/item" onClick={() => setStoryboard(!storyboard)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Storyboard</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Enable storyboard mode</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", storyboard ? "bg-[#c5a44e]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", storyboard ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showPromptOptimizerToggle && (
                                        <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-xl p-4 cursor-pointer hover:border-[#333] transition-all duration-300 group/item" onClick={() => setPromptOptimizer(!promptOptimizer)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Prompt Optimizer</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Auto-enhance vision description</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", promptOptimizer ? "bg-[#c5a44e]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", promptOptimizer ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showNegativePrompt && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Negative Prompt</span>
                                            <Textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="Elements to avoid..." className="resize-none min-h-[60px] bg-[#0e0e0e] border border-[#222] text-white placeholder:text-zinc-700 focus-visible:ring-0 focus:border-[#c5a44e]/40 px-4 py-3 text-[13px] font-medium rounded-xl" />
                                        </div>
                                    )}

                                    {creationMode === 'remix' && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 group/strength">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-black text-[#c5a44e] uppercase tracking-[0.15em]">Remix Strength</span>
                                                    <span className="text-[9px] text-zinc-600 font-bold italic tracking-wide">Creative deviation vs preservation</span>
                                                </div>
                                                <span className="text-[13px] font-black tabular-nums text-white bg-white/5 px-2.5 py-1 rounded-lg border border-[#222] group-hover/strength:border-[#c5a44e]/30 transition-all duration-500">{remixStrength}%</span>
                                            </div>
                                            <Slider
                                                value={[remixStrength]}
                                                onValueChange={(v) => setRemixStrength(v[0])}
                                                max={100}
                                                min={0}
                                                step={1}
                                                className="py-2"
                                            />
                                            <div className="flex justify-between px-1 text-[8px] font-black uppercase tracking-widest text-zinc-700 italic">
                                                <span>Subtle</span>
                                                <span>Balanced</span>
                                                <span>Vivid</span>
                                            </div>
                                        </div>
                                    )}

                                    {showVideoUpload && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Reference Video {vidCfg?.requiresReferenceVideo && <span className="text-red-400">*</span>}</span>
                                            {sourceVideoPreview ? (
                                                <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10">
                                                    <video src={sourceVideoPreview} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                                    <button onClick={() => { setSourceVideo(null); setSourceVideoPreview(""); if (videoInputRef.current) videoInputRef.current.value = ""; }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg">Remove</span></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => videoInputRef.current?.click()} className="w-full h-16 rounded-xl border border-dashed border-[#333] hover:border-[#c5a44e]/40 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all">
                                                    <Upload className="w-4 h-4" /><span className="text-[11px] font-bold uppercase tracking-wider">Upload Video</span>
                                                </button>
                                            )}
                                            <input ref={videoInputRef} type="file" className="hidden" accept="video/*" onChange={(e) => { if (e.target.files?.[0]) { setSourceVideo(e.target.files[0]); setSourceVideoPreview(URL.createObjectURL(e.target.files[0])); } }} />
                                        </div>
                                    )}

                                    {showStartImage && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Start Frame Image</span>
                                            {startImagePreview ? (
                                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                                    <img src={startImagePreview} alt="Start frame" className="w-full h-full object-cover" />
                                                    <button onClick={() => { setStartImageFile(null); setStartImagePreview(""); if (startImageRef.current) startImageRef.current.value = ""; }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><X className="w-4 h-4 text-white" /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => startImageRef.current?.click()} className="w-full h-14 rounded-xl border border-dashed border-[#333] hover:border-[#c5a44e]/40 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all">
                                                    <Upload className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-wider">Upload Start Frame</span>
                                                </button>
                                            )}
                                            <input ref={startImageRef} type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { setStartImageFile(e.target.files[0]); setStartImagePreview(URL.createObjectURL(e.target.files[0])); } }} />
                                        </div>
                                    )}

                                    {showEndImage && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">End Frame Image</span>
                                            {endImagePreview ? (
                                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                                    <img src={endImagePreview} alt="End frame" className="w-full h-full object-cover" />
                                                    <button onClick={() => { setEndImageFile(null); setEndImagePreview(""); if (endImageRef.current) endImageRef.current.value = ""; }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><X className="w-4 h-4 text-white" /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => endImageRef.current?.click()} className="w-full h-14 rounded-xl border border-dashed border-[#333] hover:border-[#c5a44e]/40 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all">
                                                    <Upload className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-wider">Upload End Frame</span>
                                                </button>
                                            )}
                                            <input ref={endImageRef} type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { setEndImageFile(e.target.files[0]); setEndImagePreview(URL.createObjectURL(e.target.files[0])); } }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {}
            <div className="flex-none p-5 pt-1 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-30 flex gap-3">
                {isGenerating && onCancel && (
                    <Button
                        onClick={onCancel}
                        variant="destructive"
                        className="w-14 h-[52px] rounded-xl flex items-center justify-center bg-red-500/5 hover:bg-red-500/15 text-red-500 border border-red-500/15 shadow-none transition-all duration-300 active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                )}
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className={cn(
                        "flex-1 h-[52px] rounded-xl text-[13px] font-bold tracking-[0.1em] uppercase transition-all duration-300 group relative overflow-hidden",
                        isGenerating || !prompt
                            ? "bg-[#111] text-zinc-600 cursor-not-allowed border border-[#222]"
                            : "btn-gold hover:shadow-[0_0_20px_rgba(197,164,78,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    )}
                >
                    {isGenerating ? (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c5a44e]/10 rounded-full border border-[#c5a44e]/20 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 text-[#c5a44e] animate-spin" />
                                <span className="text-[10px] font-black text-[#c5a44e] uppercase tracking-widest">Generating</span>
                            </div>
                        </div>
                    ) : (
                        <span className="flex items-center justify-center gap-2.5 relative z-10">
                            <Sparkles className={cn("w-4 h-4 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110", isGenerating || !prompt ? "opacity-50" : "text-black")} />
                            <span className="relative top-[0.5px]">Generate</span>
                        </span>
                    )}
                </Button>
            </div>
        </div>
        {characterPacksMountNode ? createPortal(characterPacksCard, characterPacksMountNode) : null}
        {templateDeckMountNode ? createPortal(templateDeckCard, templateDeckMountNode) : null}
        </>
    );
}
