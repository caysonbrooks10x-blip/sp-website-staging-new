import type { App } from "@/lib/types"

export const marketplaceApps: App[] = [
    {
        id: "1",
        name: "Faded Aesthetic",
        description: "Soft, washed-out textures with a nostalgic soul.",
        image: "/marketplace/bg1.mp4",
        tags: ["Style", "Film"],
        creditCost: 5,
        isNew: true,
        type: "video",
        prompt: "A beautifully faded nostalgic film reel, soft washed-out colors with visible film grain, light leaks around the edges, vintage 35mm aesthetic, highly cinematic and moody atmosphere"
    },
    {
        id: "2",
        name: "Cinematic Motion",
        description: "Dynamic temporal shifts for cinematic storytelling.",
        image: "/marketplace/bg2.mp4",
        tags: ["Video", "Motion"],
        creditCost: 10,
        isPro: true,
        type: "video",
        prompt: "Epic dynamic camera sweep through a visually striking surreal landscape, high contrast lighting, smooth temporal shifts, professional cinematography, 8k resolution, IMAX ratio"
    },
    {
        id: "3",
        name: "Neural Bloom",
        description: "Organic recursive patterns inspired by living logic.",
        image: "/marketplace/bg3.mp4",
        tags: ["Abstract", "AI"],
        creditCost: 8,
        type: "video",
        prompt: "Complex organic fractal blooms expanding and morphing, bioluminescent recursive patterns, deep neural network visualization, glowing tendrils of data, mesmerizing abstract motion"
    },
    {
        id: "4",
        name: "Ethereal Depth",
        description: "Deep spatial awareness in every pixel.",
        image: "/marketplace/bg4.mp4",
        tags: ["3D", "Atmospheric"],
        creditCost: 3,
        type: "video",
        prompt: "Massive volumetric caverns with floating crystalline structures, intense atmospheric perspective and thick fog, ethereal god rays passing through floating particles, cinematic depth of field, 3d render"
    },
    {
        id: "5",
        name: "Glitch Resonance",
        description: "Digital artifacts turned into harmonic visual noise.",
        image: "/marketplace/bg5.mp4",
        tags: ["Cyber", "VFX"],
        creditCost: 2,
        type: "video",
        prompt: "Intense digital databending glitch art, chromatic aberration and pixel sorting, harsh neon color palettes corrupted by static noise, VHS tracking errors, highly stylized cyberpunk interference"
    },
    {
        id: "6",
        name: "Minimalist Pulse",
        description: "Clean, fundamental forms for pure conceptualization.",
        image: "/marketplace/bg6.mp4",
        tags: ["Design", "Static"],
        creditCost: 12,
        type: "video",
        prompt: "Ultra-minimalist geometric pulsing shapes in a vast empty white space, soft perfectly calculated shadows, elegant motion design, museum quality contemporary digital art, 4k"
    },
    {
        id: "7",
        name: "Hyper-Contrast",
        description: "Extreme lighting for maximum emotional impact.",
        image: "/marketplace/bg7.mp4",
        tags: ["Noir", "Lighting"],
        creditCost: 7,
        isNew: true,
        type: "video",
        prompt: "Cinematic film noir style with extreme high contrast chiaroscuro lighting, deep crushing shadows and blinding highlights, dramatic tension, black and white aesthetic with single pop of neon red"
    },
    {
        id: "8",
        name: "Dream Sequence",
        description: "Surrealistic interpretations of latent imagination.",
        image: "/marketplace/bg8.mp4",
        tags: ["Dreams", "Latent"],
        creditCost: 15,
        isPro: true,
        type: "video",
        prompt: "Breathtaking surrealist dreamscape of gravity-defying architecture blending seamlessly into an ocean of clouds, pastel color palette, soft glowing lighting, hyper-detailed fantasy conceptual art"
    },
]
