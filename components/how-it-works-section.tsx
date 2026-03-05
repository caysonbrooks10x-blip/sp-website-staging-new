"use client"

import { useRef, useEffect } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { Typewriter } from "@/components/ui/typewriter"
import Image from "next/image"

export function HowItWorksSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        if (mediaQuery.matches) return

        const ctx = gsap.context(() => {
            // Mobile: Standard scroll (no pinning)
            if (window.innerWidth < 1024) {
                gsap.from(".hiw-header", {
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top 80%",
                        toggleActions: "play none none reverse",
                    },
                    y: 30, opacity: 0, duration: 1, ease: "power3.out"
                })

                gsap.from(".timeline-line-mobile", {
                    scrollTrigger: {
                        trigger: "#steps-container",
                        start: "top 80%",
                        end: "bottom 80%",
                        scrub: 1.5,
                    },
                    scaleY: 0, transformOrigin: "top center", ease: "none"
                })

                gsap.from(".step-card", {
                    scrollTrigger: {
                        trigger: "#steps-container",
                        start: "top 85%",
                        toggleActions: "play none none reverse",
                    },
                    y: 60, opacity: 0, duration: 1, stagger: 0.15, ease: "power3.out"
                })
            } else {
                // Desktop: Unified Pinning Timeline
                // The master timeline pins the section and sequences all animations
                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top top",
                        end: "+=200%", // Extends scroll distance to 200% of viewport height
                        pin: true,
                        pinSpacing: true, // CRITICAL: This pushes the next section down
                        scrub: 1, // Smooth interaction
                        anticipatePin: 1
                    }
                })

                // 1. Initial State
                tl.addLabel("start")
                    .from(".hiw-header", { y: 50, opacity: 0, duration: 2, ease: "power3.out" })

                    // 2. Draw Line
                    .from(".timeline-line", { scaleX: 0, duration: 3, ease: "none" }, "-=1")

                    // 3. Reveal Cards Sequentially
                    .from(".step-card", {
                        y: 100,
                        opacity: 0,
                        rotationX: -20,
                        transformOrigin: "top center",
                        stagger: 2, // Space them out in the scrub timeline
                        duration: 3,
                        ease: "power3.out"
                    }, "-=1.5") // Overlap slightly with line drawing

                // 4. Background Parallax (Subtle movement during the pin)
                // We animate the background ref manually within the timeline to feel "alive"
                if (bgRef.current) {
                    gsap.fromTo(bgRef.current,
                        { scale: 1.1, y: 0 },
                        {
                            scale: 1.2,
                            y: "10%",
                            ease: "none",
                            scrollTrigger: {
                                trigger: sectionRef.current,
                                start: "top top",
                                end: "+=200%",
                                scrub: true
                            }
                        }
                    )
                }
            }
        }, sectionRef)
        return () => ctx.revert()
    }, [])

    return (
        <div className="relative w-full">
            <section ref={sectionRef} className="py-32 bg-black relative z-30 overflow-hidden min-h-screen flex flex-col justify-center">
                {/* Background Ambience */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-zinc-800/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-zinc-800/10 rounded-full blur-[120px]" />
                </div>

                {/* Background Image */}
                <div ref={bgRef} className="absolute inset-0 pointer-events-none select-none w-full h-full -z-10">
                    <Image
                        src="/howitworks-bg.jpg"
                        alt="Background"
                        fill
                        className="object-cover opacity-40 mix-blend-screen"
                        priority
                    />
                </div>

                {/* Background Ambience Overlays - kept for depth */}
                <div className="absolute inset-0 pointer-events-none mix-blend-overlay">
                    <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-zinc-800/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-zinc-800/20 rounded-full blur-[120px]" />
                </div>

                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
                        <div className="hiw-header max-w-2xl">
                            <h2 className="text-4xl md:text-6xl font-bold font-serif text-white/90 mb-6">
                                <Typewriter
                                    text="Seamless Creation"
                                    delay={200}
                                    speed={60}
                                    startOnView={true}
                                />
                            </h2>
                            <p className="text-xl text-zinc-400 font-light leading-relaxed">
                                From vague idea to polished masterpiece in four simple steps. Our engine handles the complexity.
                            </p>
                        </div>
                    </div>

                    <div id="steps-container" className="relative grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-8 perspective-[1000px]">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden lg:block absolute top-[2.5rem] left-0 right-0 h-[1px] bg-zinc-800 -z-10 mx-8 md:mx-16" />
                        <div className="hidden lg:block absolute top-[2.5rem] left-0 w-full h-[1px] bg-gradient-to-r from-zinc-500/50 via-white/50 to-zinc-500/50 -z-10 mx-8 md:mx-16 origin-left scale-x-1 timeline-line" />

                        {/* Connecting Line (Mobile) */}
                        <div className="lg:hidden absolute left-[2rem] top-8 bottom-8 w-[1px] bg-zinc-800 -z-10" />
                        <div className="lg:hidden absolute left-[2rem] top-8 bottom-8 w-[1px] bg-gradient-to-b from-zinc-500/50 via-white/50 to-zinc-500/50 -z-10 origin-top scale-y-1 timeline-line-mobile" />

                        {[
                            { step: "01", title: "Discover", description: "Browse our curated marketplace of AI creative tools." },
                            { step: "02", title: "Input", description: "Provide your initial prompt, image, or raw footage." },
                            { step: "03", title: "Create", description: "Watch as our engine generates content in real-time." },
                            { step: "04", title: "Refine", description: "Iterate, remix, and export your polished results." },
                        ].map((item, index) => (
                            <div key={item.step} className="step-card relative pl-16 lg:pl-0 lg:pt-8 group">

                                {/* Number Circle */}
                                <div className="absolute left-0 top-0 lg:left-1/2 lg:-translate-x-1/2 lg:-top-8 w-16 h-16 rounded-full bg-black border border-zinc-700 group-hover:border-white transition-colors duration-500 flex items-center justify-center z-10 shadow-lg shadow-black/50">
                                    <span className="font-serif text-xl text-zinc-500 group-hover:text-white transition-colors duration-300">{item.step}</span>
                                </div>

                                <div className="lg:text-center pt-2 lg:pt-12">
                                    <h3 className="text-2xl font-bold mb-4 font-serif text-zinc-200 group-hover:text-white transition-colors duration-300">{item.title}</h3>
                                    <p className="text-base text-zinc-400 leading-relaxed font-light group-hover:text-zinc-300 transition-colors duration-300">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}
