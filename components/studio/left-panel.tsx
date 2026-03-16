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
import Image from "next/image";

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

const AI_IMAGE_MODELS: ModelItem[] = [
    { id: "flux-2-pro", name: "Flux 2 Pro", cost: 10 },
    { id: "gpt-4o-image", name: "GPT 4o Image", cost: 4 },
    { id: "gpt-image-1.5", name: "GPT Image 1.5", cost: 2 },
    { id: "nano-banana", name: "Nano Banana", cost: 5 },
    { id: "nano-banana-2", name: "Nano Banana 2", cost: 5 },
    { id: "nano-banana-2-new", name: "Nano Banana 2 (New)", cost: 5, isNew: true },
    { id: "seedream-4.5", name: "SeeDream 4.5", cost: 5 },
    { id: "seedream-5.0-lite", name: "SeeDream 5.0 Lite", cost: 5 },
    { id: "z-image", name: "Z-Image", cost: 2 },
    { id: "grok-imagine-image", name: "Grok Imagine (Image)", cost: 6 }
];

const AI_VIDEO_MODELS: ModelItem[] = [
    { id: "sora-2", name: "Sora 2", cost: 30 },
    { id: "sora-2-pro", name: "Sora 2 Pro", cost: 100 },
    { id: "veo3.1-fast", name: "Veo 3.1 Fast", cost: 24 },
    { id: "wan-animate-replace", name: "Wan Animate Replace", cost: 7 },
    { id: "wan2.6-text-to-video", name: "Wan 2.6 Text-to-Video", cost: 80 },
    { id: "kling-3.0/standard", name: "Kling 3.0 Standard", cost: 27 },
    { id: "kling-2.6", name: "Kling 2.6", cost: 65 },
    { id: "grok-imagine", name: "Grok Imagine (Video)", cost: 6 },
    { id: "hailuo-02", name: "Hailuo 02", cost: 7 },
    { id: "seedance-1.0-pro", name: "SeeDance 1.0 Pro", cost: 21 },
    { id: "seedance-1.5-pro", name: "SeeDance 1.5 Pro", cost: 9 },
    { id: "seedance-2.0", name: "SeeDance 2.0", cost: 0 }
];

export function StudioLeftPanel({ onGenerate, onCancel, isGenerating, mode: initialMode, aspectRatio, setAspectRatio }: StudioLeftPanelProps) {
    const searchParams = useSearchParams();

    // Initial Hydration from URL constraints
    const urlMode = searchParams?.get("mode")?.toLowerCase() || initialMode || "image";
    const urlPrompt = searchParams?.get("prompt") || "";
    const urlPreview = searchParams?.get("previewUrl") || "";
    const urlRemixType = searchParams?.get("remixType")?.toLowerCase() || "image";

    const urlCreationId = searchParams?.get("creationId") || "";
    const [creationMode, setCreationMode] = useState<string>(urlMode);
    const [prompt, setPrompt] = useState(urlPrompt);
    const [previewUrl, setPreviewUrl] = useState(urlPreview);
    const [creationId, setCreationId] = useState(urlCreationId);
    const [remixType, setRemixType] = useState<string>(urlRemixType);
    const [sourceFile, setSourceFile] = useState<File | null>(null);

    // Dynamic Form States
    const [imageCount, setImageCount] = useState<number>(1);
    const [resolution, setResolution] = useState<string>("1K");
    const [duration, setDuration] = useState<number>(5);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
    const [multiShots, setMultiShots] = useState<boolean>(false);
    const [fixedLens, setFixedLens] = useState<boolean>(false);
    const [generateAudio, setGenerateAudio] = useState<boolean>(false);
    const [promptOptimizer, setPromptOptimizer] = useState<boolean>(false);
    const [remixStrength, setRemixStrength] = useState<number>(75);

    const [selectedModel, setSelectedModel] = useState(
        (urlMode === 'video' || (urlMode === 'remix' && urlRemixType === 'video')) ? AI_VIDEO_MODELS[0] : AI_IMAGE_MODELS[0]
    );

    // Ensure we trigger updates if url rapidly changes without unmounting Panel
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
    }, [searchParams]);

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

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = () => {
        let parameters: any = {};

        // ✅ Universally handle Image-to-Image / Image-to-Video
        // CRITICAL FIX: Ensure we never send local 'blob:' URLs as remote image_url strings
        if (sourceFile) {
            parameters.sourceFile = sourceFile;
        } else if (previewUrl && !previewUrl.startsWith('blob:')) {
            // Only send previewUrl if it's a remote URL (already uploaded or from remix history)
            if (remixType === 'video' || previewUrl.toLowerCase().includes('.mp4') || previewUrl.toLowerCase().includes('.webm')) {
                parameters.video_url = previewUrl;
            } else {
                parameters.image_url = previewUrl;
            }
        }
        // Note: If previewUrl is a blob: and sourceFile is null, it means there's a state mismatch. 
        // We gracefully ignore it here as onGenerate in page.tsx will handle error-reporting if no input exists.

        if (creationMode === "image") {
            parameters.n = imageCount;
            // General sizing mapping to API expected payload
            if (["nano-banana", "z-image", "grok-imagine-image"].includes(selectedModel.id)) {
                parameters.size = aspectRatio;
                parameters.prompt = prompt;
            } else if (["gpt-4o-image", "gpt-image-1.5", "seedream-4.5", "seedream-5.0-lite"].includes(selectedModel.id)) {
                let finalSize = aspectRatio;
                if (selectedModel.id.startsWith("gpt-")) {
                    if (aspectRatio === "16:9" || aspectRatio === "4:3") finalSize = "3:2";
                    else if (aspectRatio === "9:16") finalSize = "2:3";
                    else finalSize = "1:1";
                }
                parameters.size = finalSize;
                parameters.prompt = prompt;
            } else if (["nano-banana-2", "nano-banana-2-new", "flux-2-pro"].includes(selectedModel.id)) {
                parameters.size = aspectRatio;
                parameters.prompt = prompt;
                parameters.resolution = resolution;
            } else {
                parameters.aspect_ratio = aspectRatio;
                parameters.prompt = prompt;
            }
        }
        else if (creationMode === "remix") {
            parameters.n = imageCount;
            parameters.prompt = prompt;
            parameters.image_weight = remixStrength / 100; // Map remix strength to standard image_weight for cross-compatibility
            if (["sora-2", "sora-2-pro", "kling-3.0/standard", "kling-2.6"].includes(selectedModel.id)) {
                parameters.duration = duration;
                parameters.aspect_ratio = aspectRatio;
            } else if (selectedModel.id === "veo3.1-fast") {
                parameters.aspect_ratio = aspectRatio;
            } else {
                let finalSize = aspectRatio;
                if (selectedModel.id.startsWith("gpt-")) {
                    if (aspectRatio === "16:9" || aspectRatio === "4:3") finalSize = "3:2";
                    else if (aspectRatio === "9:16") finalSize = "2:3";
                    else finalSize = "1:1";
                }
                parameters.aspect_ratio = finalSize;
                parameters.size = finalSize;
            }
        }
        else if (creationMode === "video") {
            const m = selectedModel.id;
            const needsPrompt = m !== "wan-animate-replace";
            if (needsPrompt) parameters.prompt = prompt;

            if (["sora-2", "sora-2-pro"].includes(m)) {
                parameters.duration = duration;
                parameters.aspect_ratio = aspectRatio;
            }
            else if (m === "veo3.1-fast") {
                parameters.aspect_ratio = aspectRatio;
            }
            else if (m === "kling-3.0/standard") {
                parameters.duration = duration;
                parameters.sound = soundEnabled;
                parameters.aspect_ratio = aspectRatio;
                parameters.multi_shots = multiShots;
            }
            else if (m === "kling-2.6") {
                parameters.duration = duration;
                parameters.sound = soundEnabled;
                parameters.aspect_ratio = aspectRatio;
            }
            else if (m === "seedance-1.0-pro") {
                parameters.duration = duration;
                parameters.resolution = resolution;
                if (sourceFile) parameters.sourceFile = sourceFile;
            }
            else if (m === "seedance-1.5-pro") {
                parameters.duration = duration;
                parameters.aspect_ratio = aspectRatio;
                parameters.resolution = resolution;
                parameters.fixed_lens = fixedLens;
                parameters.generate_audio = generateAudio;
                if (sourceFile) parameters.sourceFile = sourceFile;
            }
            else if (m === "wan-animate-replace") {
                parameters.resolution = resolution;
                if (sourceFile) parameters.sourceFile = sourceFile;
                parameters.video_url = ""; // Ideally collected via a second upload input
            }
            else if (m === "wan2.6-text-to-video") {
                parameters.duration = duration;
                parameters.resolution = resolution;
                parameters.multi_shots = multiShots;
            }
            else if (m === "grok-imagine") {
                parameters.aspect_ratio = aspectRatio;
                parameters.mode = "normal";
            }
            else if (m === "hailuo-02") {
                parameters.duration = duration;
                parameters.prompt_optimizer = promptOptimizer;
            }
        }

        onGenerate(prompt, {
            mode: creationMode,
            model: selectedModel.id,
            originalCreationId: creationId || undefined,
            ...parameters
        });

        // 🚀 RESET LOGIC:
        // Only clear the local File object so the *next* job doesn't accidentally re-send
        // the same binary blob. We intentionally keep previewUrl visible so the user
        // can see their reference image throughout the generation. 
        setSourceFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // UI Conditionals
    const currentModelId = selectedModel.id;
    const isMultiOutputImage = creationMode === "image" || creationMode === "remix";
    const isHighResImage = ["nano-banana-2", "nano-banana-2-new", "flux-2-pro", "seedance-1.0-pro", "seedance-1.5-pro", "wan-animate-replace", "wan2.6-text-to-video"].includes(currentModelId);
    const hasDuration = ["sora-2", "sora-2-pro", "kling-3.0/standard", "kling-2.6", "seedance-1.0-pro", "seedance-1.5-pro", "wan2.6-text-to-video", "hailuo-02"].includes(currentModelId);
    const showSoundToggle = ["kling-3.0/standard", "kling-2.6"].includes(currentModelId);
    const showMultiShotsToggle = ["kling-3.0/standard", "wan2.6-text-to-video"].includes(currentModelId);
    const showFixedLensToggle = currentModelId === "seedance-1.5-pro";
    const showGenAudioToggle = currentModelId === "seedance-1.5-pro";
    const showPromptOptimizerToggle = currentModelId === "hailuo-02";
    // Enable source file upload globally for all models. If the Poyo model doesn't support 
    // the internally mapped 'image_url', it will generally just ignore the parameter gracefully.
    const showImageUpload = true;
    const showPrompt = currentModelId !== "wan-animate-replace";
    // In Remix mode, we generically allow Aspect Ratio changes.
    const hasAspectRatio = creationMode === 'remix' || ["sora-2", "sora-2-pro", "veo3.1-fast", "kling-3.0/standard", "kling-2.6", "seedance-1.5-pro", "grok-imagine", "nano-banana", "z-image", "grok-imagine-image", "gpt-4o-image", "gpt-image-1.5", "seedream-4.5", "seedream-5.0-lite", "nano-banana-2", "nano-banana-2-new", "flux-2-pro", "flux-pro", "dall-e-3", "ideogram-v2", "flux-dev", "kolors", "flux-schnell"].includes(currentModelId);


    return (
        <div className="w-full h-full flex flex-col bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.7)] rounded-[28px] relative z-20 text-zinc-100 overflow-hidden transition-all duration-500 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent before:pointer-events-none">

            {/* Scrollable Content Area */}
            <div className="flex-1 relative z-10 w-full min-h-0">
                {/* Inner Wrapper for proper layout spacing with absolute inset to secure scroll boundaries */}
                <div
                    className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar touch-pan-y pointer-events-auto"
                    data-lenis-prevent="true"
                >
                    <div className="p-6 pb-12 flex flex-col gap-6 w-full">

                        {/* 1. CREATION MODE SWITCH */}
                        <div className="flex p-1.5 bg-black/60 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-[inset_0_1px_4px_rgba(255,255,255,0.05)] relative shrink-0">
                            {/* Smooth Animated Highlight Pill */}
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

                        {/* 2. MODEL SELECTION */}
                        {(creationMode === 'image' || creationMode === 'video' || creationMode === 'remix') && (
                            <div className="space-y-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                                                    {selectedModel.cost !== undefined && (
                                                        <div className="flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 group-hover:border-indigo-500/20 transition-all shadow-inner">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.5)]">
                                                                <Sparkles className="w-2.5 h-2.5 text-white fill-white" />
                                                            </div>
                                                            <span className="text-[11px] font-black text-indigo-100 group-hover:text-white tabular-nums tracking-wider">{selectedModel.cost * (isMultiOutputImage ? imageCount : 1)}</span>
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
                                                                    <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white tabular-nums tracking-wide">{model.cost * (isMultiOutputImage ? imageCount : 1)}</span>
                                                                </div>
                                                            )}
                                                            {model.isNew && <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border border-indigo-500/20">New</span>}
                                                        </div>
                                                    </DropdownMenuItem>
                                                ))}
                                            </div>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}

                        {/* TEMPLATES (If mode is templates) */}
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

                        {/* 4. PROMPT / DIRECTIVES */}
                        {showPrompt && (
                            <div className="space-y-3 shrink-0">
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
                                        className="resize-none min-h-[140px] lg:min-h-[130px] bg-transparent border-none text-white placeholder:text-zinc-700 focus-visible:ring-0 px-6 py-6 text-[15px] lg:text-[14px] font-medium leading-[1.6] tracking-wide"
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
                                                    
                                                    {/* Auto-refresh indicator overlay when new file is added */}
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
                                            e.target.value = ''; // Reset input so you can re-select same file later if needed
                                        }
                                    }} />
                                </div>
                            </div>
                        )}

                        {/* REMIX SETTINGS (If mode is remix) */}
                        {creationMode === 'remix' && (
                            <div className="space-y-4 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2 px-1">
                                    <Settings2 className="w-3.5 h-3.5 text-zinc-600" /> Remix Setting
                                </label>
                                <div className="space-y-3 px-2 bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-4 shadow-inner">
                                    <div className="flex justify-between text-[11px] text-zinc-400 font-semibold"><label>Remix Strength</label><span>{remixStrength}%</span></div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={remixStrength}
                                        onChange={(e) => setRemixStrength(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-black/50 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all"
                                        style={{ background: `linear-gradient(to right, #8b5cf6 ${remixStrength}%, rgba(0,0,0,0.5) ${remixStrength}%)` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 5. FRAMING */}
                        {hasAspectRatio && (
                            <div className="space-y-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2 px-1">
                                    <Frame className="w-3.5 h-3.5 text-zinc-600" /> Framing
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {["1:1", "4:3", "16:9", "9:16"].map((ratio) => (
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

                        {/* 6. ADVANCED CONFIGURATION */}
                        {(hasDuration || isHighResImage || isMultiOutputImage || showSoundToggle || showMultiShotsToggle || showFixedLensToggle || showGenAudioToggle || showPromptOptimizerToggle) && (
                            <div className="space-y-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2 px-1">
                                    <Settings2 className="w-3.5 h-3.5 text-zinc-600" /> Advanced Settings
                                </label>
                                <div className="flex flex-col gap-2">
                                    {isMultiOutputImage && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Image Count</span>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4].map(n => (
                                                    <button key={n} onClick={() => setImageCount(n)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border", imageCount === n ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isHighResImage && (
                                        <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Resolution</span>
                                            <div className="flex gap-2">
                                                {["1K", "2K", "4K"].map(r => (
                                                    <button key={r} onClick={() => setResolution(r)} className={cn("flex-1 h-11 rounded-xl text-[12px] font-bold transition-all border", resolution === r ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {hasDuration && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-3 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[11px] font-semibold text-zinc-400">Duration</span>
                                            <div className="flex gap-1.5">
                                                {[5, 10, 15].map(d => (
                                                    <button key={d} onClick={() => setDuration(d)} className={cn("px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all border", duration === d ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                        {d}s
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showSoundToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4.5 cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group/item" onClick={() => setSoundEnabled(!soundEnabled)}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-zinc-300 group-hover/item:text-white transition-colors">Audio Synthesis</span>
                                                <span className="text-[9px] text-zinc-600 font-medium">Generate matching soundscape</span>
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
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Sticky Action Footer - CINEMATIC ACTION */}
            <div className="flex-none p-6 pt-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent backdrop-blur-3xl z-30 flex gap-3">
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
                            {selectedModel.cost !== undefined && (
                                <div className="flex items-center gap-1.5 ml-1.5 pl-2 pr-3 py-1.5 rounded-full bg-black/[0.08] border border-black/5 shadow-inner group-hover:bg-black/[0.12] transition-colors">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
                                        <Sparkles className="w-2 h-2 text-white fill-white" />
                                    </div>
                                    <span className="text-[11px] font-black text-black tabular-nums tracking-widest">{selectedModel.cost * (isMultiOutputImage ? imageCount : 1)}</span>
                                </div>
                            )}
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}

