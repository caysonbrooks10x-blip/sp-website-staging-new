"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { ThemeBackdrop } from "@/components/theme-backdrop";
import { StudioLeftPanel } from "@/components/studio/left-panel";
import { StudioCenterCanvas, type GenerationItem } from "@/components/studio/center-canvas";
import { Loader2, Sparkles, Settings2, X, Menu } from "lucide-react";
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
  needsTwoStepPipeline,
  type StudioProvider,
} from "@/lib/provider-routing";
import { recordProviderTelemetryEvent } from "@/lib/provider-health";
import { VIDEO_MODELS, getImageModelConfig, getVideoModelConfig } from "@/lib/model-config";
import { decideTwoStep, STEP_ONE_FIXED_COST_USD } from "@/lib/studio-two-step";
import { adaptApimartStatus, adaptApimartSubmission, newRequestId, type CanonicalJobStatus } from "@/lib/provider-response";
import { executeWithFallback, buildProviderCall } from "@/lib/provider-execution";
import { persistStudioGeneration } from "@/lib/studio-generations";
import { StudioSidebar, type StudioMode } from "@/components/studio/sidebar";
import { GenerationStack } from "@/components/studio/generation-stack";

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

function flattenOutputUrls(input: unknown): string[] {
  if (typeof input === "string" && input.trim().length > 0) {
    return [input];
  }

  if (!Array.isArray(input)) return [];

  return input.flatMap((entry) => flattenOutputUrls(entry));
}

const VIDEO_MODEL_IDS = new Set(Object.keys(VIDEO_MODELS));

function inferGenerationType(mode: string, model: string): "image" | "video" {
  if (mode === "video") return "video";

  if (mode === "remix" && VIDEO_MODEL_IDS.has(model)) return "video";
  return VIDEO_MODEL_IDS.has(model) ? "video" : "image";
}

/**
 * UI-side projection of CanonicalJobStatus into the legacy field names the
 * polling loop already reads. The canonical adapter is the only thing that
 * touches the raw ApiMart payload — this function just remaps fields.
 */
function canonicalToLegacyView(canonical: CanonicalJobStatus, payload: any): NormalizedJobStatus {
  const uiStatus =
    canonical.status === "completed"
      ? "completed"
      : canonical.status === "failed"
        ? "failed"
        : "processing";
  const totalCount = Math.max(canonical.urls.length, 1);
  return {
    status: uiStatus,
    progress: canonical.progress,
    completedCount: uiStatus === "completed" ? totalCount : 0,
    totalCount,
    outputUrl: canonical.urls[0],
    outputUrls: canonical.urls.length > 0 ? canonical.urls : undefined,
    error: canonical.error || undefined,
    taskId: payload?.data?.id ?? canonical.request_id,
    thumbnailUrl: canonical.thumbnail_url,
  };
}

function normalizeApiMartStatus(payload: any, ctx?: { provider?: string; model?: string; request_id?: string }): NormalizedJobStatus {
  const canonical = adaptApimartStatus(payload, {
    provider: ctx?.provider ?? "apimart",
    model: ctx?.model ?? "unknown",
    request_id: ctx?.request_id ?? "ui-poll",
  });
  return canonicalToLegacyView(canonical, payload);
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

function isSurfacedProviderFailure(error: any): boolean {
  const code = error?.details?.code;
  return [
    "PROVIDER_BALANCE_LOW",
    "MODEL_UNAVAILABLE",
    "MODEL_SETTINGS_UNSUPPORTED",
    "PROVIDER_CAPACITY",
    "UPSTREAM_SUBMIT_FAILED",
    "FALLBACK_EXHAUSTED",
  ].includes(code);
}

const STUDIO_ACTIVE_STORAGE_KEY = "studio_active_generation";
const STUDIO_ACTIVE_TIME_KEY = "studio_active_time";
const STUDIO_HISTORY_STORAGE_KEY = "studio_generations_history";
const ACTIVE_PERSIST_INTERVAL_MS = 5000;
const HISTORY_PERSIST_INTERVAL_MS = 5000;

function pickPersistableSettings(settings: any) {
  if (!settings || typeof settings !== "object") return undefined;

  const picked = {
    mode: settings.mode,
    creationMode: settings.creationMode,
    provider: settings.provider,
    fallbackUsed: settings.fallbackUsed,
    fallbackModel: settings.fallbackModel,
    aspectRatio: settings.aspectRatio,
    size: settings.size,
    resolution: settings.resolution,
    duration: settings.duration,
    output_format: settings.output_format,
    n: settings.n,
    rootCreationId: settings.rootCreationId,
    originalCreationId: settings.originalCreationId,
    parentCreationId: settings.parentCreationId,
    remixDepth: settings.remixDepth,
    sourcePostId: settings.sourcePostId,
    campaign: settings.campaign,
    originalPrompt: settings.originalPrompt,
  };

  return Object.fromEntries(
    Object.entries(picked).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function serializeGenerationForStorage(item: GenerationItem | null) {
  if (!item) return null;

  return {
    id: item.id,
    type: item.type,
    src: item.src,
    srcs: item.srcs,
    creationId: item.creationId,
    creationIds: item.creationIds,
    taskId: item.taskId,
    generationPlatform: item.generationPlatform,
    thumbnailUrl: item.thumbnailUrl,
    prompt: item.prompt,
    model: item.model,
    status: item.status,
    error: item.error,
    progress: item.progress,
    completedCount: item.completedCount,
    totalCount: item.totalCount,
    settings: pickPersistableSettings(item.settings),
  };
}

function safeSetLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write ${key} to localStorage.`, error);
  }
}

function safeRemoveLocalStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove ${key} from localStorage.`, error);
  }
}

export default function StudioPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#06b6d4] animate-spin" /></div>}>
        <StudioLayout />
      </Suspense>
    </ProtectedRoute>
  )
}

function studioModeToCreationMode(sm: StudioMode): "image" | "video" {
  switch (sm) {
    case "text-to-image":
    case "image-to-image":
      return "image";
    case "text-to-video":
    case "image-to-video":
      return "video";
    case "remix":
      return "image";
    default:
      return "image";
  }
}

function StudioLayout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initMode = (searchParams.get("mode") as "image" | "video") || "image";
  const { user } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [suggestionPrompt, setSuggestionPrompt] = useState("");
  const [studioMode, setStudioMode] = useState<StudioMode>(() => {
    const urlMode = searchParams.get("mode")?.toLowerCase();
    if (urlMode === "video") return "text-to-video";
    if (urlMode === "remix") return "remix";

    return "text-to-image";
  });
  const [mode] = useState<"image" | "video">(initMode);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<GenerationItem | null>(null);
  // Concurrent in-flight jobs that aren't in the hero slot. Newest generation
  // always takes hero; prior still-running ones are demoted here. Oldest-first
  // in the array (so the stack renders left→right oldest→newest).
  const [backgroundJobs, setBackgroundJobs] = useState<GenerationItem[]>([]);
  const [showBillingAlert, setShowBillingAlert] = useState(false);
  const processedJobIdRef = useRef<string | null>(null);
  const cancelledJobsRef = useRef<Set<string>>(new Set());
  const lastActivePersistAtRef = useRef(0);
  const lastHistoryPersistAtRef = useRef(0);

  
  useEffect(() => {
    try {
      const savedActive = localStorage.getItem(STUDIO_ACTIVE_STORAGE_KEY);
      const savedActiveTime = localStorage.getItem(STUDIO_ACTIVE_TIME_KEY);
      const savedGens = localStorage.getItem(STUDIO_HISTORY_STORAGE_KEY);

      if (savedActive && savedActiveTime) {
        const isStale = Date.now() - parseInt(savedActiveTime, 10) > 5 * 60 * 1000;
        if (!isStale) {
          setActiveGeneration(JSON.parse(savedActive));
          if (savedGens) setGenerations(JSON.parse(savedGens));
        } else {
          safeRemoveLocalStorage(STUDIO_ACTIVE_STORAGE_KEY);
          safeRemoveLocalStorage(STUDIO_HISTORY_STORAGE_KEY);
          safeRemoveLocalStorage(STUDIO_ACTIVE_TIME_KEY);
        }
      } else if (savedActive || savedGens) {
        
        safeRemoveLocalStorage(STUDIO_ACTIVE_STORAGE_KEY);
        safeRemoveLocalStorage(STUDIO_HISTORY_STORAGE_KEY);
        safeRemoveLocalStorage(STUDIO_ACTIVE_TIME_KEY);
      }
    } catch (error) {
      console.warn("Failed to load generic studio state:", error);
    }
  }, []);

  
  useEffect(() => {
    if (activeGeneration) {
      const now = Date.now();
      const shouldThrottle =
        (activeGeneration.status === "queued" || activeGeneration.status === "generating") &&
        now - lastActivePersistAtRef.current < ACTIVE_PERSIST_INTERVAL_MS;

      if (shouldThrottle) return;

      lastActivePersistAtRef.current = now;
      safeSetLocalStorage(
        STUDIO_ACTIVE_STORAGE_KEY,
        JSON.stringify(serializeGenerationForStorage(activeGeneration))
      );
      safeSetLocalStorage(STUDIO_ACTIVE_TIME_KEY, String(now));
    } else {
      safeRemoveLocalStorage(STUDIO_ACTIVE_STORAGE_KEY);
      safeRemoveLocalStorage(STUDIO_ACTIVE_TIME_KEY);
    }
  }, [activeGeneration]);

  useEffect(() => {
    if (generations.length > 0) {
      const now = Date.now();
      const hasInFlightGeneration = generations.some(
        (generation) => generation.status === "queued" || generation.status === "generating"
      );
      if (hasInFlightGeneration && now - lastHistoryPersistAtRef.current < HISTORY_PERSIST_INTERVAL_MS) {
        return;
      }

      lastHistoryPersistAtRef.current = now;
      safeSetLocalStorage(
        STUDIO_HISTORY_STORAGE_KEY,
        JSON.stringify(generations.slice(0, 10).map((generation) => serializeGenerationForStorage(generation)))
      );
    } else {
      safeRemoveLocalStorage(STUDIO_HISTORY_STORAGE_KEY);
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
  const [canvasOpen, setCanvasOpen] = useState(false);

  
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

  const buildCampaignMeta = (_prompt: string, settings: any) => {
    if (settings?.campaign) {
      return { ...settings.campaign };
    }
    return null;
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
    // Concurrent-generations model (2026-04-22):
    //   - Newest generation always wins the hero (center-canvas) slot.
    //   - If the prior hero is still in-flight, it gets demoted into the
    //     top-left `backgroundJobs` stack. Completed heroes are replaced
    //     directly (user can still see it in my-creations / Firestore).
    //   - `isGenerating` stays true while ANY job is in-flight. A separate
    //     `isSubmitting` flag gates the Generate button only during the
    //     sync submit phase to prevent double-fire from one click.
    setIsGenerating(true);
    setIsSubmitting(true);
    // `isSubmitting` only needs to guard against same-tap double-fire. Release
    // it after a short window so the user isn't locked out of queuing a 3rd+
    // generation while the 2nd POST/upload is still resolving (uploads + the
    // executeWithFallback round-trip can take 10s+). The per-job polling is
    // tracked independently via `isGenerating` + `backgroundJobs`.
    window.setTimeout(() => setIsSubmitting(false), 1200);

    setActiveGeneration((prevHero) => {
      // Demote the prior hero regardless of status (in-flight AND completed),
      // so the user can still see & return to it from the stack. Only "failed"
      // is dropped — nothing worth keeping.
      if (prevHero && prevHero.status !== "failed") {
        setBackgroundJobs((prev) => {
          if (prev.some((j) => j.id === prevHero.id)) return prev;
          return [...prev, prevHero];
        });
      }
      return null;
    });

    let telemetryProvider: StudioProvider | null = null;

    try {
      // 2026-04-18: UI migrated from provider-specific endpoints + ghost
      // `createStudioJob` Firebase callable onto the unified /api/route/*
      // routes. Server owns chooseProvider + executeWithFallback now.
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
      const usedModel = model || (requestedMode === 'video' ? "grok-vid" : "flux-2-pro");
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

      // Sprint A Step 3: AUTO 2-step AR pipeline. Runs whenever the chosen
      // video model ignores aspect_ratio on its reference image. The
      // `parameters.two_step_applied` marker is the single source of truth
      // for the intra-call + cross-resubmission loop guard.
      if (
        generationType === "video" &&
        !parameters.two_step_applied &&
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
        const referenceAr = typeof dynamicParameters.reference_aspect_ratio === "string"
          ? dynamicParameters.reference_aspect_ratio
          : undefined;
        if (refImageUrl && targetAr) {
          const decision = decideTwoStep(
            { referenceImageUrl: refImageUrl, targetAspectRatio: targetAr, referenceAspectRatio: referenceAr, n: count },
            { modelIgnoresArOnRef: true, alreadyApplied: Boolean(parameters.two_step_applied) },
          );
          if (decision.needed) {
            try {
              toast.loading(`Reframing reference to ${targetAr} via ${decision.stepOne.model}...`, { id: "gen-toast" });
              const stepOneIdToken = user ? await user.getIdToken() : null;
              const stepOneResp = await fetch("/api/route/images/generations", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(stepOneIdToken ? { Authorization: `Bearer ${stepOneIdToken}` } : {}),
                },
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
              // /api/route/images/generations returns NormalizedSubmit:
              //   { provider, task_id, model, used_fallback, raw }
              // When provider=apimart and the response was a direct-image
              // shape, `raw.data[]` carries the inline b64/url.
              const stepOneProvider = stepOneJson.provider ?? decision.stepOne.provider;
              const stepOneTaskId: string | undefined = stepOneJson.task_id;
              let reframedUrl: string | undefined;
              const directUrl = (() => {
                const rawData = stepOneJson?.raw?.data;
                if (!Array.isArray(rawData)) return undefined;
                for (const entry of rawData) {
                  if (entry?.url) return entry.url as string;
                }
                return undefined;
              })();
              if (directUrl) {
                reframedUrl = directUrl;
              } else if (stepOneTaskId) {
                const deadline = Date.now() + 180_000;
                while (Date.now() < deadline) {
                  await new Promise((r) => setTimeout(r, 3000));
                  const statusResp = await fetch(
                    `/api/route/tasks/${encodeURIComponent(stepOneTaskId)}?provider=${encodeURIComponent(stepOneProvider)}`,
                  );
                  const statusJson = await statusResp.json();
                  if (statusJson.status === "completed") {
                    reframedUrl = flattenOutputUrls(statusJson.output_urls)[0];
                    break;
                  }
                  if (statusJson.status === "failed") {
                    throw new Error(
                      (typeof statusJson.error === "string" ? statusJson.error : statusJson.error?.message) ||
                        "Step 1 reframe job failed",
                    );
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
              parameters.two_step_applied = true;
              parameters.two_step_cost_usd = STEP_ONE_FIXED_COST_USD;
              if (Array.isArray(parameters.image_urls)) {
                parameters.image_urls = [reframedUrl];
              }
              toast.loading(`Reframe complete (+$${STEP_ONE_FIXED_COST_USD.toFixed(3)}). Submitting video job...`, { id: "gen-toast" });
            } catch (twoStepError) {
              // Fix 1: do not silently submit with wrong AR. User asked for a
              // specific target AR; if we can't deliver it, surface the error
              // and abort rather than producing a mismatched result.
              const msg = twoStepError instanceof Error ? twoStepError.message : "Step 1 reframe failed";
              console.error("[two-step] step 1 failed, aborting:", twoStepError);
              toast.error(`Could not reframe reference to ${targetAr}: ${msg}. Try a different reference or target AR.`, { id: "gen-toast", duration: 8000 });
              setIsGenerating(false);
              setIsSubmitting(false);
              return;
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
      ): Promise<{ jobId: string; taskId?: string; actualProvider?: StudioProvider; usedFallback?: boolean; directCompletedItem?: GenerationItem }> => {
        // Unified path: all submits go through /api/route/*. The server
        // runs chooseProvider + executeWithFallback and returns a
        // NormalizedSubmit: { provider, task_id, model, used_fallback, raw }.
        // `submissionProvider` is kept in the signature for client-side
        // telemetry only — the server may pick a different provider.
        void submissionProvider;
        const isVideoRemix = isRemixRequest && generationType === "video";
        const remixTaskId = settings.originalTaskId || settings.taskId || settings.originalCreationId;
        if (isVideoRemix && !remixTaskId) {
          throw new Error("This video cannot be remixed yet because its source task ID is missing.");
        }
        const endpoint = isVideoRemix
          ? `/api/route/videos/${encodeURIComponent(remixTaskId || "")}/remix`
          : generationType === "video"
            ? "/api/route/videos/generations"
            : "/api/route/images/generations";

        const idToken = user ? await user.getIdToken() : null;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({ model: submissionModel, ...parameters }),
        });
        const submission = await response.json();
        if (!response.ok) {
          const submitError = new Error(submission?.error || "Generation submission failed");
          (submitError as any).details = submission?.details;
          throw submitError;
        }

        const actualProvider: StudioProvider = submission.provider ?? "apimart";
        const usedFallback: boolean = Boolean(submission.used_fallback);

        // Image direct-response shortcut: ApiMart can return inline images
        // (no task id to poll). These arrive under `submission.raw.data[].url`
        // or `.b64_json`; the normalizer stamps `task_id` with a `direct-*`
        // sentinel so callers can detect this without peeking at `.raw`.
        const rawData = submission?.raw?.data;
        const isDirectImage =
          generationType === "image" &&
          Array.isArray(rawData) &&
          rawData.some((entry: any) => entry?.b64_json || entry?.url);
        if (isDirectImage) {
            const directImageJobId = `apimart-img-${Date.now()}`;
            const responseItems = Array.isArray(submission.raw.data) ? submission.raw.data : [];
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
              actualProvider,
              usedFallback,
              directCompletedItem: {
                id: directImageJobId,
                creationId: directImageJobId,
                creationIds: uploadedUrls.map((_, index) => `${directImageJobId}_${index}`),
                taskId: undefined,
                generationPlatform: actualProvider,
                type: "image",
                prompt,
                model: submissionModel,
                status: "completed",
                src: uploadedUrls[0],
                srcs: uploadedUrls.length > 1 ? uploadedUrls : undefined,
                settings: {
                  ...settings,
                  n: uploadedUrls.length,
                  provider: actualProvider,
                  previewUrl: uploadedUrls[0],
                  fallbackUsed: usedFallback || submissionModel !== usedModel,
                },
              },
            };
          }

          const nextTaskId: string | undefined = submission.task_id;
          if (!nextTaskId) {
            throw new Error("Router did not return a task ID");
          }
          return { jobId: nextTaskId, taskId: nextTaskId, actualProvider, usedFallback };
      };

      // Fix 3: no longer swap finalProvider preemptively based on live
      // telemetry. Stale/flaky health signals were causing us to skip the
      // primary retry budget entirely. executeWithFallback will burn
      // through retries fast if primary is genuinely down and then
      // cut to the fallback — so telemetry just informs the toast.
      const telemetryFlagsPrimaryUnhealthy =
        resolvedProvider === "apimart" &&
        Boolean(configuredFallback) &&
        (liveProviderStatus === "down" || liveProviderStatus === "degraded");

      if (telemetryFlagsPrimaryUnhealthy) {
        toast.loading(`Live telemetry shows ${resolvedProvider} is ${liveProviderStatus}. Trying primary first; fallback ready.`, { id: "gen-toast" });
      }

      const primaryCall = buildProviderCall(
        finalProvider,
        finalModel,
        () => submitWithProvider(finalProvider, finalModel),
      );
      const fallbackCall =
        configuredFallback && configuredFallback.provider !== finalProvider
          ? buildProviderCall(
              configuredFallback.provider,
              resolveExecutionModelForFallback(configuredFallback.model),
              () =>
                submitWithProvider(
                  configuredFallback.provider,
                  resolveExecutionModelForFallback(configuredFallback.model),
                ),
            )
          : null;

      const execution = await executeWithFallback(primaryCall, fallbackCall, {
        onAttempt: ({ provider, attempt, usedFallback }) => {
          if (attempt === 1 && !usedFallback) return;
          if (usedFallback) {
            recordProviderTelemetryEvent({
              provider: resolvedProvider,
              outcome: "fallback",
              message: `Primary provider exhausted; falling back to ${provider}.`,
            });
            toast.loading(`Primary unavailable. Retrying on ${provider}...`, { id: "gen-toast" });
          } else {
            toast.loading(`Retrying ${provider} (attempt ${attempt})...`, { id: "gen-toast" });
          }
        },
      });

      // Prefer the server-reported actual provider (it may have fallen
      // back internally via executeWithFallback on the /api/route/* route);
      // fall back to the client-side executeWithFallback's decision.
      finalProvider = execution.result.actualProvider ?? execution.provider;
      finalModel = execution.model;
      const submission = execution.result;
      jobId = submission.jobId;
      taskId = submission.taskId;
      const serverUsedFallback = Boolean(submission.usedFallback);
      recordProviderTelemetryEvent({ provider: finalProvider, outcome: "queued" });
      telemetryProvider = finalProvider;

      if (submission.directCompletedItem) {
        setActiveGeneration(submission.directCompletedItem);
        setGenerations((prev) => {
          const cleaned = prev.filter((g) => g.id !== submission.directCompletedItem!.id);
          return [submission.directCompletedItem!, ...cleaned];
        });
        // `isGenerating` remains true if there are still background jobs polling.
        setIsGenerating(backgroundJobs.length > 0);
        setIsSubmitting(false);
        recordProviderTelemetryEvent({ provider: finalProvider, outcome: "success" });
        toast.success(
          execution.usedFallback
            ? `Fallback completed with ${finalModel}.`
            : `Rendered ${(submission.directCompletedItem.srcs || [submission.directCompletedItem.src]).length} ${submission.directCompletedItem.generationPlatform === "apimart" ? "ApiMart" : "Studio"} image${submission.directCompletedItem.srcs && submission.directCompletedItem.srcs.length > 1 ? "s" : ""}.`,
          { id: "gen-toast" },
        );
        void persistCompletedGeneration(submission.directCompletedItem);
        return;
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
      setGenerations((prev) => {
        const cleaned = prev.filter((g) => g.id !== newItem.id);
        return [newItem, ...cleaned];
      });
      setIsSubmitting(false);
      startJobPoller(jobId, newItem);

    } catch (error: any) {
      setIsGenerating(false);
      setIsSubmitting(false);
      toast.dismiss('gen-toast');

      const appCode = error.details?.code;
      if (appCode === "INSUFFICIENT_TOKENS") {
        setShowBillingAlert(true);
      } else if (appCode === "PROVIDER_ERROR" || isSurfacedProviderFailure(error)) {
        if (telemetryProvider) {
          recordProviderTelemetryEvent({
            provider: telemetryProvider,
            outcome: "failure",
            message: error instanceof Error ? error.message : "Provider error before queueing.",
          });
        }
        toast.error(error?.message || "The upstream model rejected this job. Please retry or switch models.", {
          duration: 7000,
          id: "gen-toast",
        });
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
    // 2026-04-18: Polling migrated to unified /api/route/tasks/{id}.
    // The server owns provider routing; the client just tells it which
    // provider actually queued this task (which may differ from the
    // originally-requested provider if executeWithFallback flipped it).
    //
    // 2026-04-22 concurrent-gens: this poller may be running for a job that
    // is either the hero (activeGeneration) or a background tile. Every
    // state write uses `updateJobSlot` which targets the right slot.
    const provider = (item.generationPlatform || item.settings?.provider || "poyo") as StudioProvider;
    const maxPollAttempts = provider === "apimart" ? 240 : 200;
    const maxConsecutiveErrors = 6;
    let pollAttempts = 0;
    let consecutiveErrors = 0;

    const updateJobSlot = (patch: GenerationItem) => {
      setActiveGeneration((prev) => (prev && prev.id === patch.id ? patch : prev));
      setBackgroundJobs((prev) => prev.map((j) => (j.id === patch.id ? patch : j)));
    };

    const removeFromBackground = (id: string) => {
      setBackgroundJobs((prev) => prev.filter((j) => j.id !== id));
    };

    const stillInFlight = () => {
      // Used to decide whether to keep `isGenerating` true after a job ends.
      // We read from DOM-refs-free state via setter-callback form elsewhere,
      // but here we can use a coarse check: assume any remaining bg job keeps
      // the flag; the setter below re-derives it.
      return false;
    };

    const markTerminalFailure = (message: string) => {
      const failedItem: GenerationItem = {
        ...item,
        taskId: item.taskId || jobId,
        generationPlatform: provider,
        status: "failed" as const,
        error: message,
      };
      updateJobSlot(failedItem);
      setGenerations((prev: GenerationItem[]) => prev.map((g) => (g.id === jobId ? failedItem : g)));
      setBackgroundJobs((prev) => {
        const next = prev.filter((j) => j.id !== jobId);
        setIsGenerating(next.length > 0);
        return next;
      });
      recordProviderTelemetryEvent({ provider, outcome: "failure", message });
      toast.error(message, { id: "gen-toast" });
      void stillInFlight;
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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        const response = await fetch(
          `/api/route/tasks/${encodeURIComponent(jobId)}?provider=${encodeURIComponent(provider)}&language=en`,
          { cache: "no-store", signal: controller.signal },
        ).finally(() => {
          clearTimeout(timeout);
        });
        const raw = await response.text();
        const payload = raw ? JSON.parse(raw) : null;
        if (!response.ok) {
          const statusError = new Error(payload?.error || `Task polling failed (${response.status})`);
          (statusError as any).details = payload?.details;
          throw statusError;
        }

        // Adapt /api/route/tasks normalized shape → legacy field names
        // the downstream branches still read (output_urls, thumbnailUrl,
        // taskId, error-as-string, and a "processing"→default status).
        const normalized = payload as {
          status: "pending" | "processing" | "completed" | "failed";
          progress?: number;
          output_urls?: string[];
          thumbnail_url?: string;
          task_id?: string;
          error?: { message?: string; code?: string | number };
        };
        const data: any = {
          status: normalized.status,
          progress: normalized.progress,
          output_urls: normalized.output_urls || [],
          thumbnailUrl: normalized.thumbnail_url,
          taskId: normalized.task_id || jobId,
          error: normalized.error?.message,
        };

        consecutiveErrors = 0;

        if (data.status === "completed") {
          console.log("Finished Rendering!", data);

          
          const rawUrls =
            data.outputUrls ||
            data.output_urls ||
            data.images ||
            data.urls ||
            data.result_urls ||
            (Array.isArray(data.outputUrl) ? data.outputUrl : data.outputUrl ? [data.outputUrl] : null);
          const urls = flattenOutputUrls(rawUrls);

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

            updateJobSlot(batchItem);


            setGenerations((prev: GenerationItem[]) => {
              const cleaned = prev.filter(g => g.id !== jobId);
              return [...completedItems, ...cleaned];
            });
            // Background jobs stay in the stack with a "completed" (green)
            // state so the user can click to bring the result into the
            // hero slot. updateJobSlot above already patched the tile.
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
            updateJobSlot(completedItem);
            setGenerations((prev: GenerationItem[]) => {
              if (prev.some((g) => g.id === jobId)) {
                return prev.map(g => g.id === jobId ? completedItem : g);
              }
              return [completedItem, ...prev];
            });
            // Background jobs stay in the stack as "completed" tiles; user
            // clicks them to bring the result into the hero.
            recordProviderTelemetryEvent({ provider, outcome: "success" });
            void persistCompletedGeneration(completedItem);
          }
          // Any still-IN-FLIGHT background tiles keep the flag true. Completed
          // tiles remain visible but no longer count as "generating".
          setBackgroundJobs((prev) => {
            const anyInFlight = prev.some(
              (j) => j.status === "queued" || j.status === "generating",
            );
            setIsGenerating(anyInFlight);
            return prev;
          });
        } else if (data.status === "failed" || data.status === "cancelled") {
          console.log("Task Failed, internal backend already refunded tokens!", data.error);
          const failedItem: GenerationItem = {
            ...item,
            taskId: data.taskId || item.taskId || jobId,
            generationPlatform: provider,
            status: "failed" as const,
            error: data.error || (data.status === "cancelled" ? "Generation was cancelled." : "Generation failed."),
          };
          updateJobSlot(failedItem);
          setGenerations((prev: GenerationItem[]) => prev.map(g => g.id === jobId ? failedItem : g));
          setBackgroundJobs((prev) => {
            const next = prev.filter((j) => j.id !== jobId);
            setIsGenerating(next.length > 0);
            return next;
          });
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

          const makePatch = (g: GenerationItem) => ({
            ...g,
            generationPlatform: provider,
            taskId: data.taskId || g.taskId || jobId,
            status: "generating" as const,
            progress,
            completedCount,
            totalCount,
          });
          setActiveGeneration((prev) => (prev && prev.id === jobId ? makePatch(prev) : prev));
          setBackgroundJobs((prev) => prev.map((g) => (g.id === jobId ? makePatch(g) : g)));
          setGenerations((prev: GenerationItem[]) =>
            prev.map(g => g.id === jobId ? makePatch(g) : g)
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

  // Cancel + remove any job (hero or background) by id. Used by the stack X
  // button and by handleCancel for the hero slot.
  const cancelJobById = async (jobId: string, source: "hero" | "background") => {
    const jobFromState =
      (activeGeneration && activeGeneration.id === jobId ? activeGeneration : null) ||
      backgroundJobs.find((j) => j.id === jobId) ||
      null;
    const provider = (jobFromState?.generationPlatform || jobFromState?.settings?.provider || "poyo") as StudioProvider;
    cancelledJobsRef.current.add(jobId);

    if (source === "hero") {
      setActiveGeneration(null);
      safeRemoveLocalStorage(STUDIO_ACTIVE_STORAGE_KEY);
      safeRemoveLocalStorage(STUDIO_ACTIVE_TIME_KEY);
    }
    setBackgroundJobs((prev) => {
      const next = prev.filter((j) => j.id !== jobId);
      // If source is "hero" the active slot is now empty, so in-flight state
      // is purely a function of background jobs remaining.
      // If source is "background", activeGeneration may still be in-flight.
      if (source === "hero") {
        setIsGenerating(next.length > 0);
      }
      return next;
    });
    setGenerations((prev) => prev.map((g) => (g.id === jobId ? { ...g, status: "failed" as const } : g)));

    if (provider === "apimart") {
      if (source === "hero") {
        toast.info("ApiMart cancellation is not wired yet, so the job was removed locally only.");
      }
      return;
    }

    try {
      const cancelJob = httpsCallable(functions, "cancelStudioJob");
      await cancelJob({ jobId });
    } catch (err) {
      console.error("Warning: Could not officially cancel backend job, it may still render.", err);
    }
  };

  const handleCancel = async () => {
    if (!activeGeneration?.id) return;
    await cancelJobById(activeGeneration.id, "hero");
  };

  // Stack: user clicked X on a background tile.
  const handleDismissBackgroundJob = (jobId: string) => {
    void cancelJobById(jobId, "background");
  };

  // Stack: user clicked a background tile → swap it into the hero slot.
  // The current hero (if any, and still in-flight) gets demoted to the stack.
  const handleSwapHero = (jobId: string) => {
    const target = backgroundJobs.find((j) => j.id === jobId);
    if (!target) return;

    setBackgroundJobs((prev) => prev.filter((j) => j.id !== jobId));
    setActiveGeneration((prevHero) => {
      if (prevHero && prevHero.id !== jobId && prevHero.status !== "failed") {
        setBackgroundJobs((prev) => {
          if (prev.some((j) => j.id === prevHero.id)) return prev;
          return [...prev, prevHero];
        });
      }
      return target;
    });
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
    <div className="min-h-screen bg-black text-zinc-100 font-sans relative selection:bg-cyan-500/30 overflow-hidden">
      <ThemeBackdrop />

      {/* Billing Alert Modal */}
      {showBillingAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4">
          <div className="relative rounded-2xl overflow-hidden max-w-[380px] w-full shadow-2xl transform animate-in zoom-in-95 duration-200 border border-[#06b6d4]/20 bg-[#111]">
            <div className="relative z-10 py-10 px-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-[#06b6d4]/10 rounded-full flex items-center justify-center mb-6 border border-[#06b6d4]/20">
                <Sparkles className="w-5 h-5 text-[#06b6d4]" />
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
        {/* Top Bar — desktop only keeps the glass title; mobile uses a slim header */}
        <div className="hidden lg:flex relative h-14 items-center justify-center px-6 shrink-0 bg-black/20 backdrop-blur-xl overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[140px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.22)_0%,transparent_70%)] blur-2xl" aria-hidden />
          <h1 className="relative studio-display text-xl md:text-2xl italic text-white capitalize tracking-tight drop-shadow-[0_0_20px_rgba(6,182,212,0.35)]">
            {studioMode.replace(/-/g, " ")}
          </h1>
        </div>

        {/* Mobile slim header */}
        <div className="lg:hidden relative h-12 flex items-center justify-between px-3 shrink-0 bg-black/70 backdrop-blur-xl border-b border-white/[0.06]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
            className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-200 hover:text-white hover:bg-white/[0.08]"
            aria-label="Modes"
          >
            <Menu className="w-4 h-4" />
          </Button>
          <h1 className="studio-display italic text-base text-white/90 capitalize tracking-tight truncate max-w-[60%] text-center">
            {studioMode.replace(/-/g, " ")}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="w-9 h-9 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.06]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content: desktop = two columns; mobile = single scroll */}
        <div className="flex h-[calc(100%-48px)] lg:h-[calc(100%-56px)] overflow-hidden flex-col lg:flex-row relative">
          {/* Generation Form (mobile: canvas slot only mounts when active/generating) */}
          <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <StudioLeftPanel
                onGenerate={(prompt, settings) => {
                  handleGenerate(prompt, settings);
                  setMobilePanelOpen(false);
                  setCanvasOpen(true);
                }}
                onCancel={handleCancel}
                isGenerating={isGenerating}
                isSubmitting={isSubmitting}
                mode={studioModeToCreationMode(studioMode)}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                studioMode={studioMode}
                activeGeneration={activeGeneration}
                externalPrompt={suggestionPrompt}
                mobileInlineCanvas={
                  (isGenerating || activeGeneration) ? (
                    <div className="relative w-full h-full">
                      <StudioCenterCanvas
                        activeGeneration={activeGeneration}
                        mode={studioModeToCreationMode(studioMode)}
                        isGenerating={isGenerating}
                        aspectRatio={aspectRatio}
                        onOpenPanel={() => setMobilePanelOpen(true)}
                        onSuggestionClick={(p) => setSuggestionPrompt(p)}
                      />
                      <GenerationStack
                        jobs={backgroundJobs}
                        onSwapHero={handleSwapHero}
                        onDismiss={handleDismissBackgroundJob}
                        visibleMax={2}
                      />
                    </div>
                  ) : null
                }
                canvasOpen={canvasOpen}
                onOpenCanvas={() => setCanvasOpen(true)}
                onCloseCanvas={() => {
                  setCanvasOpen(false);
                }}
              />
            </div>
          </div>

          {/* Desktop-only canvas column */}
          <div className="hidden lg:flex flex-1 h-full min-h-0 min-w-0 flex-col relative">
            <StudioCenterCanvas
              activeGeneration={activeGeneration}
              mode={studioModeToCreationMode(studioMode)}
              isGenerating={isGenerating}
              aspectRatio={aspectRatio}
              onOpenPanel={() => setMobilePanelOpen(true)}
              onSuggestionClick={(p) => setSuggestionPrompt(p)}
            />
            <GenerationStack
              jobs={backgroundJobs}
              onSwapHero={handleSwapHero}
              onDismiss={handleDismissBackgroundJob}
              visibleMax={4}
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
