"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
    ChevronRight,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { AnimatePresence, motion } from "framer-motion";
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
import { validateModelParams, MODEL_CAPABILITIES } from "@/lib/model-capabilities";
import { useAuth } from "@/context/auth-context";
import { fetchClawState } from "@/lib/claw-state";
import { toast } from "sonner";
import Link from "next/link";
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
    getSessionProviderHealth,
    mergeProviderHealth,
    type ProviderHealthSnapshot,
} from "@/lib/provider-health";
import type { StudioMode } from "@/components/studio/sidebar";
import type { GenerationItem } from "@/components/studio/center-canvas";

interface StudioLeftPanelProps {
    onGenerate: (prompt: string, settings: any) => void;
    onCancel?: () => void;
    isGenerating: boolean;
    /**
     * Transient flag true only during the synchronous submit phase of a new
     * job (uploads + POST). Button is gated on this — NOT on `isGenerating`
     * — so users can stack concurrent generations while older jobs poll.
     */
    isSubmitting?: boolean;
    mode?: "image" | "video" | "remix" | string;
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
    studioMode?: StudioMode;
    activeGeneration?: GenerationItem | null;
    externalPrompt?: string;
    mobileInlineCanvas?: React.ReactNode;
    canvasOpen?: boolean;
    onCloseCanvas?: () => void;
    onOpenCanvas?: () => void;
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

export function StudioLeftPanel({ onGenerate, onCancel, isGenerating, isSubmitting = false, mode: initialMode, aspectRatio, setAspectRatio, studioMode, activeGeneration, externalPrompt, mobileInlineCanvas, canvasOpen, onCloseCanvas, onOpenCanvas }: StudioLeftPanelProps) {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [creditBalance, setCreditBalance] = useState<number>(0);
    const [balanceReady, setBalanceReady] = useState<boolean>(false);
    const [showInsufficient, setShowInsufficient] = useState<boolean>(false);

    const urlMode = searchParams?.get("mode")?.toLowerCase() || initialMode || "image";
    const urlPrompt = searchParams?.get("prompt") || "";
    const urlPreview = searchParams?.get("previewUrl") || "";
    const urlRemixType = searchParams?.get("remixType")?.toLowerCase() || "image";
    const urlTaskId = searchParams?.get("taskId") || "";
    const urlGenerationPlatform = searchParams?.get("generationPlatform") || "";

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
    useEffect(() => {
        if (externalPrompt) setPrompt(externalPrompt);
    }, [externalPrompt]);
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
    const [liveProviderHealth, setLiveProviderHealth] = useState<ProviderHealthSnapshot | null>(null);
    const [cameraMovement, setCameraMovement] = useState<string>("none");
    const [effectPreset, setEffectPreset] = useState<string>("none");
    const [audioDirection, setAudioDirection] = useState<string>("none");
    const [characterLock, setCharacterLock] = useState<boolean>(false);

    const hasCharacterReferenceContext = Boolean(
        sourceFile || startImageFile || sourceVideo || sourceVideoPreview || previewUrl
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
            case "remix":
                if (creationMode !== "remix") handleModeSwitch("remix");
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
        } else if (newMode === 'image' || (newMode === 'remix' && remixType === 'image')) {
            setSelectedModel(AI_IMAGE_MODELS[0]);
        }
    };

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

    useEffect(() => {
        let cancelled = false;
        if (!user) {
            setCreditBalance(0);
            setBalanceReady(false);
            return;
        }
        const load = () => {
            user.getIdToken()
                .then((idToken) => fetchClawState(idToken))
                .then((state) => {
                    if (cancelled) return;
                    setCreditBalance(state.creditBalance ?? 0);
                    setBalanceReady(true);
                })
                .catch(() => {});
        };
        load();
        const id = setInterval(load, 15000);
        return () => { cancelled = true; clearInterval(id); };
    }, [user]);

    const handleGenerate = () => {
        const taskCredits = estimateTaskCredits({
            modelId: selectedModel.id,
            mode: creationMode as "image" | "video" | "remix",
            resolution,
            duration,
            imageCount,
            generateAudio,
        });
        if (balanceReady && taskCredits > 0 && taskCredits > creditBalance) {
            setShowInsufficient(true);
            return;
        }
        let parameters: any = {};
        const previewLooksVideo =
            remixType === "video" ||
            previewUrl.toLowerCase().includes(".mp4") ||
            previewUrl.toLowerCase().includes(".webm") ||
            previewUrl.toLowerCase().includes(".mov");
        const validation = validateStudioExecution({
            mode: creationMode as "image" | "video" | "remix",
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

        const effectivePrompt = applyStudioPromptEnhancements({
            prompt,
            model: selectedModel.id,
            cameraMovement,
            effectPreset,
            audioDirection: generateAudio ? audioDirection : undefined,
            characterLock,
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

        if (creationMode === "image" && cfg?.type === "image") {
            const ic = cfg as ImageModelConfig;
            parameters.prompt = effectivePrompt;
            parameters.size = aspectRatio;
            if (ic.supportsN) {
                parameters.n = imageCount;
            }
            if (ic.supportsResolution) parameters.resolution = resolution;
            if (ic.supportsOutputFormat) parameters.output_format = outputFormat;
        }
        else if (creationMode === "remix") {
            parameters.n = imageCount;
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
        else if (creationMode === "video" && cfg?.type === "video") {
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

        const modelValidation = validateModelParams(
            selectedModel.id,
            {
                aspect_ratio: typeof parameters.aspect_ratio === "string" ? parameters.aspect_ratio : aspectRatio,
                resolution: typeof parameters.resolution === "string" ? parameters.resolution : resolution,
                duration: typeof parameters.duration === "number" ? parameters.duration : undefined,
                n: typeof parameters.n === "number" ? parameters.n : undefined,
                last_frame_image: parameters.end_image_file ? "present" : undefined,
                mask_url: typeof parameters.mask_url === "string" ? parameters.mask_url : undefined,
                kling_elements: parameters.kling_elements,
                template: typeof parameters.template === "string" ? parameters.template : undefined,
                camera_movement: typeof parameters.camera_movement === "string" ? parameters.camera_movement : undefined,
                generation_type: typeof parameters.generation_type === "string" ? parameters.generation_type : undefined,
            },
            {
                hasReferenceImage: Boolean(sourceFile || startImageFile || (previewUrl && !previewLooksVideo)),
                hasReferenceVideo: Boolean(sourceVideo || sourceVideoPreview || (previewUrl && previewLooksVideo)),
            },
        );
        if (!modelValidation.ok) {
            toast.error(modelValidation.errors[0]);
            return;
        }
        if (modelValidation.warnings.length > 0) {
            toast.warning(modelValidation.warnings[0]);
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

        onGenerate(effectivePrompt, {
            mode: creationMode,
            creationMode,
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
            originalPrompt: prompt,
            sourceFile: sourceFile || undefined,
            sourceVideo: sourceVideo || undefined,
            aspectRatio,
            cameraMovement: cameraMovement !== "none" ? cameraMovement : undefined,
            effectPreset: effectPreset !== "none" ? effectPreset : undefined,
            audioDirection: generateAudio && audioDirection !== "none" ? audioDirection : undefined,
            characterLock: characterLock || undefined,
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

    const basePool = useMemo(
        () => (creationMode === "video" || (creationMode === "remix" && remixType === "video") ? AI_VIDEO_MODELS : AI_IMAGE_MODELS),
        [creationMode, remixType]
    );

    const requiresInputImage = studioMode === "image-to-image" || studioMode === "image-to-video" || studioMode === "remix";

    const activeModelPool = useMemo(() => {
        if (studioMode === "image-to-image" || studioMode === "image-to-video") {
            return basePool.filter((m) => MODEL_CAPABILITIES[m.id]?.requiresReferenceImage === true);
        }
        if (studioMode === "text-to-image" || studioMode === "text-to-video") {
            return basePool.filter((m) => MODEL_CAPABILITIES[m.id]?.requiresReferenceImage !== true);
        }
        return basePool;
    }, [basePool, studioMode]);

    useEffect(() => {
        if (activeModelPool.length === 0) return;
        const stillValid = activeModelPool.some((m) => m.id === selectedModel.id);
        if (!stillValid) setSelectedModel(activeModelPool[0]);
    }, [activeModelPool, selectedModel.id]);

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
                        {(creationMode === 'image' || creationMode === 'video' || creationMode === 'remix') && (
                            <div className="space-y-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">

                                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <div className="w-full h-11 px-3 bg-[#111] hover:bg-[#161616] rounded-lg border border-[#222] hover:border-[#333] transition-all duration-200 cursor-pointer flex items-center justify-between group">
                                            <div className="flex flex-1 items-center justify-between">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-6 h-6 rounded-md bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center shrink-0">
                                                        {creationMode === 'video' ? <Video className="w-3.5 h-3.5 text-[#06b6d4]" /> : <Sparkles className="w-3.5 h-3.5 text-[#06b6d4]" />}
                                                    </div>
                                                    <span className="text-sm font-medium text-zinc-200 truncate">{selectedModel.name}</span>
                                                    {selectedModel.isNew && (
                                                        <span className="text-[10px] bg-[#06b6d4] text-black px-1.5 py-0.5 rounded font-bold">NEW</span>
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
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-[#06b6d4] transition-colors" />
                                                                    <span className={cn("text-[13px] font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors truncate")}>{model.name}</span>
                                                                </div>
                                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                                    {modelCredits > 0 && (
                                                                        <span className="bg-zinc-800/80 text-zinc-300 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md border border-zinc-700">
                                                                            ~{modelCredits} cr
                                                                        </span>
                                                                    )}
                                                                    {model.isNew && <span className="bg-[#06b6d4]/10 text-[#06b6d4] text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border border-[#06b6d4]/20">New</span>}
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
                                    <div className="px-1 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#06b6d4]/30 bg-[#06b6d4]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#06b6d4]">
                                            Est. task credits: {currentTaskCredits}
                                        </span>
                                        {balanceReady && (
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                                currentTaskCredits > creditBalance
                                                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                                                    : "border-zinc-700 bg-zinc-800/60 text-zinc-300"
                                            )}>
                                                Balance: {creditBalance}
                                            </span>
                                        )}
                                        {balanceReady && currentTaskCredits > creditBalance && (
                                            <Link
                                                href="/pricing#top-up"
                                                className="inline-flex items-center gap-1.5 rounded-full border border-[#06b6d4]/40 bg-[#06b6d4]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#06b6d4] hover:bg-[#06b6d4]/25"
                                            >
                                                Top up →
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

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
                                <div className="bg-[#111] rounded-xl border border-[#222] focus-within:border-[#06b6d4]/40 focus-within:shadow-[0_0_0_2px_rgba(6,182,212,0.1)] transition-all duration-300 overflow-hidden flex flex-col group relative">
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                                e.preventDefault();
                                                handleGenerate();
                                            }
                                        }}
                                        placeholder="Direct your artistic vision..."
                                        className="resize-none min-h-[140px] lg:min-h-[150px] bg-transparent border-none text-white placeholder:text-zinc-700 focus-visible:ring-0 px-5 py-5 text-[14px] lg:text-[13px] font-medium leading-[1.6] tracking-wide"
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
                                                        <div className="absolute inset-0 bg-[#06b6d4]/20 backdrop-blur-[2px] flex items-center justify-center animate-pulse">
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
                                                <div className="absolute -bottom-2 -right-2 bg-[#06b6d4] text-black p-1.5 rounded-full shadow-lg border border-[#06b6d4]/40 z-10">
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
                                                    ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40"
                                                    : "bg-white/[0.02] text-zinc-500 border-[#222] hover:bg-white/[0.04] hover:text-zinc-300 hover:border-[#333]"
                                            )}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(hasDuration || showResolution || isMultiOutputImage || showSoundToggle || showMultiShotsToggle || showFixedLensToggle || showGenAudioToggle || showPromptOptimizerToggle || showStyleSelector || showStoryboardToggle || showNegativePrompt || showOutputFormat || showModeSelector || showCharOrientationSelector || showStartImage || showEndImage || showVideoUpload || showCameraMovement || showEffectPreset || showCharacterLock || showAudioDirection) && (
                            <div className="space-y-2.5 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2 px-1">
                                    <Settings2 className="w-3.5 h-3.5 text-zinc-600" /> Settings
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
                                                            <button key={n} disabled={isDisabled} onClick={() => setImageCount(n)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border", imageCount === n ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : isDisabled ? "bg-white/[0.01] text-zinc-700 border-white/[0.02] cursor-not-allowed" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>{n}</button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <input type="range" min="1" max={maxN} value={imageCount} onChange={(e) => setImageCount(parseInt(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ background: `linear-gradient(to right, #06b6d4 ${((imageCount - 1) / (maxN - 1)) * 100}%, rgba(0,0,0,0.5) ${((imageCount - 1) / (maxN - 1)) * 100}%)` }} />
                                            )}
                                        </div>
                                    )}

                                    {showResolution && resOptions && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Quality (Resolution)</span>
                                            <div className="flex gap-2">
                                                {resOptions.map(r => (
                                                    <button key={r.value} onClick={() => setResolution(r.value)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border", resolution === r.value ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
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
                                                    <button key={fmt} onClick={() => setOutputFormat(fmt)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border uppercase", outputFormat === fmt ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
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
                                                <input type="range" min={vidCfg.durationRange.min} max={vidCfg.durationRange.max} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ background: `linear-gradient(to right, #06b6d4 ${((duration - vidCfg.durationRange.min) / (vidCfg.durationRange.max - vidCfg.durationRange.min)) * 100}%, rgba(0,0,0,0.5) ${((duration - vidCfg.durationRange.min) / (vidCfg.durationRange.max - vidCfg.durationRange.min)) * 100}%)` }} />
                                            ) : (
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {durationButtons.map(d => (
                                                        <button key={d.value} disabled={d.disabled} onClick={() => setDuration(d.value)} className={cn("px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all border", duration === d.value ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : d.disabled ? "bg-white/[0.01] text-zinc-700 border-white/[0.02] cursor-not-allowed opacity-40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
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
                                                    <button key={s} onClick={() => setVideoStyle(s)} className={cn("px-3 py-2 rounded-xl text-[11px] font-bold transition-all border capitalize", videoStyle === s ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
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
                                                    <button key={movement} onClick={() => setCameraMovement(movement)} className={cn("px-3 py-2 rounded-xl text-[11px] font-bold transition-all border capitalize", cameraMovement === movement ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
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
                                                    <button key={effect} onClick={() => setEffectPreset(effect)} className={cn("px-3 py-2 rounded-xl text-[11px] font-bold transition-all border capitalize", effectPreset === effect ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
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
                                                    <button key={m} onClick={() => setVideoMode(m)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border capitalize", videoMode === m ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
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
                                                    <button key={o} onClick={() => setCharacterOrientation(o)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border capitalize", characterOrientation === o ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
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
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", characterLock ? "bg-[#06b6d4]" : "bg-zinc-800")}>
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
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", soundEnabled ? "bg-[#06b6d4]" : "bg-zinc-800")}>
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
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", multiShots ? "bg-[#06b6d4]" : "bg-zinc-800")}>
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
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", fixedLens ? "bg-[#06b6d4]" : "bg-zinc-800")}>
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
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", generateAudio ? "bg-[#06b6d4]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", generateAudio ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showAudioDirection && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Audio Direction</span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {AUDIO_DIRECTION_PRESETS.map(direction => (
                                                    <button key={direction} onClick={() => setAudioDirection(direction)} className={cn("px-3 py-2 rounded-xl text-[11px] font-bold transition-all border capitalize", audioDirection === direction ? "bg-[#06b6d4]/15 text-[#06b6d4] border-[#06b6d4]/40" : "bg-white/[0.02] text-zinc-500 border-[#222] hover:text-zinc-300 hover:bg-white/[0.04] hover:border-[#333]")}>
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
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", storyboard ? "bg-[#06b6d4]" : "bg-zinc-800")}>
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
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", promptOptimizer ? "bg-[#06b6d4]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", promptOptimizer ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showNegativePrompt && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Negative Prompt</span>
                                            <Textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="Elements to avoid..." className="resize-none min-h-[60px] bg-[#0e0e0e] border border-[#222] text-white placeholder:text-zinc-700 focus-visible:ring-0 focus:border-[#06b6d4]/40 px-4 py-3 text-[13px] font-medium rounded-xl" />
                                        </div>
                                    )}

                                    {creationMode === 'remix' && (
                                        <div className="flex flex-col gap-3 bg-[#111] border border-[#222] rounded-xl p-4 group/strength">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-black text-[#06b6d4] uppercase tracking-[0.15em]">Remix Strength</span>
                                                    <span className="text-[9px] text-zinc-600 font-bold italic tracking-wide">Creative deviation vs preservation</span>
                                                </div>
                                                <span className="text-[13px] font-black tabular-nums text-white bg-white/5 px-2.5 py-1 rounded-lg border border-[#222] group-hover/strength:border-[#06b6d4]/30 transition-all duration-500">{remixStrength}%</span>
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
                                                <button onClick={() => videoInputRef.current?.click()} className="w-full h-16 rounded-xl border border-dashed border-[#333] hover:border-[#06b6d4]/40 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all">
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
                                                <button onClick={() => startImageRef.current?.click()} className="w-full h-14 rounded-xl border border-dashed border-[#333] hover:border-[#06b6d4]/40 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all">
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
                                                <button onClick={() => endImageRef.current?.click()} className="w-full h-14 rounded-xl border border-dashed border-[#333] hover:border-[#06b6d4]/40 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all">
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

            <AnimatePresence>
                {canvasOpen && mobileInlineCanvas && (
                    <motion.div
                        key="mobile-canvas-modal"
                        className="lg:hidden fixed inset-0 z-[60] flex flex-col bg-[#050505]/95 backdrop-blur-2xl"
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 8 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="flex-none h-14 px-4 flex items-center justify-between bg-black/40 backdrop-blur-xl border-b border-white/5">
                            <button
                                type="button"
                                onClick={() => {
                                    onCloseCanvas?.();
                                }}
                                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/90 transition-colors active:scale-95"
                                aria-label="Close canvas"
                                title={isGenerating ? "Hide (generation keeps running in background)" : "Close"}
                            >
                                <X className="w-5 h-5" />
                            </button>
                            {isGenerating ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse" />
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#06b6d4]">Generating</span>
                                </div>
                            ) : activeGeneration?.model ? (
                                <span className="text-[11px] font-medium text-zinc-400 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 truncate max-w-[180px]">
                                    {activeGeneration.model}
                                </span>
                            ) : <span />}
                        </div>
                        <div
                            className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex items-center justify-center relative"
                        >
                            <div className="w-full h-full flex items-center justify-center">
                                {mobileInlineCanvas}
                            </div>
                        </div>
                        <div
                            className="flex-none px-4 pt-3 pb-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent"
                            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
                        >
                            <button
                                type="button"
                                onClick={() => onCloseCanvas?.()}
                                className={cn(
                                    "w-full h-[52px] rounded-xl text-[13px] font-bold tracking-[0.1em] uppercase transition-all duration-300 relative overflow-hidden",
                                    "btn-gold active:scale-[0.98] flex items-center justify-center gap-2.5"
                                )}
                            >
                                <Sparkles className="w-4 h-4 text-black" />
                                <span className="relative top-[0.5px]">
                                    {isGenerating ? "Generate another" : "New generation"}
                                </span>
                            </button>
                            <p className="mt-2 text-center text-[10px] text-zinc-500 tracking-wide">
                                {isGenerating
                                    ? "Current generation keeps running in the top-left stack"
                                    : "Opens prompt panel"}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {!canvasOpen && isGenerating && onOpenCanvas && (
                    <motion.button
                        key="in-flight-pill"
                        type="button"
                        onClick={onOpenCanvas}
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="lg:hidden mx-4 mb-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-transparent border border-violet-400/30 px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
                    >
                        <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex-none flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-violet-300 animate-spin" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                                Generation running
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5 truncate">Tap to view canvas · queue another below</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-violet-300 flex-none" />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {!canvasOpen && activeGeneration && !isGenerating && activeGeneration.status === "completed" && onOpenCanvas && (
                    <motion.button
                        key="last-gen-pill"
                        type="button"
                        onClick={onOpenCanvas}
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="lg:hidden mx-4 mb-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#06b6d4]/10 via-[#06b6d4]/5 to-transparent border border-[#06b6d4]/25 px-3 py-2.5 text-left active:scale-[0.98] transition-transform"
                    >
                        {(activeGeneration.thumbnailUrl || activeGeneration.src) && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-none bg-black/40">
                                {activeGeneration.type === "video" ? (
                                    <video src={activeGeneration.src} className="w-full h-full object-cover" muted playsInline />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={activeGeneration.thumbnailUrl || activeGeneration.src} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#06b6d4]">
                                {activeGeneration.type === "video" ? "Video generated" : "Image generated"}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">Tap to view · download · send to Claw</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#06b6d4] flex-none" />
                    </motion.button>
                )}
            </AnimatePresence>

            <div className="flex-none p-4 pt-3 border-t border-[#1a1a1a] bg-[#0a0a0a] z-30 flex gap-3">
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
                    disabled={isSubmitting || !prompt || (requiresInputImage && !sourceFile && !startImageFile && !previewUrl)}
                    title={requiresInputImage && !sourceFile && !startImageFile && !previewUrl ? "Attach a source image to continue" : undefined}
                    className={cn(
                        "flex-1 h-[52px] rounded-xl text-[13px] font-bold tracking-[0.1em] uppercase transition-all duration-300 group relative overflow-hidden",
                        (isSubmitting || !prompt || (requiresInputImage && !sourceFile && !startImageFile && !previewUrl))
                            ? "bg-[#111] text-zinc-600 cursor-not-allowed border border-[#222]"
                            : "btn-gold hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    )}
                >
                    {isSubmitting ? (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#06b6d4]/10 rounded-full border border-[#06b6d4]/20 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 text-[#06b6d4] animate-spin" />
                                <span className="text-[10px] font-black text-[#06b6d4] uppercase tracking-widest">Submitting</span>
                            </div>
                        </div>
                    ) : isGenerating ? (
                        <span className="flex items-center justify-center gap-2.5 relative z-10">
                            <Sparkles className={cn("w-4 h-4 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110", !prompt ? "opacity-50" : "text-black")} />
                            <span className="relative top-[0.5px]">
                                Generate another
                                {currentTaskCredits > 0 && (
                                    <span className="ml-2 opacity-80">· {currentTaskCredits} credit{currentTaskCredits === 1 ? "" : "s"}</span>
                                )}
                            </span>
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2.5 relative z-10">
                            <Sparkles className={cn("w-4 h-4 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110", !prompt ? "opacity-50" : "text-black")} />
                            <span className="relative top-[0.5px]">
                                Generate
                                {currentTaskCredits > 0 && (
                                    <span className="ml-2 opacity-80">· {currentTaskCredits} credit{currentTaskCredits === 1 ? "" : "s"}</span>
                                )}
                            </span>
                        </span>
                    )}
                </Button>
            </div>
        </div>
        {showInsufficient && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowInsufficient(false)}>
                <div className="relative w-full max-w-sm mx-4 rounded-2xl border border-[#06b6d4]/30 bg-[#0a0a0a] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.9)]" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">Insufficient credits</div>
                    <h3 className="text-xl font-semibold text-zinc-100">Not enough credits to generate</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                        This task costs <span className="text-[#06b6d4] font-semibold">{currentTaskCredits} credits</span>, but your balance is <span className="text-red-400 font-semibold">{creditBalance}</span>.
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                        Buy a top-up or upgrade your plan to continue.
                    </p>
                    <div className="mt-5 flex gap-2">
                        <button
                            onClick={() => setShowInsufficient(false)}
                            className="flex-1 h-11 rounded-lg border border-[#222] bg-[#111] text-[12px] font-semibold uppercase tracking-widest text-zinc-300 hover:bg-[#161616]"
                        >
                            Cancel
                        </button>
                        <Link
                            href="/pricing#top-up"
                            className="flex-1 h-11 rounded-lg btn-gold text-[12px] font-bold uppercase tracking-widest flex items-center justify-center"
                            onClick={() => setShowInsufficient(false)}
                        >
                            Buy credits
                        </Link>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
