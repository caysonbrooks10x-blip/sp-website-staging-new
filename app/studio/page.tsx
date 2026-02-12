"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Image as ImageIcon,
  CreditCard,
  Plus,
  ArrowLeft,
  Sparkles,
  Paperclip,
  X,
  Send,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { communityPosts } from "@/lib/community-data";
import { useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";

// --- Types ---
type StudioTab = "studio" | "nano" | "openai";

export default function StudioPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-black" />}>
        <StudioContent />
      </Suspense>
    </ProtectedRoute>
  )
}

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<StudioTab>("studio");
  const [remixPrompt, setRemixPrompt] = useState("");

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'studio' || tabParam === 'nano' || tabParam === 'openai' || tabParam === 'sora') {
      setActiveTab(tabParam === 'sora' ? 'openai' : tabParam as StudioTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const mode = searchParams.get('mode');
    const sourceId = searchParams.get('source');
    if (mode === 'remix' && sourceId) {
      const post = communityPosts.find(p => p.id === sourceId);
      if (post) {
        setRemixPrompt(post.description || post.title);
        setActiveTab("nano");
      }
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-white/20 pt-16">
      <StudioSidebar activeTab={activeTab} setActiveTab={(t) => {
        setActiveTab(t);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', t);
        window.history.pushState({}, '', url.toString());
      }} />
      <main className="flex-1 relative flex flex-col min-w-0 bg-[#050505]">
        <div className="flex-1 relative p-4 lg:p-12 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {activeTab === "studio" && <StudioGenView key="studio" />}
            {activeTab === "nano" && <NanoBananaView key="nano" initialPrompt={remixPrompt} />}
            {activeTab === "openai" && <OpenAIView key="openai" />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- SIDEBAR ---
const NanoBananaIcon = ({ className }: { className?: string }) => (
  <div className={cn("relative", className)}>
    <Image src="/assets/gemini.svg" alt="Gemini" fill className="object-contain" />
  </div>
);

const OpenAIIcon = ({ className }: { className?: string }) => (
  <div className={cn("relative", className)}>
    <Image src="/assets/openai.svg" alt="Open AI" fill className="object-contain invert contrast-200" />
  </div>
);

const StudioIcon = ({ className }: { className?: string }) => (
  <div className={cn("relative", className)}>
    <Sparkles className="w-full h-full text-white" />
  </div>
);

function StudioSidebar({ activeTab, setActiveTab }: { activeTab: StudioTab, setActiveTab: (t: StudioTab) => void }) {
  const navItems = [
    { id: "studio", label: "Studio", icon: StudioIcon, isCustom: true },
    { id: "nano", label: "Nano Banana", icon: NanoBananaIcon, isCustom: true },
    { id: "openai", label: "Open AI", icon: OpenAIIcon, isCustom: true },
  ];
  const router = useRouter();
  const { credits } = useAuth();

  return (
    <aside className="hidden md:flex w-[80px] lg:w-72 border-r border-white/5 flex-col bg-[#020202] flex-shrink-0 z-20 transition-all duration-300 sticky top-16 h-[calc(100vh-4rem)]">
      <div className="p-6 flex flex-col gap-2">
        <div className="hidden lg:block text-[10px] font-bold text-zinc-600 tracking-[0.2em] mb-4 pl-3 uppercase">Creative Suite</div>
        {navItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activeTab === item.id}
            onClick={() => setActiveTab(item.id as StudioTab)}
            isCustom={item.isCustom}
          />
        ))}
      </div>
      <div className="mt-auto p-6 border-t border-white/5">
        <div className="group relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/5 p-5 transition-all duration-500 hover:border-white/10 hover:bg-zinc-900/60">
          <div className="relative z-20 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Credits</span>
              <CreditCard className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <div>
              <div className="text-2xl font-medium text-white tracking-tight">
                {credits !== null ? credits.toLocaleString() : "..."}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Pro Plan Active</div>
            </div>
            <Button
              onClick={() => router.push('/pricing')}
              variant="outline"
              className="w-full h-9 rounded-lg border-white/5 bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-2 mt-1 focus-visible:ring-0 focus:outline-none"
            >
              <Plus className="w-3 h-3" /> Top Up
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({ icon: Icon, label, isActive, onClick, isCustom }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-center lg:justify-start gap-4 px-3 lg:px-4 py-3.5 rounded-xl text-sm transition-all duration-300 group relative focus-visible:ring-0 focus:outline-none",
        isActive
          ? "text-white bg-white/5"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
      )}
    >
      <div className={cn("w-5 h-5 lg:w-4 lg:h-4 flex items-center justify-center transition-all duration-300", isActive ? "opacity-100" : "opacity-50 group-hover:opacity-80")}>
        <Icon className={cn("w-full h-full", !isCustom && (isActive ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"))} />
      </div>
      <span className={cn("hidden lg:block font-medium tracking-wide", isActive ? "opacity-100" : "opacity-80")}>{label}</span>
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  )
}

// --- SHARED: CLASSY INPUT CARD ---
const ClassyInputCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("relative w-full overflow-hidden rounded-[2.5rem] border border-white/10 group shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-1000", className)}>
    {/* Background Image */}
    <div className="absolute inset-0 z-0">
      <Image
        src="/createcard.jpeg"
        fill
        className="object-cover opacity-60 blur-sm scale-[1.01] group-hover:scale-[1.03] transition-transform duration-[3s] ease-in-out"
        alt="Background"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-black/60 to-black/95" />
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
    </div>
    {/* Content Container */}
    <div className="relative z-10 h-full p-8 lg:p-12 flex flex-col justify-between">
      {children}
    </div>
  </div>
)

// --- HELPER: MODE TOGGLE ---
const ModeToggle = ({ mode, setMode, disabled = false }: { mode: 'image' | 'video', setMode?: (m: 'image' | 'video') => void, disabled?: boolean }) => (
  <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-full p-1 h-11 w-fit backdrop-blur-xl shadow-lg">
    <button
      onClick={() => !disabled && setMode?.('image')}
      className={cn(
        "px-6 h-full rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-2 focus-visible:ring-0 focus:outline-none",
        mode === 'image'
          ? "bg-white text-black shadow-lg shadow-white/10"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
      )}
    >
      <ImageIcon className="w-3.5 h-3.5" />
      Image
    </button>
    <button
      onClick={() => !disabled && setMode?.('video')}
      className={cn(
        "px-6 h-full rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-2 focus-visible:ring-0 focus:outline-none",
        mode === 'video'
          ? "bg-white text-black shadow-lg shadow-white/10"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
      )}
    >
      <Video className="w-3.5 h-3.5" />
      Video
    </button>
  </div>
)

// --- PREMIUM LOADER ---
const CosmicLoader = () => {
  const [status, setStatus] = useState("Initializing");
  useEffect(() => {
    const states = ["Parsing Logic", "Synthesizing Latent Space", "Enhancing Details", "Finalizing Output"];
    let i = 0;
    const interval = setInterval(() => {
      setStatus(states[i % states.length]);
      i++;
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40 backdrop-blur-md">
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Orbiting Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-white/5"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 rounded-full border border-white/5"
        />

        {/* Glowing Core */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-xl animate-pulse" />

        {/* Particles */}
        <div className="absolute inset-0">
          <span className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full blur-[1px] animate-[ping_2s_ease-in-out_infinite]" />
          <span className="absolute top-1/4 left-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
          <span className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-75" />
        </div>

        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white/80 animate-pulse" />
        </div>

        {/* Shimmer Ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-y-12 animate-shimmer opacity-30" />
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          key={status}
          className="text-sm font-medium text-white tracking-[0.3em] uppercase"
        >
          {status}
        </motion.div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-1 h-1 rounded-full bg-zinc-500"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// --- VIEWS ---
function StudioGenView() { return <UnifiedGenView provider="studio" />; }
function NanoBananaView({ initialPrompt }: { initialPrompt?: string }) { return <UnifiedGenView provider="nano" initialPrompt={initialPrompt} />; }
function OpenAIView() { return <UnifiedGenView provider="openai" />; }

function UnifiedGenView({ provider, initialPrompt }: { provider: 'studio' | 'nano' | 'openai', initialPrompt?: string }) {
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const { credits, updateCredits } = useAuth();

  const [nanoImageModel, setNanoImageModel] = useState<'nano-banana' | 'nano-banana-2'>('nano-banana');

  const handleModeChange = (newMode: 'image' | 'video') => {
    if (newMode === mode) return;
    setMode(newMode);
    setResult(null);
    setHasGenerated(false);
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    if (!prompt) return;
    if (credits !== null && credits < 1) {
      alert("Insufficient Credits");
      return;
    }
    setIsGenerating(true);
    setHasGenerated(true);
    setResult(null);

    try {
      let data;
      if (provider === 'nano') {
        if (mode === 'image') {
          if (nanoImageModel === 'nano-banana') {
            data = await api.generateNanoBanana({
              model: "nano-banana",
              prompt,
              size: "1024x1024"
            });
          } else {
            data = await api.generateNanoBanana({
              model: "nano-banana-2",
              prompt,
              resolution: "2K"
            });
          }
        } else {
          // Video: veo3.1-fast
          data = await api.generateNanoBanana({
            model: "veo3.1-fast",
            prompt,
            duration: 8,
            aspect_ratio: "16:9"
          });
        }
      } else if (provider === 'openai') {
        if (mode === 'video') {
          data = await api.openaiVideo({ prompt });
        } else {
          data = await api.openaiImage({ prompt });
        }
      } else {
        data = await api.generateOpenAI({ type: mode, prompt: prompt });
      }

      if (data && data.success) {
        // Nano Banana returns { success: true, outputs: [{ url: "..." }], ... } 
        // or sometimes just { url: "..." } depending on normalization.
        // Assuming the API standardizes on outputs[0].url as per other handlers.
        const outputUrl = data.outputs?.[0]?.url || data.url || data.output_url;

        if (outputUrl) {
          setResult(outputUrl);
          if (data.new_balance !== undefined) updateCredits(data.new_balance);
        } else {
          throw new Error("No output URL received");
        }
      } else {
        const outputUrl = data?.outputs?.[0]?.url;
        if (outputUrl) {
          setResult(outputUrl);
          if (data.new_balance !== undefined) updateCredits(data.new_balance);
        } else {
          const errDetail = data?.error || (data?.detail && JSON.stringify(data.detail)) || "Unknown error";
          alert(`Generation failed: ${errDetail}`);
          setHasGenerated(false);
        }
      }
    } catch (err: any) {
      alert("Error: " + err.message);
      setHasGenerated(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // ... (handleFileSelect and getTitle remain same)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  const getTitle = () => {
    switch (provider) {
      case 'nano': return { title: 'Nano Banana', sub: 'High-Fidelity Image Synthesis', icon: '/assets/gemini.svg' };
      case 'openai': return { title: 'Open AI', sub: 'Advanced Multi-Modal Intelligence', icon: '/assets/openai.svg' };
      default: return { title: 'Studio', sub: 'Unified Creation Engine', icon: null };
    }
  }
  const info = getTitle();

  return (
    <motion.div
      layout
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "w-full max-w-[1700px] py-8 gap-8 lg:gap-12",
        hasGenerated ? "grid grid-cols-1 lg:grid-cols-2 items-start" : "flex justify-center items-center"
      )}
    >
      <ClassyInputCard className={cn(
        "bg-zinc-950/90 backdrop-blur-2xl transition-all duration-700 ease-[0.23,1,0.32,1]",
        hasGenerated ? "h-[700px] min-h-[700px] w-full" : "h-[650px] w-full max-w-4xl"
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner">
              {info.icon ? (
                <div className="relative w-7 h-7">
                  <Image src={info.icon} alt={info.title} fill className={cn("object-contain", provider === 'openai' && "invert contrast-200")} />
                </div>
              ) : (
                <Sparkles className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-light tracking-tight text-white">{info.title}</h2>
              <p className="text-xs text-zinc-500 font-medium tracking-[0.2em] uppercase mt-1">{info.sub}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">

            <ModeToggle mode={mode} setMode={handleModeChange} disabled={isGenerating} />
          </div>
        </div>

        <div className="flex-1 relative flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.98, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -5 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col justify-end gap-6"
            >
              <div className="relative flex-1 flex flex-col justify-end h-full">
                {!preview && !prompt && (
                  <div className="absolute top-0 bottom-32 left-0 right-0 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                    <Wand2 className="w-12 h-12 mb-4 text-white/50" />
                    <p className="text-xl font-light text-center">
                      {mode === 'image' ? 'What masterpiece shall we create today?' : 'Describe your scene together...'}
                    </p>
                  </div>
                )}

                {preview && (
                  <div className="mb-4 relative w-fit group z-20">
                    <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-white/10 shadow-xl">
                      <img src={preview} alt="upload" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPreview(null)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors focus:outline-none focus:ring-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* FIXED INPUT CONTAINER: Flex Column, Fixed Height */}
                <div className={cn(
                  "relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[28px] overflow-hidden transition-all duration-300 focus-within:bg-black/40 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/10 shadow-2xl flex flex-col",
                  prompt.length > 200 ? "h-64" : "h-48"
                )}>
                  {/* Textarea: Flex-1, Min-H-0 ensures it scrolls internally & doesn't push bottom */}
                  <div className="flex-1 relative min-h-0">
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={mode === 'image' ? "Type a prompt for image generation..." : "Describe a video scene..."}
                      className="w-full h-full text-lg font-light leading-relaxed bg-transparent border-none p-6 resize-none placeholder:text-zinc-600 text-white/95 selection:bg-white/20 focus:ring-0 focus:outline-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>

                  {/* Toolbar: Flex-Shrink-0, Fixed Height */}
                  <div className="h-14 px-4 flex-shrink-0 flex items-center justify-between border-t border-white/5 bg-black/20">
                    <div className="flex items-center gap-2">
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-0 focus:outline-none"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload Reference"
                      >
                        <Paperclip className="w-4.5 h-4.5" />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt}
                      className={cn(
                        "h-9 w-9 rounded-full transition-all duration-300 shadow-lg focus-visible:ring-0 focus:outline-none",
                        prompt
                          ? "bg-white text-black hover:bg-zinc-200 hover:scale-105"
                          : "bg-white/10 text-zinc-600 cursor-not-allowed"
                      )}
                    >
                      {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 ml-0.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 font-medium px-2">
                <span>{mode === 'image' ? 'High-Resolution • Standard Aspect' : '5s Duration • 1080p'}</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                  System Ready
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </ClassyInputCard>

      <AnimatePresence>
        {hasGenerated && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="w-full h-full min-h-[700px] flex flex-col justify-start lg:sticky lg:top-24"
          >
            <div
              className={cn(
                "relative w-full aspect-[4/5] rounded-[2.5rem] border border-white/10 bg-black/60 backdrop-blur-3xl overflow-hidden flex items-center justify-center p-0 transition-all duration-700",
                isGenerating ? "border-purple-500/30 shadow-[0_0_100px_rgba(168,85,247,0.1)]" : "shadow-2xl"
              )}
            >
              {isGenerating ? (
                <CosmicLoader />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
                  {result ? (
                    <div className="w-full h-full relative group/result bg-black">
                      {mode === 'image' ? (
                        <img src={result} alt="Generated" className="w-full h-full object-contain" />
                      ) : (
                        <video src={result} controls autoPlay loop className="w-full h-full object-contain" />
                      )}

                      <div className="absolute top-6 right-6 opacity-0 group-hover/result:opacity-100 transition-opacity flex gap-2">
                        <Button size="icon" className="rounded-full bg-black/50 backdrop-blur-md text-white border border-white/10 hover:bg-white hover:text-black transition-all focus-visible:ring-0 focus:outline-none" onClick={() => window.open(result, '_blank')}>
                          <ArrowLeft className="w-4 h-4 rotate-[135deg]" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-4 opacity-30">
                      <Wand2 className="w-12 h-12" />
                      <p className="text-sm uppercase tracking-widest">Waiting for output</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
