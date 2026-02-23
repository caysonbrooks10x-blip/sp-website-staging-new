"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ChevronDown,
    Sparkles,
    Image as ImageIcon,
    Video,
    Music,
    Box,
    ChevronLeft,
    Upload,
    Zap,
    LayoutTemplate,
    Wand2,
    Maximize2
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
    isGenerating: boolean;
    mode: "image" | "video";
    setMode: (mode: "image" | "video") => void;
    initialPrompt?: string;
    initialPreviewUrl?: string;
}

export function StudioLeftPanel({ onGenerate, isGenerating, mode, setMode, initialPrompt = "", initialPreviewUrl = "" }: StudioLeftPanelProps) {
    const [activeTab, setActiveTab] = useState<"create" | "variations">("create");
    // Local mode state removed in favor of prop
    const [prompt, setPrompt] = useState(initialPrompt);
    const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);

    useEffect(() => {
        if (initialPrompt) setPrompt(initialPrompt);
        if (initialPreviewUrl) setPreviewUrl(initialPreviewUrl);
    }, [initialPrompt, initialPreviewUrl]);

    const [autoPolish, setAutoPolish] = useState(false);

    // Local state for model selection
    const [selectedModel, setSelectedModel] = useState<"Nano" | "OpenAI" | "Veo">("Nano");

    // Reset model when mode changes
    if (mode === 'image' && selectedModel === 'Veo') setSelectedModel('Nano');
    // if (mode === 'video' && selectedModel !== 'Veo') setSelectedModel('Veo');

    // Derived display values
    const modelDisplay = {
        Nano: { name: "Nano", sub: "Banana Pro", icon: "G", color: "bg-zinc-800 text-white" },
        OpenAI: { name: "OpenAI", sub: "DALL-E 3", icon: "O", color: "bg-green-600 text-white" },
        Veo: { name: "Veo", sub: "2.0 Flash", icon: "V", color: "bg-purple-900/50 text-purple-300" }
    };

    const currentModel = modelDisplay[selectedModel];

    // Derived state based on mode
    const aspectRatio = mode === 'video' ? "16:9" : "4:3";
    const resolution = mode === 'video' ? "5s" : "1K";

    const [outputCount, setOutputCount] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = () => {
        onGenerate(prompt, {
            mode,
            model: selectedModel,
            aspectRatio,
            resolution,
            outputCount,
            autoPolish
        });
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#0B0F19]/60 backdrop-blur-3xl border border-indigo-500/10 rounded-3xl relative z-20 flex-shrink-0 text-zinc-100 overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="h-16 flex items-center px-6 border-b border-white/5">
                <Button variant="ghost" size="icon" className="mr-2 text-zinc-400 hover:text-white">
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-semibold">
                    {activeTab === 'create'
                        ? (mode === 'image' ? 'Create Image' : 'Create Video')
                        : (mode === 'image' ? 'Image Variations' : 'Video Variations')}
                </h1>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-8">
                {/* Mode Switcher - Large & Premium */}
                <div className="bg-[#06080D]/40 p-1.5 rounded-2xl border border-indigo-500/10 flex relative mt-2">
                    <div
                        className={cn(
                            "absolute inset-y-1.5 w-[calc(50%-6px)] bg-[#1A2235] rounded-xl shadow-lg border border-indigo-500/20 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            mode === 'video' ? "left-[calc(50%+3px)]" : "left-1.5"
                        )}
                    />
                    <button
                        onClick={() => setMode('image')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl relative z-10 transition-colors duration-300",
                            mode === 'image' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <ImageIcon className={cn("w-4 h-4", mode === 'image' ? "fill-white/20" : "")} />
                        <span className="font-semibold text-sm">Image</span>
                    </button>
                    <button
                        onClick={() => setMode('video')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl relative z-10 transition-colors duration-300",
                            mode === 'video' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Video className={cn("w-4 h-4", mode === 'video' ? "fill-white/20" : "")} />
                        <span className="font-semibold text-sm">Video</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="p-1 bg-[#0D111D] rounded-xl flex gap-1">
                    <button
                        onClick={() => setActiveTab("create")}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-2 relative overflow-hidden",
                            activeTab === "create"
                                ? "text-white bg-[#1A2235] shadow-lg border border-indigo-500/20"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        {activeTab === "create" && <div className={cn("absolute inset-0 bg-gradient-to-br from-transparent", mode === 'image' ? "from-pink-500/10" : "from-blue-500/10")} />}
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center mb-1 relative z-10",
                            activeTab === "create"
                                ? (mode === 'image' ? "bg-pink-500 text-white" : "bg-blue-600 text-white")
                                : "bg-zinc-800 text-zinc-600"
                        )}>
                            {mode === 'image' ? <Sparkles className="w-4 h-4 fill-current" /> : <Video className="w-4 h-4 fill-current" />}
                        </div>
                        <span className="relative z-10">{mode === 'image' ? 'Create Image' : 'Create Video'}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("variations")}
                        className={cn(
                            "flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-2 relative overflow-hidden",
                            activeTab === "variations"
                                ? "text-white bg-[#1A2235] shadow-lg border border-indigo-500/20"
                                : "text-zinc-500 hover:text-indigo-200"
                        )}
                    >
                        {activeTab === "variations" && <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />}
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center mb-1 relative z-10",
                            activeTab === "variations" ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-600"
                        )}>
                            <LayoutTemplate className="w-4 h-4 fill-current" />
                        </div>
                        <span className="relative z-10">{mode === 'image' ? 'Image Variations' : 'Video Variations'}</span>
                    </button>
                </div>

                {/* Describe Image */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-zinc-200">Describe your {mode}</label>
                        <Maximize2 className="w-3 h-3 text-zinc-500 cursor-pointer hover:text-zinc-300" />
                    </div>

                    <div className="relative bg-[#0D111D] rounded-2xl border border-indigo-500/10 overflow-hidden group focus-within:border-indigo-500/50 transition-colors py-2">

                        {/* Upload Area */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="mx-4 mt-2 p-2 rounded-xl border border-indigo-900/30 bg-[#131A2B] hover:bg-[#1A2235] cursor-pointer flex items-center gap-3 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                                {previewUrl ? (
                                    <video src={previewUrl} className="object-cover w-full h-full opacity-80" autoPlay loop muted playsInline />
                                ) : mode === 'image' ? (
                                    <Image src="/createcard.jpeg" alt="Upload" fill className="object-cover opacity-80" />
                                ) : (
                                    <Video className="w-4 h-4 text-zinc-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-indigo-200 truncate">Add visual references <span className="text-indigo-400 ml-1">Optional</span></div>
                                <div className="text-[10px] text-indigo-400/70 truncate">Guide the look and keep things consistent.</div>
                            </div>
                            <span className="text-[10px] font-medium text-indigo-400/50">0/10</span>
                            <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*" />
                        </div>

                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="What do you want to see? Example: 'A cat sitting on a table, warm morning light.'"
                            className="resize-none min-h-[120px] bg-transparent border-none text-indigo-100 placeholder:text-indigo-900/40 focus-visible:ring-0 p-4 text-sm leading-relaxed"
                        />

                        <div className="px-4 pb-2 flex items-center justify-between">
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white rounded-full hover:bg-white/10">
                                    <Box className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white rounded-full hover:bg-white/10">
                                    <Wand2 className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-zinc-400">Auto Polish</span>
                                <Switch checked={autoPolish} onCheckedChange={setAutoPolish} className="scale-75 data-[state=checked]:bg-zinc-200" />
                            </div>
                        </div>

                        {/* Random Prompt Button */}
                        <div className="absolute right-4 bottom-20">
                            <button className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-400 flex items-center justify-center transition-colors shadow-lg shadow-orange-500/20 translate-y-1/2">
                                <Zap className="w-4 h-4 text-black fill-current" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Adjust Settings - MATCHING SCREENSHOT */}
                <div className="space-y-4">
                    <label className="text-sm font-semibold text-zinc-200">Adjust Settings</label>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Model Selector */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="p-4 bg-[#0D111D] rounded-2xl border border-indigo-500/10 flex flex-col justify-between cursor-pointer hover:border-indigo-500/40 transition-colors h-24 shadow-lg shadow-black/20">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">MODEL</span>
                                        <ChevronDown className="w-3 h-3 text-zinc-600" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", currentModel.color)}>
                                            {currentModel.icon}
                                        </div>
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-sm font-semibold text-white">{currentModel.name}</span>
                                            <span className="text-[10px] text-zinc-500 font-medium">{currentModel.sub}</span>
                                        </div>
                                    </div>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[180px] bg-[#0D111D] border-indigo-500/20 text-indigo-100 shadow-xl shadow-black/40">
                                <>
                                    <DropdownMenuItem onClick={() => setSelectedModel("Nano")} className="hover:bg-white/5 cursor-pointer flex gap-2">
                                        <div className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[8px] font-bold">G</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold">Nano</span>
                                            <span className="text-[8px] text-zinc-500">Banana Pro</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSelectedModel("OpenAI")} className="hover:bg-white/5 cursor-pointer flex gap-2">
                                        <div className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-[8px] font-bold">O</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold">OpenAI</span>
                                            <span className="text-[8px] text-zinc-500">DALL-E 3</span>
                                        </div>
                                    </DropdownMenuItem>
                                    {mode === 'video' && (
                                        <DropdownMenuItem onClick={() => setSelectedModel("Veo")} className="hover:bg-white/5 cursor-pointer flex gap-2">
                                            <div className="w-4 h-4 rounded-full bg-purple-900/50 text-purple-300 flex items-center justify-center text-[8px] font-bold">V</div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold">Veo</span>
                                                <span className="text-[8px] text-zinc-500">2.0 Flash</span>
                                            </div>
                                        </DropdownMenuItem>
                                    )}
                                </>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Output Settings Display */}
                        <div className="p-4 bg-[#0D111D] rounded-2xl border border-indigo-500/10 flex flex-col justify-between cursor-pointer hover:border-indigo-500/40 transition-colors h-24 shadow-lg shadow-black/20">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">OUTPUT</span>
                            <div className="flex items-center gap-2">
                                <LayoutTemplate className="w-5 h-5 text-zinc-500" />
                                <span className="text-sm font-semibold text-white">{aspectRatio} <span className="text-zinc-600 mx-1">|</span> {resolution}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Count & Generate */}
                <div className="flex gap-3 items-stretch h-14">
                    <div className="flex items-center gap-4 bg-[#0D111D] px-5 rounded-2xl border border-indigo-500/10 shadow-lg shadow-black/20">
                        <button
                            onClick={() => setOutputCount(Math.max(1, outputCount - 1))}
                            className="text-zinc-500 hover:text-white transition-colors text-lg"
                        >
                            -
                        </button>
                        <span className="text-sm font-semibold w-4 text-center text-white">{outputCount}/4</span>
                        <button
                            onClick={() => setOutputCount(Math.min(4, outputCount + 1))}
                            className="text-zinc-500 hover:text-white transition-colors text-lg"
                        >
                            +
                        </button>
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt}
                        className={cn(
                            "flex-1 rounded-2xl text-base font-semibold shadow-xl border-0 transition-all active:scale-[0.98]",
                            mode === 'image'
                                ? "bg-gradient-to-r from-[#d9005c] to-[#9d00c6] hover:from-[#c20052] hover:to-[#8a00ae] shadow-pink-900/20"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/20"
                        )}
                    >
                        {isGenerating ? "Generating..." : (
                            <span className="flex items-center gap-2">Generate <Sparkles className="w-4 h-4 fill-current text-yellow-300" /> 80</span>
                        )}
                    </Button>
                </div>

            </div>

            {/* Footer Navigation - Removed Mode Switcher */}
            <div className="mt-auto px-6 py-4 flex justify-end items-center bg-black/20 border-t border-white/5">
                <div className="flex gap-3 text-zinc-600">
                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-white rounded-full"><Maximize2 className="w-4 h-4" /></Button>
                </div>
            </div>
        </div>
    );
}
