"use client"

import { useRef, useEffect } from "react"
import { Sparkles, Shield, Zap, Users } from "lucide-react"
import { FeatureCard } from "@/components/feature-card"
import { Typewriter } from "@/components/ui/typewriter"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function FeaturesSection() {
    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        if (mediaQuery.matches) return

        const ctx = gsap.context(() => {
            gsap.from(".feature-header", {
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 80%",
                    toggleActions: "play none none reverse",
                },
                y: 40,
                opacity: 0,
                duration: 1.2,
                stagger: 0.1,
                ease: "power3.out",
            })

            gsap.from(".feature-card-wrapper", {
                scrollTrigger: {
                    trigger: "#features-grid",
                    start: "top 85%",
                    toggleActions: "play none none reverse",
                },
                y: 60,
                opacity: 0,
                duration: 1.2,
                stagger: 0.15,
                ease: "power3.out",
            })

            ScrollTrigger.create({
                trigger: containerRef.current,
                start: "top top",
                end: "+=100%",
                pin: true,
                pinSpacing: false,
                scrub: true,
            })

            gsap.to(contentRef.current, {
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: true,
                },
                scale: 0.9,
                opacity: 0,
                filter: "blur(10px)",
                ease: "power1.in",
            })

            if (videoRef.current) {
                gsap.fromTo(
                    videoRef.current,
                    { scale: 1.1 },
                    {
                        scale: 1,
                        ease: "none",
                        scrollTrigger: {
                            trigger: containerRef.current,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true,
                        },
                    }
                )
            }
        }, containerRef)

        return () => ctx.revert()
    }, [])

    return (
        <section
            ref={containerRef}
            className="relative bg-black z-20 overflow-hidden flex flex-col justify-center min-h-screen"
        >
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                src="/features-bg.mp4"
                autoPlay
                muted
                loop
                playsInline
            />

            <div className="absolute inset-0 bg-black/70" />

            <div
                ref={contentRef}
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full py-32"
            >
                <div className="text-center mb-24 space-y-6">
                    <h2 className="feature-header text-4xl md:text-6xl font-bold font-serif tracking-tight text-white/90">
                        <Typewriter
                            text="Powerful Features"
                            delay={300}
                            speed={70}
                            cursorClassName="bg-zinc-500"
                        />
                    </h2>
                    <p className="feature-header text-xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
                        Refined tools for the modern creator. Everything you need to scale your vision.
                    </p>
                </div>

                <div
                    id="features-grid"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                >
                    {[
                        {
                            icon: Sparkles,
                            title: "Remix Engine",
                            description: "Build on community creations and iterate with one click.",
                        },
                        {
                            icon: Zap,
                            title: "Hybrid Routing",
                            description: "Intelligent model selection for optimal quality and speed.",
                        },
                        {
                            icon: Shield,
                            title: "Ethical Core",
                            description: "Consent-based generation with identity-safe practices.",
                        },
                        {
                            icon: Users,
                            title: "Fair Credits",
                            description: "Transparent pricing with a flexible control system.",
                        },
                    ].map((feature) => (
                        <div key={feature.title} className="feature-card-wrapper h-[320px]">
                            <FeatureCard
                                icon={feature.icon}
                                title={feature.title}
                                description={feature.description}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}