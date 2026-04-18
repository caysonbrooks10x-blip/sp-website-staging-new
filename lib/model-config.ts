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
    getCost: ({ n = 1 }) => 4 * n,
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
    getCost: ({ n = 1 }) => 2 * n,
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
    editVariant: "nano-banana-edit",
    getCost: () => 5,
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
    editVariant: "nano-banana-2-edit",
    getCost: ({ resolution = "2K" }) => 8 * (resolution === "2K" ? 2 : 1),
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
    editVariant: "nano-banana-2-new-edit",
    isNew: true,
    getCost: ({ resolution = "2K" }) => 5 * (resolution === "2K" ? 2 : 1),
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
    getCost: ({ resolution = "1K" }) => 6 * (resolution === "2K" ? 2 : 1),
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
    getCost: ({ resolution = "1K" }) => 18 * (resolution === "2K" ? 2 : 1),
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
    getCost: () => 6,
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
    getCost: () => 10,
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
    getCost: ({ n = 1 }) => 5 * n,
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
    getCost: ({ n = 1 }) => 5 * n,
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
    getCost: () => 2,
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
    editVariant: "nano-banana-pro-edit",
    isNew: true,
    getCost: ({ resolution = "2K" }) => 10 * (resolution === "4K" ? 4 : resolution === "2K" ? 2 : 1),
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
    editVariant: "nano-banana-2-official-edit",
    getCost: ({ resolution = "2K" }) => 12 * (resolution === "2K" ? 2 : 1),
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
    getCost: () => 5,
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
    getCost: () => 5,
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
    editVariant: "kling-o3-image-edit",
    isNew: true,
    getCost: () => 6,
  },

  "kling-o3-image-edit": {
    type: "image",
    id: "kling-o3-image-edit",
    name: "Kling O3 Image Edit",
    baseCost: 6,
    sizeOptions: STANDARD_SIZES,
    supportsN: false,
    maxN: 1,
    supportsResolution: false,
    supportsReferenceImage: true,
    maxReferenceImages: 1,
    supportsMask: false,
    supportsOutputFormat: false,
    editVariant: null,
    isNew: true,
    getCost: () => 6,
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
    getCost: () => 6,
  },

  // --- Step 3: added from handoff §11 P3 ---
};

export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  "sora-2": {
    type: "video",
    id: "sora-2",
    name: "Sora 2",
    baseCost: 48,
    aspectRatioOptions: ["16:9", "9:16"],
    durationOptions: [
      { value: 10, label: "10s" },
      { value: 15, label: "15s" },
    ],
    defaultDuration: 10,
    supportsResolution: false,
    supportsReferenceImage: false,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: true,
    styleOptions: ["none", "thanksgiving", "comic", "news", "selfie", "nostalgic", "anime"],
    supportsStoryboard: true,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    getCost: ({ duration = 10 }) => Math.round(48 * (duration / 10)),
  },

  "sora-2-pro": {
    type: "video",
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    baseCost: 100,
    aspectRatioOptions: ["16:9", "9:16"],
    durationOptions: [
      { value: 15, label: "15s" },
      { value: 25, label: "25s" },
    ],
    defaultDuration: 15,
    supportsResolution: false,
    supportsReferenceImage: false,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: true,
    styleOptions: ["none", "thanksgiving", "comic", "news", "selfie", "nostalgic", "anime"],
    supportsStoryboard: true,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    getCost: ({ duration = 15 }) => Math.round(100 * (duration / 15)),
  },

  "veo3.1-fast": {
    type: "video",
    id: "veo3.1-fast",
    name: "Veo 3.1 Fast",
    baseCost: 20,
    aspectRatioOptions: ["16:9", "9:16"],
    supportsResolution: true,
    resolutionOptions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
      { value: "4k", label: "4K" },
    ],
    defaultResolution: "720p",
    supportsReferenceImage: true,
    maxReferenceImages: 3,
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
    getCost: ({ resolution = "720p" }) => {
      if (resolution === "4k") return 80;
      if (resolution === "1080p") return 40;
      return 20;
    },
  },

  "veo3.1-quality": {
    type: "video",
    id: "veo3.1-quality",
    name: "Veo 3.1 Quality",
    baseCost: 40,
    aspectRatioOptions: ["16:9", "9:16"],
    supportsResolution: true,
    resolutionOptions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
      { value: "4k", label: "4K" },
    ],
    defaultResolution: "720p",
    supportsReferenceImage: true,
    maxReferenceImages: 3,
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
    getCost: ({ resolution = "720p" }) => {
      if (resolution === "4k") return 160;
      if (resolution === "1080p") return 80;
      return 40;
    },
  },

  "kling-3.0/standard": {
    type: "video",
    id: "kling-3.0/standard",
    name: "Kling 3.0 Standard",
    baseCost: 45,
    aspectRatioOptions: ["1:1", "16:9", "9:16"],
    durationRange: { min: 3, max: 15 },
    defaultDuration: 5,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: true,
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
    getCost: ({ duration = 5 }) => 9 * duration,
  },

  "kling-3.0/pro": {
    type: "video",
    id: "kling-3.0/pro",
    name: "Kling 3.0 Pro",
    baseCost: 75,
    aspectRatioOptions: ["1:1", "16:9", "9:16"],
    durationRange: { min: 3, max: 15 },
    defaultDuration: 5,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: true,
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
    getCost: ({ duration = 5 }) => 15 * duration,
  },

  "kling-2.6": {
    type: "video",
    id: "kling-2.6",
    name: "Kling 2.6",
    baseCost: 50,
    aspectRatioOptions: ["1:1", "16:9", "9:16"],
    durationOptions: [
      { value: 5, label: "5s" },
      { value: 10, label: "10s" },
    ],
    defaultDuration: 5,
    supportsResolution: false,
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: true,
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
    getCost: ({ duration = 5 }) => 10 * duration,
  },

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
    getCost: () => 30,
  },

  "seedance-2": {
    type: "video",
    id: "seedance-2",
    name: "SeeDance 2 (Poyo)",
    baseCost: 18,
    aspectRatioOptions: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    durationOptions: [
      { value: 4, label: "4s" },
      { value: 8, label: "8s" },
      { value: 12, label: "12s" },
    ],
    defaultDuration: 4,
    supportsResolution: true,
    resolutionOptions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
      { value: "2K", label: "2K" },
    ],
    defaultResolution: "1080p",
    supportsReferenceImage: true,
    maxReferenceImages: 1,
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
    getCost: ({ resolution = "1080p", duration = 4 }) => {
      const grid: Record<string, Record<number, number>> = {
        "720p": { 4: 18, 8: 36, 12: 54 },
        "1080p": { 4: 24, 8: 48, 12: 72 },
        "2K": { 4: 32, 8: 64, 12: 96 },
      };
      return grid[resolution]?.[duration] ?? 24;
    },
  },

  "seedance-2-fast": {
    type: "video",
    id: "seedance-2-fast",
    name: "SeeDance 2 Fast",
    baseCost: 12,
    aspectRatioOptions: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    durationOptions: [
      { value: 4, label: "4s" },
      { value: 8, label: "8s" },
      { value: 12, label: "12s" },
    ],
    defaultDuration: 4,
    supportsResolution: true,
    resolutionOptions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
    ],
    defaultResolution: "1080p",
    supportsReferenceImage: true,
    maxReferenceImages: 1,
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
    getCost: ({ resolution = "1080p", duration = 4 }) => {
      const grid: Record<string, Record<number, number>> = {
        "720p": { 4: 12, 8: 24, 12: 36 },
        "1080p": { 4: 16, 8: 32, 12: 48 },
      };
      return grid[resolution]?.[duration] ?? 16;
    },
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
    getCost: ({ resolution = "768p", duration = 6 }) => {
      if (resolution === "1080p") return 70;
      return duration === 10 ? 70 : 35;
    },
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
    getCost: ({ resolution = "1080p", duration = 5 }) => (resolution === "1080p" ? 30 : 15) * (duration / 5),
  },

  "wan2.6-image-to-video": {
    type: "video",
    id: "wan2.6-image-to-video",
    name: "Wan 2.6 (Image)",
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
    supportsEffectPreset: true,
    supportsCharacterLock: true,
    getCost: ({ resolution = "1080p", duration = 5 }) => (resolution === "1080p" ? 30 : 15) * (duration / 5),
  },


  "doubao-seedance-2.0": {
    type: "video",
    id: "doubao-seedance-2.0",
    name: "SeeDance 2.0",
    baseCost: 20,
    aspectRatioOptions: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    durationOptions: [
      { value: 4, label: "4s" },
      { value: 8, label: "8s" },
      { value: 12, label: "12s" },
      { value: 15, label: "15s" },
    ],
    defaultDuration: 4,
    supportsResolution: true,
    resolutionOptions: [
      { value: "1080p", label: "1080p" },
      { value: "2K", label: "2K" },
      { value: "4K", label: "4K" },
    ],
    defaultResolution: "1080p",
    supportsReferenceImage: true,
    maxReferenceImages: 1,
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
    getCost: ({ resolution = "1080p", duration = 4 }) => {
      const grid: Record<string, Record<number, number>> = {
        "1080p": { 4: 20, 8: 40, 12: 60, 15: 75 },
        "2K": { 4: 30, 8: 60, 12: 90, 15: 110 },
        "4K": { 4: 48, 8: 96, 12: 144, 15: 180 },
      };
      return grid[resolution]?.[duration] ?? 20;
    },
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
    getCost: () => 30,
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
    getCost: () => 60,
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
    getCost: () => 120,
  },

  "doubao-seedance-2.0-face": {
    type: "video",
    id: "doubao-seedance-2.0-face",
    name: "SeeDance 2.0 (Face Ref)",
    baseCost: 24,
    aspectRatioOptions: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    durationOptions: [
      { value: 4, label: "4s" },
      { value: 8, label: "8s" },
      { value: 12, label: "12s" },
    ],
    defaultDuration: 4,
    supportsResolution: true,
    resolutionOptions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
    ],
    defaultResolution: "1080p",
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
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    supportsCharacterLock: true,
    isNew: true,
    getCost: ({ resolution = "1080p", duration = 4 }) => {
      const grid: Record<string, Record<number, number>> = {
        "720p": { 4: 18, 8: 36, 12: 54 },
        "1080p": { 4: 24, 8: 48, 12: 72 },
      };
      return grid[resolution]?.[duration] ?? 24;
    },
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
    getCost: ({ resolution = "1080p", duration = 5 }) => (resolution === "1080p" ? 40 : 24) * (duration / 5),
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
    getCost: ({ resolution = "1080p", duration = 5 }) => (resolution === "1080p" ? 36 : 22) * (duration / 5),
  },

  "doubao-seedance-2.0-fast-face": {
    type: "video",
    id: "doubao-seedance-2.0-fast-face",
    name: "SeeDance 2.0 Fast (Face Ref)",
    baseCost: 16,
    aspectRatioOptions: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    durationOptions: [
      { value: 4, label: "4s" },
      { value: 8, label: "8s" },
      { value: 12, label: "12s" },
    ],
    defaultDuration: 4,
    supportsResolution: true,
    resolutionOptions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
    ],
    defaultResolution: "720p",
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
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    supportsCharacterLock: true,
    isNew: true,
    getCost: ({ resolution = "720p", duration = 4 }) => {
      const grid: Record<string, Record<number, number>> = {
        "720p": { 4: 12, 8: 24, 12: 36 },
        "1080p": { 4: 16, 8: 32, 12: 48 },
      };
      return grid[resolution]?.[duration] ?? 16;
    },
  },

  "MiniMax-Hailuo-2.3-Fast": {
    type: "video",
    id: "MiniMax-Hailuo-2.3-Fast",
    name: "Hailuo 2.3 Fast",
    baseCost: 18,
    aspectRatioOptions: ["16:9", "9:16", "1:1"],
    durationOptions: [{ value: 6, label: "6s" }, { value: 10, label: "10s" }],
    defaultDuration: 6,
    supportsResolution: true,
    resolutionOptions: [{ value: "768p", label: "768p" }, { value: "1080p", label: "1080p" }],
    defaultResolution: "768p",
    supportsReferenceImage: true,
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
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    isNew: true,
    getCost: ({ resolution = "768p", duration = 6 }) => (resolution === "1080p" ? 30 : 18) * (duration / 6),
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
    getCost: ({ resolution = "720p", duration = 5 }) => (resolution === "1080p" ? 44 : 28) * (duration / 5),
  },

  "wan2.6-i2v-flash": {
    type: "video",
    id: "wan2.6-i2v-flash",
    name: "Wan 2.6 i2v Flash",
    baseCost: 12,
    aspectRatioOptions: ["16:9", "9:16", "1:1"],
    durationOptions: [{ value: 5, label: "5s" }, { value: 8, label: "8s" }],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [{ value: "480p", label: "480p" }, { value: "720p", label: "720p" }],
    defaultResolution: "720p",
    supportsReferenceImage: true,
    requiresReferenceImage: true,
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
    isNew: true,
    getCost: ({ resolution = "720p", duration = 5 }) => (resolution === "720p" ? 12 : 7) * (duration / 5),
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
    getCost: ({ resolution = "1080p", duration = 5 }) => (resolution === "1080p" ? 50 : 30) * (duration / 5),
  },
};

export const IMAGE_MODEL_LIST: ImageModelConfig[] = Object.values(IMAGE_MODELS);
export const VIDEO_MODEL_LIST: VideoModelConfig[] = Object.values(VIDEO_MODELS);

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
