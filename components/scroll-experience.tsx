"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { BackgroundSystem } from "@/components/background-system"
import { HeroState } from "@/components/scroll-states/hero-state"
import { WorkflowState } from "@/components/scroll-states/workflow-state"
import { WorkflowStepState } from "@/components/scroll-states/workflow-step-state"



const TOTAL_STATES = 3
const SCROLL_HEIGHT_PER_STATE = 20

export function ScrollExperience() {
    const containerRef = useRef<HTMLDivElement>(null)

    
    const listeners = useRef<((progress: number, index: number) => void)[]>([])

    const register = useCallback((callback: (progress: number, index: number) => void) => {
        listeners.current.push(callback)
        return () => {
            listeners.current = listeners.current.filter(cb => cb !== callback)
        }
    }, [])

    const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        gsap.registerPlugin(ScrollTrigger)

        const timer = setTimeout(() => {
            ScrollTrigger.refresh()
        }, 100)

        if (window.innerWidth >= 768) {
            listeners.current.forEach(cb => cb(0, 0))
        }

        const ctx = gsap.context(() => {
            ScrollTrigger.matchMedia({
                "(min-width: 768px)": function () {
                    ScrollTrigger.create({
                        trigger: containerRef.current,
                        start: "top top",
                        end: `+=${TOTAL_STATES * SCROLL_HEIGHT_PER_STATE}%`,
                        pin: true,
                        scrub: 0.5,
                        onUpdate: (self) => {
                            const globalProgress = self.progress
                            const currentIndex = Math.min(TOTAL_STATES - 1, Math.floor(globalProgress * TOTAL_STATES))

                            listeners.current.forEach(cb => cb(globalProgress, currentIndex))

                            Array.from({ length: TOTAL_STATES }).forEach((_, i) => {
                                const el = sectionRefs.current[i]
                                if (!el) return

                                const { opacity, translateY, pointerEvents, zIndex, scale, blur, visibility } = calculateState(i, globalProgress)

                                gsap.set(el, {
                                    opacity,
                                    yPercent: translateY,
                                    scale,
                                    pointerEvents,
                                    visibility,
                                    zIndex,
                                    force3D: true,
                                })
                            })
                        }
                    })
                },

                "(max-width: 767px)": function () {
                    Array.from({ length: TOTAL_STATES }).forEach((_, i) => {
                        const el = sectionRefs.current[i]
                        if (!el) return
                        gsap.set(el, { clearProps: "all" })
                    })
                }
            })
        }, containerRef)

        return () => {
            clearTimeout(timer)
            ctx.revert()
        }
    }, [])

    const calculateState = (index: number, globalProgress: number) => {
        const total = TOTAL_STATES
        const slice = 1 / total
        const start = index * slice
        const end = (index + 1) * slice
        // half the cross-fade window — fades are centered on the boundary so they overlap
        const half = slice * 0.15

        let opacity = 0
        let translateY = 0
        let scale = 1

        // Completely outside the extended visibility range
        if (globalProgress < start - half || globalProgress > end + half) {
            return { opacity: 0, translateY: 20, scale: 0.98, blur: 0, visibility: 'hidden' as const, zIndex: 0, pointerEvents: 'none' as const }
        }

        if (globalProgress < start + half) {
            // Fade-in zone: [start - half, start + half] centered on the boundary
            if (index === 0) {
                // First section is always fully visible from the start
                opacity = 1
            } else {
                const p = Math.max(0, (globalProgress - (start - half)) / (2 * half))
                const eased = p * p * (3 - 2 * p)
                opacity = eased
                translateY = (1 - eased) * 15
                scale = 0.99 + (eased * 0.01)
            }
        } else if (globalProgress > end - half) {
            // Fade-out zone: [end - half, end + half] centered on the boundary
            if (index === total - 1) {
                // Last section stays fully visible at its end boundary
                opacity = 1
            } else {
                const p = Math.max(0, ((end + half) - globalProgress) / (2 * half))
                const eased = p * p * (3 - 2 * p)
                opacity = eased
                translateY = (eased - 1) * 15
                scale = 1 - ((1 - eased) * 0.01)
            }
        } else {
            // Full-opacity zone: [start + half, end - half]
            opacity = 1
            translateY = 0
            scale = 1
        }

        const clampedOpacity = Math.max(0, Math.min(1, opacity))
        const isActive = clampedOpacity > 0.01

        return {
            opacity: clampedOpacity,
            translateY,
            scale,
            blur: 0,
            pointerEvents: (clampedOpacity > 0.5) ? 'auto' as const : 'none' as const,
            visibility: isActive ? 'visible' as const : 'hidden' as const,
            zIndex: isActive ? 100 - Math.round((1 - clampedOpacity) * 50) : 0
        }
    }

    return (
        <div ref={containerRef} className="relative w-full md:h-screen bg-background text-foreground selection:bg-primary/30 z-[45]">
            {/* BackgroundSystem only renders on desktop — on mobile it leaks into MarketplaceSection via the scroll-experience z-[45] stacking context (inherited -z-50 child still outranks z-40 siblings of the parent context) */}
            <div className="hidden md:block fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                <BackgroundSystem register={register} />
            </div>

            {}
            <div className="relative w-full h-full flex flex-col md:block" style={{ zIndex: 10 }}>

                {Array.from({ length: TOTAL_STATES }).map((_, i) => (
                    <div
                        key={i}
                        ref={(el) => { sectionRefs.current[i] = el }}
                        className={`relative w-full h-auto md:absolute md:inset-0 md:h-full overflow-x-hidden ${i === 0 ? 'md:opacity-100 md:overflow-hidden' : 'md:opacity-0 md:overflow-visible'}`}
                        style={{
                            pointerEvents: i === 0 ? 'auto' : 'none',
                            visibility: i === 0 ? 'visible' : 'hidden',
                        }}
                    >
                        {i === 0 && <HeroState register={register} />}
                        {i === 1 && <WorkflowState register={register} />}

                        {}
                        {i === 2 && (
                            <WorkflowStepState
                                register={register}
                                stepIndex={2}
                                totalSteps={TOTAL_STATES}
                                title="Create"
                                description="Start with a spark. Our engine interprets your intent and generates the foundation."
                                semicircleColor="rgba(45, 212, 191, 0.4)"
                            />
                        )}
                    </div>
                ))}

            </div>

        </div>
    )
}
