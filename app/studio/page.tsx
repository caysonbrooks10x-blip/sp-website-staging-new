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
import {
  chooseProvider,
  getProviderFallback,
  isRetryableProviderFailure,
  needsTwoStepPipeline,
  type StudioProvider,
} from "@/lib/provider-routing";
import { recordProviderTelemetryEvent } from "@/lib/provider-health";
import { VIDEO_MODELS, getImageModelConfig, getVideoModelConfig } from "@/lib/model-config";
import { decideTwoStep, isTwoStepEnabled } from "@/lib/studio-two-step";
import { persistStudioGeneration } from "@/lib/studio-generations";
import { normalizeExportPresetIds } from "@/lib/export-pack";
import { StudioSidebar, type StudioMode } from "@/components/studio/sidebar";

interface NormalizedJobStatus {
  status: "processing" | "completed" | "failed";
  progress?: number;
  completedCount?: number;
  totalCount?: number;
  outputUrl?: string;
  outputUrls?: string[];
  error?: string;
  creationId?: string;
  creationIds?: string[];
  taskId?: string;
  thumbnailUrl?: string;
}

const VIDEO_MODEL_IDS = new Set(Object.keys(VIDEO_MODELS));

function inferGenerationType(mode: string, model: string): "image" | "video" {
  if (mode === "video") return "video";
  if (mode === "templates" && VIDEO_MODEL_IDS.has(model)) return "video";
  if (mode === "remix" && VIDEO_MODEL_IDS.has(model)) return "video";
  return VIDEO_MODEL_IDS.has(model) ? "video" : "image";
}

function normalizeApiMartStatus(payload: any): NormalizedJobStatus {
  const task = payload?.data ?? {};
  const imageUrls = Array.isArray(task?.result?.images)
    ? task.result.images.flatMap((group: any) =>
        Array.isArray(group?.url) ? group.url.filter((url: unknown) => typeof url === "string" && url.length > 0) : []
      )
    : [];
  const videoEntries = Array.isArray(task?.result?.videos) ? task.result.videos : [];
  const videoUrls = videoEntries
    .map((entry: any) => entry?.url)
    .filter((url: unknown) => typeof url === "string" && url.length > 0);
  const directUrls = Array.isArray(task?.result?.url)
    ? task.result.url.filter((url: unknown) => typeof url === "string" && url.length > 0)
    : typeof task?.result?.url === "string"
      ? [task.result.url]
      : [];
  const urls = [...imageUrls, ...videoUrls, ...directUrls];

  const rawStatus = typeof task?.status === "string" ? task.status : "pending";
  const status =
    rawStatus === "completed"
      ? "completed"
      : rawStatus === "failed" || rawStatus === "cancelled"
        ? "failed"
        : "processing";
  const totalCount = Math.max(urls.length, 1);

  return {
    status,
    progress:
      typeof task?.progress === "number"
        ? task.progress
        : status === "completed"
          ? 100
          : rawStatus === "processing"
            ? 50
            : 10,
    completedCount: status === "completed" ? totalCount : 0,
    totalCount,
    outputUrl: urls[0],
    outputUrls: urls.length > 0 ? urls : undefined,
    error: task?.error?.message || task?.error?.type,
    taskId: task?.id,
    thumbnailUrl: videoEntries[0]?.thumbnail_url || task?.result?.thumbnail_url,
  };
}

function isApiMartDirectImageResponse(payload: any) {
  return Array.isArray(payload?.data) && payload.data.some((entry: any) => entry?.b64_json || entry?.url);
}

function base64ToBlob(base64: string, mimeType = "image/png") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function extensionFromBlob(blob: Blob, fallback = "png") {
  if (blob.type.includes("jpeg")) return "jpg";
  if (blob.type.includes("webp")) return "webp";
  if (blob.type.includes("gif")) return "gif";
  if (blob.type.includes("png")) return "png";
  return fallback;
}

export default function StudioPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#c5a44e] animate-spin" /></div>}>
        <StudioLayout />
      </Suspense>
    </ProtectedRoute>
  )
}

function studioModeToCreationMode(sm: StudioMode): "image" | "video" | "templates" {
  switch (sm) {
    case "text-to-image":
    case "image-to-image":
      return "image";
    case "text-to-video":
    case "image-to-video":
    case "motion-control":
      return "video";
    case "remix":
      return "image";
    case "workflow-templates":
      return "templates";
    default:
      return "image";
  }
}

function StudioLayout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initMode = (searchParams.get("mode") as "image" | "video" | "templates") || "image";
  const { user } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [studioMode, setStudioMode] = useState<StudioMode>(() => {
    const urlMode = searchParams.get("mode")?.toLowerCase();
    if (urlMode === "video") return "text-to-video";
    if (urlMode === "remix") return "remix";
    if (urlMode === "templates") return "workflow-templates";
    return "text-to-image";
  });
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
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".studio-panel",
        { y: 40, opacity: 0, scale: 0.98, filter: "blur(15px)" },
        { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.2, stagger: 0.1, ease: "expo.out", clearProps: "filter,scale" }
      );
    });
    return () => ctx.revert();
  }, []);

  const buildCampaignMeta = (prompt: string, settings: any) => {
    const presetIds = normalizeExportPresetIds(settings?.campaign_preset_ids || settings?.campaign?.presetIds || []);
    if (settings?.campaign) {
      return {
        ...settings.campaign,
        presetIds: settings.campaign.presetIds || presetIds,
      };
    }

    const goal = settings?.director_goal || undefined;
    const platform = settings?.director_platform || undefined;
    const style = settings?.director_style || undefined;
    const variationCount = settings?.director_variations ? Number(settings.director_variations) : undefined;
    const directed = settings?.campaign_directed === "1" || Boolean(goal || platform || style);

    if (!directed && !goal && !platform && !style && !variationCount) {
      return null;
    }

    return {
      directed,
      goal,
      platform,
      style,
      variationCount,
      brief: settings?.campaign_brief || prompt,
      presetIds: presetIds.length > 0 ? presetIds : undefined,
    };
  };

  const persistCompletedGeneration = async (item: GenerationItem) => {
    if (!user?.uid || item.status !== "completed" || !item.src) return;

    try {
      await persistStudioGeneration(user.uid, {
        id: item.id,
        creationId: item.creationId || item.taskId || item.id,
        taskId: item.taskId || null,
        prompt: item.prompt,
        model: item.model,
        type: item.type,
        outputUrl: item.src,
        outputUrls: item.srcs,
        thumbnailUrl: item.thumbnailUrl || null,
        generationPlatform: item.generationPlatform || item.settings?.provider || "poyo",
        rootCreationId: item.settings?.rootCreationId || item.settings?.originalCreationId || item.creationId || item.id,
        parentCreationId: item.settings?.originalCreationId || null,
        remixDepth: item.settings?.remixDepth || 0,
        sourcePostId: item.settings?.sourcePostId || null,
        campaign: buildCampaignMeta(item.prompt, item.settings),
      });
    } catch (error) {
      console.warn("Failed to persist studio generation locally:", error);
    }
  };

  const handleGenerate = async (prompt: string, settings: any) => {
    setIsGenerating(true);
    
    setGenerations([]);
    setActiveGeneration(null);
    localStorage.removeItem("studio_generations_history");
    localStorage.removeItem("studio_active_generation");
    localStorage.removeItem("studio_active_time");

    let telemetryProvider: StudioProvider | null = null;

    try {
      const createStudioJob = httpsCallable(functions, "createStudioJob");
      const {
        model,
        mode: legacyMode,
        creationMode: explicitCreationMode,
        provider,
        sourceFile,
        sourceVideo,
        sourceFiles,
        sourceVideos,
        end_image_file,
        aspectRatio: _ar,
        ...dynamicParameters
      } = settings;
      const requestedMode = explicitCreationMode || legacyMode || mode;

      const uploadAsset = async (file: File) => {
        const extension = file.name.split('.').pop() || "png";
        const storagePath = `community-uploads/${user?.uid || "anonymous"}/${Date.now()}_studio-input_${Math.random().toString(36).substring(7)}.${extension}`;
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadBytesResumable(storageRef, file);
        return await getDownloadURL(uploadResult.ref);
      };

      const uploadGeneratedAsset = async (blob: Blob, jobId: string, index: number, fallbackExtension = "png") => {
        const extension = extensionFromBlob(blob, fallbackExtension);
        const storagePath = `community-uploads/${user?.uid || "anonymous"}/${jobId}_studio-result_${index}.${extension}`;
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadBytesResumable(storageRef, blob);
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

      const firstImageUrl =
        typeof dynamicParameters.image_url === "string" && dynamicParameters.image_url.length > 0
          ? dynamicParameters.image_url
          : Array.isArray(dynamicParameters.image_urls) && dynamicParameters.image_urls.length > 0
            ? dynamicParameters.image_urls[0]
            : undefined;
      const firstVideoUrl =
        typeof dynamicParameters.video_url === "string" && dynamicParameters.video_url.length > 0
          ? dynamicParameters.video_url
          : Array.isArray(dynamicParameters.video_urls) && dynamicParameters.video_urls.length > 0
            ? dynamicParameters.video_urls[0]
            : undefined;

      if (firstImageUrl && !dynamicParameters.image_url) dynamicParameters.image_url = firstImageUrl;
      if (firstImageUrl && (!Array.isArray(dynamicParameters.image_urls) || dynamicParameters.image_urls.length === 0)) {
        dynamicParameters.image_urls = [firstImageUrl];
      }
      if (firstVideoUrl && !dynamicParameters.video_url) dynamicParameters.video_url = firstVideoUrl;
      if (firstVideoUrl && (!Array.isArray(dynamicParameters.video_urls) || dynamicParameters.video_urls.length === 0)) {
        dynamicParameters.video_urls = [firstVideoUrl];
      }

      if (dynamicParameters.image_url) {
        dynamicParameters.reference_image_url = dynamicParameters.reference_image_url || dynamicParameters.image_url;
        dynamicParameters.source_image_url = dynamicParameters.source_image_url || dynamicParameters.image_url;
        if (requestedMode === "video") {
          dynamicParameters.start_image_url = dynamicParameters.start_image_url || dynamicParameters.image_url;
        }
      }
      if (dynamicParameters.video_url) {
        dynamicParameters.reference_video_url = dynamicParameters.reference_video_url || dynamicParameters.video_url;
        dynamicParameters.source_video_url = dynamicParameters.source_video_url || dynamicParameters.video_url;
      }

      toast.loading('Initiating AI Model creation...', { id: 'gen-toast' });

      const count = dynamicParameters.n && typeof dynamicParameters.n === 'number' ? dynamicParameters.n : 1;
      const usedModel = model || (requestedMode === 'video' ? "sora-2" : "flux-2-pro");
      const generationType = inferGenerationType(requestedMode, usedModel);
      const hasImageReference = Boolean(dynamicParameters.image_url || dynamicParameters.image_urls?.length);
      const imageModelConfig = generationType === "image" ? getImageModelConfig(usedModel) : undefined;
      const executionModel =
        generationType === "image" && hasImageReference && imageModelConfig?.editVariant
          ? imageModelConfig.editVariant
          : usedModel;
      const resolvedProvider =
        (provider as StudioProvider | undefined) ||
        chooseProvider({
          mode: requestedMode === "remix" ? "remix" : generationType,
          model: usedModel,
          wantsRemix: requestedMode === "remix" || Boolean(settings.originalCreationId),
          hasReferenceImage: Boolean(
            dynamicParameters.image_url ||
            dynamicParameters.image_urls?.length ||
            dynamicParameters.video_url ||
            dynamicParameters.video_urls?.length
          ),
          needsCharacterReference: Boolean(settings.needsCharacterReference),
        });
      telemetryProvider = resolvedProvider;
      const parameters: Record<string, any> = {
        ...(prompt ? { prompt } : {}),
        ...dynamicParameters,
        n: Number(count),
      };

      // Step 6 (handoff §10): 2-step AR pipeline. Flag-gated; off in prod by
      // default. When the chosen video model ignores aspect_ratio on a ref
      // image, reframe the ref via a cheap image-edit step first, then feed
      // the reframed output into the video job.
      if (
        isTwoStepEnabled() &&
        generationType === "video" &&
        needsTwoStepPipeline({
          mode: "video",
          hasReferenceImage: hasImageReference,
          modelIgnoresArOnRef: getVideoModelConfig(usedModel)?.ignoresArOnRef,
        })
      ) {
        const refImageUrl =
          (typeof dynamicParameters.image_url === "string" && dynamicParameters.image_url) ||
          (Array.isArray(dynamicParameters.image_urls) && dynamicParameters.image_urls[0]) ||
          undefined;
        const targetAr = typeof dynamicParameters.aspect_ratio === "string" ? dynamicParameters.aspect_ratio : undefined;
        if (refImageUrl && targetAr) {
          const decision = decideTwoStep(
            { referenceImageUrl: refImageUrl, targetAspectRatio: targetAr, n: count },
            { twoStepFlag: true, modelIgnoresArOnRef: true },
          );
          if (decision.needed) {
            try {
              toast.loading(`Reframing reference to ${targetAr} via ${decision.stepOne.model}...`, { id: "gen-toast" });
              const stepOneResp = await fetch("/api/apimart/images/generations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: decision.stepOne.model,
                  prompt: decision.stepOne.prompt,
                  image_urls: [refImageUrl],
                  aspect_ratio: targetAr,
                  n: 1,
                }),
              });
              const stepOneJson = await stepOneResp.json();
              if (!stepOneResp.ok) {
                throw new Error(stepOneJson?.error || "Step 1 reframe failed");
              }
              const stepOneTaskId = stepOneJson?.data?.[0]?.task_id;
              let reframedUrl: string | undefined;
              if (!stepOneTaskId && Array.isArray(stepOneJson?.data) && stepOneJson.data[0]?.url) {
                reframedUrl = stepOneJson.data[0].url;
              } else if (stepOneTaskId) {
                const deadline = Date.now() + 180_000;
                while (Date.now() < deadline) {
                  await new Promise((r) => setTimeout(r, 3000));
                  const statusResp = await fetch(`/api/apimart/tasks/${encodeURIComponent(stepOneTaskId)}`);
                  const statusJson = await statusResp.json();
                  const task = statusJson?.data ?? statusJson;
                  const state = task?.status || task?.state;
                  if (state === "succeeded" || state === "completed" || state === "success") {
                    const images = task?.result?.images || task?.images;
                    const flat = Array.isArray(images)
                      ? images.flatMap((g: any) => (Array.isArray(g?.url) ? g.url : g?.url ? [g.url] : []))
                      : [];
                    reframedUrl = flat[0];
                    break;
                  }
                  if (state === "failed" || state === "error") {
                    throw new Error(task?.error || "Step 1 reframe job failed");
                  }
                }
              }
              if (!reframedUrl) {
                throw new Error("Step 1 reframe timed out");
              }
              dynamicParameters.image_url = reframedUrl;
              if (Array.isArray(dynamicParameters.image_urls)) {
                dynamicParameters.image_urls = [reframedUrl];
              }
              parameters.image_url = reframedUrl;
              if (Array.isArray(parameters.image_urls)) {
                parameters.image_urls = [reframedUrl];
              }
              toast.loading("Reframe complete. Submitting video job...", { id: "gen-toast" });
            } catch (twoStepError) {
              console.warn("[two-step] step 1 failed, continuing with original image:", twoStepError);
              toast.loading("Reframe failed; submitting with original reference...", { id: "gen-toast" });
            }
          }
        }
      }

      const configuredFallback =
        settings.needsCharacterReference
          ? settings.providerFallback
          : settings.providerFallback || getProviderFallback(usedModel);
      const liveProviderStatus = settings.providerStatus as "healthy" | "degraded" | "down" | "unknown" | undefined;
      const isRemixRequest = requestedMode === "remix";
      const resolveExecutionModelForFallback = (candidateModel: string) => {
        if (generationType !== "image" || !hasImageReference) return candidateModel;
        return getImageModelConfig(candidateModel)?.editVariant || candidateModel;
      };

      let jobId = "";
      let taskId: string | undefined;
      let finalProvider = resolvedProvider;
      let finalModel = executionModel;

      const submitWithProvider = async (
        submissionProvider: StudioProvider,
        submissionModel: string
      ): Promise<{ jobId: string; taskId?: string; directCompletedItem?: GenerationItem }> => {
        if (submissionProvider === "apimart") {
          const isVideoRemix = isRemixRequest && generationType === "video";
          const remixTaskId = settings.originalTaskId || settings.taskId || settings.originalCreationId;
          const endpoint = isVideoRemix
            ? `/api/apimart/videos/${encodeURIComponent(remixTaskId || "")}/remix`
            : generationType === "video"
              ? "/api/apimart/videos/generations"
              : "/api/apimart/images/generations";

          if (isVideoRemix && !remixTaskId) {
            throw new Error("This video cannot be remixed yet because its ApiMart task ID is missing.");
          }

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: submissionModel,
              ...parameters,
            }),
          });
          const submission = await response.json();
          if (!response.ok) {
            throw new Error(submission?.error || "ApiMart generation submission failed");
          }

          if (generationType === "image" && isApiMartDirectImageResponse(submission)) {
            const directImageJobId = `apimart-img-${Date.now()}`;
            const responseItems = Array.isArray(submission.data) ? submission.data : [];
            const uploadedUrls = await Promise.all(
              responseItems.map(async (entry: any, index: number) => {
                if (entry?.b64_json) {
                  const outputFormat = submission?.output_format || "png";
                  const mimeType = outputFormat === "jpg" ? "image/jpeg" : `image/${outputFormat}`;
                  return uploadGeneratedAsset(base64ToBlob(entry.b64_json, mimeType), directImageJobId, index, outputFormat === "jpg" ? "jpg" : outputFormat);
                }

                if (entry?.url) {
                  const assetResponse = await fetch(entry.url);
                  if (!assetResponse.ok) {
                    throw new Error("ApiMart returned an image URL that could not be downloaded");
                  }
                  return uploadGeneratedAsset(await assetResponse.blob(), directImageJobId, index);
                }

                throw new Error("ApiMart image response did not include image data");
              })
            );

            if (uploadedUrls.length === 0) {
              throw new Error("ApiMart returned no images");
            }

            return {
              jobId: directImageJobId,
              directCompletedItem: {
                id: directImageJobId,
                creationId: directImageJobId,
                creationIds: uploadedUrls.map((_, index) => `${directImageJobId}_${index}`),
                taskId: undefined,
                generationPlatform: submissionProvider,
                type: "image",
                prompt,
                model: submissionModel,
                status: "completed",
                src: uploadedUrls[0],
                srcs: uploadedUrls.length > 1 ? uploadedUrls : undefined,
                settings: {
                  ...settings,
                  n: uploadedUrls.length,
                  provider: submissionProvider,
                  previewUrl: uploadedUrls[0],
                  fallbackUsed: submissionModel !== usedModel,
                },
              },
            };
          }

          const nextTaskId = submission?.data?.[0]?.task_id;
          if (!nextTaskId) {
            throw new Error("ApiMart did not return a task ID");
          }
          return { jobId: nextTaskId, taskId: nextTaskId };
        }

        const result = await createStudioJob({
          provider: submissionProvider,
          model: submissionModel,
          parameters,
        });

        return { jobId: (result.data as any).jobId };
      };

      const shouldPreemptivelyFallback =
        resolvedProvider === "apimart" &&
        Boolean(configuredFallback) &&
        (liveProviderStatus === "down" || liveProviderStatus === "degraded");

      try {
        if (shouldPreemptivelyFallback && configuredFallback) {
          finalProvider = configuredFallback.provider;
          finalModel = resolveExecutionModelForFallback(configuredFallback.model);
          recordProviderTelemetryEvent({
            provider: resolvedProvider,
            outcome: "fallback",
            message: settings.providerTelemetryMessage || "Live telemetry triggered a preemptive fallback.",
          });
          toast.loading(`Live provider health is ${liveProviderStatus}. Routing through ${finalModel} on ${finalProvider} instead...`, { id: "gen-toast" });
        }

        const submission = await submitWithProvider(finalProvider, finalModel);
        jobId = submission.jobId;
        taskId = submission.taskId;
        recordProviderTelemetryEvent({ provider: finalProvider, outcome: "queued" });
        telemetryProvider = finalProvider;

        if (submission.directCompletedItem) {
          setActiveGeneration(submission.directCompletedItem);
          setGenerations([submission.directCompletedItem]);
          setIsGenerating(false);
          recordProviderTelemetryEvent({ provider: finalProvider, outcome: "success" });
          toast.success(`Rendered ${(submission.directCompletedItem.srcs || [submission.directCompletedItem.src]).length} ${submission.directCompletedItem.generationPlatform === "apimart" ? "ApiMart" : "Studio"} image${submission.directCompletedItem.srcs && submission.directCompletedItem.srcs.length > 1 ? "s" : ""}.`, { id: "gen-toast" });
          void persistCompletedGeneration(submission.directCompletedItem);
          return;
        }
      } catch (primaryError) {
        if (resolvedProvider === "apimart" && configuredFallback && isRetryableProviderFailure(primaryError)) {
          finalProvider = configuredFallback.provider;
          finalModel = resolveExecutionModelForFallback(configuredFallback.model);
          recordProviderTelemetryEvent({
            provider: resolvedProvider,
            outcome: "failure",
            message: primaryError instanceof Error ? primaryError.message : "Provider request failed before fallback.",
          });
          toast.loading(`ApiMart is under load. Retrying with ${configuredFallback.model} on ${configuredFallback.provider}...`, { id: "gen-toast" });
          const fallbackSubmission = await submitWithProvider(finalProvider, finalModel);
          jobId = fallbackSubmission.jobId;
          taskId = fallbackSubmission.taskId;
          recordProviderTelemetryEvent({ provider: finalProvider, outcome: "queued" });
          telemetryProvider = finalProvider;

          if (fallbackSubmission.directCompletedItem) {
            setActiveGeneration(fallbackSubmission.directCompletedItem);
            setGenerations([fallbackSubmission.directCompletedItem]);
            setIsGenerating(false);
            recordProviderTelemetryEvent({ provider: finalProvider, outcome: "success" });
            toast.success(`Fallback completed with ${finalModel}.`, { id: "gen-toast" });
            void persistCompletedGeneration(fallbackSubmission.directCompletedItem);
            return;
          }
        } else {
          throw primaryError;
        }
      }

      console.log(`Job queued! ID:`, jobId);
      toast.success(`Task queued! Rendering ${count} results...`, { id: 'gen-toast' });

      const newItem: GenerationItem = {
        id: jobId,
        taskId: taskId || jobId,
        generationPlatform: finalProvider,
        type: generationType,
        prompt: prompt,
        model: finalModel === executionModel ? usedModel : finalModel,
        status: "queued" as const,
        settings: {
          ...settings,
          n: count,
          provider: finalProvider,
          fallbackUsed: finalModel !== executionModel,
          fallbackModel: finalModel !== executionModel ? finalModel : undefined,
          previewUrl: dynamicParameters.image_url || settings.previewUrl,
          taskId: taskId || jobId,
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
        if (telemetryProvider) {
          recordProviderTelemetryEvent({
            provider: telemetryProvider,
            outcome: "failure",
            message: error instanceof Error ? error.message : "Provider error before queueing.",
          });
        }
        toast.error("AI Provider is currently at capacity or low on credits. Your tokens have been refunded. Please try again or switch models.", { duration: 6000 });
      } else {
        if (telemetryProvider) {
          recordProviderTelemetryEvent({
            provider: telemetryProvider,
            outcome: "failure",
            message: error instanceof Error ? error.message : "Studio generation failed before queueing.",
          });
        }
        console.error("Failed to deduct tokens or create job:", error);
        toast.error(`Job failed: ${error?.message || 'Unknown error'}`, { id: 'gen-toast' });
      }
    }
  };

  const startJobPoller = async (jobId: string, item: GenerationItem) => {
    const provider = (item.generationPlatform || item.settings?.provider || "poyo") as StudioProvider;
    const getJobStatus = provider === "poyo" ? httpsCallable(functions, "getJobStatus") : null;
    const maxPollAttempts = provider === "apimart" ? 240 : 200;
    const maxConsecutiveErrors = 6;
    let pollAttempts = 0;
    let consecutiveErrors = 0;

    const markTerminalFailure = (message: string) => {
      const failedItem: GenerationItem = {
        ...item,
        taskId: item.taskId || jobId,
        generationPlatform: provider,
        status: "failed" as const,
        error: message,
      };
      setActiveGeneration(failedItem);
      setGenerations((prev: GenerationItem[]) => prev.map((g) => (g.id === jobId ? failedItem : g)));
      setIsGenerating(false);
      recordProviderTelemetryEvent({ provider, outcome: "failure", message });
      toast.error(message, { id: "gen-toast" });
    };

    const scheduleNextPoll = (isError: boolean) => {
      const baseDelay = isError ? 2_200 : 1_400;
      const factor = isError ? Math.pow(1.6, Math.max(0, consecutiveErrors - 1)) : Math.pow(1.06, pollAttempts);
      const delay = Math.min(Math.round(baseDelay * factor), isError ? 12_000 : 5_500);
      setTimeout(checkStatus, delay);
    };

    const checkStatus = async () => {
      if (cancelledJobsRef.current.has(jobId)) {
        console.log("Job was cancelled by user, aborting poller.");
        cancelledJobsRef.current.delete(jobId);
        return;
      }

      if (pollAttempts >= maxPollAttempts) {
        markTerminalFailure("Generation timed out before completion. Please retry or switch to a lighter model.");
        return;
      }

      pollAttempts += 1;

      try {
        const data: any = provider === "apimart"
          ? await (async () => {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 15_000);
              const response = await fetch(`/api/apimart/tasks/${encodeURIComponent(jobId)}?language=en`, {
                cache: "no-store",
                signal: controller.signal,
              }).finally(() => {
                clearTimeout(timeout);
              });
              const raw = await response.text();
              const payload = raw ? JSON.parse(raw) : null;
              if (!response.ok) {
                throw new Error(payload?.error || `ApiMart task polling failed (${response.status})`);
              }
              return normalizeApiMartStatus(payload);
            })()
          : (await getJobStatus!({ jobId: jobId })).data;

        consecutiveErrors = 0;

        if (data.status === "completed") {
          console.log("Finished Rendering!", data);

          
          const rawUrls = data.outputUrls || data.output_urls || data.images || data.urls || data.result_urls || (Array.isArray(data.outputUrl) ? data.outputUrl : null);
          const urls = Array.isArray(rawUrls) ? rawUrls.filter(u => !!u) : [];

          if (urls.length > 1) {
            
            const completedItems = urls.map((url: string, index: number) => ({
              ...item,
              id: index === 0 ? jobId : `${jobId}_${index}`,
              creationId: (data.creationIds || data.creation_ids)?.[index] || data.creationId || data.taskId || item.taskId || jobId,
              taskId: data.taskId || item.taskId || jobId,
              generationPlatform: provider,
              status: "completed" as const,
              src: url,
              srcs: undefined,
              thumbnailUrl: data.thumbnailUrl,
            }));

            
            const batchItem: GenerationItem = {
              ...item,
              id: jobId,
              taskId: data.taskId || item.taskId || jobId,
              generationPlatform: provider,
              creationId: data.creationId || data.taskId || item.creationId || jobId,
              status: "completed" as const,
              src: urls[0], 
              srcs: urls,
              creationIds: data.creationIds || data.creation_ids || Array(urls.length).fill(data.creationId || data.taskId || item.taskId || jobId),
              thumbnailUrl: data.thumbnailUrl,
            };

            setActiveGeneration(batchItem);

            
            setGenerations((prev: GenerationItem[]) => {
              const cleaned = prev.filter(g => g.id !== jobId);
              return [...completedItems, ...cleaned];
            });
            recordProviderTelemetryEvent({ provider, outcome: "success" });
            void persistCompletedGeneration(batchItem);
          } else {
            
            const finalUrl = urls[0] || data.outputUrl;
            const completedItem: GenerationItem = {
              ...item,
              taskId: data.taskId || item.taskId || jobId,
              generationPlatform: provider,
              status: "completed" as const,
              src: finalUrl,
              srcs: undefined,
              creationId: data.creationId || data.taskId || item.creationId || jobId,
              thumbnailUrl: data.thumbnailUrl,
            };
            setActiveGeneration(completedItem);
            setGenerations((prev: GenerationItem[]) => prev.map(g => g.id === jobId ? completedItem : g));
            recordProviderTelemetryEvent({ provider, outcome: "success" });
            void persistCompletedGeneration(completedItem);
          }
          setIsGenerating(false);
        } else if (data.status === "failed" || data.status === "cancelled") {
          console.log("Task Failed, internal backend already refunded tokens!", data.error);
          const failedItem: GenerationItem = {
            ...item,
            taskId: data.taskId || item.taskId || jobId,
            generationPlatform: provider,
            status: "failed" as const,
            error: data.error || (data.status === "cancelled" ? "Generation was cancelled." : "Generation failed."),
          };
          setActiveGeneration(failedItem);
          setGenerations((prev: GenerationItem[]) => prev.map(g => g.id === jobId ? failedItem : g));
          setIsGenerating(false);
          recordProviderTelemetryEvent({
            provider,
            outcome: "failure",
            message: data.error || (data.status === "cancelled" ? "Generation was cancelled." : "Generation failed."),
          });
        } else {
          console.log("Still processing, polling again in 1.5 seconds...");

          
          const progress = data.progress || 0;
          const completedCount = data.completedCount || 0;
          const totalCount = data.totalCount || item.settings?.n || 1;

          setActiveGeneration((prev: GenerationItem | null) =>
            prev ? { ...prev, generationPlatform: provider, taskId: data.taskId || prev.taskId || jobId, status: "generating", progress, completedCount, totalCount } : null
          );
          setGenerations((prev: GenerationItem[]) =>
            prev.map(g => g.id === jobId ? { ...g, generationPlatform: provider, taskId: data.taskId || g.taskId || jobId, status: "generating", progress, completedCount, totalCount } : g)
          );
          scheduleNextPoll(false);
        }
      } catch (error) {
        consecutiveErrors += 1;
        console.error("Polling error:", error);

        if (consecutiveErrors >= maxConsecutiveErrors) {
          markTerminalFailure("We lost connection while checking job status. Please retry in a moment.");
          return;
        }

        scheduleNextPoll(true);
      }
    };
    checkStatus();
  };

  const handleCancel = async () => {
    if (activeGeneration?.id) {
      const jobId = activeGeneration.id;
      const provider = (activeGeneration.generationPlatform || activeGeneration.settings?.provider || "poyo") as StudioProvider;
      cancelledJobsRef.current.add(jobId);

      const cancelledItem: GenerationItem = { ...activeGeneration, status: "failed" };
      setActiveGeneration(null); 
      setGenerations((prev) => prev.map(g => g.id === jobId ? cancelledItem : g));
      setIsGenerating(false);

      
      localStorage.removeItem("studio_active_generation");
      localStorage.removeItem("studio_active_time");

      console.log("Job marked as cancelled locally, syncing with backend...");

      if (provider === "apimart") {
        toast.info("ApiMart cancellation is not wired yet, so the job was removed locally only.");
        return;
      }

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


  const studioShellTopOffset = "var(--app-nav-height, 96px)";

  const handleSidebarModeChange = (newMode: StudioMode) => {
    setStudioMode(newMode);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans relative selection:bg-[#c5a44e]/40 overflow-hidden">

      {/* Billing Alert Modal */}
      {showBillingAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4">
          <div className="relative rounded-2xl overflow-hidden max-w-[380px] w-full shadow-2xl transform animate-in zoom-in-95 duration-200 border border-[#c5a44e]/20 bg-[#111]">
            <div className="relative z-10 py-10 px-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-[#c5a44e]/10 rounded-full flex items-center justify-center mb-6 border border-[#c5a44e]/20">
                <Sparkles className="w-5 h-5 text-[#c5a44e]" />
              </div>

              <h2 className="text-xl font-medium text-white mb-2">Out of Credits</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8 px-2">
                Your remaining balance is empty. Top up your credits to continue creating.
              </p>

              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={() => router.push('/pricing')}
                  className="w-full btn-gold text-sm h-11 rounded-xl"
                >
                  Get More Credits
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowBillingAlert(false)}
                  className="w-full text-zinc-500 hover:text-white hover:bg-white/5 h-11 rounded-xl text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <StudioSidebar
        activeMode={studioMode}
        onModeChange={handleSidebarModeChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobilePanelOpen}
        topOffset={studioShellTopOffset}
      />

      {/* Mobile sidebar toggle */}
      <div
        className="lg:hidden fixed left-4 z-50"
        style={{ top: `calc(${studioShellTopOffset} + 16px)` }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
          className="w-10 h-10 rounded-lg bg-[#111] border border-[#1a1a1a] text-zinc-400 hover:text-white"
        >
          <Settings2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          sidebarCollapsed ? "lg:ml-[60px]" : "lg:ml-[210px]"
        )}
        style={{
          marginTop: studioShellTopOffset,
          height: `calc(100dvh - ${studioShellTopOffset})`,
        }}
      >
        {/* Top Bar */}
        <div className="h-14 border-b border-[#1a1a1a] flex items-center px-6 shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-zinc-200 capitalize">
              {studioMode.replace(/-/g, " ")}
            </h1>
          </div>
        </div>

        {/* Two-column content */}
        <div className="flex h-[calc(100%-56px)] overflow-hidden flex-col lg:flex-row">
          {/* Left: Generation Form */}
          <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 h-[52dvh] lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-[#1a1a1a]">
            <div className="flex-1 min-h-0">
              <StudioLeftPanel
                onGenerate={(prompt, settings) => {
                  handleGenerate(prompt, settings);
                  setMobilePanelOpen(false);
                }}
                onCancel={handleCancel}
                isGenerating={isGenerating}
                mode={studioModeToCreationMode(studioMode)}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                studioMode={studioMode}
                activeGeneration={activeGeneration}
              />
            </div>
          </div>

          {/* Right: Preview / Canvas */}
          <div className="flex-1 h-full min-h-0 min-w-0 flex flex-col">
            <StudioCenterCanvas
              activeGeneration={activeGeneration}
              mode={studioModeToCreationMode(studioMode)}
              isGenerating={isGenerating}
              aspectRatio={aspectRatio}
              onOpenPanel={() => setMobilePanelOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[35] transition-opacity duration-500",
          mobilePanelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobilePanelOpen(false)}
      />
    </div>
  );
}
