"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ArrowRight, Play } from "lucide-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "@/components/ui/split-text"
import { Typewriter } from "@/components/ui/typewriter"

export function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null)
    const heroRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        if (mediaQuery.matches) return

        const isMobile = window.innerWidth < 768

        const ctx = gsap.context(() => {
            // 1. Intro Animation
            const introTl = gsap.timeline({ defaults: { ease: "power4.out" } })

            introTl
                .to(".reveal-text", {
                    y: 0,
                    duration: 1.5,
                    stagger: 0.1,
                    delay: 0.2,
                })
                .from(".hero-badge", {
                    y: 20,
                    opacity: 0,
                    duration: 1
                }, "-=1.0")
                .from(".hero-desc", {
                    y: 20,
                    opacity: 0,
                    duration: 1
                }, "-=0.8")
                .from(".hero-btn", {
                    y: 20,
                    opacity: 0,
                    duration: 1,
                    stagger: 0.1
                }, "-=0.6")
                .from(".hero-video-container", {
                    scale: 1.1,
                    opacity: 0,
                    duration: 2,
                    ease: "power2.out"
                }, 0)

            // 2. Video Ambient Motion
            gsap.to(".hero-video", {
                scale: 1.05,
                duration: 20,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            })

            // 3. Scroll Pinning & Parallax
            if (!isMobile) {
                const scrubTl = gsap.timeline({
                    scrollTrigger: {
                        trigger: heroRef.current,
                        start: "top top",
                        end: "+=120%", // Extended pin for smoother feel
                        pin: true,
                        pinSpacing: false,
                        scrub: 1.2, // Smoother scrub
                        anticipatePin: 1,
                    }
                })

                // Text moves up and fades out relative to scroll
                scrubTl
                    .to(".hero-content", {
                        y: -150,
                        opacity: 0,
                        scale: 0.95,
                        ease: "power2.inOut", // Smoother easing
                    }, 0)
                    .to(".hero-video-container", {
                        y: 100,
                        scale: 1.15, // Slightly more scale for depth
                        ease: "none"
                    }, 0)
                    .to(".hero-bg-overlay", {
                        opacity: 0.8, // Darker overlay on scroll
                        ease: "none"
                    }, 0)
            } else {
                // Mobile Parallax
                gsap.to(".hero-content", {
                    y: -80,
                    opacity: 0,
                    scrollTrigger: {
                        trigger: heroRef.current,
                        start: "top top",
                        end: "bottom center",
                        scrub: 1
                    }
                })

                gsap.to(".hero-video-container", {
                    y: 60,
                    scrollTrigger: {
                        trigger: heroRef.current,
                        start: "top top",
                        end: "bottom top",
                        scrub: 1
                    }
                })
            }

        }, containerRef)

        return () => ctx.revert()
    }, [])

    return (
        <section ref={containerRef} className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-background">
            <div ref={heroRef} className="w-full h-full absolute inset-0 flex flex-col items-center justify-center pt-[100px] md:pt-[120px]">

                {/* Video Background */}
                <div className="hero-video-container absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="hero-video w-full h-full object-cover opacity-60 grayscale-[0.3] will-change-transform" // Added grayscale for mood
                    >
                        <source src="/herosection.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
                    {/* Gradient for smooth transition to next section */}
                    <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/60 to-transparent" />
                </div>

                {/* Overlay */}
                <div className="hero-bg-overlay absolute inset-0 bg-background/0 z-1 pointer-events-none" />

                <div className="hero-content relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left flex flex-col items-start justify-center gap-6 md:gap-8 mt-12 md:mt-16 w-full lg:w-[800px] xl:w-[1000px] self-start md:ml-12 lg:ml-24">

                    <div className="hero-badge overflow-hidden w-full text-left">
                        <Badge variant="outline" className="border-white/10 text-zinc-400 gap-2 px-6 py-2 rounded-full backdrop-blur-md bg-white/5 text-xs md:text-sm tracking-[0.2em] uppercase font-medium shadow-lg transition-all duration-500 hover:bg-white/10">
                            <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="min-w-[200px] text-left">
                                <Typewriter
                                    text="Future-ready from day one."
                                    delay={800}
                                    speed={70}
                                    cursorClassName="bg-zinc-400"
                                />
                            </span>
                        </Badge>
                    </div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold tracking-tight leading-[0.95] md:leading-[0.9] font-serif text-balance drop-shadow-2xl text-zinc-400/90 mix-blend-overlay w-full text-left"> {/* Greyish text with overlay blend */}
                        <div className="overflow-hidden py-2 block">
                            <SplitText>Lightning fast creation meets</SplitText>
                        </div>
                        <div className="overflow-hidden py-2 block">
                            <span className="text-zinc-500 italic block -ml-1 md:-ml-2"><SplitText>professional cinematic motion.</SplitText></span>
                        </div>
                    </h1>

                    <p className="hero-desc text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed tracking-wide font-light drop-shadow-md w-full text-left">
                        The ultimate platform for remix-based creation. Clone voices, upscale video, and generate code with a single command.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start justify-start gap-6 pt-6 w-full sm:w-auto">
                        <Button size="lg" className="hero-btn h-14 px-10 rounded-full text-base bg-zinc-200 text-zinc-900 hover:bg-white transition-all shadow-[0_0_30px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_-5px_rgba(255,255,255,0.5)] hover:scale-105 duration-300 w-full sm:w-auto" asChild>
                            <a href="/studio">
                                Start Creating
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                        <Button size="lg" variant="outline" className="hero-btn h-14 px-10 rounded-full text-base bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all hover:scale-105 duration-300 text-zinc-300 w-full sm:w-auto" asChild>
                            <a href="/community">
                                <Play className="mr-2 h-4 w-4" />
                                Showreel
                            </a>
                        </Button>
                    </div>

                </div>

                {/* Scroll Indicator */}
                <div className="hero-btn absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-pulse cursor-pointer z-10 hover:opacity-100 transition-opacity duration-300"
                    onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                    <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-zinc-500 to-transparent" />
                    <span className="text-[10px] uppercase tracking-[0.3em] font-light text-zinc-500">Scroll</span>
                </div>
            </div>
        </section>
    )
}
