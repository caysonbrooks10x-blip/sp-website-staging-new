"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Clock,
    ChevronDown,
    LayoutGrid,
    Maximize,
    MoreVertical,
    Download,
    Share2,
    Trash2,
    Settings2,
    Image as ImageIcon,
    Sparkles
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

    // Reset defaults when mode changes
    // This is a simple implementation; normally use useEffect or derived state if more complex
    if (mode === "video" && resolution === "1K") setResolution("5s");
    if (mode === "image" && resolution === "5s") setResolution("1K");

    return (
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
            {/* ... Header ... */}
            <div className="sticky top-24 z-30 mb-8">
                <header className="h-16 rounded-2xl border border-indigo-500/10 flex items-center justify-between px-6 bg-[#0B0F19]/60 backdrop-blur-3xl shadow-xl">
                    {/* ... existing header content ... */}
                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-9 gap-2 px-3 text-zinc-200 hover:text-white hover:bg-white/5 font-medium">
                                    <Clock className="w-4 h-4 text-zinc-400" />
                                    {mode === "video" ? "Video History" : "Generation History"}
                                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 bg-[#0D111D] border-indigo-500/20 text-indigo-100 shadow-2xl">
                                <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">All Generations</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">Favorites</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">Archived</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5">
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5" onClick={() => setShowOutputSettings(!showOutputSettings)}>
                            <Settings2 className="w-4 h-4" />
                        </Button>
                        <Button className="bg-white text-black hover:bg-zinc-200 h-8 text-xs font-semibold px-4 rounded-lg">
                            Select All
                        </Button>
                    </div>
                </header>
            </div>

            {/* Content Area */}
            <main className="flex-1 relative">
                <div className="w-full">
                    {/* Main Grid */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-6">Ready to create</h1>

                        {generations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[600px] border border-dashed border-indigo-500/20 rounded-3xl bg-gradient-to-b from-indigo-500/5 to-transparent hover:border-indigo-500/40 transition-all duration-500 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-8 ring-1 ring-white/10 group-hover:scale-110 group-hover:ring-white/20 transition-all duration-500 relative">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <Sparkles className="w-12 h-12 text-zinc-500 group-hover:text-white transition-colors duration-500 relative z-10" />
                                </div>

                                <h3 className="text-2xl font-bold text-zinc-300 group-hover:text-white transition-colors mb-3">Start Creating Magic</h3>
                                <p className="text-zinc-500 group-hover:text-zinc-400 text-center max-w-sm transition-colors mb-8">
                                    Your creative journey starts here. Use the panel on the left to generate your first {mode}.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {generations.map((item) => (
                                    <div key={item.id} className="aspect-[4/5] bg-[#0D111D] rounded-2xl overflow-hidden relative group border border-transparent hover:border-indigo-500/30 transition-all shadow-xl shadow-black/20">
                                        {item.status === 'queued' || item.status === 'generating' ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#06080D] border border-indigo-500/20 border-dashed rounded-2xl">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
                                                    <Clock className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <span className="text-sm font-medium text-emerald-500">Queued</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Image
                                                    src={item.src || "/placeholder.svg"}
                                                    alt={item.prompt}
                                                    fill
                                                    className="object-cover transition-opacity duration-500"
                                                />
                                                {/* Overlay Actions */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                                    <div className="flex justify-end">
                                                        <input type="checkbox" className="rounded-full border-white/50 bg-black/40 text-white focus:ring-0 w-5 h-5" />
                                                    </div>
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <Button size="icon" className="h-8 w-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/10">
                                                            <Maximize className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button size="icon" className="h-8 w-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/10">
                                                            <Download className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
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
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0D111D] border border-indigo-500/20 rounded-2xl p-4 shadow-2xl w-[400px] z-50 flex flex-col gap-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-white">Output Settings</h3>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setShowOutputSettings(false)}>
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Aspect Ratio</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {["1:1", "4:3", "3:2", "16:9"].map((ratio) => (
                                            <button
                                                key={ratio}
                                                onClick={() => setAspectRatio(ratio)}
                                                className={cn(
                                                    "py-2 px-1 rounded-lg text-xs font-medium transition-all border",
                                                    aspectRatio === ratio
                                                        ? "bg-indigo-500 text-white border-indigo-400"
                                                        : "bg-[#1A2235] text-indigo-200 border-transparent hover:bg-indigo-900/50"
                                                )}
                                            >
                                                {ratio}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                        {mode === "video" ? "Duration" : "Resolution"}
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(mode === "video" ? ["5s", "10s"] : ["1K", "2K", "4K"]).map((res) => (
                                            <button
                                                key={res}
                                                onClick={() => setResolution(res)}
                                                className={cn(
                                                    "py-2 px-1 rounded-lg text-xs font-medium transition-all border",
                                                    resolution === res
                                                        ? "bg-indigo-500 text-white border-indigo-400"
                                                        : "bg-[#1A2235] text-indigo-200 border-transparent hover:bg-indigo-900/50"
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
