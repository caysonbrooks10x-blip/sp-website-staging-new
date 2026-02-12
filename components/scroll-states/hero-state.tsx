"use client"

import { useRef, useLayoutEffect, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight, Play } from "lucide-react"
import { Typewriter } from "@/components/ui/typewriter"
import { gsap } from "gsap"
import { motion, AnimatePresence } from "framer-motion"

interface HeroStateProps {
    register: (cb: (progress: number, index: number) => void) => () => void
}

const ROTATOR_WORDS = [
    "unmatched precision",
    "infinite scale",
    "total control",
    "pure speed"
]

export function HeroState({ register }: HeroStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    const badgeRef = useRef<HTMLDivElement>(null)
    const descRef = useRef<HTMLParagraphElement>(null)
    const buttonsRef = useRef<HTMLDivElement>(null)

    const [wordIndex, setWordIndex] = useState(0)

    // Word Rotator Timer
    useEffect(() => {
        const interval = setInterval(() => {
            setWordIndex((prev) => (prev + 1) % ROTATOR_WORDS.length)
        }, 2500)
        return () => clearInterval(interval)
    }, [])

    // Entry Animations
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

            // Initial State: Hidden
            gsap.set([badgeRef.current, titleRef.current, descRef.current, buttonsRef.current], {
                opacity: 0,
                y: 40
            })

            tl.to(badgeRef.current, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: "power2.out"
            })
                .to(titleRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    skewY: 0
                }, "-=0.4")
                .to(descRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8
                }, "-=0.6")
                .to(buttonsRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8
                }, "-=0.6")

        }, containerRef)

        return () => ctx.revert()
    }, [])

    // Scroll & Exit Logic
    useEffect(() => {
        const unregister = register((globalProgress, index) => {
            if (!contentRef.current) return

            // Hero is index 0: [0, 0.14] (1/7th)
            const slice = 1 / 7

            // Parallax Effect: Move text faster than background
            // We can just use globalProgress * speed
            if (globalProgress < slice) {
                gsap.set(contentRef.current, {
                    y: globalProgress * 500 // 500px movement over the section
                })
            }

            // Exit Animation (Fade out rapidly at the end of the slice)
            const exitStart = slice * 0.6
            const exitEnd = slice
            let exitP = 0

            if (globalProgress > exitStart) {
                exitP = Math.min(1, (globalProgress - exitStart) / (exitEnd - exitStart))

                gsap.set(contentRef.current, {
                    opacity: 1 - exitP,
                    scale: 1 - (0.05 * exitP),
                    filter: `blur(${exitP * 10}px)`
                })
            } else {
                // Reset if scrolling back up
                gsap.set(contentRef.current, {
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)"
                })
            }
        })

        return () => unregister && unregister()
    }, [register])

    return (
        <section ref={containerRef} className="md:absolute md:inset-0 relative w-full h-auto min-h-[100svh] flex items-center justify-center overflow-hidden pointer-events-none perspective-[1000px]">
            {/* Content Layer */}
            <div ref={contentRef} className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6 md:gap-10 pt-24 will-change-transform">

                <div ref={badgeRef} className="hero-badge opacity-0 overflow-hidden pointer-events-auto">
                    <Badge variant="outline" className="border-none text-black gap-2 px-5 py-2 rounded-full bg-white text-[10px] md:text-xs tracking-[0.2em] uppercase font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-zinc-200 transition-colors">
                        <Sparkles className="h-3 w-3 text-black animate-pulse" />
                        <span className="min-w-[180px] text-left">
                            <Typewriter
                                text="Next Gen Creative Studio"
                                delay={800}
                                speed={70}
                                cursorClassName="bg-black"
                            />
                        </span>
                    </Badge>
                </div>

                <h1 ref={titleRef} className="opacity-0 text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] font-serif text-transparent bg-clip-text bg-gradient-to-b from-zinc-200 via-zinc-500 to-zinc-800 drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
                    Limitless <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-black via-zinc-700 to-black italic font-light tracking-normal pb-2 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                        Creation
                    </span>
                </h1>

                <p ref={descRef} className="opacity-0 text-base md:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-lg text-balance flex flex-wrap justify-center gap-1.5">
                    The ultimate platform for remix-based creation. Clone voices, upscale video, and generate code with {" "}
                    <span className="inline-flex w-[210px] justify-start relative h-[1.3em] overflow-hidden align-top text-white font-medium">
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={wordIndex}
                                initial={{ y: 20, opacity: 0, filter: "blur(5px)" }}
                                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                                exit={{ y: -20, opacity: 0, filter: "blur(5px)" }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="absolute left-0 top-0 whitespace-nowrap"
                            >
                                {ROTATOR_WORDS[wordIndex]}
                            </motion.span>
                        </AnimatePresence>
                    </span>
                </p>

                <div ref={buttonsRef} className="opacity-0 flex flex-col sm:flex-row items-center gap-5 pt-2 pointer-events-auto">
                    <Button size="lg" className="h-16 px-12 rounded-full text-lg bg-white text-black hover:bg-zinc-200 hover:scale-[1.02] transition-all duration-300 shadow-[0_0_40px_-5px_rgba(255,255,255,0.3)] font-semibold" asChild>
                        <a href="/studio">
                            Start Creating
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </a>
                    </Button>
                    <Button size="lg" variant="outline" className="h-16 px-12 rounded-full text-lg bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 text-white font-medium group" asChild>
                        <a href="/community">
                            <Play className="mr-2 h-5 w-5 fill-white/20 group-hover:fill-white/100 transition-all" />
                            Showreel
                        </a>
                    </Button>
                </div>

            </div>

            {/* Scroll Hint */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce duration-[2000ms]">
                <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
            </div>
        </section>
    )
}
