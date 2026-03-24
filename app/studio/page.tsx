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

  
  useEffect(() => {
    try {
      const savedActive = localStorage.getItem("studio_active_generation");
      const savedActiveTime = localStorage.getItem("studio_active_time");
      const savedGens = localStorage.getItem("studio_generations_history");

      if (savedActive && savedActiveTime) {
        const isStale = Date.now() - parseInt(savedActiveTime, 10) > 5 * 60 * 1000;
        if (!isStale) {
          setActiveGeneration(JSON.parse(savedActive));
          if (savedGens) setGenerations(JSON.parse(savedGens));
        } else {
          localStorage.removeItem("studio_active_generation");
          localStorage.removeItem("studio_generations_history");
          localStorage.removeItem("studio_active_time");
        }
      } else if (savedActive || savedGens) {
        
        localStorage.removeItem("studio_active_generation");
        localStorage.removeItem("studio_generations_history");
        localStorage.removeItem("studio_active_time");
      }
    } catch (error) {
      console.warn("Failed to load generic studio state:", error);
    }
  }, []);

  
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
      
      localStorage.setItem("studio_generations_history", JSON.stringify(generations.slice(0, 10)));
    }
  }, [generations]);

  
  const [aspectRatio, _setAspectRatio] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("studio_aspect_ratio") || "1:1";
    }
    return "1:1";
  });
  const setAspectRatio = (val: string) => {
    _setAspectRatio(val);
    try { localStorage.setItem("studio_aspect_ratio", val); } catch (e) {}
  };
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  
  useEffect(() => {
    
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        const isRemix = searchParams.get("mode") === "remix";
        const isDirectJob = !!searchParams.get("jobId");

        
        if (isRemix && !isDirectJob) {
          setMobilePanelOpen(true);
        }
        
        else if (!activeGeneration && !isDirectJob && !isGenerating && generations.length === 0) {
          setMobilePanelOpen(true);
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchParams, activeGeneration, isGenerating, generations.length]);

  
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".studio-panel",
        { y: 40, opacity: 0, scale: 0.98, filter: "blur(15px)" },
        { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.2, stagger: 0.1, ease: "expo.out", clearProps: "filter,scale" }
      );
    });
    return () => ctx.revert();
  }, []);

  const handleGenerate = async (prompt: string, settings: any) => {
    setIsGenerating(true);
    
    setGenerations([]);
    setActiveGeneration(null);
    localStorage.removeItem("studio_generations_history");
    localStorage.removeItem("studio_active_generation");
    localStorage.removeItem("studio_active_time");

    const createStudioJob = httpsCallable(functions, "createStudioJob");

    try {
      const { model, mode: genMode, sourceFile, sourceVideo, sourceFiles, sourceVideos, end_image_file, aspectRatio: _ar, ...dynamicParameters } = settings;

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
      if (end_image_file) {
        toast.loading('Uploading end frame image...', { id: 'gen-toast' });
        dynamicParameters.end_image_url = await uploadAsset(end_image_file);
        toast.success('End frame uploaded!', { id: 'gen-toast' });
      }

      toast.loading('Initiating AI Model creation...', { id: 'gen-toast' });

      const count = dynamicParameters.n && typeof dynamicParameters.n === 'number' ? dynamicParameters.n : 1;
      const usedModel = model || (genMode === 'video' ? "sora-2" : "flux-2-pro");

      const result = await createStudioJob({
        provider: "poyo",
        model: usedModel,
        parameters: {
          ...(prompt ? { prompt } : {}),
          ...dynamicParameters,
          n: Number(count),
        }
      });

      const jobId = (result.data as any).jobId;
      console.log(`Job queued! ID:`, jobId);
      toast.success(`Task queued! Rendering ${count} results...`, { id: 'gen-toast' });

      const newItem: GenerationItem = {
        id: jobId,
        type: settings.mode === 'video' ? 'video' : 'image',
        prompt: prompt,
        status: "queued" as const,
        settings: {
          ...settings,
          n: count,
          previewUrl: dynamicParameters.image_url || settings.previewUrl
        }
      };

      setActiveGeneration(newItem);
      setGenerations([newItem]);
      startJobPoller(jobId, newItem);

    } catch (error: any) {
      setIsGenerating(false);
      toast.dismiss('gen-toast');

      const appCode = error.details?.code;
      if (appCode === "INSUFFICIENT_TOKENS") {
        setShowBillingAlert(true);
      } else if (appCode === "PROVIDER_ERROR") {
        toast.error("AI Provider is currently at capacity or low on credits. Your tokens have been refunded. Please try again or switch models.", { duration: 6000 });
      } else {
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
          console.log("Finished Rendering!", data);

          
          const rawUrls = data.outputUrls || data.output_urls || data.images || data.urls || data.result_urls || (Array.isArray(data.outputUrl) ? data.outputUrl : null);
          const urls = Array.isArray(rawUrls) ? rawUrls.filter(u => !!u) : [];

          if (urls.length > 1) {
            
            const completedItems = urls.map((url: string, index: number) => ({
              ...item,
              id: index === 0 ? jobId : `${jobId}_${index}`,
              creationId: (data.creationIds || data.creation_ids)?.[index] || data.creationId,
              status: "completed" as const,
              src: url,
              srcs: undefined 
            }));

            
            const batchItem: GenerationItem = {
              ...item,
              id: jobId,
              status: "completed" as const,
              src: urls[0], 
              srcs: urls,
              creationIds: data.creationIds || data.creation_ids || Array(urls.length).fill(data.creationId)
            };

            setActiveGeneration(batchItem);

            
            setGenerations((prev: GenerationItem[]) => {
              const cleaned = prev.filter(g => g.id !== jobId);
              return [...completedItems, ...cleaned];
            });
          } else {
            
            const finalUrl = urls[0] || data.outputUrl;
            const completedItem: GenerationItem = {
              ...item,
              status: "completed" as const,
              src: finalUrl,
              srcs: undefined,
              creationId: data.creationId
            };
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
          console.log("Still processing, polling again in 1.5 seconds...");

          
          const progress = data.progress || 0;
          const completedCount = data.completedCount || 0;
          const totalCount = data.totalCount || item.settings?.n || 1;

          setActiveGeneration((prev: GenerationItem | null) =>
            prev ? { ...prev, status: "generating", progress, completedCount, totalCount } : null
          );
          setGenerations((prev: GenerationItem[]) =>
            prev.map(g => g.id === jobId ? { ...g, status: "generating", progress, completedCount, totalCount } : g)
          );
          setTimeout(checkStatus, 1500); 
        }
      } catch (error) {
        console.error("Polling error:", error);
        setTimeout(checkStatus, 2000);
      }
    };
    checkStatus();
  };

  const handleCancel = async () => {
    if (activeGeneration?.id) {
      const jobId = activeGeneration.id;
      cancelledJobsRef.current.add(jobId);

      const cancelledItem: GenerationItem = { ...activeGeneration, status: "failed" };
      setActiveGeneration(null); 
      setGenerations((prev) => prev.map(g => g.id === jobId ? cancelledItem : g));
      setIsGenerating(false);

      
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

  
  useEffect(() => {
    const urlJobId = searchParams.get("jobId");

    if (urlJobId && processedJobIdRef.current !== urlJobId) {
      processedJobIdRef.current = urlJobId; 
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
      router.replace('/studio', { scroll: false }); 
    }
    
    else if (!urlJobId && activeGeneration && (activeGeneration.status === 'generating' || activeGeneration.status === 'queued')) {
      if (!isGenerating) {
        setIsGenerating(true);
        startJobPoller(activeGeneration.id, activeGeneration);
      }
    }
  }, [searchParams, router, activeGeneration, isGenerating]);


  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans relative selection:bg-cyan-500/40 overflow-hidden">

      {}
      {showBillingAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4">
          <div className="relative rounded-3xl overflow-hidden max-w-[380px] w-full shadow-2xl transform animate-in zoom-in-95 duration-200 border border-white/10">
            {}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
              style={{ backgroundImage: `url('${ASSET_BASE}/fdshj.jpg')` }}
            />
            {}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />

            {}
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

      {}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#020203]" />

        {}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.45] mix-blend-screen scale-110 blur-[1px] animate-pulse duration-[8000ms]"
          style={{ backgroundImage: `url('${ASSET_BASE}/studio/studio3.jpeg')` }}
        />

        {}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.08)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(6,182,212,0.05)_0%,transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(236,72,153,0.05)_0%,transparent_40%)]" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-[#050505]/80" />
        <div className="absolute inset-0 backdrop-blur-[100px]" />
      </div>

      {}
      <div className="relative z-10 flex flex-col lg:flex-row w-full h-[100dvh] lg:h-[calc(100vh-24px)] pt-[72px] lg:pt-[104px] px-0 lg:px-6 gap-0 lg:gap-6 max-w-[2000px] mx-auto overflow-hidden">

        {}
        <div className="lg:hidden h-2" />

        {}
        <div
          className={cn(
            "fixed inset-y-0 left-0 w-[90%] max-w-[380px] lg:relative lg:inset-auto lg:w-[340px] lg:shrink-0 h-[100dvh] lg:h-full flex flex-col z-[100] lg:z-20 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] bg-[#050505]/95 lg:bg-transparent backdrop-blur-3xl shadow-[30px_0_60px_rgba(0,0,0,0.8)] lg:shadow-none p-4 pb-6 lg:p-0 border-r border-white/5 lg:border-none",
            mobilePanelOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {}
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

          <div className="studio-panel flex-1 flex flex-col min-h-0 w-full relative">
            <StudioLeftPanel
              onGenerate={(prompt, settings) => {
                handleGenerate(prompt, settings);
                setMobilePanelOpen(false); 
              }}
              onCancel={handleCancel}
              isGenerating={isGenerating}
              mode={mode}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
            />
          </div>
        </div>

        {}
        <div
          className={cn(
            "lg:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[95] transition-opacity duration-500",
            mobilePanelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setMobilePanelOpen(false)}
        />

        {}
        <div className="flex-1 h-full min-w-0 flex flex-col relative z-10">
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
