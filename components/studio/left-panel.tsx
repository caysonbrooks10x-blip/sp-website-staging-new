"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    Loader2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import Image from "next/image";
import {
    IMAGE_MODEL_LIST,
    VIDEO_MODEL_LIST,
    IMAGE_MODELS,
    VIDEO_MODELS,
    type ImageModelConfig,
    type VideoModelConfig,
    type ModelConfig,
} from "@/lib/model-config";

interface StudioLeftPanelProps {
    onGenerate: (prompt: string, settings: any) => void;
    onCancel?: () => void;
    isGenerating: boolean;
    mode?: "image" | "video" | "templates" | "remix" | string;
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
}

interface ModelItem {
    id: string;
    name: string;
    isNew?: boolean;
    cost?: number;
}

const AI_IMAGE_MODELS: ModelItem[] = IMAGE_MODEL_LIST.map(m => ({
    id: m.id, name: m.name, isNew: m.isNew, cost: m.baseCost,
}));

const AI_VIDEO_MODELS: ModelItem[] = VIDEO_MODEL_LIST.map(m => ({
    id: m.id, name: m.name, isNew: m.isNew, cost: m.baseCost,
}));

function getConfig(modelId: string): ModelConfig | undefined {
    return IMAGE_MODELS[modelId] || VIDEO_MODELS[modelId];
}

export function StudioLeftPanel({ onGenerate, onCancel, isGenerating, mode: initialMode, aspectRatio, setAspectRatio }: StudioLeftPanelProps) {
    const searchParams = useSearchParams();

    const urlMode = searchParams?.get("mode")?.toLowerCase() || initialMode || "image";
    const urlPrompt = searchParams?.get("prompt") || "";
    const urlPreview = searchParams?.get("previewUrl") || "";
    const urlRemixType = searchParams?.get("remixType")?.toLowerCase() || "image";

    const urlCreationId = searchParams?.get("creationId") || "";
    const [creationMode, setCreationMode] = useState<string>(urlMode);
    const [prompt, setPrompt] = useState(() => {
        if (urlPrompt) return urlPrompt;
        if (typeof window !== 'undefined') return localStorage.getItem("studio_last_prompt") || "";
        return "";
    });
    const [previewUrl, setPreviewUrl] = useState(urlPreview);
    const [creationId, setCreationId] = useState(urlCreationId);
    const [remixType, setRemixType] = useState<string>(urlRemixType);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [sourceVideo, setSourceVideo] = useState<File | null>(null);
    const [sourceVideoPreview, setSourceVideoPreview] = useState<string>("");

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
        const ar = searchParams?.get("aspectRatio");
        if (ar && ar !== aspectRatio) {
            setAspectRatio(ar);
        }
        const modelId = searchParams?.get("model");
        if (modelId && modelId !== selectedModel.id) {
            const found = IMAGE_MODEL_LIST.find(m => m.id === modelId) || VIDEO_MODEL_LIST.find(m => m.id === modelId);
            if (found) setSelectedModel(found);
        }
        const res = searchParams?.get("resolution");
        if (res && res !== resolution) {
            setResolution(res);
        }
    }, [searchParams]);

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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const startImageRef = useRef<HTMLInputElement>(null);
    const endImageRef = useRef<HTMLInputElement>(null);
    const [startImageFile, setStartImageFile] = useState<File | null>(null);
    const [startImagePreview, setStartImagePreview] = useState<string>("");
    const [endImageFile, setEndImageFile] = useState<File | null>(null);
    const [endImagePreview, setEndImagePreview] = useState<string>("");

    const handleGenerate = () => {
        let parameters: any = {};

        if (sourceFile) {
            parameters.sourceFile = sourceFile;
        } else if (previewUrl && !previewUrl.startsWith('blob:')) {
            if (remixType === 'video' || previewUrl.toLowerCase().includes('.mp4') || previewUrl.toLowerCase().includes('.webm')) {
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
            parameters.prompt = prompt;
            parameters.size = aspectRatio;
            if (ic.supportsN) parameters.n = imageCount;
            if (ic.supportsResolution) parameters.resolution = resolution;
            if (ic.supportsOutputFormat) parameters.output_format = outputFormat;
        }
        else if (creationMode === "remix") {
            parameters.n = imageCount;
            parameters.prompt = prompt;
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
            if (vc.supportsPrompt) parameters.prompt = prompt;
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
        }

        onGenerate(prompt, {
            mode: creationMode,
            model: selectedModel.id,
            originalCreationId: creationId || undefined,
            sourceFile: sourceFile || undefined,
            sourceVideo: sourceVideo || undefined,
            aspectRatio,
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

    const currentModelId = selectedModel.id;
    const isImageMode = cfg?.type === "image";
    const isVideoMode = cfg?.type === "video";
    const imgCfg = isImageMode ? (cfg as ImageModelConfig) : null;
    const vidCfg = isVideoMode ? (cfg as VideoModelConfig) : null;

    const supportsMultiOutput = imgCfg?.supportsN && imgCfg.maxN > 1;
    const isMultiOutputImage = creationMode === "image" || creationMode === "remix";

    const currentCostEstimate = (() => {
        if (imgCfg) return imgCfg.getCost({ resolution, n: supportsMultiOutput ? imageCount : 1 });
        if (vidCfg) {
            let effectiveDuration = duration;
            if (vidCfg.durationOptions && vidCfg.durationOptions.length > 0) {
                const validDurations = vidCfg.durationOptions.map(d => d.value);
                if (!validDurations.includes(effectiveDuration)) {
                    effectiveDuration = vidCfg.defaultDuration || validDurations[0];
                }
            } else if (vidCfg.durationRange) {
                effectiveDuration = Math.max(vidCfg.durationRange.min, Math.min(vidCfg.durationRange.max, effectiveDuration));
            }
            return vidCfg.getCost({ resolution: vidCfg.supportsResolution ? resolution : undefined, duration: effectiveDuration, generateAudio });
        }
        return selectedModel.cost || 0;
    })();

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


    return (
        <div className="w-full h-full flex flex-col bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.7)] rounded-[28px] relative z-20 text-zinc-100 overflow-hidden transition-all duration-500 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent before:pointer-events-none">

            {}
            <div className="flex-1 relative z-10 w-full min-h-0">
                {}
                <div
                    className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar touch-pan-y pointer-events-auto"
                    data-lenis-prevent="true"
                >
                    <div className="p-5 pb-12 flex flex-col gap-5 w-full">

                        {}
                        <div className="flex p-1.5 bg-black/60 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-[inset_0_1px_4px_rgba(255,255,255,0.05)] relative shrink-0">
                            {}
                            <div
                                className="absolute top-1.5 bottom-1.5 left-1.5 bg-white/[0.08] border border-white/20 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-0"
                                style={{
                                    width: `calc((100% - 12px) / 4)`,
                                    transform: `translateX(calc(${['image', 'video', 'remix', 'templates'].indexOf(creationMode)} * 100%))`
                                }}
                            />
                            {['Image', 'Video', 'Remix', 'Templates'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => handleModeSwitch(mode)}
                                    className={cn(
                                        "flex-1 min-w-0 flex items-center justify-center py-2.5 text-[10px] font-black tracking-wider uppercase transition-all duration-300 relative z-10",
                                        creationMode === mode.toLowerCase() ? "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]" : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>

                        {}
                        {(creationMode === 'image' || creationMode === 'video' || creationMode === 'remix' || creationMode === 'templates') && (
                            <div className="space-y-2.5 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2 px-1">
                                    <Settings2 className="w-3.5 h-3.5 text-zinc-600" /> Model Engine
                                </label>
                                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <div className="w-full h-[54px] px-4.5 bg-black/20 hover:bg-black/40 rounded-[18px] border border-white/5 hover:border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] transition-all duration-500 cursor-pointer flex items-center justify-between group overflow-hidden">
                                            <div className="flex flex-1 items-center justify-between">
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.12] border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-500 shrink-0">
                                                        {creationMode === 'video' ? <Video className="w-4 h-4 text-white/80" /> : <Sparkles className="w-4 h-4 text-white/80" />}
                                                    </div>
                                                    <div className="flex flex-col gap-0 min-w-0">
                                                        <span className="text-[12px] font-bold text-zinc-100 group-hover:text-white transition-colors uppercase tracking-wider truncate">{selectedModel.name}</span>
                                                        <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Active Engine</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {currentCostEstimate > 0 && (
                                                        <div className="flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 group-hover:border-indigo-500/20 transition-all shadow-inner">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.5)]">
                                                                <Sparkles className="w-2.5 h-2.5 text-white fill-white" />
                                                            </div>
                                                            <span className="text-[11px] font-black text-indigo-100 group-hover:text-white tabular-nums tracking-wider">{currentCostEstimate}</span>
                                                        </div>
                                                    )}
                                                    <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-all group-hover:translate-y-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" sideOffset={8} className="z-[9999] w-[340px] max-w-[calc(100vw-64px)] bg-[#121217]/95 border border-white/[0.08] shadow-[0_30px_60px_rgba(0,0,0,0.9)] rounded-[20px] p-0 overflow-hidden backdrop-blur-3xl">
                                        <div
                                            className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar pointer-events-auto"
                                            onWheel={(e) => e.stopPropagation()}
                                            onTouchMove={(e) => e.stopPropagation()}
                                        >
                                            <div className="space-y-0.5">
                                                {(creationMode === "video" || (creationMode === "remix" && remixType === "video") ? AI_VIDEO_MODELS : AI_IMAGE_MODELS).map((model) => (
                                                    <DropdownMenuItem
                                                        key={model.id}
                                                        onClick={() => setSelectedModel(model)}
                                                        className="hover:bg-white/[0.05] focus:bg-white/[0.05] cursor-pointer flex items-center justify-between p-3 rounded-xl transition-all group"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-indigo-400 transition-colors shadow-[0_0_8px_transparent] group-hover:shadow-indigo-500/50" />
                                                            <span className={cn("text-[13px] font-medium text-zinc-400 group-hover:text-zinc-100 transition-colors")}>{model.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {model.cost !== undefined && (
                                                                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                    <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
                                                                        <Sparkles className="w-2.5 h-2.5 text-white fill-white" />
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white tabular-nums tracking-wide">
                                                                        {(() => {
                                                                            const mc = getConfig(model.id);
                                                                            if (mc?.type === "image") return mc.getCost({ resolution: mc.defaultResolution, n: 1 });
                                                                            if (mc?.type === "video") return mc.getCost({ resolution: mc.defaultResolution, duration: mc.defaultDuration, generateAudio: false });
                                                                            return model.cost || 0;
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {model.isNew && <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border border-indigo-500/20 shrink-0">New</span>}
                                                        </div>
                                                    </DropdownMenuItem>
                                                ))}
                                            </div>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}

                        {}
                        {creationMode === 'templates' && (
                            <div className="space-y-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[10px] font-bold text-zinc-300 tracking-[0.15em] uppercase flex items-center gap-2">
                                    <Wand2 className="w-3.5 h-3.5" /> Select Template
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Cyberpunk', 'Anime', 'Realistic', '3D Render', 'Cinematic', 'Cartoon', 'Neon', 'Vintage'].map(tpl => (
                                        <button key={tpl} onClick={(e) => {
                                            e.preventDefault();
                                            setPrompt(prev => prev ? `${prev}, ${tpl} style` : `${tpl} style, `);
                                        }} className="py-2.5 px-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-[11px] font-medium text-zinc-400 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all text-left">
                                            {tpl}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                <div className="bg-white/[0.02] rounded-[20px] border border-white/[0.05] focus-within:border-white/[0.15] focus-within:bg-white/[0.04] focus-within:shadow-[0_0_40px_rgba(255,255,255,0.03)] transition-all duration-500 overflow-hidden shadow-inner flex flex-col group relative">
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
                                                        <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-[2px] flex items-center justify-center animate-pulse">
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
                                                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg border border-white/20 z-10">
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
                                                    ? "bg-white/[0.08] text-white border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                                    : "bg-white/[0.01] text-zinc-500 border-white/[0.03] hover:bg-white/[0.03] hover:text-zinc-300 hover:border-white/[0.08]"
                                            )}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {}
                        {(hasDuration || showResolution || isMultiOutputImage || showSoundToggle || showMultiShotsToggle || showFixedLensToggle || showGenAudioToggle || showPromptOptimizerToggle || showStyleSelector || showStoryboardToggle || showNegativePrompt || showOutputFormat || showModeSelector || showCharOrientationSelector || showStartImage || showEndImage || showVideoUpload) && (
                            <div className="space-y-2.5 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2 px-1">
                                    <Settings2 className="w-3.5 h-3.5 text-zinc-600" /> Advanced Settings
                                </label>
                                <div className="flex flex-col gap-2">
                                    {(creationMode === "image" || creationMode === "remix") && (
                                        <div className={cn("flex flex-col gap-3 rounded-[20px] p-4 border transition-colors", supportsMultiOutput ? "bg-white/[0.02] border-white/[0.05] shadow-inner hover:bg-white/[0.03]" : "bg-black/20 border-white/[0.02]")}>
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Image Count {maxN > 4 && <span className="text-zinc-600">({imageCount})</span>}</span>
                                            {maxN <= 4 ? (
                                                <div className="flex gap-2">
                                                    {Array.from({ length: maxN }, (_, i) => i + 1).map(n => {
                                                        const isDisabled = !supportsMultiOutput && n > 1;
                                                        return (
                                                            <button key={n} disabled={isDisabled} onClick={() => setImageCount(n)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border", imageCount === n ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : isDisabled ? "bg-white/[0.01] text-zinc-700 border-white/[0.02] cursor-not-allowed" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>{n}</button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <input type="range" min="1" max={maxN} value={imageCount} onChange={(e) => setImageCount(parseInt(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ background: `linear-gradient(to right, #8b5cf6 ${((imageCount - 1) / (maxN - 1)) * 100}%, rgba(0,0,0,0.5) ${((imageCount - 1) / (maxN - 1)) * 100}%)` }} />
                                            )}
                                        </div>
                                    )}

                                    {showResolution && resOptions && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Quality (Resolution)</span>
                                            <div className="flex gap-2">
                                                {resOptions.map(r => (
                                                    <button key={r.value} onClick={() => setResolution(r.value)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border", resolution === r.value ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                        {r.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showOutputFormat && imgCfg?.outputFormatOptions && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Output Format</span>
                                            <div className="flex gap-2">
                                                {imgCfg.outputFormatOptions.map(fmt => (
                                                    <button key={fmt} onClick={() => setOutputFormat(fmt)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border uppercase", outputFormat === fmt ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                        {fmt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {hasDuration && durationButtons.length > 0 && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-3 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[11px] font-semibold text-zinc-400">Duration {vidCfg?.durationRange && <span className="text-zinc-600">({duration}s)</span>}</span>
                                            {vidCfg?.durationRange ? (
                                                <input type="range" min={vidCfg.durationRange.min} max={vidCfg.durationRange.max} value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full h-1.5 bg-black/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ background: `linear-gradient(to right, #8b5cf6 ${((duration - vidCfg.durationRange.min) / (vidCfg.durationRange.max - vidCfg.durationRange.min)) * 100}%, rgba(0,0,0,0.5) ${((duration - vidCfg.durationRange.min) / (vidCfg.durationRange.max - vidCfg.durationRange.min)) * 100}%)` }} />
                                            ) : (
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {durationButtons.map(d => (
                                                        <button key={d.value} disabled={d.disabled} onClick={() => setDuration(d.value)} className={cn("px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all border", duration === d.value ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" : d.disabled ? "bg-white/[0.01] text-zinc-700 border-white/[0.02] cursor-not-allowed opacity-40" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                            {d.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {showStyleSelector && vidCfg?.styleOptions && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Style</span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {vidCfg.styleOptions.map(s => (
                                                    <button key={s} onClick={() => setVideoStyle(s)} className={cn("px-3 py-2 rounded-xl text-[11px] font-bold transition-all border capitalize", videoStyle === s ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showModeSelector && vidCfg?.modeOptions && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Mode</span>
                                            <div className="flex gap-2">
                                                {vidCfg.modeOptions.map(m => (
                                                    <button key={m} onClick={() => setVideoMode(m)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border capitalize", videoMode === m ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showCharOrientationSelector && vidCfg?.characterOrientationOptions && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Character Orientation</span>
                                            <div className="flex gap-2">
                                                {vidCfg.characterOrientationOptions.map(o => (
                                                    <button key={o} onClick={() => setCharacterOrientation(o)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border capitalize", characterOrientation === o ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                        {o}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showSoundToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4.5 cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group/item" onClick={() => { if (!(multiShots && vidCfg?.supportsMultiShots)) setSoundEnabled(!soundEnabled); }}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Audio Synthesis</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">{multiShots ? "Required for multi-shots" : "Generate matching soundscape"}</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", soundEnabled ? "bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", soundEnabled ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showMultiShotsToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4.5 cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group/item" onClick={() => setMultiShots(!multiShots)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Multi-Shots</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Dynamic camera cuts & shifts</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", multiShots ? "bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", multiShots ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showFixedLensToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4.5 cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group/item" onClick={() => setFixedLens(!fixedLens)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Fixed Lens</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Maintain consistent focal length</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", fixedLens ? "bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", fixedLens ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showGenAudioToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4.5 cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group/item" onClick={() => setGenerateAudio(!generateAudio)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Audio Synthesis</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">AI generated foley & sound</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", generateAudio ? "bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", generateAudio ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showStoryboardToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4.5 cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group/item" onClick={() => setStoryboard(!storyboard)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Storyboard</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Enable storyboard mode</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", storyboard ? "bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", storyboard ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showPromptOptimizerToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4.5 cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group/item" onClick={() => setPromptOptimizer(!promptOptimizer)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Prompt Optimizer</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Auto-enhance vision description</span>
                                            </div>
                                            <div className={cn("w-10 h-5.5 rounded-full transition-all duration-500 relative", promptOptimizer ? "bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]" : "bg-zinc-800")}>
                                                <div className={cn("absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-xl", promptOptimizer ? "left-[19px] scale-110" : "left-[3px] scale-90")} />
                                            </div>
                                        </div>
                                    )}

                                    {showNegativePrompt && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Negative Prompt</span>
                                            <Textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="Elements to avoid..." className="resize-none min-h-[60px] bg-black/20 border border-white/5 text-white placeholder:text-zinc-700 focus-visible:ring-0 px-4 py-3 text-[13px] font-medium rounded-xl" />
                                        </div>
                                    )}

                                    {creationMode === 'remix' && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4.5 group/strength">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.15em] drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]">Remix Strength</span>
                                                    <span className="text-[9px] text-zinc-600 font-bold italic tracking-wide">Creative deviation vs preservation</span>
                                                </div>
                                                <span className="text-[13px] font-black tabular-nums text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 group-hover/strength:border-indigo-500/30 transition-all duration-500">{remixStrength}%</span>
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
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Reference Video {vidCfg?.requiresReferenceVideo && <span className="text-red-400">*</span>}</span>
                                            {sourceVideoPreview ? (
                                                <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10">
                                                    <video src={sourceVideoPreview} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                                    <button onClick={() => { setSourceVideo(null); setSourceVideoPreview(""); if (videoInputRef.current) videoInputRef.current.value = ""; }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg">Remove</span></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => videoInputRef.current?.click()} className="w-full h-16 rounded-xl border border-dashed border-white/10 hover:border-white/20 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all">
                                                    <Upload className="w-4 h-4" /><span className="text-[11px] font-bold uppercase tracking-wider">Upload Video</span>
                                                </button>
                                            )}
                                            <input ref={videoInputRef} type="file" className="hidden" accept="video/*" onChange={(e) => { if (e.target.files?.[0]) { setSourceVideo(e.target.files[0]); setSourceVideoPreview(URL.createObjectURL(e.target.files[0])); } }} />
                                        </div>
                                    )}

                                    {showStartImage && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Start Frame Image</span>
                                            {startImagePreview ? (
                                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                                    <img src={startImagePreview} alt="Start frame" className="w-full h-full object-cover" />
                                                    <button onClick={() => { setStartImageFile(null); setStartImagePreview(""); if (startImageRef.current) startImageRef.current.value = ""; }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><X className="w-4 h-4 text-white" /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => startImageRef.current?.click()} className="w-full h-14 rounded-xl border border-dashed border-white/10 hover:border-white/20 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all">
                                                    <Upload className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-wider">Upload Start Frame</span>
                                                </button>
                                            )}
                                            <input ref={startImageRef} type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { setStartImageFile(e.target.files[0]); setStartImagePreview(URL.createObjectURL(e.target.files[0])); } }} />
                                        </div>
                                    )}

                                    {showEndImage && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">End Frame Image</span>
                                            {endImagePreview ? (
                                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                                    <img src={endImagePreview} alt="End frame" className="w-full h-full object-cover" />
                                                    <button onClick={() => { setEndImageFile(null); setEndImagePreview(""); if (endImageRef.current) endImageRef.current.value = ""; }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><X className="w-4 h-4 text-white" /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => endImageRef.current?.click()} className="w-full h-14 rounded-xl border border-dashed border-white/10 hover:border-white/20 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-all">
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
            <div className="flex-none p-5 pt-1 bg-gradient-to-t from-black/90 via-black/40 to-transparent backdrop-blur-3xl z-30 flex gap-3">
                {isGenerating && onCancel && (
                    <Button
                        onClick={onCancel}
                        variant="destructive"
                        className="w-14 h-[58px] rounded-[22px] flex items-center justify-center bg-red-500/5 hover:bg-red-500/15 text-red-500 border border-red-500/15 shadow-none transition-all duration-300 active:scale-95"
                    >
                        <X className="w-5.5 h-5.5" />
                    </Button>
                )}
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className={cn(
                        "flex-1 h-[58px] rounded-[22px] text-[13px] font-black tracking-[0.2em] uppercase transition-all duration-500 group relative overflow-hidden",
                        isGenerating || !prompt
                            ? "bg-white/[0.04] text-zinc-600 cursor-not-allowed shadow-none border border-white/[0.05]"
                            : "bg-white hover:bg-zinc-100 text-black border-none shadow-[0_20px_40px_rgba(255,255,255,0.12)] hover:shadow-[0_25px_50px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    )}
                >
                    {isGenerating ? (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 rounded-full border border-indigo-500/20 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Synthesis</span>
                            </div>
                        </div>
                    ) : (
                        <span className="flex items-center justify-center gap-2.5 relative z-10">
                            <Sparkles className={cn("w-4 h-4 transition-all duration-700 group-hover:rotate-12 group-hover:scale-110", isGenerating || !prompt ? "opacity-50" : "text-black")} />
                            <span className="relative top-[0.5px]">Generate</span>
                            {currentCostEstimate > 0 && (
                                <div className="flex items-center gap-1.5 ml-1.5 pl-2 pr-3 py-1.5 rounded-full bg-black/[0.08] border border-black/5 shadow-inner group-hover:bg-black/[0.12] transition-colors">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
                                        <Sparkles className="w-2 h-2 text-white fill-white" />
                                    </div>
                                    <span className="text-[11px] font-black text-black tabular-nums tracking-widest">{currentCostEstimate}</span>
                                </div>
                            )}
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}

