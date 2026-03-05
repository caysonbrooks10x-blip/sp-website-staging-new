import { Button } from "@/components/ui/button";
import { Coins, User, Sparkles, Image as ImageIcon, Video, Layers, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudioTopNavProps {
    mode: "image" | "video" | "templates";
    setMode: (mode: "image" | "video" | "templates") => void;
}

export function StudioTopNav({ mode, setMode }: StudioTopNavProps) {
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1400px] px-6">
            <div className="h-16 w-full bg-white/[0.04] backdrop-blur-[20px] border border-white/[0.08] rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-between px-5">

                {/* Logo Area */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                        <Wand2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-bold text-[17px] tracking-tight">StudioX</span>
                </div>

                {/* Center Mode Switcher */}
                <div className="flex items-center bg-black/40 rounded-full p-1 border border-white/[0.05] relative">
                    <div
                        className={cn(
                            "absolute inset-y-1 w-[100px] bg-white/[0.1] rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.2)] border border-white/[0.1] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            mode === 'image' ? "left-1" : mode === 'video' ? "left-[105px]" : "left-[209px]"
                        )}
                    />

                    <button
                        onClick={() => setMode('image')}
                        className={cn("w-[100px] py-1.5 flex items-center justify-center gap-2 relative z-10 transition-colors duration-300", mode === 'image' ? "text-white" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-xs font-semibold">Image</span>
                    </button>

                    <button
                        onClick={() => setMode('video')}
                        className={cn("w-[100px] py-1.5 flex items-center justify-center gap-2 relative z-10 transition-colors duration-300", mode === 'video' ? "text-white" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        <Video className="w-4 h-4" />
                        <span className="text-xs font-semibold">Video</span>
                    </button>

                    <button
                        onClick={() => setMode('templates')}
                        className={cn("w-[100px] py-1.5 flex items-center justify-center gap-2 relative z-10 transition-colors duration-300", mode === 'templates' ? "text-white" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        <Layers className="w-4 h-4" />
                        <span className="text-xs font-semibold">Templates</span>
                    </button>
                </div>

                {/* Right Area (Credits & Profile) */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full hover:bg-white/[0.08] transition-colors cursor-pointer group">
                        <Sparkles className="w-4 h-4 text-violet-400 group-hover:text-cyan-400 transition-colors" />
                        <span className="text-sm font-bold text-white tracking-wide">4,250</span>
                    </div>
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] transition-colors">
                        <User className="w-5 h-5 text-zinc-300" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
