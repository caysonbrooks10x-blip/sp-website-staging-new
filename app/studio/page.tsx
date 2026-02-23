"use client";

import { useState, Suspense } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { StudioLeftPanel } from "../../components/studio/left-panel";
import { StudioMainContent, type GenerationItem } from "../../components/studio/main-content";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function StudioPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>}>
        <StudioLayout />
      </Suspense>
    </ProtectedRoute>
  )
}

function StudioLayout() {
  const searchParams = useSearchParams();
  const initMode = (searchParams.get("mode") as "image" | "video") || "image";
  const initPrompt = searchParams.get("prompt") || "";
  const initPreviewUrl = searchParams.get("previewUrl") || "";

  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<"image" | "video">(initMode);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);

  const handleGenerate = async (prompt: string, settings: any) => {
    setIsGenerating(true);

    // Create new generation item
    const newItem: GenerationItem = {
      id: crypto.randomUUID(),
      type: mode,
      prompt: prompt,
      status: "queued"
    };

    // Add to list (prepend)
    setGenerations(prev => [newItem, ...prev]);

    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Update item to completed
    setGenerations(prev => prev.map(item =>
      item.id === newItem.id
        ? { ...item, status: "completed", src: mode === 'image' ? "/createcard.jpeg" : "/studiox.jpg" } // using existing placeholder assets
        : item
    ));

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-[#07080f] text-zinc-100 font-sans relative selection:bg-indigo-500/30 pb-20 overflow-x-hidden">
      {/* Background Cinematic Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[150px] animate-pulse-slow" />
        <div className="absolute top-[30%] right-[-10%] w-[40%] h-[50%] bg-indigo-800/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[30%] w-[60%] h-[60%] bg-violet-900/15 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-slate-950/40 pointer-events-none mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex max-w-[1920px] mx-auto pt-24 px-4 sm:px-6 lg:px-8 gap-6 min-h-screen">
        {/* Sticky Left Sidebar */}
        <div className="w-[420px] shrink-0 sticky top-24 self-start h-[calc(100vh-120px)] hidden lg:block rounded-3xl shadow-2xl">
          <StudioLeftPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            mode={mode}
            setMode={setMode}
            initialPrompt={initPrompt}
            initialPreviewUrl={initPreviewUrl}
          />
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 min-w-0 pb-12">
          <StudioMainContent mode={mode} generations={generations} />
        </div>
      </div>
    </div>
  );
}
