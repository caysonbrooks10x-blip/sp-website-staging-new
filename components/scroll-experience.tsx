"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { BackgroundSystem } from "@/components/background-system"
import { HeroState } from "@/components/scroll-states/hero-state"
import { FeaturesState } from "@/components/scroll-states/features-state"
import { WorkflowState } from "@/components/scroll-states/workflow-state"
import { WorkflowStepState } from "@/components/scroll-states/workflow-step-state"



const TOTAL_STATES = 4
const SCROLL_HEIGHT_PER_STATE = 200

export function ScrollExperience() {
    const containerRef = useRef<HTMLDivElement>(null)
    const progressBarRef = useRef<HTMLDivElement>(null)

    
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
                        scrub: 0.6,
                        onUpdate: (self) => {
                            const globalProgress = self.progress
                            const currentIndex = Math.min(TOTAL_STATES - 1, Math.floor(globalProgress * TOTAL_STATES))

                            if (progressBarRef.current) {
                                progressBarRef.current.style.width = `${globalProgress * 100}%`
                            }

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
        const transition = slice * 0.12 

        let opacity = 0
        let translateY = 0
        let scale = 1

        
        if (globalProgress < start - transition || globalProgress > end + transition) {
            return { opacity: 0, translateY: 20, scale: 0.98, blur: 0, visibility: 'hidden' as const, zIndex: 0, pointerEvents: 'none' as const }
        }

        if (globalProgress >= start && globalProgress < end) {
            if (globalProgress < start + transition && index !== 0) {
                
                const p = (globalProgress - start) / transition
                const eased = p * p * (3 - 2 * p) 
                opacity = eased
                translateY = (1 - eased) * 15
                scale = 0.99 + (eased * 0.01)
            } else if (globalProgress > end - transition && index !== total - 1) {
                
                const p = (end - globalProgress) / transition
                const eased = p * p * (3 - 2 * p)
                opacity = eased
                translateY = (eased - 1) * 15
                scale = 1 - ((1 - eased) * 0.01)
            } else {
                
                opacity = 1
                translateY = 0
                scale = 1
            }
        }

        
        if (index === 0 && globalProgress <= transition) {
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
        <div ref={containerRef} className="relative w-full md:h-screen bg-background text-foreground selection:bg-primary/30">
            {}
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
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
                        {i === 1 && <FeaturesState register={register} />}
                        {i === 2 && <WorkflowState register={register} />}

                        {}
                        {i === 3 && (
                            <WorkflowStepState
                                register={register}
                                stepIndex={3}
                                totalSteps={TOTAL_STATES}
                                title="Create"
                                description="Start with a spark. Our engine interprets your intent and generates the foundation."
                                semicircleColor="rgba(45, 212, 191, 0.4)" 
                            />
                        )}
                    </div>
                ))}

            </div>

            {}
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
