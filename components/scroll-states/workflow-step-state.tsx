"use client"

import { useRef, useEffect, useState } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Typewriter } from "@/components/ui/typewriter"

gsap.registerPlugin(ScrollTrigger)

interface WorkflowStepStateProps {
    register: (cb: (progress: number, index: number) => void) => () => void
    stepIndex: number
    title: string
    description: string
    semicircleColor?: string
}

export function WorkflowStepState({ register, stepIndex, title, description, semicircleColor = "rgba(100,100,255,0.15)" }: WorkflowStepStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    const descRef = useRef<HTMLParagraphElement>(null)
    const semicircleRef = useRef<HTMLDivElement>(null)
    const textContainerRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)

    // Cursor Tracking State (Refs for performance)
    const targetRef = useRef({ x: 0, y: 0 })
    const currentRef = useRef({ x: 0, y: 0 })
    const rafIdRef = useRef<number | null>(null)

    const [startTypewriter, setStartTypewriter] = useState(false)

    // Color Theme Mapping (Fallback if semicircleColor isn't specific enough)
    // We use the passed color for the gradient to ensure consistency

    // --- 1. CURSOR TRACKING SYSTEM (Living Color Field) ---
    useEffect(() => {
        // Initial center position
        if (typeof window !== 'undefined') {
            targetRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
            currentRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return
            // Get position relative to viewport (fixed/absolute context)
            targetRef.current = { x: e.clientX, y: e.clientY }
        }

        window.addEventListener("mousemove", handleMouseMove)

        const loop = () => {
            // Lerp (0.1 for smooth delay)
            currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.1
            currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.1

            const x = currentRef.current.x
            const y = currentRef.current.y

            // A. Background Gradient Update
            // Using a large, soft radial gradient that follows the cursor
            if (bgRef.current) {
                // We use setProperty for performance if it's a CSS var, or direct style
                // Direct background string construction is fine for modern browsers on RAF
                bgRef.current.style.background = `radial-gradient(800px circle at ${x}px ${y}px, ${semicircleColor}, transparent 70%)`
            }

            // B. Semicircle Interaction (Parallax)
            // Moves slightly towards the cursor horizontally
            if (semicircleRef.current) {
                // Center is window.innerWidth / 2
                // Range +/- 50px
                const centerX = window.innerWidth / 2
                const deltaX = (x - centerX) * 0.05

                // We use GSAP quickSetter ideally, or just set transform directly here if simple
                // But let's mix with scroll logic below. 
                // To avoid conflict, we'll store this value or use CSS var?
                // Actually, let's just use a transform.
                // We need to merge with the Y transform from scroll.
                // Best to split: Semicircle Inner (Cursor) vs Outer (Scroll) ?
                // For simplicity, let's set CSS Variable --cursor-x
                semicircleRef.current.style.setProperty('--cursor-x', `${deltaX}px`)

                // Also proximity glow?
                // We can adjust opacity based on Y distance to bottom
                const distY = window.innerHeight - y
                const proximity = Math.max(0, 1 - (distY / 500)) // 0 to 1
                const brightness = 0.6 + (proximity * 0.4) // 0.6 to 1.0
                semicircleRef.current.style.opacity = brightness.toFixed(2)
            }

            rafIdRef.current = requestAnimationFrame(loop)
        }
        loop()

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
        }
    }, [semicircleColor])


    // --- 2. GSAP SCROLL & REVEAL SYSTEM ---
    useEffect(() => {
        const mm = gsap.matchMedia()

        // Initial setup
        const ctx = gsap.context(() => {
            const targets = [titleRef.current, descRef.current].filter((el) => el !== null) as HTMLElement[]

            // DESKTOP: Initial Hide & Parent Control
            mm.add("(min-width: 768px)", () => {
                if (targets.length > 0) {
                    gsap.set(targets, {
                        opacity: 0,
                        y: 60,
                        filter: "blur(12px)",
                        scale: 0.94
                    })
                }

                // Semicircle Initial
                if (semicircleRef.current) {
                    gsap.set(semicircleRef.current, {
                        scale: 0.96,
                        yPercent: 20
                    })
                }
            })

            // MOBILE: Simple In-View Trigger
            mm.add("(max-width: 767px)", () => {
                if (targets.length > 0) {
                    gsap.from(targets, {
                        scrollTrigger: {
                            trigger: containerRef.current,
                            start: "top 65%",
                            onEnter: () => setStartTypewriter(true)
                        },
                        opacity: 0,
                        y: 40,
                        filter: "blur(5px)",
                        stagger: 0.2,
                        duration: 1,
                        ease: "power2.out"
                    })
                }
                // Ensure typewriter starts if already in view or forced
                ScrollTrigger.create({
                    trigger: containerRef.current,
                    start: "top 80%",
                    onEnter: () => setStartTypewriter(true)
                })
            })

        }, containerRef)

        // Only register listener updates if NOT mobile (handled by parent on desktop)
        // Actually, we can just register safely. If parent doesn't call it on mobile, no harm.
        // If parent DID call it, we'd have a conflict. But we know parent disables it on mobile.
        const unregister = register((globalProgress, currentIndex) => {
            // Local Progress Logic
            const TOTAL = 7
            const start = stepIndex / TOTAL
            const end = (stepIndex + 1) / TOTAL
            const duration = end - start
            const localProgress = (globalProgress - start) / duration

            // Typewriter Trigger (Desktop Fallback)
            if (localProgress > 0.1 && !startTypewriter) {
                setStartTypewriter(true)
            }

            // Reveal / Parallax Logic
            if (localProgress < 0) {
                // Reset if scrolled back up far
                const targets = [titleRef.current, descRef.current].filter((el) => el !== null) as HTMLElement[]
                if (targets.length > 0) {
                    gsap.set(targets, { opacity: 0, y: 60, filter: "blur(12px)", scale: 0.94 })
                }

            } else if (localProgress >= 0 && localProgress <= 1) {
                // ENTRY PHASE (0 - 0.25)
                const entryP = Math.min(1, localProgress / 0.25)

                // Ease the entry
                const easedEntry = 1 - Math.pow(1 - entryP, 3) // Cubic ease out

                // Properties
                const currentY = 60 * (1 - easedEntry) // 60 -> 0
                const currentBlur = 12 * (1 - easedEntry) // 12 -> 0
                const currentScale = 0.94 + (0.06 * easedEntry) // 0.94 -> 1.0
                const currentOpacity = easedEntry

                // Parallax PHASE (0.25 - 1.0)
                // Once entered, we slowly drift up
                const drift = Math.max(0, localProgress - 0.25) * 50 // 0px to 37.5px

                // Apply Text Transforms
                if (titleRef.current) {
                    gsap.set(titleRef.current, {
                        opacity: currentOpacity,
                        y: currentY - drift, // Enter (0) then drift up (-drift)
                        filter: `blur(${currentBlur}px)`,
                        scale: currentScale
                    })
                }
                if (descRef.current) {
                    // Subtext drifts a bit less for parallax depth
                    gsap.set(descRef.current, {
                        opacity: currentOpacity,
                        y: currentY - (drift * 0.7),
                        filter: `blur(${currentBlur}px)`,
                        scale: currentScale
                    })
                }

                // Semicircle Scroll Params
                if (semicircleRef.current) {
                    // Grows as we scroll
                    const scale = 0.96 + (localProgress * 0.1) // 0.96 -> 1.06
                    // Moves up slightly
                    const yPerc = 20 - (localProgress * 20) // 20% -> 0%

                    // We use CSS var for the scroll Y to allow mixing with cursor X
                    semicircleRef.current.style.setProperty('--scroll-scale', scale.toFixed(3))
                    semicircleRef.current.style.setProperty('--scroll-y', `${yPerc}%`)
                }
            } else {
                // Out of view
                const targets = [titleRef.current, descRef.current].filter((el) => el !== null) as HTMLElement[]
                if (targets.length > 0) {
                    gsap.set(targets, { opacity: 0 })
                }
            }
        })

        return () => {
            ctx.revert()
            mm.revert()
            unregister()
        }
    }, [register, stepIndex, startTypewriter])

    return (
        <section ref={containerRef} className="md:absolute md:inset-0 relative w-full h-auto min-h-[100svh] flex flex-col items-center justify-center overflow-hidden pointer-events-none bg-black">

            {/* 1. LIVING GRADIENT BACKGROUND */}
            <div
                ref={bgRef}
                className="absolute inset-0 w-full h-full opacity-20 pointer-events-none transition-colors duration-1000 ease-linear"
                style={{ mixBlendMode: 'screen' }}
            />

            {/* 2. SEMICIRCLE (Bottom Anchor) */}
            <div
                ref={semicircleRef}
                className="absolute bottom-[-20vh] left-1/2 w-[60vw] h-[30vw] rounded-t-full z-10 blur-[80px] will-change-transform"
                style={{
                    background: semicircleColor,
                    // Combine Scroll (Scale/Y) + Cursor (X)
                    transform: `translateX(calc(-50% + var(--cursor-x, 0px))) translateY(var(--scroll-y, 20%)) scale(var(--scroll-scale, 0.96))`
                }}
            />

            {/* 3. TEXT CONTENT */}
            <div
                ref={textContainerRef}
                className="relative z-20 text-center px-4 flex flex-col items-center justify-center gap-8"
            >
                <div className="h-24 md:h-32 flex items-center justify-center">
                    <h2
                        ref={titleRef}
                        className="text-6xl md:text-8xl font-serif text-white tracking-tight leading-none will-change-transform"
                    >
                        <Typewriter
                            text={title}
                            start={startTypewriter}
                            speed={50}
                            cursorClassName="hidden"
                        />
                    </h2>
                </div>

                <p
                    ref={descRef}
                    className="text-xl md:text-2xl text-zinc-400 font-light max-w-lg leading-relaxed will-change-transform"
                >
                    {description}
                </p>
            </div>

        </section>
    )
}
