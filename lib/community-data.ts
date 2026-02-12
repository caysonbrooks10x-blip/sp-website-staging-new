import { CommunityPost } from "@/lib/types"

export const communityPosts: CommunityPost[] = [
    {
        id: "post-1",
        title: "Neon Cyberpunk City",
        description: "A futuristic cityview bathed in neon lights and rain.",
        author: {
            id: "user-1",
            name: "Alex Rivera",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
        },
        assetUrl: "https://images.unsplash.com/photo-1598556836316-2586b68b4495?q=80&w=1200",
        thumbnailUrl: "https://images.unsplash.com/photo-1598556836316-2586b68b4495?q=80&w=600",
        aspectRatio: "landscape",
        likes: 1240,
        views: 5300,
        allowRemix: true,
        createdAt: new Date("2024-01-15"),
        tags: ["cyberpunk", "city", "neon"]
    },
    {
        id: "post-2",
        title: "Abstract Fluid Art",
        description: "Swirling colors and abstract shapes merging together.",
        author: {
            id: "user-2",
            name: "Sarah Chen",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
        },
        assetUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200",
        thumbnailUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600",
        aspectRatio: "portrait",
        likes: 890,
        views: 2100,
        allowRemix: true,
        createdAt: new Date("2024-01-18"),
        tags: ["abstract", "art", "fluid"]
    },
    {
        id: "post-3",
        title: "Minimalist Architecture",
        description: "Clean lines and geometric shapes in modern architecture.",
        author: {
            id: "user-3",
            name: "David Smith",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
        },
        assetUrl: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=1200",
        thumbnailUrl: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=600",
        aspectRatio: "square",
        likes: 450,
        views: 1200,
        allowRemix: false,
        createdAt: new Date("2024-01-20"),
        tags: ["architecture", "minimalist", "design"]
    },
    {
        id: "post-4",
        title: "Vintage Sci-Fi Poster",
        description: "Retro style sci-fi movie poster design.",
        author: {
            id: "user-4",
            name: "Emily Clark",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily"
        },
        assetUrl: "https://images.unsplash.com/photo-1614726365723-49cfae9278bf?q=80&w=1200",
        thumbnailUrl: "https://images.unsplash.com/photo-1614726365723-49cfae9278bf?q=80&w=600",
        aspectRatio: "portrait",
        likes: 2100,
        views: 8900,
        allowRemix: true,
        createdAt: new Date("2024-01-22"),
        tags: ["vintage", "scifi", "poster"]
    },
    {
        id: "post-5",
        title: "Underwater Coral Reef",
        description: "Vibrant colors of a healthy coral reef ecosystem.",
        author: {
            id: "user-1",
            name: "Alex Rivera",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
        },
        assetUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?q=80&w=1200",
        thumbnailUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?q=80&w=600",
        aspectRatio: "landscape",
        likes: 670,
        views: 3400,
        allowRemix: true,
        createdAt: new Date("2024-01-25"),
        tags: ["nature", "underwater", "ocean"]
    },
    {
        id: "post-6",
        title: "Cyberpunk Character",
        description: "Detailed character portrait in cyberpunk style.",
        author: {
            id: "user-5",
            name: "Michael Chen",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael"
        },
        assetUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1200",
        thumbnailUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=600",
        aspectRatio: "portrait",
        likes: 1560,
        views: 6700,
        allowRemix: true,
        createdAt: new Date("2024-01-28"),
        tags: ["cyberpunk", "character", "portrait"]
    },
    {
        id: "post-7",
        title: "Serene Mountain Lake",
        description: "Calm waters reflecting the surrounding mountains.",
        author: {
            id: "user-3",
            name: "David Smith",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
        },
        assetUrl: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1200",
        thumbnailUrl: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=600",
        aspectRatio: "landscape",
        likes: 920,
        views: 4100,
        allowRemix: false,
        createdAt: new Date("2024-02-01"),
        tags: ["nature", "landscape", "mountain"]
    }
]
