import { CommunityPost } from "@/lib/types"

export const communityPosts: CommunityPost[] = [
    {
        id: "post-1",
        type: "video",
        title: "Cinematic Fantasy Realm",
        description: "A sweeping drone shot through a magical kingdom.",
        prompt: "Ultra-realistic 8k volumetric drone sweep through an ancient bioluminescent fantasy forest at twilight, giant glowing mushrooms, ethereal floating light particles, cinematic god rays piercing dense misty canopy, Unreal Engine 5 render, hyper-detailed",
        author: {
            id: "user-1",
            name: "Alex Rivera",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
        },
        assetUrl: "/community/community1.mp4",
        thumbnailUrl: "/community/community1.mp4",
        aspectRatio: "landscape",
        likes: 1240,
        views: 5300,
        allowRemix: true,
        createdAt: new Date("2024-01-15"),
        tags: ["fantasy", "forest", "cinematic"]
    },
    {
        id: "post-2",
        type: "image",
        title: "Abstract Liquid Gold",
        description: "Macro photography of golden paint.",
        prompt: "Macro photography, hyper-detailed abstract fluid art, swirling metallic liquid gold and obsidian black colors mixing together, extremely high resolution, dramatic studio lighting, 8k",
        author: {
            id: "user-2",
            name: "Sarah Chen",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
        },
        assetUrl: "/community/community2.png",
        thumbnailUrl: "/community/community2.png",
        aspectRatio: "portrait",
        likes: 890,
        views: 2100,
        allowRemix: true,
        createdAt: new Date("2024-01-18"),
        tags: ["abstract", "gold", "fluid"]
    },
    {
        id: "post-3",
        type: "video",
        title: "Vaporwave Grid Ride",
        description: "Retro outrun aesthetic loop.",
        prompt: "Seamless 3d vaporwave loop, driving a futuristic retro sports car on a neon grid outrun highway, giant retro sun dropping below the horizon, purple and magenta glowing wireframes, retro-futurism synthwave style 80s, 4k 60fps",
        author: {
            id: "user-3",
            name: "David Smith",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
        },
        assetUrl: "/community/community3.mp4",
        thumbnailUrl: "/community/community3.mp4",
        aspectRatio: "square",
        likes: 450,
        views: 1200,
        allowRemix: true,
        createdAt: new Date("2024-01-20"),
        tags: ["retro", "vaporwave", "synthwave"]
    },
    {
        id: "post-4",
        type: "video",
        title: "Microscopic Neural Pathways",
        description: "Abstract representation of AI thinking.",
        prompt: "Macro 3D render of vast glowing neural network synapses firing light pulses, deep blue and electric cyan microscopic organic pathways, highly detailed biological concept, cinematic shallow depth of field, 8k macro video",
        author: {
            id: "user-1",
            name: "Alex Rivera",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
        },
        assetUrl: "/community/community4.mp4",
        thumbnailUrl: "/community/community4.mp4",
        aspectRatio: "landscape",
        likes: 670,
        views: 3400,
        allowRemix: true,
        createdAt: new Date("2024-01-25"),
        tags: ["science", "neural", "abstract"]
    },
    {
        id: "post-5",
        type: "video",
        title: "Deep Sea Bioluminescence",
        description: "Alien-like sea creatures glowing in the dark.",
        prompt: "Documentary style deep sea footage exploring glowing transparent alien-like medusa jellyfish, shimmering electric blue bioluminescence against the pitch black ocean abyss, extremely realistic underwater scattering, National Geographic 4k",
        author: {
            id: "user-3",
            name: "David Smith",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
        },
        assetUrl: "/community/community5.mp4",
        thumbnailUrl: "/community/community5.mp4",
        aspectRatio: "portrait",
        likes: 920,
        views: 4100,
        allowRemix: true,
        createdAt: new Date("2024-02-01"),
        tags: ["ocean", "nature", "bioluminscent"]
    },
    {
        id: "post-7",
        type: "video",
        title: "Ascension Of The Monolith",
        description: "Mysterious sci-fi structure animation.",
        prompt: "Cinematic wide angle pan up a colossal obsidian monolith floating over a barren alien desert, surrounded by harsh dust storms, massive scale, ominous sci-fi atmosphere, hyper-detailed, Denis Villeneuve film style, IMAX visual, 8k",
        author: {
            id: "user-7",
            name: "James Howlett",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=James"
        },
        assetUrl: "/community/community7.mp4",
        thumbnailUrl: "/community/community7.mp4",
        aspectRatio: "landscape",
        likes: 3100,
        views: 15400,
        allowRemix: true,
        createdAt: new Date("2024-02-06"),
        tags: ["scifi", "monolith", "epic"]
    },
    {
        id: "post-21",
        type: "image",
        title: "Neon Cybernetic Samurai",
        description: "Character concept art.",
        prompt: "Highly detailed sci-fi character portrait of a cybernetic samurai rogue, wearing tactical neon techwear, glowing katana slung over shoulder, rainy tokyo cyberpunk alleyway background, cinematic rim lighting, 8k resolution, photorealistic",
        author: {
            id: "user-4",
            name: "Emily Clark",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily"
        },
        assetUrl: "/community/community21.webp",
        thumbnailUrl: "/community/community21.webp",
        aspectRatio: "portrait",
        likes: 2100,
        views: 8900,
        allowRemix: true,
        createdAt: new Date("2024-01-22"),
        tags: ["cyberpunk", "samurai", "character"]
    },
    {
        id: "post-22",
        type: "image",
        title: "Minimalist Concrete Villa",
        description: "Brutalist architecture in the desert.",
        prompt: "Architectural photography of a minimalist brutalist concrete villa seamlessly embedded into a vast red desert landscape, large glass windows reflecting the golden hour sunset, ultra-minimalist, high-end design, photorealistic, 8k",
        author: {
            id: "user-5",
            name: "Michael Chen",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael"
        },
        assetUrl: "/community/community22.png",
        thumbnailUrl: "/community/community22.png",
        aspectRatio: "landscape",
        likes: 1560,
        views: 6700,
        allowRemix: true,
        createdAt: new Date("2024-01-28"),
        tags: ["architecture", "minimalist", "design"]
    },
    {
        id: "post-23",
        type: "image",
        title: "Cozy Lo-Fi Room",
        description: "Isometric 3D aesthetic room.",
        prompt: "Isometric 3d render of a cozy lo-fi bedroom at night, raining outside the window, glowing warm desk lamp, vintage computer setup, plants hanging, highly detailed, soft aesthetic anime style lighting, unreal engine 5, octane render",
        author: {
            id: "user-6",
            name: "Elena Rostova",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena"
        },
        assetUrl: "/community/community23.webp",
        thumbnailUrl: "/community/community23.webp",
        aspectRatio: "square",
        likes: 2450,
        views: 11000,
        allowRemix: true,
        createdAt: new Date("2024-02-03"),
        tags: ["lofi", "3d", "isometric"]
    },
    {
        id: "post-24",
        type: "image",
        title: "Mechanical Watch Macro",
        description: "Incredible detail of gears.",
        prompt: "Extreme macro photography of the intricate gears and tourbillon of a high-end luxury mechanical watch, platinum and gold polished metal, ruby bearings, sharp focus, 8k resolution, spectacular studio macro lighting",
        author: {
            id: "user-2",
            name: "Sarah Chen",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
        },
        assetUrl: "/community/community24.webp",
        thumbnailUrl: "/community/community24.webp",
        aspectRatio: "square",
        likes: 1120,
        views: 5200,
        allowRemix: false,
        createdAt: new Date("2024-02-08"),
        tags: ["macro", "watch", "mechanical"]
    },
    {
        id: "post-25",
        type: "image",
        title: "Neon Rain Shinjuku",
        description: "Cinematic street photography.",
        prompt: "Cinematic street photography of Shinjuku tokyo raining at night, heavy rain drops splashing in neon lit puddles, highly atmospheric, reflections of colorful billboards, sharp focus, cinematic grading, photorealistic, 8k",
        author: {
            id: "user-8",
            name: "Kenji Sato",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kenji"
        },
        assetUrl: "/community/community25.png",
        thumbnailUrl: "/community/community25.png",
        aspectRatio: "portrait",
        likes: 4500,
        views: 18200,
        allowRemix: true,
        createdAt: new Date("2024-02-12"),
        tags: ["tokyo", "street", "neon"]
    },
    {
        id: "post-26",
        type: "image",
        title: "Low Poly Mountain",
        description: "Stylized landscape.",
        prompt: "Beautiful stylized low poly 3d illustration of a snowy mountain peak at sunrise, vibrant soft pastel colors, volumetric fog in the valleys, clean sharp geometric edges, vector art style render, 4k",
        author: {
            id: "user-9",
            name: "Felix Arvid",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
        },
        assetUrl: "/community/community26.webp",
        thumbnailUrl: "/community/community26.webp",
        aspectRatio: "landscape",
        likes: 830,
        views: 3100,
        allowRemix: true,
        createdAt: new Date("2024-02-15"),
        tags: ["lowpoly", "landscape", "3d"]
    },
    {
        id: "post-27",
        type: "image",
        title: "Ethereal Ghost Entity",
        description: "Spooky atmospheric ghost.",
        prompt: "A translucent ethereal phantom entity hovering in an abandoned gothic cathedral, moonlight shining through shattered stained glass, moody atmosphere, volumetric fog, spectral glow, 8k resolution, cinematic lighting",
        author: {
            id: "user-10",
            name: "Mia Wallace",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia"
        },
        assetUrl: "/community/community27.webp",
        thumbnailUrl: "/community/community27.webp",
        aspectRatio: "portrait",
        likes: 1240,
        views: 4500,
        allowRemix: true,
        createdAt: new Date("2024-02-16"),
        tags: ["ghost", "gothic", "spooky"]
    },
    {
        id: "post-28",
        type: "image",
        title: "Futuristic Drone Delivery",
        description: "Sci-fi delivery drone.",
        prompt: "A sleek futuristic delivery drone hovering outside a glass balcony in a mega-city, glowing neon thrusters, carrying a small cargo box, sunset lighting casting long shadows, highly detailed cybernetic joints, 4k",
        author: {
            id: "user-11",
            name: "Logan Roy",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Logan"
        },
        assetUrl: "/community/community28.webp",
        thumbnailUrl: "/community/community28.webp",
        aspectRatio: "square",
        likes: 670,
        views: 2900,
        allowRemix: true,
        createdAt: new Date("2024-02-17"),
        tags: ["drone", "scifi", "future"]
    },
    {
        id: "post-29",
        type: "image",
        title: "Galactic Nebula",
        description: "Stunning space wallpaper.",
        prompt: "Stunning deep space photography of a vibrant purple and orange galactic nebula, millions of glowing stars, cosmic dust clouds, extreme high resolution, Hubble telescope style, astrophysics visualization, 8k",
        author: {
            id: "user-12",
            name: "Stella Starchild",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Stella"
        },
        assetUrl: "/community/community29.webp",
        thumbnailUrl: "/community/community29.webp",
        aspectRatio: "landscape",
        likes: 8900,
        views: 42000,
        allowRemix: true,
        createdAt: new Date("2024-02-18"),
        tags: ["space", "nebula", "galaxy"]
    },
    {
        id: "post-30",
        type: "image",
        title: "Cybernetic Geisha",
        description: "Traditional meets future.",
        prompt: "A gorgeous cybernetic Japanese geisha wearing traditional silk kimono with embedded neon circuits, metallic robotic joints on face, holding a holographic folding fan, cyberpunk kyoto alley, bokeh background, cinematic portrait, 8k",
        author: {
            id: "user-13",
            name: "Hiroshi Tanaka",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hiroshi"
        },
        assetUrl: "/community/community30.webp",
        thumbnailUrl: "/community/community30.webp",
        aspectRatio: "portrait",
        likes: 5400,
        views: 21000,
        allowRemix: true,
        createdAt: new Date("2024-02-18"),
        tags: ["cyberpunk", "geisha", "japan"]
    },
    {
        id: "post-31",
        type: "image",
        title: "Golden Hour Wheat field",
        description: "Peaceful nature scene.",
        prompt: "Cinematic wide shot of a peaceful golden wheat field swaying in the wind during perfect golden hour sunset, warm sun flares, dramatic clouds in the sky, hyper-realistic, 8k, nature photography",
        author: {
            id: "user-14",
            name: "Oliver Green",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver"
        },
        assetUrl: "/community/community31.webp",
        thumbnailUrl: "/community/community31.webp",
        aspectRatio: "landscape",
        likes: 420,
        views: 1800,
        allowRemix: true,
        createdAt: new Date("2024-02-19"),
        tags: ["nature", "sunset", "peaceful"]
    },
    {
        id: "post-32",
        type: "image",
        title: "Steampunk Airship",
        description: "Giant zeppelin over victorian city.",
        prompt: "Massive highly detailed steampunk airship floating above a smoggy Victorian London style city, brass gears, steam chimneys, warm sepia color grading, intricate mechanical design, epic fantasy concept art, 8k",
        author: {
            id: "user-15",
            name: "Arthur Pendelton",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arthur"
        },
        assetUrl: "/community/community32.webp",
        thumbnailUrl: "/community/community32.webp",
        aspectRatio: "landscape",
        likes: 1300,
        views: 6500,
        allowRemix: true,
        createdAt: new Date("2024-02-19"),
        tags: ["steampunk", "fantasy", "airship"]
    },
    {
        id: "post-33",
        type: "image",
        title: "Glass Bonsai Tree",
        description: "Elegant artificial plant.",
        prompt: "Exquisite macro rendering of a bonsai tree made entirely of translucent colored glass, illuminated softly from below, vibrant glowing leaves, sitting on a black velvet pedestal, extreme realism, octane render",
        author: {
            id: "user-16",
            name: "Chloe Glass",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe"
        },
        assetUrl: "/community/community33.png",
        thumbnailUrl: "/community/community33.png",
        aspectRatio: "square",
        likes: 2750,
        views: 11000,
        allowRemix: false,
        createdAt: new Date("2024-02-20"),
        tags: ["glass", "bonsai", "art"]
    },
    {
        id: "post-34",
        type: "image",
        title: "Retro Arcade Scene",
        description: "Nostalgic 80s arcade.",
        prompt: "Vibrant hyper-realistic photo of a dark 1980s retro arcade, rows of glowing arcade cabinets, patterned retro carpet, neon signs reflecting on the floor, nostalgic atmosphere, cinematic lighting, 8k",
        author: {
            id: "user-17",
            name: "Tommy Vercetti",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tommy"
        },
        assetUrl: "/community/community34.webp",
        thumbnailUrl: "/community/community34.webp",
        aspectRatio: "landscape",
        likes: 1900,
        views: 8200,
        allowRemix: true,
        createdAt: new Date("2024-02-20"),
        tags: ["retro", "arcade", "80s"]
    },
    {
        id: "post-35",
        type: "image",
        title: "Crystal Ice Cave",
        description: "Beautiful frozen cavern.",
        prompt: "Photorealistic wide angle interior of a massive glacial ice cave, glistening blue ice crystals on the walls, sunlight refracting through the translucent ceiling, mysterious and cold, National Geographic photography, 8k",
        author: {
            id: "user-18",
            name: "Lars Frost",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lars"
        },
        assetUrl: "/community/community35.webp",
        thumbnailUrl: "/community/community35.webp",
        aspectRatio: "landscape",
        likes: 1150,
        views: 4800,
        allowRemix: true,
        createdAt: new Date("2024-02-21"),
        tags: ["ice", "cave", "nature"]
    },
    {
        id: "post-36",
        type: "image",
        title: "Post-Apocalyptic Survivor",
        description: "Gritty survival concept art.",
        prompt: "Gritty cinematic portrait of a hardened survivor in a post-apocalyptic wasteland, wearing a makeshift gas mask, tattered clothing, holding a rusted weapon, dusty environment, dramatic harsh lighting, highly detailed concept art, 8k",
        author: {
            id: "user-19",
            name: "Max Rockatansky",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max"
        },
        assetUrl: "/community/community36.webp",
        thumbnailUrl: "/community/community36.webp",
        aspectRatio: "portrait",
        likes: 3400,
        views: 14500,
        allowRemix: true,
        createdAt: new Date("2024-02-21"),
        tags: ["apocalypse", "survivor", "gritty"]
    },
    {
        id: "post-37",
        type: "image",
        title: "Holographic Smart City",
        description: "Utopian future metropolis.",
        prompt: "A breathtaking utopian future smart city, sleek white curving skyscrapers, lush green sky gardens, massive holographic data interfaces floating in the sky, flying cars passing by, bright sunny day, photorealistic 3d render, 8k",
        author: {
            id: "user-20",
            name: "Nova Sterling",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nova"
        },
        assetUrl: "/community/community37.webp",
        thumbnailUrl: "/community/community37.webp",
        aspectRatio: "landscape",
        likes: 2100,
        views: 9200,
        allowRemix: true,
        createdAt: new Date("2024-02-21"),
        tags: ["utopia", "future", "city"]
    },
    {
        id: "post-38",
        type: "image",
        title: "Magical Spell Book",
        description: "Glowing ancient tome.",
        prompt: "Macro close-up of an ancient leather-bound spell book resting on a wooden desk, pages glowing with ethereal golden text, dust motes floating in the magical aura, fantasy illustration style, highly detailed, dramatic lighting",
        author: {
            id: "user-21",
            name: "Merlin Ambrosius",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Merlin"
        },
        assetUrl: "/community/community38.webp",
        thumbnailUrl: "/community/community38.webp",
        aspectRatio: "square",
        likes: 1800,
        views: 7400,
        allowRemix: true,
        createdAt: new Date("2024-02-22"),
        tags: ["magic", "fantasy", "book"]
    },
    {
        id: "post-39",
        type: "image",
        title: "Alien Flora Macro",
        description: "Strange otherworldly plants.",
        prompt: "Extreme macro photography of bizarre extraterrestrial flora, fluorescent purple and magenta tendrils oozing glowing sap, intricate biological textures, dark jungle background, alien planet concept, 8k resolution, photorealistic",
        author: {
            id: "user-22",
            name: "Ripley Scott",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ripley"
        },
        assetUrl: "/community/community39.webp",
        thumbnailUrl: "/community/community39.webp",
        aspectRatio: "square",
        likes: 950,
        views: 3100,
        allowRemix: true,
        createdAt: new Date("2024-02-22"),
        tags: ["alien", "botany", "macro"]
    },
    {
        id: "post-40",
        type: "image",
        title: "Enchanted Elven Castle",
        description: "Beautiful fantasy architecture.",
        prompt: "Epic establishing wide shot of an elegant white marble elven castle built into the side of a massive waterfall, surrounded by lush autumn forests, flock of birds flying in the distance, high fantasy concept art, matte painting, 8k",
        author: {
            id: "user-23",
            name: "Legolas Greenleaf",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Legolas"
        },
        assetUrl: "/community/community40.webp",
        thumbnailUrl: "/community/community40.webp",
        aspectRatio: "landscape",
        likes: 4100,
        views: 19500,
        allowRemix: true,
        createdAt: new Date("2024-02-22"),
        tags: ["fantasy", "castle", "elves"]
    },
    {
        id: "post-41",
        type: "image",
        title: "Synthwave Sunset Drift",
        description: "Car interior outrun vibe.",
        prompt: "First-person perspective driving a vintage sports car on a neon grid outrun highway, hands on the steering wheel, synthwave dashboard glowing, retro wireframe mountains and a segmented sunset in the distance, highly detailed 3d render",
        author: {
            id: "user-24",
            name: "Ryan Gosling",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan"
        },
        assetUrl: "/community/community41.webp",
        thumbnailUrl: "/community/community41.webp",
        aspectRatio: "landscape",
        likes: 3200,
        views: 12000,
        allowRemix: true,
        createdAt: new Date("2024-02-22"),
        tags: ["synthwave", "driving", "retro"]
    },
    {
        id: "post-42",
        type: "image",
        title: "Holographic Koi Fish",
        description: "Cyberpunk aquarium.",
        prompt: "Beautiful glowing holographic koi fish swimming through the air in a neon lit cyberpunk Tokyo alleyway, translucent blue and pink data streams trailing behind them, rainy atmosphere, photorealistic, 8k resolution",
        author: {
            id: "user-25",
            name: "Yuki Nakamoto",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yuki"
        },
        assetUrl: "/community/community42.webp",
        thumbnailUrl: "/community/community42.webp",
        aspectRatio: "square",
        likes: 2800,
        views: 10500,
        allowRemix: true,
        createdAt: new Date("2024-02-22"),
        tags: ["hologram", "koi", "cyberpunk"]
    },
    {
        id: "post-43",
        type: "image",
        title: "Surreal Floating Islands",
        description: "Defying gravity.",
        prompt: "Surreal fantasy landscape of massive chunks of earth floating in the sky, upside down waterfalls pouring into the clouds below, ancient ruins built on the edges, breathtaking atmospheric perspective, digital painting masterpiece, 8k",
        author: {
            id: "user-26",
            name: "Salvador Dali",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Salvador"
        },
        assetUrl: "/community/community43.webp",
        thumbnailUrl: "/community/community43.webp",
        aspectRatio: "portrait",
        likes: 1500,
        views: 6200,
        allowRemix: false,
        createdAt: new Date("2024-02-22"),
        tags: ["surreal", "fantasy", "floating"]
    },
    {
        id: "post-44",
        type: "image",
        title: "Gothic Vampire Cathedral",
        description: "Dark moody architecture.",
        prompt: "Foreboding dark gothic cathedral exterior at midnight during a blood moon, massive gargoyles peering from the roof, swarm of bats circling the spires, red ambient moonlight, incredibly detailed architecture, dark fantasy matte painting",
        author: {
            id: "user-27",
            name: "Vlad Tepes",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vlad"
        },
        assetUrl: "/community/community44.webp",
        thumbnailUrl: "/community/community44.webp",
        aspectRatio: "portrait",
        likes: 2900,
        views: 11000,
        allowRemix: true,
        createdAt: new Date("2024-02-22"),
        tags: ["gothic", "vampire", "cathedral"]
    }
]
