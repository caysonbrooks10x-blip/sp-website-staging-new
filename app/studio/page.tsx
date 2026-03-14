"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { StudioLeftPanel } from "@/components/studio/left-panel";
import { StudioCenterCanvas, type GenerationItem } from "@/components/studio/center-canvas";
import { Loader2, Sparkles, Settings2, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import gsap from "gsap";
import { httpsCallable } from "firebase/functions";
import { functions, storage } from "@/lib/firebaseClient";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ASSET_BASE } from "@/lib/assets";

export default function StudioPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-[#050508] flex items-center justify-center"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>}>
        <StudioLayout />
      </Suspense>
    </ProtectedRoute>
  )
}

function StudioLayout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initMode = (searchParams.get("mode") as "image" | "video" | "templates") || "image";
  const { user } = useAuth();

  const [mode] = useState<"image" | "video" | "templates">(initMode);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<GenerationItem | null>(null);
  const [showBillingAlert, setShowBillingAlert] = useState(false);
  const processedJobIdRef = useRef<string | null>(null);
  const cancelledJobsRef = useRef<Set<string>>(new Set());

  // Restore persistent state on mount
  useEffect(() => {
    try {
      const savedActive = localStorage.getItem("studio_active_generation");
      const savedActiveTime = localStorage.getItem("studio_active_time");
      const savedGens = localStorage.getItem("studio_generations_history");

      if (savedActive && savedActiveTime) {
        // Enforce a strict 5-minute timeout. If you reload much later, the active card is gone (clean slate)
        const isStale = Date.now() - parseInt(savedActiveTime, 10) > 5 * 60 * 1000;
        if (!isStale) {
          setActiveGeneration(JSON.parse(savedActive));
        } else {
          localStorage.removeItem("studio_active_generation");
          localStorage.removeItem("studio_active_time");
        }
      } else if (savedActive) {
        // Purge legacy ghost caches lacking timestamps
        localStorage.removeItem("studio_active_generation");
      }

      if (savedGens) setGenerations(JSON.parse(savedGens));
    } catch (error) {
      console.warn("Failed to load generic studio state:", error);
    }
  }, []);

  // Sync state to local storage to persist across immediate/accidental navigations
  useEffect(() => {
    if (activeGeneration) {
      localStorage.setItem("studio_active_generation", JSON.stringify(activeGeneration));
      localStorage.setItem("studio_active_time", Date.now().toString());
    } else {
      localStorage.removeItem("studio_active_generation");
      localStorage.removeItem("studio_active_time");
    }
  }, [activeGeneration]);

  useEffect(() => {
    if (generations.length > 0) {
      // Keep only the most recent 10 to avoid bloating local storage string length
      localStorage.setItem("studio_generations_history", JSON.stringify(generations.slice(0, 10)));
    }
  }, [generations]);

  // Shared state for framing/canvas preview
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Auto-open panel on mobile if remixing or empty
  useEffect(() => {
    // Small delay to ensure state hydration doesn't conflict
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        const isRemix = searchParams.get("mode") === "remix";
        const isDirectJob = !!searchParams.get("jobId");

        // If they are strictly remixing, definitely open it
        if (isRemix && !isDirectJob) {
          setMobilePanelOpen(true);
        }
        // If there's absolutely no history/active job and they just landed, auto-open it
        else if (!activeGeneration && !isDirectJob && !isGenerating && generations.length === 0) {
          setMobilePanelOpen(true);
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchParams, activeGeneration, isGenerating, generations.length]);

  // GSAP Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".studio-panel",
        { y: 30, opacity: 0, filter: "blur(10px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1, stagger: 0.1, ease: "power3.out", clearProps: "filter" }
      );
    });
    return () => ctx.revert();
  }, []);

  const handleGenerate = async (prompt: string, settings: any) => {
    setIsGenerating(true);

    const createStudioJob = httpsCallable(functions, "createStudioJob");
    const getJobStatus = httpsCallable(functions, "getJobStatus");

    try {
      const { model, mode: genMode, sourceFile, sourceVideo, sourceFiles, sourceVideos, ...dynamicParameters } = settings;

      const uploadAsset = async (file: File) => {
        const extension = file.name.split('.').pop() || "png";
        const storagePath = `studio-inputs/${user?.uid || "anonymous"}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadBytesResumable(storageRef, file);
        return await getDownloadURL(uploadResult.ref);
      };

      if (sourceFile) {
        toast.loading('Uploading reference media securely...', { id: 'gen-toast' });
        const url = await uploadAsset(sourceFile);
        if (sourceFile.type.startsWith('video/')) {
          dynamicParameters.video_url = url;
        } else {
          // Pass it strictly as image_url for the backend Universal Mapper
          dynamicParameters.image_url = url;
        }
        toast.success('Media fully uploaded!', { id: 'gen-toast' });
      }

      if (sourceVideo) {
        toast.loading('Uploading reference video...', { id: 'gen-toast' });
        dynamicParameters.video_url = await uploadAsset(sourceVideo);
        toast.success('Video fully uploaded!', { id: 'gen-toast' });
      }
      if (sourceFiles && Array.isArray(sourceFiles) && sourceFiles.length > 0) {
        toast.loading('Uploading multiple reference images...', { id: 'gen-toast' });
        dynamicParameters.image_urls = await Promise.all(sourceFiles.map(f => uploadAsset(f)));
        toast.success('All images uploaded!', { id: 'gen-toast' });
      }
      if (sourceVideos && Array.isArray(sourceVideos) && sourceVideos.length > 0) {
        toast.loading('Uploading multiple videos...', { id: 'gen-toast' });
        dynamicParameters.video_urls = await Promise.all(sourceVideos.map(f => uploadAsset(f)));
        toast.success('All videos uploaded!', { id: 'gen-toast' });
      }

      toast.loading('Initiating AI Model creation...', { id: 'gen-toast' });

      const count = dynamicParameters.n && typeof dynamicParameters.n === 'number' ? dynamicParameters.n : 1;
      const usedModel = model || (genMode === 'video' ? "sora-2" : "flux-2-pro");

      const result = await createStudioJob({
        provider: "poyo",
        model: usedModel,
        parameters: {
          ...dynamicParameters,
          n: count // Backend natively processes this now!
        }
      });

      const jobId = (result.data as any).jobId;
      console.log(`Job queued! Initiating Poller for ID:`, jobId);
      toast.success(`Generation task queued successfully!`, { id: 'gen-toast' });

      // Since we only have ONE result now, update your generation items:
      const newItem: GenerationItem = {
        id: jobId,
        type: settings.mode === 'video' ? 'video' : 'image',
        prompt: prompt,
        status: "queued" as const,
        settings: settings
      };

      // Set the first item as the currently active generation
      setActiveGeneration(newItem);

      // Add all new items to the history list
      setGenerations((prev: GenerationItem[]) => [newItem, ...prev]);

      // Start poller for every job independently
      startJobPoller(jobId, newItem);

    } catch (error: any) {
      setIsGenerating(false);
      toast.dismiss('gen-toast');

      // Check the specific Application Code we set in the backend
      const appCode = error.details?.code;
      if (appCode === "INSUFFICIENT_TOKENS") {
        // Show the billing overlay only if the USER is out of tokens
        setShowBillingAlert(true);
      } else if (appCode === "PROVIDER_ERROR") {
        // Show a system toast if the AI ENGINE (Poyo) is failing
        toast.error("AI Provider is currently at capacity or low on credits. Your tokens have been refunded. Please try again or switch models.", { duration: 6000 });
      } else {
        // Handle other errors (Network, Timeout, etc.)
        console.error("Failed to deduct tokens or create job:", error);
        toast.error(`Job failed: ${error?.message || 'Unknown error'}`, { id: 'gen-toast' });
      }
    }
  };

  const startJobPoller = async (jobId: string, item: GenerationItem) => {
    const getJobStatus = httpsCallable(functions, "getJobStatus");

    const checkStatus = async () => {
      if (cancelledJobsRef.current.has(jobId)) {
        console.log("Job was cancelled by user, aborting poller.");
        cancelledJobsRef.current.delete(jobId);
        return;
      }
      try {
        const result = await getJobStatus({ jobId: jobId });
        const data = result.data as any;

        if (data.status === "completed") {
          console.log("Finished Rendering!", data.outputUrl);

          if (data.outputUrls && Array.isArray(data.outputUrls) && data.outputUrls.length > 1) {
            // Multiple images generated!
            const completedItems = data.outputUrls.map((url: string, index: number) => ({
              ...item,
              id: index === 0 ? jobId : `${jobId}_${index}`,
              creationId: data.creationIds?.[index] || data.creationId,
              status: "completed" as const,
              src: url
            }));

            // Set active as the first one
            setActiveGeneration(completedItems[0]);

            // Replace the generating item in the list with ALL of the completed items!
            setGenerations((prev: GenerationItem[]) => {
              const cleaned = prev.filter(g => g.id !== jobId);
              return [...completedItems, ...cleaned];
            });
          } else {
            const completedItem: GenerationItem = { ...item, status: "completed" as const, src: data.outputUrl, creationId: data.creationId };
            setActiveGeneration(completedItem);
            setGenerations((prev: GenerationItem[]) => prev.map(g => g.id === jobId ? completedItem : g));
          }
          setIsGenerating(false);
        } else if (data.status === "failed") {
          console.log("Task Failed, internal backend already refunded tokens!", data.error);
          const failedItem: GenerationItem = { ...item, status: "failed" as const, error: data.error };
          setActiveGeneration(failedItem);
          setGenerations((prev: GenerationItem[]) => prev.map(g => g.id === jobId ? failedItem : g));
          setIsGenerating(false);
        } else {
          console.log("Still processing, polling again in 3 seconds...");
          setActiveGeneration((prev: GenerationItem | null) => prev ? { ...prev, status: "generating" } : null);
          setGenerations((prev: GenerationItem[]) => prev.map(g => g.id === jobId ? { ...g, status: "generating" } : g));
          setTimeout(checkStatus, 3000); // Poll strictly every 3 seconds to avoid rate limits
        }
      } catch (error) {
        console.error("Polling error:", error);
        setTimeout(checkStatus, 3000);
      }
    };
    checkStatus();
  };

  const handleCancel = async () => {
    if (activeGeneration?.id) {
      const jobId = activeGeneration.id;
      cancelledJobsRef.current.add(jobId);

      const cancelledItem: GenerationItem = { ...activeGeneration, status: "failed" };
      setActiveGeneration(null); // Clear completely so canvas resets back to editing mode
      setGenerations((prev) => prev.map(g => g.id === jobId ? cancelledItem : g));
      setIsGenerating(false);

      // Clean local storage explicitly so a refresh doesn't magically resurrect it from cache
      localStorage.removeItem("studio_active_generation");
      localStorage.removeItem("studio_active_time");

      console.log("Job marked as cancelled locally, syncing with backend...");

      try {
        const cancelJob = httpsCallable(functions, "cancelStudioJob");
        await cancelJob({ jobId });
        console.log("Successfully securely cancelled backend job and refunded tokens.");
      } catch (err) {
        console.error("Warning: Could not officially cancel backend job, it may still render.", err);
      }
    }
  };

  // Automatically start tracking if we navigated here from a direct Remix button
  useEffect(() => {
    const urlJobId = searchParams.get("jobId");

    if (urlJobId && processedJobIdRef.current !== urlJobId) {
      processedJobIdRef.current = urlJobId; // Lock it immediately
      setIsGenerating(true);

      const newItem: GenerationItem = {
        id: urlJobId,
        type: (searchParams.get("remixType") as 'image' | 'video') || 'image',
        prompt: searchParams.get("remixPrompt") || "Remixing Creation...",
        status: "queued",
        settings: { mode: searchParams.get("remixType") || 'image' }
      };

      setActiveGeneration(newItem);
      setGenerations((prev) => {
        if (prev.find(g => g.id === urlJobId)) return prev;
        return [newItem, ...prev];
      });

      startJobPoller(urlJobId, newItem);
      router.replace('/studio', { scroll: false }); // Clean URL silently
    }
    // Also handle restoring polling if user reloads a page while something was generating
    else if (!urlJobId && activeGeneration && (activeGeneration.status === 'generating' || activeGeneration.status === 'queued')) {
      if (!isGenerating) {
        setIsGenerating(true);
        startJobPoller(activeGeneration.id, activeGeneration);
      }
    }
  }, [searchParams, router, activeGeneration, isGenerating]);


  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans relative selection:bg-cyan-500/40 overflow-hidden">

      {/* Zero Tokens Premium Alert Overlay */}
      {showBillingAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4">
          <div className="relative rounded-3xl overflow-hidden max-w-[380px] w-full shadow-2xl transform animate-in zoom-in-95 duration-200 border border-white/10">
            {/* Background Image Container */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
              style={{ backgroundImage: `url('${ASSET_BASE}/fdshj.jpg')` }}
            />
            {/* Dim Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />

            {/* Content Container */}
            <div className="relative z-10 py-10 px-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 backdrop-blur-md shadow-2xl">
                <Sparkles className="w-5 h-5 text-white/80" />
              </div>

              <h2 className="text-xl font-medium text-white mb-2 tracking-wide">Out of Tokens</h2>
              <p className="text-zinc-400 font-light text-[13px] leading-relaxed mb-8 px-2 tracking-wide">
                Your remaining balance is empty. Refill your tokens to continue creating.
              </p>

              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={() => router.push('/pricing')}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-medium tracking-wide text-sm h-12 rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                >
                  Get More Tokens
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowBillingAlert(false)}
                  className="w-full text-zinc-500 hover:text-white hover:bg-white/5 tracking-wide h-12 rounded-2xl text-[13px] font-medium transition-colors"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Lighting & Image Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-black/80" />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 transition-all duration-[20s] ease-linear scale-105"
          style={{ backgroundImage: `url('${ASSET_BASE}/studio/studio3.jpeg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0.3)_100%)] backdrop-blur-[6px]" />
      </div>

      {/* Main Layout Container */}
      <div className="relative z-10 flex flex-col lg:flex-row w-full h-full lg:h-[calc(100vh-24px)] pt-[72px] lg:pt-[104px] px-0 lg:px-6 gap-0 lg:gap-6 max-w-[2000px] mx-auto overflow-hidden">

        {/* Perfect Mobile Workspace (No sticky header overlap) */}
        <div className="lg:hidden h-2" />

        {/* Left Panel - Tool Control (Now a slide-over on mobile) */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 w-[90%] max-w-[380px] lg:relative lg:inset-auto lg:w-[340px] lg:shrink-0 h-[100dvh] lg:h-[calc(100vh-130px)] flex flex-col z-[100] lg:z-20 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] bg-[#050505]/95 lg:bg-transparent backdrop-blur-3xl shadow-[30px_0_60px_rgba(0,0,0,0.8)] lg:shadow-none p-4 pb-6 lg:p-0 border-r border-white/5 lg:border-none",
            mobilePanelOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Mobile Close Button Container */}
          <div className="lg:hidden flex items-center justify-between mb-4 pt-24 px-2 shrink-0">
            <span className="text-[11px] font-black tracking-[0.2em] uppercase text-white/50">Studio Canvas Config</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobilePanelOpen(false)}
              className="text-white hover:bg-white/10 rounded-full w-9 h-9 flex items-center justify-center shrink-0 bg-white/5 border border-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="studio-panel flex-1 flex flex-col min-h-0 w-full relative pb-safe">
            <StudioLeftPanel
              onGenerate={(prompt, settings) => {
                handleGenerate(prompt, settings);
                setMobilePanelOpen(false); // Auto close panel on generation starting!
              }}
              onCancel={handleCancel}
              isGenerating={isGenerating}
              mode={mode}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
            />
          </div>
        </div>

        {/* Panel Overlay for Mobile */}
        <div
          className={cn(
            "lg:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[95] transition-opacity duration-500",
            mobilePanelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setMobilePanelOpen(false)}
        />

        {/* Center Panel - Creation Canvas (Hero Content) */}
        <div className="studio-panel flex-1 h-full min-w-0 flex flex-col relative z-10 pb-0 lg:pb-0">
          <StudioCenterCanvas
            activeGeneration={activeGeneration}
            mode={mode}
            isGenerating={isGenerating}
            aspectRatio={aspectRatio}
            onOpenPanel={() => setMobilePanelOpen(true)}
          />
        </div>

      </div>
    </div>
  );
}
