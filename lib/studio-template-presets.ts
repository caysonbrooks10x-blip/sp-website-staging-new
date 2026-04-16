import { CLAW_WORKFLOWS } from "@/lib/claw-workflows"
import type { StudioProvider } from "@/lib/provider-routing"

export interface StudioTemplatePreset {
  id: string
  name: string
  description: string
  category: "workflow" | "style" | "commerce" | "cinema"
  mode: "image" | "video" | "remix"
  model: string
  provider: StudioProvider
  prompt: string
  aspectRatio: string
  resolution?: string
  duration?: number
  imageCount?: number
  generateAudio?: boolean
  outputFormat?: string
  directorGoal?: string
  directorPlatform?: string
  directorStyle?: string
  directorBrief?: string
  directorVariations?: number
  directorPresetIds?: string[]
  autoExportPack?: boolean
  cameraMovement?: string
  effectPreset?: string
  audioDirection?: string
  characterLock?: boolean
}

const workflowBackedPresets: StudioTemplatePreset[] = CLAW_WORKFLOWS.map((workflow) => ({
  id: `workflow-${workflow.id}`,
  name: workflow.title,
  description: workflow.summary,
  category: workflow.section === "commerce" ? "commerce" : workflow.section === "motion" ? "cinema" : "workflow",
  mode: workflow.mode,
  model: workflow.model,
  provider: workflow.provider,
  prompt: workflow.studioPrompt,
  aspectRatio: workflow.aspectRatio,
  resolution: workflow.resolution,
}))

const customPresets: StudioTemplatePreset[] = [
  {
    id: "cinema-seedance-launch",
    name: "Seedance Launch Teaser",
    description: "A premium short-form teaser using Seedance 2 with a strong mobile-first campaign cut.",
    category: "cinema",
    mode: "video",
    model: "doubao-seedance-2.0",
    provider: "apimart",
    prompt: "Create a premium launch teaser for a new product drop. Build anticipation with clean hero framing, high-end lighting, and a final brand reveal that feels bold but commercially polished.",
    aspectRatio: "9:16",
    resolution: "1080p",
    cameraMovement: "dolly in",
    audioDirection: "cinematic score",
  },
  {
    id: "cinema-hailuo-camera-test",
    name: "Hailuo Camera Sweep",
    description: "Use Hailuo 2.3 as a cinematic motion sketch pad with explicit camera direction.",
    category: "cinema",
    mode: "video",
    model: "hailuo-2.3",
    provider: "apimart",
    prompt: "Generate a cinematic camera-study clip with a strong subject, layered depth, and premium motion readability. Keep the pacing elegant and the frame composition clean.",
    aspectRatio: "16:9",
    resolution: "768p",
    cameraMovement: "orbit right",
  },
  {
    id: "cinema-wan-effect-burst",
    name: "Wan Effect Burst",
    description: "A stylized motion preset designed for spectacle-led social content and punchy transitions.",
    category: "cinema",
    mode: "video",
    model: "wan2.6-image-to-video",
    provider: "apimart",
    prompt: "Turn the source image into a stylized motion beat with clean choreography, premium lighting, and a strong opening hook for social media.",
    aspectRatio: "9:16",
    resolution: "1080p",
    effectPreset: "electric surge",
    characterLock: true,
  },
  {
    id: "commerce-luxury-product-stack",
    name: "Luxury Product Stack",
    description: "A commerce-ready product setup for landing pages, paid social, and launch campaigns.",
    category: "commerce",
    mode: "image",
    model: "seedream-4.5",
    provider: "apimart",
    prompt: "Create premium product campaign stills with accurate geometry, high-end commercial lighting, a confident hero composition, and space for brand messaging.",
    aspectRatio: "4:5",
    resolution: "2K",
    imageCount: 4,
  },
]

export const STUDIO_TEMPLATE_LIBRARY: StudioTemplatePreset[] = [...customPresets, ...workflowBackedPresets]
