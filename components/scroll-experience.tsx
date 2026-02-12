import { useRef, useEffect, useState, useCallback } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { BackgroundSystem } from "@/components/background-system"
import { HeroState } from "@/components/scroll-states/hero-state"
import { FeaturesState } from "@/components/scroll-states/features-state"
import { WorkflowState } from "@/components/scroll-states/workflow-state"
import { WorkflowStepState } from "@/components/scroll-states/workflow-step-state"
// ... (imports)

// Constants for tuning
const TOTAL_STATES = 7
const SCROLL_HEIGHT_PER_STATE = 300 // Increased to provide much more scroll duration per section
const TRANSITION_OVERLAP = 0.2

export function ScrollExperience() {
    const containerRef = useRef<HTMLDivElement>(null)
    const progressBarRef = useRef<HTMLDivElement>(null)

    // Registry for components that need to react to scroll
    // They will be called inside the GSAP ticker
    const listeners = useRef<((progress: number, index: number) => void)[]>([])

    const register = useCallback((callback: (progress: number, index: number) => void) => {
        listeners.current.push(callback)
        // Return cleanup function
        return () => {
            listeners.current = listeners.current.filter(cb => cb !== callback)
        }
    }, [])

    // Direct DOM refs for section containers to avoid re-renders
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

    // We use a simple state to force re-render on mount for hydration matching, 
    // but the real logic is in CSS/GSAP matchMedia
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        gsap.registerPlugin(ScrollTrigger)

        // Force refresh to handle dynamic height changes from loading images/fonts
        const timer = setTimeout(() => {
            ScrollTrigger.refresh()
        }, 100)

        // Initial state set - ONLY ON DESKTOP
        // On mobile, we want to rely on the CSS 'relative' layout, not the GSAP 'absolute' positioning
        if (window.innerWidth >= 768) {
            listeners.current.forEach(cb => cb(0, 0))
        }

        const ctx = gsap.context(() => {
            // DESKTOP ONLY: ScrollTrigger logic
            ScrollTrigger.matchMedia({
                "(min-width: 768px)": function () {
                    ScrollTrigger.create({
                        trigger: containerRef.current,
                        start: "top top",
                        end: `+=${TOTAL_STATES * SCROLL_HEIGHT_PER_STATE}%`,
                        pin: true,
                        scrub: 1, // Slightly tighter scrub for responsiveness
                        onUpdate: (self) => {
                            const globalProgress = self.progress
                            const currentIndex = Math.floor(globalProgress * TOTAL_STATES)

                            // 1. Update Progress Bar directly
                            if (progressBarRef.current) {
                                progressBarRef.current.style.width = `${globalProgress * 100}%`
                            }

                            // 2. Broadcast to children
                            listeners.current.forEach(cb => cb(globalProgress, currentIndex))

                            // 3. Handle Transitions (The "Boat" Protocol) directly on Refs
                            Array.from({ length: TOTAL_STATES }).forEach((_, i) => {
                                const el = sectionRefs.current[i]
                                if (!el) return

                                const { opacity, translateY, pointerEvents, zIndex, scale, blur } = calculateState(i, globalProgress)

                                gsap.set(el, {
                                    opacity,
                                    yPercent: translateY,
                                    scale: scale,
                                    filter: `blur(${blur}px)`,
                                    pointerEvents,
                                    zIndex
                                })
                            })
                        }
                    })
                },

                // MOBILE: Ensure clean state
                "(max-width: 767px)": function () {
                    // Reset any GSAP sets that might have lingered
                    Array.from({ length: TOTAL_STATES }).forEach((_, i) => {
                        const el = sectionRefs.current[i]
                        if (!el) return
                        gsap.set(el, {
                            opacity: 1,
                            yPercent: 0,
                            scale: 1,
                            filter: 'blur(0px)',
                            pointerEvents: 'auto',
                            zIndex: 10
                        })
                    })
                }
            })
        }, containerRef)

        return () => {
            clearTimeout(timer)
            ctx.revert()
        }
    }, [])

    /* 
       "The Boat" Protocol Logic (Moved out of render)
    */
    const calculateState = (index: number, globalProgress: number) => {
        const total = TOTAL_STATES
        const slice = 1 / total
        const start = index * slice
        const end = (index + 1) * slice
        const overlap = slice * 0.15

        let opacity = 0
        let translateY = 0
        let scale = 1
        let blur = 0

        // 1. Entry Phase
        if (globalProgress >= start && globalProgress < (start + overlap)) {
            const entryProgress = (globalProgress - start) / overlap
            // WORKFLOW SPECIAL (index 2): Standard fade in
            opacity = index === 0 ? 1 : entryProgress
        }
        // 2. Active Phase & Dwell
        else if (globalProgress >= (start + overlap) && globalProgress < end) {
            opacity = 1
            translateY = 0
            scale = 1
            blur = 0
        }
        // 3. Exit Phase
        else if (globalProgress >= end && globalProgress < (end + overlap)) {
            const exitProgress = (globalProgress - end) / overlap
            if (index === 6) {
                // SCALE SPECIAL (Index 6): Stay Visible? No next section yet.
                opacity = 1
            } else {
                // Standard Exit: Fade out, Blur in, Scale down
                opacity = 1 - (exitProgress * 0.4)
                blur = exitProgress * 6
                scale = 1 - (exitProgress * 0.03)
            }
        }
        // 4. Out of bounds
        else {
            opacity = 0
        }

        return {
            opacity: Math.max(0, Math.min(1, opacity)),
            translateY,
            scale,
            blur,
            pointerEvents: (opacity > 0.5) ? 'auto' as const : 'none' as const,
            zIndex: index * 10
        }
    }

    return (
        <div ref={containerRef} className="relative w-full md:h-screen bg-background text-foreground selection:bg-primary/30">
            {/* Background System with Subscription */}
            <div className="fixed inset-0 pointer-events-none">
                <BackgroundSystem register={register} />
            </div>

            {/* Viewport Content */}
            <div className="relative w-full h-full flex flex-col md:block">

                {Array.from({ length: TOTAL_STATES }).map((_, i) => (
                    <div
                        key={i}
                        ref={(el) => { sectionRefs.current[i] = el }}
                        className={`relative w-full min-h-[100svh] md:absolute md:inset-0 md:min-h-0 will-change-[opacity,transform,filter] overflow-hidden md:overflow-visible ${i === 0 ? 'md:opacity-100' : 'md:opacity-0'}`}
                        style={{
                            // Only set initial styles that match desktop logic
                            // Mobile styles are overridden by CSS classes (opacity 1 naturally)
                            // But inline styles win, so we rely on the GSAP matchMedia to reset these on mobile
                        }}
                    >
                        {i === 0 && <HeroState register={register} />}
                        {i === 1 && <FeaturesState register={register} />}
                        {i === 2 && <WorkflowState register={register} />}

                        {/* New Workflow Steps */}
                        {i === 3 && (
                            <WorkflowStepState
                                register={register}
                                stepIndex={3}
                                title="Create"
                                description="Start with a spark. Our engine interprets your intent and generates the foundation."
                                semicircleColor="rgba(45, 212, 191, 0.4)" // Teal glow
                            />
                        )}
                        {i === 4 && (
                            <WorkflowStepState
                                register={register}
                                stepIndex={4}
                                title="Refine"
                                description="Iterate directly. Adjust parameters, remix styles, and perfect the details."
                                semicircleColor="rgba(244, 63, 94, 0.4)" // Rose glow
                            />
                        )}
                        {i === 5 && (
                            <WorkflowStepState
                                register={register}
                                stepIndex={5}
                                title="Publish"
                                description="Share with the world. Export in any format and showcase your work instantly."
                                semicircleColor="rgba(124, 58, 237, 0.5)" // Indigo glow
                            />
                        )}
                        {i === 6 && (
                            <WorkflowStepState
                                register={register}
                                stepIndex={6}
                                title="Scale"
                                description="Grow without limits. Our infrastructure scales perfectly with your ambition."
                                semicircleColor="rgba(56, 189, 248, 0.5)" // Sky blue glow
                            />
                        )}
                    </div>
                ))}

            </div>

            {/* Global Progress Bar - Hidden on mobile as native scroll is the progress */}
            <div className="invisible md:visible fixed bottom-0 left-0 h-1 bg-white/5 w-full z-50">
                <div
                    ref={progressBarRef}
                    className="h-full bg-white/20 transition-none"
                    style={{ width: '0%' }}
                />
            </div>
        </div>
    )
}
