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
    X
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
        if (sourceFile) {
            parameters.sourceFile = sourceFile;
        } else if (previewUrl) {
            if (remixType === 'video' || previewUrl.includes('.mp4')) {
                parameters.video_url = previewUrl;
            } else {
                if (selectedModel.id.includes('veo') || selectedModel.id.includes('kling-3.0')) {
                    parameters.image_urls = [previewUrl];
                } else {
                    parameters.image_url = previewUrl;
                }
            }
        }

        if (creationMode === "image") {
            parameters.n = imageCount;
            // General sizing mapping to API expected payload
            if (["nano-banana", "z-image", "grok-imagine-image"].includes(selectedModel.id)) {
                parameters.size = aspectRatio;
                parameters.prompt = prompt;
            } else if (["gpt-4o-image", "gpt-image-1.5", "seedream-4.5", "seedream-5.0-lite"].includes(selectedModel.id)) {
                parameters.size = aspectRatio;
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
            parameters.prompt = prompt;
            parameters.image_weight = remixStrength / 100; // Map remix strength to standard image_weight for cross-compatibility
            if (["sora-2", "sora-2-pro", "kling-3.0/standard", "kling-2.6"].includes(selectedModel.id)) {
                parameters.duration = duration;
                parameters.aspect_ratio = aspectRatio;
            } else if (selectedModel.id === "veo3.1-fast") {
                parameters.aspect_ratio = aspectRatio;
            } else {
                parameters.aspect_ratio = aspectRatio;
                parameters.size = aspectRatio;
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

        // 🚀 PERFECT RESET LOGIC: 
        // We purge the file attachment from the UI instantly after firing the job payload.
        // This ensures the user can immediately attach a NEW reference image for their NEXT job 
        // without accidentally sending the old file again, matching handleResetComplete perfectly!
        setSourceFile(null);
        setPreviewUrl("");
        setCreationId("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // UI Conditionals
    const currentModelId = selectedModel.id;
    const isMultiOutputImage = creationMode === "image";
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
                    className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain"
                    data-lenis-prevent="true"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    <div className="p-6 pb-12 flex flex-col gap-6 w-full">

                        {/* 1. CREATION MODE SWITCH */}
                        <div className="flex p-1 bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/[0.05] shadow-[inset_0_1px_4px_rgba(255,255,255,0.02)] relative shrink-0">
                            {/* Smooth Animated Highlight Pill */}
                            <div
                                className="absolute top-1 bottom-1 bg-white/[0.08] border border-white/10 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-0"
                                style={{
                                    width: `calc((100% - 8px) / 4)`,
                                    transform: `translateX(calc(${['image', 'video', 'remix', 'templates'].indexOf(creationMode)} * 100%))`
                                }}
                            />
                            {['Image', 'Video', 'Remix', 'Templates'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => handleModeSwitch(mode)}
                                    className={cn(
                                        "flex-1 min-w-0 flex items-center justify-center py-2.5 text-[11px] font-semibold transition-colors duration-300 relative z-10",
                                        creationMode === mode.toLowerCase() ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "text-zinc-500 hover:text-zinc-300"
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
                                <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <div className="w-full h-[52px] px-4 bg-white/[0.02] rounded-[16px] border border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(255,255,255,0.02)] transition-all duration-300 cursor-pointer flex items-center justify-between group">
                                            <div className="flex flex-1 items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                                                        {creationMode === 'video' ? <Video className="w-3.5 h-3.5 text-zinc-300" /> : <Sparkles className="w-3.5 h-3.5 text-zinc-300" />}
                                                    </div>
                                                    <span className="text-[13px] font-semibold text-zinc-300 tracking-wide group-hover:text-white transition-colors">{selectedModel.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {selectedModel.cost !== undefined && (
                                                        <div className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-black/40 border border-white/5 group-hover:border-white/10 transition-all shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                                                                <Sparkles className="w-2 h-2 text-white fill-white" />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white tabular-nums tracking-wide">{selectedModel.cost}</span>
                                                        </div>
                                                    )}
                                                    <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" sideOffset={8} className="z-50 w-[340px] max-w-[calc(100vw-64px)] bg-[#121217]/95 border border-white/[0.08] shadow-[0_30px_60px_rgba(0,0,0,0.9)] rounded-[20px] p-0 overflow-hidden backdrop-blur-3xl">
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
                                                                    <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white tabular-nums tracking-wide">{model.cost}</span>
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
                                        placeholder="Describe your vision in detail..."
                                        className="resize-none min-h-[140px] lg:min-h-[120px] bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 px-5 py-5 text-[15px] lg:text-[14px] font-light leading-relaxed tracking-wide"
                                    />

                                    {showImageUpload && previewUrl && (
                                        <div className="px-5 pb-5 pt-2 animate-in fade-in zoom-in-95 duration-300">
                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 group/preview shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
                                                {(sourceFile?.type.startsWith('video/') || (previewUrl.includes('.mp4') && !sourceFile)) ? (
                                                    <video src={previewUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                                                ) : (
                                                    <img src={previewUrl} alt="Source Media" className="object-cover w-full h-full" />
                                                )}
                                                <button onClick={() => { setPreviewUrl(""); setSourceFile(null); setCreationId(""); }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity backdrop-blur-sm">
                                                    <X className="w-5 h-5 text-white drop-shadow-md hover:text-red-400 transition-colors" strokeWidth={2.5} />
                                                </button>
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
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-3 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[11px] font-semibold text-zinc-400">Image Count</span>
                                            <div className="flex gap-1.5">
                                                {[1, 2, 4].map(n => (
                                                    <button key={n} onClick={() => setImageCount(n)} className={cn("px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all border", imageCount === n ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isHighResImage && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-3 shadow-inner hover:bg-white/[0.03] transition-colors">
                                            <span className="text-[11px] font-semibold text-zinc-400">Resolution</span>
                                            <div className="flex gap-1.5">
                                                {["1K", "2K", "4K"].map(r => (
                                                    <button key={r} onClick={() => setResolution(r)} className={cn("px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all border", resolution === r ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "bg-white/[0.02] text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:bg-white/[0.05]")}>
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
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-4 cursor-pointer hover:bg-white/[0.04] transition-all shadow-inner" onClick={() => setSoundEnabled(!soundEnabled)}>
                                            <span className="text-[11px] font-semibold text-zinc-300">Generate Sound</span>
                                            <div className={cn("w-8 h-4.5 rounded-full transition-colors relative shadow-inner", soundEnabled ? "bg-indigo-500" : "bg-black/50 border border-white/[0.05]")}>
                                                <div className={cn("absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm", soundEnabled ? "left-[16px]" : "left-[2px]")} />
                                            </div>
                                        </div>
                                    )}

                                    {showMultiShotsToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-4 cursor-pointer hover:bg-white/[0.04] transition-all shadow-inner" onClick={() => setMultiShots(!multiShots)}>
                                            <span className="text-[11px] font-semibold text-zinc-300">Multi-Shots</span>
                                            <div className={cn("w-8 h-4.5 rounded-full transition-colors relative shadow-inner", multiShots ? "bg-indigo-500" : "bg-black/50 border border-white/[0.05]")}>
                                                <div className={cn("absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm", multiShots ? "left-[16px]" : "left-[2px]")} />
                                            </div>
                                        </div>
                                    )}

                                    {showFixedLensToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-4 cursor-pointer hover:bg-white/[0.04] transition-all shadow-inner" onClick={() => setFixedLens(!fixedLens)}>
                                            <span className="text-[11px] font-semibold text-zinc-300">Fixed Lens</span>
                                            <div className={cn("w-8 h-4.5 rounded-full transition-colors relative shadow-inner", fixedLens ? "bg-indigo-500" : "bg-black/50 border border-white/[0.05]")}>
                                                <div className={cn("absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm", fixedLens ? "left-[16px]" : "left-[2px]")} />
                                            </div>
                                        </div>
                                    )}

                                    {showGenAudioToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-4 cursor-pointer hover:bg-white/[0.04] transition-all shadow-inner" onClick={() => setGenerateAudio(!generateAudio)}>
                                            <span className="text-[11px] font-semibold text-zinc-300">Audio Synthesis</span>
                                            <div className={cn("w-8 h-4.5 rounded-full transition-colors relative shadow-inner", generateAudio ? "bg-indigo-500" : "bg-black/50 border border-white/[0.05]")}>
                                                <div className={cn("absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm", generateAudio ? "left-[16px]" : "left-[2px]")} />
                                            </div>
                                        </div>
                                    )}

                                    {showPromptOptimizerToggle && (
                                        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-4 cursor-pointer hover:bg-white/[0.04] transition-all shadow-inner" onClick={() => setPromptOptimizer(!promptOptimizer)}>
                                            <span className="text-[11px] font-semibold text-zinc-300">Prompt Optimizer</span>
                                            <div className={cn("w-8 h-4.5 rounded-full transition-colors relative shadow-inner", promptOptimizer ? "bg-indigo-500" : "bg-black/50 border border-white/[0.05]")}>
                                                <div className={cn("absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm", promptOptimizer ? "left-[16px]" : "left-[2px]")} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="flex-none p-6 pt-2 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-md z-30 flex gap-3">
                {isGenerating && onCancel && (
                    <Button
                        onClick={onCancel}
                        variant="destructive"
                        className="w-14 h-[56px] rounded-2xl flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 shadow-none transition-all duration-300"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                )}
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className={cn(
                        "flex-1 h-[56px] rounded-2xl text-[14px] font-semibold tracking-[0.15em] uppercase transition-all duration-500 group relative overflow-hidden",
                        isGenerating || !prompt
                            ? "bg-white/[0.03] text-zinc-600 cursor-not-allowed shadow-none border border-white/[0.05]"
                            : "bg-white hover:bg-zinc-100 text-black border-none shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] hover:scale-[1.01] active:scale-[0.99]"
                    )}
                >
                    {isGenerating ? (
                        <span className="flex items-center gap-2 animate-pulse text-zinc-500">
                            <span className="text-[11px] uppercase font-bold tracking-widest text-[#8B5CF6] px-3 py-1 rounded-full">Processing</span>
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2 relative z-10 transition-transform duration-300">
                            <Sparkles className={cn("w-4 h-4 transition-transform duration-500 group-hover:rotate-12", isGenerating || !prompt ? "opacity-50" : "text-black")} />
                            Generate
                            {selectedModel.cost !== undefined && (
                                <div className="flex items-center gap-1.5 ml-2 pl-2 pr-3 py-1 rounded-full bg-black/10 border border-black/10 shadow-inner group-hover:bg-black/15 transition-colors">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
                                        <Sparkles className="w-2 h-2 text-white fill-white" />
                                    </div>
                                    <span className="text-[11px] font-bold text-black tabular-nums tracking-widest">{selectedModel.cost}</span>
                                </div>
                            )}
                        </span>
                    )}
                </Button>
            </div>
        </div>
    );
}

