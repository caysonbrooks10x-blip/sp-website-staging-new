"use client"

import { useRef, useEffect } from "react"
import { gsap } from "gsap"
// import { Users, MessageCircle, Heart, Share2 } from "lucide-react"

interface CommunityStateProps {
    progress: number
    isVisible?: boolean
}

const NODES = [
    { label: "@alex_cr", x: -300, y: -200, scale: 1.2 },
    { label: "@sarah_vfx", x: 350, y: -150, scale: 1.0 },
    { label: "@motion_god", x: -400, y: 100, scale: 0.9 },
    { label: "@render_wiz", x: 300, y: 250, scale: 1.1 },
    { label: "@pixel_art", x: 0, y: -350, scale: 0.8 },
    { label: "@studio_fan", x: 0, y: 350, scale: 1.0 },
]

export function CommunityState({ progress, isVisible = true }: CommunityStateProps) {
    const centerRef = useRef<HTMLDivElement>(null)
    const nodesRef = useRef<(HTMLDivElement | null)[]>([])

    useEffect(() => {
        if (!isVisible) return

        // Orbital / Galaxy Animation
        // Nodes swirl around the center

        // Progress 0 -> 1: Rotation 0deg -> 90deg?
        const rotation = progress * 90

        if (centerRef.current) {
            gsap.set(centerRef.current, {
                scale: 0.8 + (progress * 0.4), // Grows slightly
                opacity: Math.min(1, progress * 4) // Fades in quickly
            })
        }

        NODES.forEach((node, i) => {
            const el = nodesRef.current[i]
            if (!el) return

            // Convert initial XY to polar, add rotation, convert back
            const rad = Math.atan2(node.y, node.x)
            const dist = Math.sqrt(node.x * node.x + node.y * node.y)

            // Add scroll rotation
            const currentRad = rad + (rotation * (Math.PI / 180))

            // Expand distance slightly as we scroll? "Big Bang" effect
            const currentDist = dist * (1 + progress * 0.5)

            const finalX = Math.cos(currentRad) * currentDist
            const finalY = Math.sin(currentRad) * currentDist

            gsap.set(el, {
                x: finalX,
                y: finalY,
                scale: node.scale * (0.8 + progress * 0.4), // individual scale grow
                opacity: Math.min(1, (progress - 0.1) * 3) // Fade in a bit later than center
            })
        })

    }, [progress, isVisible])

    return (
        <section className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">

            {/* Center Hub */}
            <div ref={centerRef} className="absolute z-20 flex flex-col items-center justify-center pointer-events-auto">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border border-white/10 bg-white/5 backdrop-blur-2xl flex items-center justify-center shadow-[0_0_100px_rgba(255,255,255,0.1)] relative">
                    {/* Ripples */}
                    <div className="absolute inset-0 rounded-full border border-white/5 animate-ping opacity-20" />
                    <div className="absolute -inset-4 rounded-full border border-white/5 opacity-10" />

                    <span className="font-serif text-3xl md:text-5xl font-bold text-white tracking-tighter">Sx</span>
                </div>
                <div className="mt-8 text-center bg-black/50 backdrop-blur-sm p-4 rounded-xl border border-white/5 text-white">
                    <h2 className="text-2xl font-bold">Join 50,000+ Creators</h2>
                    <p className="text-zinc-400 text-sm">Remix, Collab, Grow.</p>
                </div>
            </div>

            {/* Orbiting Nodes */}
            {NODES.map((node, i) => (
                <div
                    key={i}
                    ref={(el) => { nodesRef.current[i] = el }}
                    className="absolute z-10 p-3 pl-4 pr-6 bg-zinc-900/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-3 whitespace-nowrap shadow-xl"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 ring-2 ring-black flex-shrink-0" />
                    <div>
                        <div className="text-xs text-white font-mono">{node.label}</div>
                        <div className="text-[10px] text-zinc-400">Just remixed a project</div>
                    </div>
                </div>
            ))}

        </section>
    )
}
