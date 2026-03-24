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

  "seedream-4": {
    type: "image",
    id: "seedream-4",
    name: "SeeDream 4",
    baseCost: 5,
    sizeOptions: WIDE_SIZES,
    supportsN: true,
    maxN: 15,
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
    editVariant: "seedream-4-edit",
    getCost: ({ n = 1, resolution = "2K" }) => 5 * n * (resolution === "4K" ? 4 : resolution === "2K" ? 2 : 1),
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

  "sora-2-official": {
    type: "video",
    id: "sora-2-official",
    name: "Sora 2 Official",
    baseCost: 50,
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
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    getCost: ({ duration = 4 }) => Math.round(50 * (duration / 4)),
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

  "kling-2.5-turbo-pro": {
    type: "video",
    id: "kling-2.5-turbo-pro",
    name: "Kling 2.5 Turbo Pro",
    baseCost: 42,
    aspectRatioOptions: ["16:9"],
    durationOptions: [
      { value: 5, label: "5s" },
      { value: 10, label: "10s" },
    ],
    defaultDuration: 5,
    supportsResolution: false,
    supportsReferenceImage: false,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: true,
    supportsStartImage: true,
    supportsEndImage: true,
    supportsMode: false,
    supportsCharacterOrientation: false,
    getCost: ({ duration = 5 }) => (duration === 10 ? 84 : 42),
  },

  "kling-3.0-motion-control": {
    type: "video",
    id: "kling-3.0-motion-control",
    name: "Kling 3.0 Motion Control",
    baseCost: 45,
    supportsResolution: true,
    resolutionOptions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
    ],
    defaultResolution: "720p",
    supportsReferenceImage: true,
    requiresReferenceImage: true,
    maxReferenceImages: 1,
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
    supportsCharacterOrientation: true,
    characterOrientationOptions: ["image", "video"],
    getCost: ({ resolution = "720p", duration = 5 }) =>
      resolution === "1080p" ? 18 * duration : 9 * duration,
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

  "hailuo-02": {
    type: "video",
    id: "hailuo-02",
    name: "Hailuo 02",
    baseCost: 42,
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
    supportsPromptOptimizer: true,
    supportsPrompt: true,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    getCost: ({ duration = 6 }) => 7 * duration,
  },

  "hailuo-02-pro": {
    type: "video",
    id: "hailuo-02-pro",
    name: "Hailuo 02 Pro",
    baseCost: 65,
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
    supportsMode: false,
    supportsCharacterOrientation: false,
    getCost: () => 65,
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
    getCost: ({ resolution = "1080p", duration = 5 }) => (resolution === "1080p" ? 30 : 15) * (duration / 5),
  },


  "wan-animate-replace": {
    type: "video",
    id: "wan-animate-replace",
    name: "Wan Animate Replace",
    baseCost: 7,
    supportsResolution: true,
    resolutionOptions: [
      { value: "480p", label: "480p" },
      { value: "580p", label: "580p" },
      { value: "720p", label: "720p" },
    ],
    defaultResolution: "480p",
    supportsReferenceImage: true,
    requiresReferenceImage: true,
    supportsReferenceVideo: true,
    requiresReferenceVideo: true,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: false,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    getCost: ({ resolution = "480p" }) => {
      if (resolution === "720p") return 28;
      if (resolution === "580p") return 14;
      return 7;
    },
  },

  "wan-animate-move": {
    type: "video",
    id: "wan-animate-move",
    name: "Wan Animate Move",
    baseCost: 7,
    supportsResolution: true,
    resolutionOptions: [
      { value: "480p", label: "480p" },
      { value: "580p", label: "580p" },
      { value: "720p", label: "720p" },
    ],
    defaultResolution: "480p",
    supportsReferenceImage: true,
    requiresReferenceImage: true,
    supportsReferenceVideo: true,
    requiresReferenceVideo: true,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: false,
    supportsGenerateAudio: false,
    supportsPromptOptimizer: false,
    supportsPrompt: false,
    supportsStyle: false,
    supportsStoryboard: false,
    supportsNegativePrompt: false,
    supportsStartImage: false,
    supportsEndImage: false,
    supportsMode: false,
    supportsCharacterOrientation: false,
    getCost: ({ resolution = "480p" }) => {
      if (resolution === "720p") return 28;
      if (resolution === "580p") return 14;
      return 7;
    },
  },

  "seedance-1.0-pro": {
    type: "video",
    id: "seedance-1.0-pro",
    name: "SeeDance 1.0 Pro",
    baseCost: 21,
    durationOptions: [
      { value: 5, label: "5s" },
      { value: 10, label: "10s" },
    ],
    defaultDuration: 5,
    supportsResolution: true,
    resolutionOptions: [
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
    ],
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
    getCost: ({ resolution = "720p", duration = 5 }) => (resolution === "1080p" ? 42 : 21) * (duration / 5),
  },

  "seedance-1.5-pro": {
    type: "video",
    id: "seedance-1.5-pro",
    name: "SeeDance 1.5 Pro",
    baseCost: 9,
    aspectRatioOptions: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    durationOptions: [
      { value: 4, label: "4s" },
      { value: 8, label: "8s" },
      { value: 12, label: "12s" },
    ],
    defaultDuration: 4,
    supportsResolution: true,
    resolutionOptions: [
      { value: "480p", label: "480p" },
      { value: "720p", label: "720p" },
    ],
    defaultResolution: "720p",
    supportsReferenceImage: true,
    supportsReferenceVideo: false,
    supportsSound: false,
    supportsMultiShots: false,
    supportsFixedLens: true,
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
    getCost: ({ resolution = "720p", duration = 4, generateAudio = false }) => {
      const grid: Record<string, Record<number, number>> = {
        "480p": { 4: 9, 8: 18, 12: 21 },
        "480p_audio": { 4: 16, 8: 32, 12: 42 },
        "720p": { 4: 16, 8: 32, 12: 42 },
        "720p_audio": { 4: 32, 8: 64, 12: 84 },
      };
      const key = generateAudio ? `${resolution}_audio` : resolution;
      return grid[key]?.[duration] ?? 16;
    },
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
