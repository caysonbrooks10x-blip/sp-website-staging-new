"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { TypewriterText } from "@/components/typewriter-text"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function CTASection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".cta-content", {
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 70%",
                    toggleActions: "play none none reverse",
                },
                scale: 0.9,
                opacity: 0,
                y: 40,
                duration: 1.2,
                ease: "power3.out",
            })

            if (bgRef.current) {
                gsap.fromTo(
                    bgRef.current,
                    { yPercent: -8, scale: 1.1 },
                    {
                        yPercent: 8,
                        scale: 1,
                        ease: "none",
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true,
                        },
                    }
                )
            }
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    return (
        <section
            ref={sectionRef}
            className="relative py-32 md:py-40 bg-foreground text-background overflow-hidden flex items-center justify-center min-h-screen z-50 shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.5)]"
        >
            <div
                ref={bgRef}
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url(/cta.jpg)" }}
            />
            <div className="absolute inset-0 bg-foreground/80" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/20 via-foreground to-foreground pointer-events-none" />

            <div className="absolute w-full h-full top-0 left-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-accent/30 rounded-full blur-[150px] animate-pulse duration-[5000ms]" />
            </div>

            <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center z-10 cta-content">
                <div className="space-y-10">
                    <div className="inline-block relative">
                        <TypewriterText
                            text="Start Creating."
                            className="text-5xl sm:text-6xl md:text-9xl font-bold text-background font-serif tracking-tighter"
                            cursor={true}
                            delay={0.5}
                        />
                    </div>

                    <p className="text-xl md:text-3xl text-background/80 max-w-2xl mx-auto font-light leading-relaxed px-4">
                        Join the revolution of AI-assisted artistry. Your first 50 credits are on us.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-12 w-full px-4">
                        <Button
                            size="lg"
                            className="h-20 px-10 sm:px-16 rounded-full text-xl gap-3 shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_80px_-10px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-500 bg-background text-foreground hover:bg-background/90 w-full sm:w-auto"
                            asChild
                        >
                            <a href="/studio">
                                Get Started Free
                                <ArrowRight className="h-6 w-6" />
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}