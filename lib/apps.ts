import type { App } from "@/lib/types"
import { ASSET_BASE } from "@/lib/assets"

export const marketplaceApps: App[] = [
    {
        id: "1",
        name: "Air Bending",
        description: "Violent environmental distortion with hurricane-force circular vortices.",
        image: `${ASSET_BASE}/marketplace/bg1.mp4`,
        tags: ["Cinematic", "VFX"],
        creditCost: 5,
        isNew: true,
        type: "video",
        prompt: "air bending - environment trees bend violently dust and debris spiral outward in a perfect circular vortex, clothes and hair whip back with hurricane force. The air itself distorts like heat haze on steroids IMAX-level cinematography"
    },
    {
        id: "2",
        name: "Earth Zoom Out",
        description: "Smooth epic transition from a ground-level portrait to a full orbital view of Earth.",
        image: `${ASSET_BASE}/marketplace/bg2.mp4`,
        tags: ["Epic", "Motion"],
        creditCost: 10,
        isPro: true,
        type: "video",
        prompt: "earth zoom out - A fashionable young man with bleached blonde hair and bold sunglasses stands confidently in a vibrant green field dotted with yellow wildflowers, surrounded by pine-covered hills under a deep blue sky. He wears a bright, abstract geometric-print oversized shirt and red pants. The camera is positioned low, looking up at him with a wide lens, emphasizing his presence against the open landscape. As he holds still and looks into the camera, the shot smoothly zooms out — revealing the field, surrounding mountains, the entire valley, then the continent — and finally transitions to a photorealistic full view of Earth from space."
    },
    {
        id: "3",
        name: "Fire Lava",
        description: "Visceral transformation through molten lava and columns of infernal fire.",
        image: `${ASSET_BASE}/marketplace/bg3.mp4`,
        tags: ["Transform", "Lava"],
        creditCost: 8,
        type: "video",
        prompt: "firelava - The ground beneath Person A cracks and glows molten — rivers of lava surge upward and swallow them in a column of fire from below. The inferno rages for a beat, then extinguishes instantly. From the cooled, smoking crater, Person B rises, born from the earth's core."
    },
    {
        id: "4",
        name: "Shadow Smoke",
        description: "Surreal materialization via sentient shadows and collapsing smoke columns.",
        image: `${ASSET_BASE}/marketplace/bg4.mp4`,
        tags: ["Shadow", "Smoke"],
        creditCost: 3,
        type: "video",
        prompt: "shadow smoke - Person A's shadow peels off the ground and rises as sentient black smoke, consuming Person A from the feet up until they're gone. The smoke column swirls, compresses, and collapses inward — then Person B materializes out of the dissipating smoke, stepping forward from nothingness."
    },
    {
        id: "5",
        name: "Animalization",
        description: "Terrifyingly detailed visceral morphing into a monstrous beast.",
        image: `${ASSET_BASE}/marketplace/bg5.mp4`,
        tags: ["Morph", "Beast"],
        creditCost: 2,
        type: "video",
        prompt: "animalization- The subject's face morphs with monstrous intensity — skin splitting, fur bursting through, jaw elongating, eyes going full beast mode. The transformation is visceral, detailed and terrifying — hair follicles extending frame by frame, bones reshaping under the skin. Think werewolf meets Avatar."
    },
    {
        id: "6",
        name: "Train Rush",
        description: "High-octane transit transition using a full-speed freight train.",
        image: `${ASSET_BASE}/marketplace/bg6.mp4`,
        tags: ["Action", "Speed"],
        creditCost: 12,
        type: "video",
        prompt: "train rush - A full-speed freight train blasts through the frame from the side — and in the split second it occupies every pixel, it takes Person A with it."
    },
    {
        id: "7",
        name: "Mouth In",
        description: "Surreal portal transition plunging through an expanding perspective.",
        image: `${ASSET_BASE}/marketplace/bg7.mp4`,
        tags: ["Surreal", "Portal"],
        creditCost: 7,
        isNew: true,
        type: "video",
        prompt: "mouth in - Person A opens their mouth until it fills slowly the entire frame like a portal. The camera plunges inside, rocketing through darkness "
    },
    {
        id: "8",
        name: "Raven Transformation",
        description: "Cinematic silhouette explosion into a rhythmic vortex of raven feathers.",
        image: `${ASSET_BASE}/marketplace/bg8.mp4`,
        tags: ["Cinematic", "Dark"],
        creditCost: 15,
        isPro: true,
        type: "video",
        prompt: "raven transformation - A massive murder of ravens explodes from the subject's silhouette in slow motion, their black feathers consuming the entire frame in a vortex of darkness — then, as the last feather falls, the new scene is revealed underneath. Ultra-cinematic, 4K, dramatic lighting."
    },
]
