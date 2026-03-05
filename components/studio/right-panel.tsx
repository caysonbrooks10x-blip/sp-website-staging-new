"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Download, Share, Archive, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { GenerationItem } from "./center-canvas";

interface StudioRightPanelProps {
    generations: GenerationItem[];
}

export function StudioRightPanel({ generations }: StudioRightPanelProps) {
    const [activeTab, setActiveTab] = useState<"history" | "saved">("history");

    return (
        <div className="w-[320px] h-[calc(100vh-140px)] flex flex-col bg-white/[0.05] backdrop-blur-[20px] border border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-[20px] relative z-20 flex-shrink-0 text-zinc-100 overflow-hidden transition-all duration-500">

            {/* Tabs */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.05] bg-white/[0.02]">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all", activeTab === 'history' ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        History
                    </button>
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all", activeTab === 'saved' ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        Saved
                    </button>
                </div>
            </div>

            {/* Scrollable History Grid */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-3">
                {generations.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                        <Archive className="w-8 h-8 mb-2" />
                        <span className="text-xs font-semibold uppercase tracking-wider">No History</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {generations.map((item) => (
                            <div key={item.id} className="aspect-[4/5] bg-[#0A0A0A] rounded-xl border border-white/[0.05] overflow-hidden relative group hover:border-white/[0.2] transition-colors shadow-sm">
                                {item.status === 'queued' || item.status === 'generating' ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/[0.02] border border-white/[0.05] border-dashed rounded-xl">
                                        <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                                    </div>
                                ) : (
                                    <>
                                        <Image
                                            src={item.src || "/placeholder.svg"}
                                            alt={item.prompt}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex justify-end">
                                                <CheckCircle2 className="w-4 h-4 text-white/50" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Fixed Footer Actions */}
            <div className="flex-shrink-0 p-4 border-t border-white/[0.05] bg-white/[0.02]">
                <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-xs font-semibold rounded-xl text-zinc-300">
                        <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                    <Button variant="ghost" size="icon" className="w-9 h-9 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] rounded-xl text-zinc-300">
                        <Share className="w-4 h-4" />
                    </Button>
                </div>
            </div>

        </div>
    );
}
