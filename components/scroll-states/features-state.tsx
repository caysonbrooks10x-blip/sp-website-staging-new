"use client"

import { useRef, useEffect, useState } from "react"
import { Layers, Cpu, Fingerprint, Scale } from "lucide-react"
import { FeatureCard } from "@/components/feature-card"
import { Typewriter } from "@/components/ui/typewriter"
import { WordRotator } from "@/components/ui/word-rotator"
import { gsap } from "gsap"

interface FeaturesStateProps {
    register: (cb: (progress: number, index: number) => void) => () => void
}

const FEATURES = [
    {
        icon: Layers,
        title: "Remix Engine",
        description: "Build on community creations and iterate with one click.",
    },
    {
        icon: Cpu,
        title: "Hybrid Routing",
        description: "Intelligent model selection for optimal quality and speed.",
    },
    {
        icon: Fingerprint,
        title: "Ethical Core",
        description: "Consent-based generation with identity-safe practices.",
    },
    {
        icon: Scale,
        title: "Fair Credits",
        description: "Transparent pricing with a flexible control system.",
    },
]

export function FeaturesState({ register }: FeaturesStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const cardsRef = useRef<(HTMLDivElement | null)[]>([])
    const indicatorsRef = useRef<(HTMLDivElement | null)[]>([])
    const videoRef = useRef<HTMLVideoElement>(null)
    const cardsContainerRef = useRef<HTMLDivElement>(null)

    // State just for the Typewriter trigger (updates once)
    const [started, setStarted] = useState(false)

    useEffect(() => {
        // Ensure video plays
        if (videoRef.current) {
            videoRef.current.play().catch(() => { })
        }

        const unregister = register((globalProgress, index) => {
            // Index 1 of 7 states
            // Range: [0.1428, 0.2857]
            const TOTAL = 7
            const start = 1 / TOTAL
            const end = 2 / TOTAL
            const slice = 1 / TOTAL

            let localProgress = 0
            if (globalProgress < start) localProgress = 0
            else if (globalProgress > end) localProgress = 1
            else localProgress = (globalProgress - start) / slice

            // Trigger Typewriter
            if (localProgress > 0.05 && !started) {
                setStarted(true)
            }

            // --- PARALLAX BACKGROUND LOGIC ---
            if (videoRef.current) {
                const parallaxY = localProgress * 15
                gsap.set(videoRef.current, {
                    yPercent: -parallaxY,
                    scale: 1.1
                })
            }

            // --- DECK/STACK ANIMATION LOGIC ---
            // We want to show 4 cards.
            // 0 -> 1 : Card 1 active, Card 2 below
            // ...

            // Total 'steps' = length - 1. 
            // We want the last card to be fully visible at the end.
            const totalDistance = FEATURES.length - 1
            const currentFocus = localProgress * totalDistance

            FEATURES.forEach((_, i) => {
                const el = cardsRef.current[i]
                if (!el) return

                const dist = i - currentFocus

                // VISUAL VARS
                let x = 0
                let y = 0
                let scale = 1
                let opacity = 1
                let zIndex = 0
                let blur = 0

                // Refined Logic for "Cosmos" feel
                // Positive dist = Future cards (waiting in stack)
                // Negative dist = Past cards (flying away/fading)
                // dist ~ 0 = Active card

                let pointerEvents = 'none'

                if (dist > 0) {
                    // WAITING IN STACK (Future cards)
                    // Stack them visibly behind with nice depth spacing
                    const depth = dist
                    scale = 1 - (depth * 0.05) // Subtle scale down
                    y = depth * 30             // Tighter stack
                    zIndex = 100 - i
                    opacity = Math.max(0, 1 - (depth * 0.3)) // Fade out further cards to focus on current
                    blur = depth * 2            // Blur background cards more to focus on active

                    // Cap visual stack depth
                    if (depth > 4) {
                        opacity = 0
                    }
                }
                else {
                    // ACTIVE OR PAST
                    // transitions from 0 to -1 (active -> exit)

                    const timeSinceActive = Math.abs(dist)

                    if (timeSinceActive <= 1) {
                        // EXITING CARD (0 to -1)
                        // Fly UP significantly to clear the view, but stay opaque longer
                        const exit = timeSinceActive // 0 -> 1

                        y = -exit * 350    // Fly up much higher to physically reveal next card
                        scale = 1 - (exit * 0.1) // Slight scale down
                        blur = exit * 2    // Minimal blur so it remains readable while moving

                        // Opacity: Stay visible (1) until almost gone, then rapid fade
                        // This fixes "disappears too quick"
                        opacity = 1 - Math.pow(Math.max(0, exit - 0.5) * 2, 3)

                        zIndex = 100 - i
                    } else {
                        // TOTALLY GONE
                        opacity = 0
                        y = -400
                    }
                }

                pointerEvents = (dist > -0.5 && dist < 0.5) ? 'auto' : 'none'

                gsap.set(el, {
                    x: x,
                    y: y,
                    scale: Math.max(0, scale),
                    opacity: Math.max(0, opacity),
                    zIndex: zIndex,
                    filter: `blur(${blur}px)`,
                    pointerEvents: pointerEvents,
                    transformOrigin: "center bottom"
                })

                // Indicators
                const indEl = indicatorsRef.current[i]
                if (indEl) {
                    // Active window roughly centered on index
                    const isActive = dist > -0.5 && dist <= 0.5
                    indEl.style.width = isActive ? '40px' : '8px'
                    indEl.style.backgroundColor = isActive ? 'white' : 'rgba(255,255,255,0.2)'
                }
            })
        })

        return () => unregister && unregister()
    }, [register, started])

    return (
        <section ref={containerRef} className="md:absolute md:inset-0 relative w-full h-auto min-h-[100svh] flex flex-col items-center justify-center overflow-hidden bg-black">

            {/* VIDEO BACKGROUND WITH PARALLAX */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 w-full h-[120%] -top-[10%]"> {/* Container for parallax movement */}
                    <video
                        ref={videoRef}
                        src="/features-bg.mp4"
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover opacity-60"
                        style={{ willChange: 'transform' }}
                    />
                </div>
                {/* Heavy Vignette / Overlay for Dark Theme */}
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
            </div>


            {/* Content Container */}
            <div className="relative z-10 w-full max-w-7xl mx-auto h-full flex flex-col md:flex-row items-center justify-between p-8 md:p-20">

                {/* Left Side: Typography */}
                <div className="flex-1 space-y-8 md:pr-12 pointer-events-none z-20 text-center md:text-left">
                    <div className="space-y-4">
                        <h2 className="text-5xl md:text-7xl font-semibold font-sans tracking-tighter text-white drop-shadow-2xl">
                            <Typewriter
                                text="Capabilities"
                                delay={100}
                                speed={70}
                                cursorClassName="bg-white/50"
                                start={started}
                            />
                        </h2>
                        <div className="h-[2px] w-24 bg-white/30 md:mx-0 mx-auto" />
                    </div>

                    <div className="text-xl md:text-2xl text-zinc-300 font-light leading-relaxed h-20">
                        <span className="opacity-70">Engineered for your </span>
                        <span className="font-medium text-white">
                            <WordRotator
                                words={["Vision", "Workflow", "Scale", "Future"]}
                            />
                        </span>
                    </div>
                </div>

                {/* Right Side: Card Stack */}
                <div ref={cardsContainerRef} className="flex-1 relative w-full md:h-[500px] h-auto flex flex-col md:flex-row items-center justify-center md:-ml-0 mt-8 md:mt-0">
                    {FEATURES.map((feature, i) => (
                        <div
                            key={i}
                            ref={(el) => { cardsRef.current[i] = el }}
                            className="relative md:absolute w-full md:w-[480px] h-[320px] mb-6 md:mb-0 will-change-transform"
                        >
                            {/* Glass Card Wrapper */}
                            <div className="h-full w-full bg-zinc-950/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative group">
                                {/* Background Image */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-40"
                                    style={{ backgroundImage: "url('/capabilities.jpeg')" }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

                                <div className="relative z-10 h-full p-1">
                                    <FeatureCard
                                        icon={feature.icon}
                                        title={feature.title}
                                        description={feature.description}
                                        className="border-none bg-transparent shadow-none h-full"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination / Progress Dots */}
            <div className="absolute md:right-20 right-1/2 md:translate-x-0 translate-x-1/2 bottom-12 flex gap-2 z-20">
                {FEATURES.map((_, i) => (
                    <div
                        key={i}
                        ref={(el) => { indicatorsRef.current[i] = el }}
                        className="h-1 rounded-full bg-white/20 transition-all duration-300 w-2"
                    />
                ))}
            </div>

        </section>
    )
}
