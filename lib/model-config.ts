import { getModelCredits } from "./model-credits";

export type ModelType = "image" | "video";

export interface DurationOption {
  value: number;
  label: string;
  disabled?: boolean;
}

export interface ResolutionOption {
  value: string;
  label: string;
}

export interface ImageModelConfig {
  type: "image";
  id: string;
  name: string;
  baseCost: number;
  sizeOptions: string[];
  supportsN: boolean;
  maxN: number;
  supportsResolution: boolean;
  resolutionOptions?: ResolutionOption[];
  defaultResolution?: string;
  supportsReferenceImage: boolean;
  maxReferenceImages?: number;
  supportsMask: boolean;
  supportsOutputFormat: boolean;
  outputFormatOptions?: string[];
  editVariant?: string | null;
  isNew?: boolean;
  getCost: (params: { resolution?: string; n?: number }) => number;
}

export interface VideoModelConfig {
  type: "video";
  id: string;
  name: string;
  baseCost: number;
  aspectRatioOptions?: string[];
  durationOptions?: DurationOption[];
  defaultDuration?: number;
  durationRange?: { min: number; max: number };
  supportsResolution: boolean;
  resolutionOptions?: ResolutionOption[];
  defaultResolution?: string;
  supportsReferenceImage: boolean;
  maxReferenceImages?: number;
  supportsReferenceVideo: boolean;
  requiresReferenceImage?: boolean;
  requiresReferenceVideo?: boolean;
  supportsSound: boolean;
  supportsMultiShots: boolean;
  supportsFixedLens: boolean;
  supportsGenerateAudio: boolean;
  supportsPromptOptimizer: boolean;
  supportsPrompt: boolean;
  supportsStyle: boolean;
  styleOptions?: string[];
  supportsStoryboard: boolean;
  supportsNegativePrompt: boolean;
  supportsStartImage: boolean;
  supportsEndImage: boolean;
  supportsMode: boolean;
  modeOptions?: string[];
  supportsCharacterOrientation: boolean;
  characterOrientationOptions?: string[];
  supportsCameraMovement?: boolean;
  supportsEffectPreset?: boolean;
  supportsCharacterLock?: boolean;
  supportsAudioDirection?: boolean;
  /**
   * True when the model derives output aspect ratio from the reference
   * image and ignores the caller's `aspect_ratio` field. Used by the
   * 2-step AR pipeline (lib/studio-two-step.ts) to decide whether to
   * insert a reframing image edit before the video job. Defaults to
   * undefined (treated as false / safe).
   */
  ignoresArOnRef?: boolean;
  isNew?: boolean;
  durationConstraints?: Record<string, number[]>;
  getCost: (params: {
    resolution?: string;
    duration?: number;
    generateAudio?: boolean;
    n?: number;
  }) => number;
}

export type ModelConfig = ImageModelConfig | VideoModelConfig;

const GPT_SIZES = ["1:1", "2:3", "3:2"];
const STANDARD_SIZES = ["1:1", "4:3", "3:4", "16:9", "9:16"];
const EXTENDED_SIZES = ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9", "16:21"];
const WIDE_SIZES = ["1:1", "3:4", "4:3", "16:9", "9:16", "3:2", "2:3", "21:9"];
const GROK_IMAGE_SIZES = ["1:1", "2:3", "3:2", "16:9", "9:16"];

export const IMAGE_MODELS: Record<string, ImageModelConfig> = {
  "gpt-4o-image": {
    type: "image",
    id: "gpt-4o-image",
    name: "GPT 4o Image",
    baseCost: 4,
    sizeOptions: GPT_SIZES,
    supportsN: true,
    maxN: 4,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsMask: true,
    supportsOutputFormat: false,
    editVariant: "gpt-4o-image-edit",
    getCost: ({ n = 1 }) => getModelCredits("gpt-4o-image", { n }),
  },

  "gpt-image-1.5": {
    type: "image",
    id: "gpt-image-1.5",
    name: "GPT Image 1.5",
    baseCost: 2,
    sizeOptions: GPT_SIZES,
    supportsN: true,
    maxN: 4,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsMask: true,
    supportsOutputFormat: false,
    editVariant: "gpt-image-1.5-edit",
    getCost: ({ n = 1 }) => getModelCredits("gpt-image-1.5", { n }),
  },

  "nano-banana": {
    type: "image",
    id: "nano-banana",
    name: "Nano Banana",
    baseCost: 5,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsMask: false,
    supportsOutputFormat: false,
    // Keep Studio image edits on the base Nano Banana model.
    // ApiMart accepts reference images on the base wire model; auto-
    // switching to a synthetic edit ID breaks routing and fallback.
    editVariant: null,
    getCost: () => getModelCredits("nano-banana"),
  },

  "nano-banana-2": {
    type: "image",
    id: "nano-banana-2",
    name: "Nano Banana 2 Pro",
    baseCost: 8,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: true,
    resolutionOptions: [
      { value: "1K", label: "Standard (1K)" },
      { value: "2K", label: "Ultra (2K)" },
    ],
    defaultResolution: "2K",
    supportsReferenceImage: true,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    getCost: ({ resolution = "2K" }) => getModelCredits("nano-banana-2", { resolution }),
  },

  "nano-banana-2-new": {
    type: "image",
    id: "nano-banana-2-new",
    name: "Nano Banana 2 (New)",
    baseCost: 5,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: true,
    resolutionOptions: [
      { value: "1K", label: "Standard (1K)" },
      { value: "2K", label: "Ultra (2K)" },
    ],
    defaultResolution: "2K",
    supportsReferenceImage: true,
    supportsMask: false,
    supportsOutputFormat: false,
    // `nano-banana-2-new-edit` remains reserved for the 2-step AR helper.
    // Normal Studio image generation should stay on the base model ID.
    editVariant: null,
    isNew: true,
    getCost: ({ resolution = "2K" }) => getModelCredits("nano-banana-2-new", { resolution }),
  },

  "flux-2-pro": {
    type: "image",
    id: "flux-2-pro",
    name: "Flux 2 Pro",
    baseCost: 6,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: true,
    resolutionOptions: [
      { value: "1K", label: "Standard (1K)" },
      { value: "2K", label: "Ultra (2K)" },
    ],
    defaultResolution: "1K",
    supportsReferenceImage: true,
    maxReferenceImages: 8,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: "flux-2-pro-edit",
    getCost: ({ resolution = "1K" }) => getModelCredits("flux-2-pro", { resolution }),
  },

  "flux-2-flex": {
    type: "image",
    id: "flux-2-flex",
    name: "Flux 2 Flex",
    baseCost: 18,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: true,
    resolutionOptions: [
      { value: "1K", label: "Standard (1K)" },
      { value: "2K", label: "Ultra (2K)" },
    ],
    defaultResolution: "1K",
    supportsReferenceImage: true,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: "flux-2-flex-edit",
    getCost: ({ resolution = "1K" }) => getModelCredits("flux-2-flex", { resolution }),
  },

  "flux-kontext-pro": {
    type: "image",
    id: "flux-kontext-pro",
    name: "Flux Kontext Pro",
    baseCost: 6,
    sizeOptions: EXTENDED_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: false,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
    supportsMask: false,
    supportsOutputFormat: true,
    outputFormatOptions: ["png", "jpg"],
    editVariant: "flux-kontext-pro-edit",
    getCost: () => getModelCredits("flux-kontext-pro"),
  },

  "flux-kontext-max": {
    type: "image",
    id: "flux-kontext-max",
    name: "Flux Kontext Max",
    baseCost: 10,
    sizeOptions: EXTENDED_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: false,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
    supportsMask: false,
    supportsOutputFormat: true,
    outputFormatOptions: ["png", "jpg"],
    editVariant: "flux-kontext-max-edit",
    getCost: () => getModelCredits("flux-kontext-max"),
  },

  "seedream-4.5": {
    type: "image",
    id: "seedream-4.5",
    name: "SeeDream 4.5",
    baseCost: 5,
    sizeOptions: STANDARD_SIZES,
    supportsN: true,
    maxN: 4,
    supportsResolution: false,
    supportsReferenceImage: true,
    maxReferenceImages: 10,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: "seedream-4.5-edit",
    getCost: ({ n = 1 }) => getModelCredits("seedream-4.5", { n }),
  },

  "seedream-5.0-lite": {
    type: "image",
    id: "seedream-5.0-lite",
    name: "SeeDream 5.0 Lite",
    baseCost: 5,
    sizeOptions: STANDARD_SIZES,
    supportsN: true,
    maxN: 4,
    supportsResolution: false,
    supportsReferenceImage: true,
    maxReferenceImages: 10,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: "seedream-5.0-lite-edit",
    getCost: ({ n = 1 }) => getModelCredits("seedream-5.0-lite", { n }),
  },

  "z-image": {
    type: "image",
    id: "z-image",
    name: "Z-Image",
    baseCost: 2,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: false,
    supportsReferenceImage: false,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    getCost: () => getModelCredits("z-image"),
  },

  "gpt-image-2": {
    type: "image",
    id: "gpt-image-2",
    name: "GPT Image 2",
    baseCost: 10,
    sizeOptions: GPT_SIZES,
    supportsN: true,
    maxN: 4,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    isNew: true,
    getCost: ({ n = 1 }) => getModelCredits("gpt-image-2", { n }),
  },

  "nano-banana-pro": {
    type: "image",
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    baseCost: 10,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: true,
    resolutionOptions: [
      { value: "1K", label: "Standard (1K)" },
      { value: "2K", label: "Ultra (2K)" },
      { value: "4K", label: "Cinema (4K)" },
    ],
    defaultResolution: "2K",
    supportsReferenceImage: true,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    isNew: true,
    getCost: ({ resolution = "2K" }) => getModelCredits("nano-banana-pro", { resolution }),
  },

  "nano-banana-2-official": {
    type: "image",
    id: "nano-banana-2-official",
    name: "Nano Banana 2 (Official)",
    baseCost: 12,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: true,
    resolutionOptions: [
      { value: "1K", label: "Standard (1K)" },
      { value: "2K", label: "Ultra (2K)" },
    ],
    defaultResolution: "2K",
    supportsReferenceImage: true,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    getCost: ({ resolution = "2K" }) => getModelCredits("nano-banana-2-official", { resolution }),
  },

  "qwen-image-2.0-pro": {
    type: "image",
    id: "qwen-image-2.0-pro",
    name: "Qwen Image 2.0 Pro",
    baseCost: 5,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    isNew: true,
    getCost: () => getModelCredits("qwen-image-2.0-pro"),
  },

  "wan-2.7-image-pro": {
    type: "image",
    id: "wan-2.7-image-pro",
    name: "Wan 2.7 Image Pro",
    baseCost: 5,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: false,
    supportsReferenceImage: false,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    isNew: true,
    getCost: () => getModelCredits("wan-2.7-image-pro"),
  },

  "kling-o3-image": {
    type: "image",
    id: "kling-o3-image",
    name: "Kling O3 Image",
    baseCost: 6,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: false,
    supportsReferenceImage: false,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    isNew: true,
    getCost: () => getModelCredits("kling-o3-image"),
  },


  "grok-imagine-image": {
    type: "image",
    id: "grok-imagine-image",
    name: "Grok Imagine (Image)",
    baseCost: 6,
    sizeOptions: GROK_IMAGE_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    getCost: () => getModelCredits("grok-imagine-image"),
  },

  // --- Step 3: added from handoff §11 P3 ---
};

export const VIDEO_MODELS: Record<string, VideoModelConfig> = {







  "grok-vid": {
    type: "video",
    id: "grok-vid",
    name: "Grok Imagine (Video)",
    baseCost: 30,
    aspectRatioOptions: ["1:1", "2:3", "3:2", "16:9", "9:16"],
    durationOptions: [
      { value: 6, label: "6s" },
      { value: 10, label: "10s" },
    ],
    defaultDuration: 6,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: true,
    modeOptions: ["normal", "fun", "spicy"],
    supportsCharacterOrientation: false,
    getCost: ({ duration }) => getModelCredits("grok-vid", { duration }),
  },



  "hailuo-2.3": {
    type: "video",
    id: "hailuo-2.3",
    name: "Hailuo 2.3",
    baseCost: 35,
    durationOptions: [
      { value: 6, label: "6s" },
      { value: 10, label: "10s" },
    ],
    defaultDuration: 6,
    supportsResolution: true,
    resolutionOptions: [
      { value: "768p", label: "768p" },
      { value: "1080p", label: "1080p" },
    ],
    defaultResolution: "768p",
    supportsReferenceImage: false,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: true,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: true,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    supportsCameraMovement: true,
    durationConstraints: {
      "1080p": [6],
    },
    getCost: ({ resolution = "768p", duration = 6 }) => getModelCredits("hailuo-2.3", { resolution, duration }),
  },

  "wan2.6-text-to-video": {
    type: "video",
    id: "wan2.6-text-to-video",
    name: "Wan 2.6 (Text)",
    baseCost: 15,
    durationOptions: [
      { value: 5, label: "5s" },
      { value: 10, label: "10s" },
      { value: 15, label: "15s" },
    ],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
    ],
    defaultResolution: "1080p",
    supportsReferenceImage: false,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: true,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    supportsEffectPreset: true,
    getCost: ({ resolution = "1080p", duration = 5 }) => getModelCredits("wan2.6-text-to-video", { resolution, duration }),
  },



  "doubao-seedance-2.0": {
    type: "video",
    id: "doubao-seedance-2.0",
    name: "Seedance 2",
    baseCost: 20,
    aspectRatioOptions: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    durationOptions: [
      { value: 4, label: "4s" },
      { value: 5, label: "5s" },
      { value: 8, label: "8s" },
      { value: 10, label: "10s" },
      { value: 12, label: "12s" },
      { value: 15, label: "15s" },
    ],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [
      { value: "480p", label: "480p" },
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
    ],
    defaultResolution: "720p",
    supportsReferenceImage: true,
    maxReferenceImages: 2,
    supportsReferenceVideo: true,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    supportsCharacterLock: true,
    isNew: true,
    getCost: ({ resolution = "720p", duration = 5 }) => getModelCredits("doubao-seedance-2.0", { resolution, duration }),
  },

  "seedance-2": {
    type: "video",
    id: "seedance-2",
    name: "Seedance 2",
    baseCost: 30,
    aspectRatioOptions: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
    durationOptions: [
      { value: 4, label: "4s" },
      { value: 5, label: "5s" },
      { value: 8, label: "8s" },
      { value: 10, label: "10s" },
      { value: 12, label: "12s" },
      { value: 15, label: "15s" },
    ],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [
      { value: "480p", label: "480p" },
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
    ],
    defaultResolution: "720p",
    // Capability flags below mirror Poyo's seedance-2 wire spec exactly.
    // Anything else gets stripped by normalizePoyoVideoPayload, so showing UI
    // for it would be misleading (silent no-op + stranded uploaded media).
    supportsReferenceImage: true,
    maxReferenceImages: 2,
    supportsReferenceVideo: false,
    supportsSound: false,            // would duplicate Audio Synthesis toggle
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: true,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    supportsCharacterLock: false,
    isNew: true,
    getCost: ({ resolution = "720p", duration = 5 }) => getModelCredits("seedance-2", { resolution, duration }),
  },

  "sora-2-official": {
    type: "video",
    id: "sora-2-official",
    name: "Sora 2 Official",
    baseCost: 48,
    aspectRatioOptions: ["16:9", "9:16"],
    durationOptions: [
      { value: 4, label: "4s" },
      { value: 8, label: "8s" },
      { value: 12, label: "12s" },
      { value: 16, label: "16s" },
      { value: 20, label: "20s" },
    ],
    defaultDuration: 4,
    supportsResolution: false,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: true,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    supportsCharacterLock: true,
    isNew: true,
    getCost: ({ duration = 4 }) => getModelCredits("sora-2-official", { duration }),
  },

  // --- Step 3: added from handoff §11 P3 ---
  "veo3.1-lite": {
    type: "video",
    id: "veo3.1-lite",
    name: "Veo 3.1 Lite",
    baseCost: 30,
    aspectRatioOptions: ["16:9", "9:16"],
    durationOptions: [{ value: 5, label: "5s" }, { value: 8, label: "8s" }],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }],
    defaultResolution: "720p",
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: true,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: true,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    isNew: true,
    getCost: () => getModelCredits("veo3.1-lite"),
  },

  "veo3.1-fast-official": {
    type: "video",
    id: "veo3.1-fast-official",
    name: "Veo 3.1 Fast (Official)",
    baseCost: 60,
    aspectRatioOptions: ["16:9", "9:16"],
    durationOptions: [{ value: 8, label: "8s" }],
    defaultDuration: 8,
    supportsResolution: true,
    resolutionOptions: [{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }],
    defaultResolution: "720p",
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: true,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: true,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    isNew: true,
    getCost: () => getModelCredits("veo3.1-fast-official"),
  },

  "veo3.1-quality-official": {
    type: "video",
    id: "veo3.1-quality-official",
    name: "Veo 3.1 Quality (Official)",
    baseCost: 120,
    aspectRatioOptions: ["16:9", "9:16"],
    durationOptions: [{ value: 8, label: "8s" }],
    defaultDuration: 8,
    supportsResolution: true,
    resolutionOptions: [{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }],
    defaultResolution: "1080p",
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: true,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: true,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    isNew: true,
    getCost: () => getModelCredits("veo3.1-quality-official"),
  },


  "kling-v3-omni": {
    type: "video",
    id: "kling-v3-omni",
    name: "Kling v3 Omni",
    baseCost: 40,
    aspectRatioOptions: ["16:9", "9:16", "1:1"],
    durationOptions: [{ value: 5, label: "5s" }, { value: 10, label: "10s" }],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }],
    defaultResolution: "1080p",
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    supportsCharacterLock: true,
    isNew: true,
    getCost: ({ resolution = "1080p", duration = 5 }) => getModelCredits("kling-v3-omni", { resolution, duration }),
  },

  "kling-video-o1": {
    type: "video",
    id: "kling-video-o1",
    name: "Kling Video O1",
    baseCost: 36,
    aspectRatioOptions: ["16:9", "9:16", "1:1"],
    durationOptions: [{ value: 5, label: "5s" }, { value: 10, label: "10s" }],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }],
    defaultResolution: "1080p",
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    supportsCharacterLock: true,
    isNew: true,
    getCost: ({ resolution = "1080p", duration = 5 }) => getModelCredits("kling-video-o1", { resolution, duration }),
  },



  "wan2.6-video-to-video": {
    type: "video",
    id: "wan2.6-video-to-video",
    name: "Wan 2.6 Video-to-Video",
    baseCost: 28,
    aspectRatioOptions: ["16:9", "9:16", "1:1"],
    durationOptions: [{ value: 5, label: "5s" }, { value: 8, label: "8s" }],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }],
    defaultResolution: "720p",
    supportsReferenceImage: false,
    supportsReferenceVideo: true,
    requiresReferenceVideo: true,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    isNew: true,
    getCost: ({ resolution = "720p", duration = 5 }) => getModelCredits("wan2.6-video-to-video", { resolution, duration }),
  },


  "runway-gen-4.5": {
    type: "video",
    id: "runway-gen-4.5",
    name: "Runway Gen-4.5",
    baseCost: 50,
    aspectRatioOptions: ["16:9", "9:16", "1:1"],
    durationOptions: [{ value: 5, label: "5s" }, { value: 10, label: "10s" }],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }],
    defaultResolution: "1080p",
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: true,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: true,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: true,
    supportsEndImage: true,
    supportsMode: false,
    supportsCharacterOrientation: false,
    isNew: true,
    getCost: ({ resolution = "1080p", duration = 5 }) => getModelCredits("runway-gen-4.5", { resolution, duration }),
  },
};

// Customer-facing Studio image picker list.
// Keep provider-specific official tiers routable internally, but avoid
// exposing duplicate/confusing variants as separate visible choices.
const HIDDEN_IMAGE_MODEL_IDS = new Set<string>([
  "nano-banana-2-official",
]);

export const IMAGE_MODEL_LIST: ImageModelConfig[] = Object.values(IMAGE_MODELS).filter(
  (model) => !HIDDEN_IMAGE_MODEL_IDS.has(model.id)
);

// Public Studio video surface — keep this order explicit.
// The web app renders `VIDEO_MODEL_LIST`, and Telegram should mirror this
// exact keep-list/order instead of carrying older wizard-era legacy models.
export const VIDEO_MODEL_PRIORITY: Array<keyof typeof VIDEO_MODELS> = [
  "grok-vid",
  "hailuo-2.3",
  "wan2.6-text-to-video",
  "seedance-2",
  "sora-2-official",
  "veo3.1-lite",
  "veo3.1-fast-official",
  "veo3.1-quality-official",
  "kling-v3-omni",
  "kling-video-o1",
  "wan2.6-video-to-video",
  "runway-gen-4.5",
];

export const VIDEO_MODEL_LIST: VideoModelConfig[] = VIDEO_MODEL_PRIORITY.map(
  (modelId) => VIDEO_MODELS[modelId]
);

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return IMAGE_MODELS[modelId] || VIDEO_MODELS[modelId];
}

export function getImageModelConfig(modelId: string): ImageModelConfig | undefined {
  return IMAGE_MODELS[modelId];
}

export function getVideoModelConfig(modelId: string): VideoModelConfig | undefined {
  return VIDEO_MODELS[modelId];
}

export function calculateImageCost(
  modelId: string,
  params: { resolution?: string; n?: number }
): number {
  const config = IMAGE_MODELS[modelId];
  if (!config) return 0;
  return config.getCost(params);
}

export function calculateVideoCost(
  modelId: string,
  params: {
    resolution?: string;
    duration?: number;
    generateAudio?: boolean;
  }
): number {
  const config = VIDEO_MODELS[modelId];
  if (!config) return 0;
  return config.getCost(params);
}
