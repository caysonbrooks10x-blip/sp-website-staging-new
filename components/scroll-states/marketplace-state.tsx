"use client"

import { useRef, useEffect } from "react"
import { gsap } from "gsap"
import { ArrowUpRight } from "lucide-react"

interface MarketplaceStateProps {
    progress: number
    isVisible?: boolean
}

const ASSETS = [
    { title: "Cinematic LUTs", category: "Color", price: "Free" },
    { title: "Cyberpunk City", category: "3D Model", price: "$29" },
    { title: "Glitch Pack", category: "Overlay", price: "$15" },
    { title: "Deep Bass", category: "Audio", price: "$10" },
    { title: "Neon Titles", category: "Typography", price: "Free" },
    { title: "Smoke Plumes", category: "VFX", price: "$10" },
    { title: "Analog Film", category: "Texture", price: "$20" },
    { title: "Sci-Fi HUD", category: "Interface", price: "$35" },
    { title: "Portrait Rig", category: "Lighting", price: "Free" },
]

export function MarketplaceState({ progress, isVisible = true }: MarketplaceStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const cardsRef = useRef<(HTMLDivElement | null)[]>([])
    const titleRef = useRef<HTMLHeadingElement>(null)

    useEffect(() => {
        if (!isVisible) return

        // 3D Grid Animation
        // Concept: A wall of cards that slides diagonally or zooms past
        // Let's do a vertical scroll simulation where new rows appear

        // 0 -> 1 progress
        // Move entire grid up by Y pixels

        const totalHeight = 800 // Virtual scroll height
        const currentY = -progress * totalHeight

        // Title Float
        if (titleRef.current) {
            gsap.set(titleRef.current, {
                y: progress * 200, // Parallax down slower
                opacity: 1 - Math.pow(progress, 3) // Fade out near end
            })
        }

        ASSETS.forEach((_, i) => {
            const el = cardsRef.current[i]
            if (!el) return

            // Grid Layout Math
            // 3 columns
            const col = i % 3
            const row = Math.floor(i / 3)

            const xBase = (col - 1) * 320 // -320, 0, 320
            const yBase = row * 320 // 0, 320, 640

            // Apply global scroll movement
            const finalY = yBase + currentY + 200 // Start lower

            // 3D Tilt based on position (Perspective center is 0,0)
            // If card is far left, tilt Y positive (face right)
            const rotateY = -(col - 1) * 15
            const rotateX = (finalY / 500) * 15 // Tilt based on height

            // Distance from "Focus Zone" (center screen)
            // Center roughly at Y = 0 to 300
            const distFromCenter = Math.abs(finalY - 100)
            const scale = Math.max(0.8, 1 - (distFromCenter / 2000))
            const opacity = Math.max(0, 1 - (distFromCenter / 1200))

            gsap.set(el, {
                x: xBase,
                y: finalY,
                z: -Math.abs(col - 1) * 50, // Center col is closer
                rotateY: rotateY,
                rotateX: rotateX,
                scale: scale,
                opacity: opacity,
                zIndex: 100 - row
            })
        })

    }, [progress, isVisible])

    return (
        <section className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden perspective-[1000px] pointer-events-none">

            {/* Background elements? */}

            {/* Title - Fixed at somewhat top */}
            <div ref={titleRef} className="absolute top-[15%] z-20 text-center pointer-events-auto">
                <h2 className="text-sm font-mono text-cyan-400 mb-4 tracking-widest uppercase">Ecosystem</h2>
                <h3 className="text-5xl md:text-7xl font-serif font-bold text-white tracking-tight">
                    Marketplace
                </h3>
                <p className="text-zinc-400 mt-4 max-w-md mx-auto">
                    Thousands of assets created by the community, ready for your next project.
                </p>
            </div>

            {/* Grid Container */}
            <div className="relative w-full max-w-5xl h-full flex items-center justify-center transform-style-3d top-[10%]">
                {ASSETS.map((asset, i) => (
                    <div
                        key={i}
                        ref={(el) => { cardsRef.current[i] = el }}
                        className="absolute w-[280px] h-[280px] p-6 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col justify-between group hover:border-cyan-500/30 transition-colors duration-500 pointer-events-auto cursor-pointer will-change-transform"
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-mono text-cyan-500/80 px-2 py-1 bg-cyan-950/30 rounded border border-cyan-500/20">
                                    {asset.category}
                                </span>
                                <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                            </div>
                            <div className="h-24 w-full bg-gradient-to-br from-white/5 to-transparent rounded-lg mt-4 opacity-50 group-hover:opacity-80 transition-opacity" />
                        </div>

                        <div>
                            <h4 className="text-xl font-bold text-white group-hover:text-cyan-100 transition-colors">{asset.title}</h4>
                            <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-3">
                                <span className="text-zinc-500 text-sm">By StudioX</span>
                                <span className="text-white font-mono text-sm">{asset.price}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </section>
    )
}
