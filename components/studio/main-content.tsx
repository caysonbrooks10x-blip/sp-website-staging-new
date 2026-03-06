"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Clock,
    ChevronDown,
    LayoutGrid,
    Maximize,
    Download,
    Settings2,
    Sparkles,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export interface GenerationItem {
    id: string;
    type: "image" | "video";
    src?: string;
    prompt: string;
    status: "queued" | "generating" | "completed";
}

interface StudioMainContentProps {
    mode: "image" | "video";
    generations: GenerationItem[];
}

export function StudioMainContent({ mode, generations }: StudioMainContentProps) {
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showOutputSettings, setShowOutputSettings] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(mode === "video" ? "16:9" : "4:3");
    const [resolution, setResolution] = useState(mode === "video" ? "5s" : "1K");

    if (mode === "video" && resolution === "1K") setResolution("5s");
    if (mode === "image" && resolution === "5s") setResolution("1K");

    return (
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
            <div className="sticky top-24 z-30 mb-8">
                <header className="h-[72px] rounded-3xl border border-white/[0.12] flex items-center justify-between px-6 bg-white/[0.04] backdrop-blur-[50px] shadow-[0_8px_32px_0_rgba(18,10,40,0.6)] transition-all duration-500">
                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 gap-2.5 px-4 text-violet-200 hover:text-white hover:bg-white/[0.08] rounded-xl font-bold tracking-wide transition-colors">
                                    <Clock className="w-4 h-4 text-violet-400" />
                                    {mode === "video" ? "Video History" : "Generation History"}
                                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 bg-[#1A0B38]/95 backdrop-blur-3xl border-white/[0.15] text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-2xl p-1.5 z-50">
                                <DropdownMenuItem className="hover:bg-white/[0.1] focus:bg-white/[0.1] cursor-pointer rounded-xl p-2.5 transition-colors font-medium">All Generations</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-white/[0.1] focus:bg-white/[0.1] cursor-pointer rounded-xl p-2.5 transition-colors font-medium">Favorites</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-white/[0.1] focus:bg-white/[0.1] cursor-pointer rounded-xl p-2.5 transition-colors font-medium">Archived</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-violet-300 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors">
                            <LayoutGrid className="w-[18px] h-[18px]" />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("h-10 w-10 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors", showOutputSettings ? "bg-white/[0.1] text-white" : "text-violet-300")} onClick={() => setShowOutputSettings(!showOutputSettings)}>
                            <Settings2 className="w-[18px] h-[18px]" />
                        </Button>
                        <Button className="bg-white text-violet-900 hover:bg-violet-100 h-9 text-[13px] font-extrabold px-5 ml-3 rounded-xl shadow-[0_4px_15px_rgba(255,255,255,0.2)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.3)] transition-all active:scale-[0.98]">
                            Select All
                        </Button>
                    </div>
                </header>
            </div>

            {/* Content Area */}
            <main className="flex-1 relative z-10">
                <div className="w-full">
                    <div className="mb-8">
                        <h1 className="text-[32px] font-extrabold text-white mb-8 tracking-tight drop-shadow-sm">Ready to Create</h1>

                        {generations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[500px] border border-white/[0.12] rounded-[32px] bg-white/[0.04] backdrop-blur-[50px] hover:bg-white/[0.06] transition-all duration-500 group relative overflow-hidden shadow-[0_8px_32px_0_rgba(18,10,40,0.6)]">
                                <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/10 via-transparent to-fuchsia-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                <div className="w-28 h-28 rounded-[28px] bg-white/[0.04] border border-white/[0.12] shadow-[0_0_40px_rgba(139,92,246,0.15)] flex items-center justify-center mb-8 group-hover:scale-[1.15] group-hover:rotate-3 transition-all duration-[600ms] ease-out relative">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 to-fuchsia-500/20 rounded-[28px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <Sparkles className="w-12 h-12 text-violet-300 group-hover:text-fuchsia-200 transition-colors duration-500 relative z-10" />
                                </div>

                                <h3 className="text-3xl font-bold text-white group-hover:text-violet-50 transition-colors mb-3 tracking-tight drop-shadow-md">Start Creating Magic</h3>
                                <p className="text-violet-200/60 group-hover:text-violet-200 text-center max-w-[400px] transition-colors mb-8 text-[15px] font-medium leading-relaxed">
                                    Your creative journey begins here. Use the studio dashboard on the left to start synthesizing your first {mode}.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {generations.map((item) => (
                                    <div key={item.id} className="aspect-[4/5] bg-white/[0.04] rounded-[24px] p-1.5 border border-white/[0.08] overflow-hidden relative group hover:border-white/[0.2] hover:bg-white/[0.08] transition-all duration-500 shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                                        <div className="relative w-full h-full rounded-[18px] overflow-hidden bg-black/60 shadow-inner">
                                            {item.status === 'queued' || item.status === 'generating' ? (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/[0.02] border border-white/[0.1] border-dashed rounded-[18px]">
                                                    <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_25px_rgba(139,92,246,0.3)]">
                                                        <Clock className="w-5 h-5 text-violet-300" />
                                                    </div>
                                                    <span className="text-[11px] font-extrabold tracking-[0.2em] text-violet-300 uppercase">{item.status}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Image
                                                        src={item.src || "/placeholder.svg"}
                                                        alt={item.prompt}
                                                        fill
                                                        className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110"
                                                    />
                                                    {/* Overlay Actions */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3.5">
                                                        <div className="flex justify-end">
                                                            <button className="w-7 h-7 rounded-full border border-white/40 bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/30 hover:scale-110 transition-all shadow-lg">
                                                                <CheckCircle2 className="w-4 h-4 text-white opacity-60 group-hover:opacity-100 transition-opacity" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-3 justify-center translate-y-6 group-hover:translate-y-0 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] pb-1">
                                                            <Button size="icon" className="h-10 w-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-violet-900 backdrop-blur-md border border-white/20 shadow-xl transition-all hover:scale-110 float">
                                                                <Maximize className="w-[18px] h-[18px]" />
                                                            </Button>
                                                            <Button size="icon" className="h-10 w-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-violet-900 backdrop-blur-md border border-white/20 shadow-xl transition-all hover:scale-110 float" style={{ animationDelay: '50ms' }}>
                                                                <Download className="w-[18px] h-[18px]" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Output Settings Panel (Floating) */}
                <AnimatePresence>
                    {showOutputSettings && (
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1A0B38]/95 backdrop-blur-3xl border border-white/[0.15] rounded-[24px] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.7)] w-[420px] z-50 flex flex-col gap-6"
                        >
                            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                                <h3 className="text-[15px] font-bold text-white tracking-wide">Output Geometry</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-violet-300 hover:text-white rounded-full hover:bg-white/[0.1] transition-colors" onClick={() => setShowOutputSettings(false)}>
                                    <ChevronDown className="w-[18px] h-[18px]" />
                                </Button>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-3.5">
                                    <label className="text-[11px] uppercase font-bold text-violet-300/70 tracking-widest">Aspect Ratio</label>
                                    <div className="grid grid-cols-4 gap-2.5">
                                        {["1:1", "4:3", "3:2", "16:9"].map((ratio) => (
                                            <button
                                                key={ratio}
                                                onClick={() => setAspectRatio(ratio)}
                                                className={cn(
                                                    "py-2.5 px-1 rounded-xl text-[13px] font-bold transition-all duration-300 shadow-sm border",
                                                    aspectRatio === ratio
                                                        ? mode === 'image'
                                                            ? "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.2)]"
                                                            : "bg-indigo-500/20 text-indigo-200 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                                        : "bg-white/[0.03] text-violet-200/50 border-white/[0.08] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.2]"
                                                )}
                                            >
                                                {ratio}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3.5">
                                    <label className="text-[11px] uppercase font-bold text-violet-300/70 tracking-widest">
                                        {mode === "video" ? "Duration" : "Resolution"}
                                    </label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {(mode === "video" ? ["5s", "10s"] : ["1K", "2K", "4K"]).map((res) => (
                                            <button
                                                key={res}
                                                onClick={() => setResolution(res)}
                                                className={cn(
                                                    "py-2.5 px-1 rounded-xl text-[13px] font-bold transition-all duration-300 shadow-sm border",
                                                    resolution === res
                                                        ? mode === 'image'
                                                            ? "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.2)]"
                                                            : "bg-indigo-500/20 text-indigo-200 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                                        : "bg-white/[0.03] text-violet-200/50 border-white/[0.08] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.2]"
                                                )}
                                            >
                                                {res}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
