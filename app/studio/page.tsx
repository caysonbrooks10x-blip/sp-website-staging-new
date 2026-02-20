"use client";

import { useState, Suspense } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { StudioLeftPanel } from "../../components/studio/left-panel";
import { StudioMainContent, type GenerationItem } from "../../components/studio/main-content";
import { Loader2 } from "lucide-react";

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<"image" | "video">("image");
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
    <div className="flex h-screen bg-black text-zinc-100 font-sans overflow-hidden relative">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-70 select-none pointer-events-none z-0"
      >
        <source src="/studio-background-new.mp4" type="video/mp4" />
      </video>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/40 pointer-events-none z-0" />

      {/* Content */}
      <div className="relative z-10 flex h-[calc(100vh-64px)] w-full mt-[64px] overflow-hidden">
        <StudioLeftPanel
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          mode={mode}
          setMode={setMode}
        />
        <StudioMainContent mode={mode} generations={generations} />
      </div>
    </div>
  );
}
