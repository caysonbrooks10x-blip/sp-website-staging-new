import { buildTelegramBotStartUrl } from "@/lib/claw-urls"

export type ClawWorkflowSection = "core" | "commerce" | "motion"
export type ClawWorkflowProvider = "apimart" | "poyo"
export type ClawWorkflowMode = "image" | "video" | "remix"

export interface ClawWorkflowDefinition {
  id: string
  botWorkflowId?: string
  title: string
  summary: string
  section: ClawWorkflowSection
  mediaType: "image" | "video"
  provider: ClawWorkflowProvider
  model: string
  mode: ClawWorkflowMode
  remixType?: "image" | "video"
  aspectRatio: string
  resolution?: string
  inputLabel: string
  outputLabel: string
  businessValue: string
  tags: string[]
  outputs: string[]
  telegramStatus: "planned" | "designed"
  telegramFlow: string[]
  studioPrompt: string
}

export const CLAW_WORKFLOW_SECTIONS: Array<{
  id: ClawWorkflowSection
  title: string
  description: string
}> = [
  {
    id: "core",
    title: "Core Creator Workflows",
    description: "High-frequency workflows for ideation, remix, and fast creative iteration across StudioX.",
  },
  {
    id: "commerce",
    title: "E-commerce Workflows",
    description: "Product imaging, campaign generation, and apparel styling workflows built for commerce users and marketers.",
  },
  {
    id: "motion",
    title: "Motion Workflows",
    description: "Video-first workflows that turn still assets or prompts into campaign-ready motion deliverables.",
  },
]

export const CLAW_WORKFLOWS: ClawWorkflowDefinition[] = [
  {
    id: "fast-concept-board",
    botWorkflowId: "fast-concept-board",
    title: "Fast Concept Board",
    summary: "Spin up a quick image direction set before moving into higher-cost refinement passes.",
    section: "core",
    mediaType: "image",
    provider: "poyo",
    model: "flux-2-pro",
    mode: "image",
    aspectRatio: "1:1",
    inputLabel: "Prompt only",
    outputLabel: "4 concept stills",
    businessValue: "Rapid ideation before committing to premium generation spend.",
    tags: ["ideation", "concept", "quick-start"],
    outputs: ["Visual concept board", "Prompt direction", "Early look exploration"],
    telegramStatus: "designed",
    telegramFlow: [
      "Choose workflow",
      "Send brief",
      "Receive four initial concepts",
      "Promote best option into refinement",
    ],
    studioPrompt:
      "Create a high-signal concept board with four distinct visual directions for this brief. Keep composition, lighting, and styling clearly differentiated while staying commercially usable.",
  },
  {
    id: "style-variation-burst",
    botWorkflowId: "style-variation-burst",
    title: "Style Variation Burst",
    summary: "Use one reference image to generate multiple premium stylistic variations without rebuilding the shot from scratch.",
    section: "core",
    mediaType: "image",
    provider: "apimart",
    model: "seedream-4.5",
    mode: "remix",
    remixType: "image",
    aspectRatio: "4:5",
    inputLabel: "1 reference image",
    outputLabel: "4 premium variants",
    businessValue: "Fast creative exploration for creators, brands, and campaign teams.",
    tags: ["remix", "variations", "brand-style"],
    outputs: ["Multiple art directions", "Social-ready versions", "Refined prompt baseline"],
    telegramStatus: "designed",
    telegramFlow: [
      "Upload reference image",
      "Pick style family",
      "Pick aspect ratio",
      "Receive a variation set",
    ],
    studioPrompt:
      "Using the uploaded image as the base composition, generate four polished variations with distinct premium styling directions, stronger lighting, cleaner commercial framing, and improved material detail.",
  },
  {
    id: "creator-launch-pack",
    botWorkflowId: "creator-launch-pack",
    title: "Creator Launch Pack",
    summary: "Turn a single hero image or creative brief into platform-shaped campaign visuals.",
    section: "core",
    mediaType: "image",
    provider: "apimart",
    model: "seedream-4.5",
    mode: "remix",
    remixType: "image",
    aspectRatio: "4:5",
    resolution: "2K",
    inputLabel: "Prompt or 1 reference image",
    outputLabel: "Multi-format campaign set",
    businessValue: "Build a lightweight campaign pack without leaving StudioX.",
    tags: ["campaign", "creator", "export-pack"],
    outputs: ["Hero asset", "Square social post", "Story cover", "Wide promo visual"],
    telegramStatus: "planned",
    telegramFlow: [
      "Upload hero image or send brief",
      "Choose campaign objective",
      "Select export pack",
      "Receive image set and pack-ready outputs",
    ],
    studioPrompt:
      "Create a cohesive creator campaign pack from this reference. Keep the subject consistent while generating premium social-first visuals with clear focal hierarchy and polished brand styling.",
  },
  {
    id: "product-mockup-generator",
    botWorkflowId: "product-mockup",
    title: "Product Mockup Generator",
    summary: "Transform one product image into premium studio shots, landing-page visuals, and polished ad compositions.",
    section: "commerce",
    mediaType: "image",
    provider: "apimart",
    model: "nano-banana-2-new",
    mode: "remix",
    remixType: "image",
    aspectRatio: "4:5",
    resolution: "2K",
    inputLabel: "1 product image",
    outputLabel: "Luxury mockup set",
    businessValue: "Convert a plain packshot into campaign-quality product imaging quickly.",
    tags: ["product", "mockup", "commerce"],
    outputs: ["Luxury studio shot", "Lifestyle placement", "Clean ad composition", "Landing-page hero visual"],
    telegramStatus: "planned",
    telegramFlow: [
      "Upload product image",
      "Pick scene family",
      "Choose output pack",
      "Receive mockup set in Telegram",
    ],
    studioPrompt:
      "Turn this product image into a premium commerce mockup set. Preserve the exact product identity, label integrity, proportions, and materials while generating polished studio and lifestyle product visuals with high-end advertising quality.",
  },
  {
    id: "background-scene-swap",
    botWorkflowId: "scene-swap",
    title: "Background And Scene Swap",
    summary: "Restage a product into a new environment while preserving shape, materials, and branding.",
    section: "commerce",
    mediaType: "image",
    provider: "apimart",
    model: "flux-kontext-max",
    mode: "remix",
    remixType: "image",
    aspectRatio: "4:5",
    inputLabel: "1 product image",
    outputLabel: "Restaged product visual",
    businessValue: "Generate catalog and campaign context without reshooting physical scenes.",
    tags: ["background-replace", "scene-swap", "catalog"],
    outputs: ["Studio table scene", "Luxury marble setup", "Vanity placement", "Seasonal commercial backdrop"],
    telegramStatus: "designed",
    telegramFlow: [
      "Upload product image",
      "Choose environment",
      "Confirm premium or seasonal look",
      "Receive updated product shot",
    ],
    studioPrompt:
      "Restage this product into a polished commerce environment. Keep the product exact, photoreal, and brand-safe while replacing the background and supporting props with a premium scene that feels intentionally art directed.",
  },
  {
    id: "product-campaign-pack",
    botWorkflowId: "campaign-pack",
    title: "Product Campaign Pack",
    summary: "Expand one uploaded product into a full cross-channel visual pack.",
    section: "commerce",
    mediaType: "image",
    provider: "apimart",
    model: "seedream-4.5",
    mode: "remix",
    remixType: "image",
    aspectRatio: "4:5",
    resolution: "2K",
    inputLabel: "1 product image",
    outputLabel: "Channel pack",
    businessValue: "Generate consistent product campaign assets without a manual design sprint.",
    tags: ["campaign-pack", "commerce", "channel-outputs"],
    outputs: ["Hero banner visual", "Instagram post", "Story cover", "Product detail image", "Marketplace-clean image"],
    telegramStatus: "planned",
    telegramFlow: [
      "Upload product image",
      "Choose campaign goal",
      "Select channel pack",
      "Receive multi-output set",
    ],
    studioPrompt:
      "Build a product campaign pack from this uploaded item. Create multiple channel-shaped outputs with consistent branding, strong hierarchy, polished product focus, and premium advertising composition.",
  },
  {
    id: "multi-variant-ad-generation",
    botWorkflowId: "ad-variants",
    title: "Multi-Variant Ad Generation",
    summary: "Generate several distinct ad concepts from one product or hero image.",
    section: "commerce",
    mediaType: "image",
    provider: "apimart",
    model: "seedream-4.5",
    mode: "remix",
    remixType: "image",
    aspectRatio: "1:1",
    inputLabel: "1 product or hero image",
    outputLabel: "4 ad concepts",
    businessValue: "A/B test visual direction faster across launches, offers, and seasonal pushes.",
    tags: ["ad-creative", "variants", "performance"],
    outputs: ["Minimal luxury concept", "High-energy commercial", "Dark campaign look", "Seasonal/festive variant"],
    telegramStatus: "designed",
    telegramFlow: [
      "Upload product image",
      "Choose ad mood",
      "Pick number of variants",
      "Receive creative set",
    ],
    studioPrompt:
      "Generate four ad concepts from this base asset. Each concept should feel commercially viable and distinct: minimal luxury, energetic performance marketing, premium dark campaign, and a seasonal promotional variant.",
  },
  {
    id: "costume-change-studio",
    botWorkflowId: "costume-change",
    title: "Clothing / Costume Change",
    summary: "Transform a portrait into a new wardrobe direction while preserving identity, pose continuity, and styling quality.",
    section: "commerce",
    mediaType: "image",
    provider: "apimart",
    model: "nano-banana-2",
    mode: "remix",
    remixType: "image",
    aspectRatio: "4:5",
    resolution: "2K",
    inputLabel: "1 person image",
    outputLabel: "Styled wardrobe transforms",
    businessValue: "Supports fashion previews, uniform exploration, creator looks, and cinematic costume changes.",
    tags: ["fashion", "costume", "outfit-change"],
    outputs: ["Formalwear", "Streetwear", "Luxury fashion", "Ethnic wear", "Uniform or cinematic costume"],
    telegramStatus: "planned",
    telegramFlow: [
      "Upload portrait",
      "Choose wardrobe family",
      "Choose realism or stylized mode",
      "Receive transformed outputs",
    ],
    studioPrompt:
      "Change the clothing and styling of the person in this image while preserving identity, pose, body proportions, camera angle, and overall realism. Prioritize garment quality, believable fabric behavior, and polished editorial presentation.",
  },
  {
    id: "merch-try-on-lookbook",
    botWorkflowId: "merch-styling",
    title: "Apparel Try-On / Merch Styling",
    summary: "Create merchandising and apparel previews from a person image and styling direction.",
    section: "commerce",
    mediaType: "image",
    provider: "apimart",
    model: "nano-banana",
    mode: "remix",
    remixType: "image",
    aspectRatio: "4:5",
    inputLabel: "1 person image or merch shot",
    outputLabel: "Merch lookbook stills",
    businessValue: "Useful for merch drops, apparel sellers, and branded styling previews without custom shoots.",
    tags: ["merch", "try-on", "apparel"],
    outputs: ["Lifestyle merch preview", "Lookbook portrait", "Catalog apparel shot", "Brand styling mockup"],
    telegramStatus: "planned",
    telegramFlow: [
      "Upload model or merch image",
      "Choose styling context",
      "Pick catalog or lifestyle output",
      "Receive merch visuals",
    ],
    studioPrompt:
      "Create a merch and apparel styling preview from this image. Preserve the person's identity and body shape while rendering believable branded apparel, clean garment details, and commercial fashion presentation.",
  },
  {
    id: "product-motion-teaser",
    botWorkflowId: "product-motion",
    title: "Product Motion Teaser",
    summary: "Turn a still product visual into a short campaign-ready motion piece.",
    section: "motion",
    mediaType: "video",
    provider: "apimart",
    model: "wan2.6-image-to-video",
    mode: "video",
    aspectRatio: "9:16",
    resolution: "720p",
    inputLabel: "1 product image",
    outputLabel: "Short motion teaser",
    businessValue: "Convert image campaigns into social motion without leaving the workflow layer.",
    tags: ["video", "product-motion", "teaser"],
    outputs: ["Reel cover animation", "Short launch teaser", "Attention-grabbing product motion"],
    telegramStatus: "planned",
    telegramFlow: [
      "Upload product image",
      "Choose camera energy",
      "Choose aspect ratio",
      "Receive teaser video",
    ],
    studioPrompt:
      "Animate this product image into a premium short-form teaser with elegant camera motion, controlled lighting shifts, and commercial polish. Keep branding and product geometry stable and avoid surreal distortion.",
  },
  {
    id: "before-after-reveal-reel",
    botWorkflowId: "before-after-reveal-reel",
    title: "Before / After Reveal Reel",
    summary: "Use start and end frames to create a stylized transformation sequence for campaigns or explainers.",
    section: "motion",
    mediaType: "video",
    provider: "apimart",
    model: "kling-3.0/pro",
    mode: "video",
    aspectRatio: "9:16",
    resolution: "1080p",
    inputLabel: "Start image + end image",
    outputLabel: "Transformation reel",
    businessValue: "Useful for product refresh, makeover content, and visual storytelling in paid or organic social.",
    tags: ["transformation", "reel", "before-after"],
    outputs: ["Reveal sequence", "Transition reel", "Story-led promo video"],
    telegramStatus: "planned",
    telegramFlow: [
      "Upload start frame",
      "Upload end frame",
      "Choose transition style",
      "Receive reveal reel",
    ],
    studioPrompt:
      "Create a polished before-and-after transformation reel between the provided start and end visuals. Keep motion clean, premium, and commercially readable with strong transition timing and no chaotic artifacts.",
  },
]

export function buildClawWorkflowStudioHref(workflow: ClawWorkflowDefinition) {
  const params = new URLSearchParams()
  params.set("mode", workflow.mode)
  params.set("prompt", workflow.studioPrompt)
  params.set("model", workflow.model)
  params.set("generationPlatform", workflow.provider)
  params.set("aspectRatio", workflow.aspectRatio)

  if (workflow.resolution) params.set("resolution", workflow.resolution)
  if (workflow.remixType) params.set("remixType", workflow.remixType)

  return `/studio?${params.toString()}`
}

export function buildClawWorkflowStartParam(workflow: ClawWorkflowDefinition) {
  const botWorkflowId = workflow.botWorkflowId || workflow.id
  if (workflow.id === "fast-concept-board") return "image"
  if (workflow.id === "style-variation-burst") return "remix"
  if (workflow.id === "creator-launch-pack") return "director"
  if (workflow.id === "before-after-reveal-reel") return "video"
  return `commerce_${botWorkflowId}`
}

export function buildClawWorkflowTelegramHref(workflow: ClawWorkflowDefinition) {
  return buildTelegramBotStartUrl(buildClawWorkflowStartParam(workflow))
}

export function buildClawWorkflowTelegramCommand(workflow: ClawWorkflowDefinition) {
  const botWorkflowId = workflow.botWorkflowId || workflow.id
  if (workflow.id === "fast-concept-board") return "/image"
  if (workflow.id === "style-variation-burst") return "/remix"
  if (workflow.id === "creator-launch-pack") return "/director"
  if (workflow.id === "before-after-reveal-reel") return "/video"
  if (workflow.section === "commerce" || workflow.section === "motion") {
    return `/commerce ${botWorkflowId}`
  }
  return `/workflow ${botWorkflowId}`
}
