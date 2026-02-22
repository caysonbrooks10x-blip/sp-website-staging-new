"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { UnifiedCard } from "@/components/unified-card"
import { TypewriterText } from "@/components/typewriter-text"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { communityPosts } from "@/lib/community-data"
import Image from "next/image"
import Link from "next/link"

export function CommunitySection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Force refresh to handle dynamic layout of grid
        setTimeout(() => ScrollTrigger.refresh(), 100)

        const mm = gsap.matchMedia()

        const ctx = gsap.context(() => {
            // Intro Animation - Runs on all devices
            gsap.from(".community-card", {
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 75%",
                    end: "bottom 25%",
                    toggleActions: "play none none reverse",
                },
                y: 50,
                opacity: 0,
                duration: 1.2,
                stagger: 0.05,
                ease: "power3.out"
            })

            // Desktop Specifics - Pinning & Parallax
            mm.add("(min-width: 768px)", () => {
                // Pinning: Wait until bottom of section hits bottom of viewport (allows full scroll)
                ScrollTrigger.create({
                    trigger: sectionRef.current,
                    start: "bottom bottom",
                    end: "+=100%", // Pin for 1 screen height while next section overlaps
                    pin: true,
                    pinSpacing: false, // Essential for stacking: next section slides over
                    anticipatePin: 1,
                    id: "community-pin"
                })

                // Parallax exit - Smoother & less aggressive
                gsap.to(contentRef.current, {
                    y: -50,
                    scale: 0.95,
                    opacity: 0.5,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "bottom bottom",
                        end: "+=100%", // Sync with pin duration
                        scrub: true,
                    }
                })
            })
        }, sectionRef)

        return () => {
            ctx.revert()
            mm.revert()
        }
    }, [])

    return (
        <section ref={sectionRef} className="py-12 md:py-20 bg-background relative z-40 min-h-screen flex flex-col justify-center overflow-hidden border-t border-border/10 will-change-transform">
            {/* Artistic Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-background to-background pointer-events-none" />

            <div ref={contentRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full mb-10">
                <div className="text-center mb-10 space-y-4">
                    <div className="inline-block">
                        <TypewriterText
                            text="Made with StudioX"
                            className="text-4xl md:text-6xl font-bold font-serif tracking-tighter"
                            cursor={false}
                        />
                    </div>
                    <div className="h-6 md:h-8">
                        <TypewriterText
                            text="Explore the latest masterpieces from our community."
                            className="text-lg text-muted-foreground max-w-2xl mx-auto font-light"
                            delay={1.0}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-4 mb-10">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                        const stylePrompts = [
                            "A beautiful surreal photography of a dreamscape, highly detailed, 8k resolution, cinematic lighting",
                            "A gorgeous landscape painting with vibrant colors, oil on canvas, masterpiece, extreme detail",
                            "A hyper-realistic portrait of a futuristic cyborg, neon lighting, cyberpunk aesthetic, 85mm lens",
                            "A vast ancient alien city made of crystal, floating in the clouds, ethereal lighting, concept art",
                            "A minimalist design of a modern home interior, very clean, architectural digest, photorealistic",
                            "An epic dramatic shot of a mountain peak during a thunder storm, striking lightning, 4k",
                            "A cozy lo-fi bedroom at night, raining outside, warm lamplight, anime style illustration",
                            "A macro shot of a complex biomechanical watch with glowing gears, luxury, extreme detail"
                        ];
                        const prompt = stylePrompts[(i - 1) % stylePrompts.length];
                        const previewUrl = `https://picsum.photos/seed/${i + 100}/800/1000`;

                        return (
                            <div key={i} className={`${i % 2 === 0 ? 'md:translate-y-8' : ''}`}>
                                <div className="community-card h-full">
                                    <UnifiedCard className="aspect-[4/5] overflow-hidden group relative border-0 bg-secondary/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />

                                        {/* Artistic Placeholder */}
                                        <div className="absolute inset-0 flex items-center justify-center text-accent/20 group-hover:scale-110 transition-transform duration-1000">
                                            <div className="w-full h-full bg-cover bg-center transition-all duration-700 grayscale group-hover:grayscale-0"
                                                style={{
                                                    backgroundImage: `url(${previewUrl})`,
                                                    backgroundColor: `hsl(var(--accent) / ${0.1 + (i * 0.05)})`
                                                }}
                                            />
                                        </div>

                                        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 z-20 px-4 text-center">
                                            <span className="text-white text-xs font-medium tracking-widest uppercase mb-2 truncate w-full px-2">Remix ID #{2040 + i}</span>
                                            <Link href={`/studio?mode=image&prompt=${encodeURIComponent(prompt)}&previewUrl=${encodeURIComponent(previewUrl)}`} className="w-full">
                                                <Button size="sm" variant="outline" className="rounded-full px-6 border-white/20 bg-white/10 text-white hover:bg-white hover:text-black backdrop-blur-md w-full">
                                                    Remix Art
                                                </Button>
                                            </Link>
                                        </div>
                                    </UnifiedCard>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="text-center pt-8">
                    <Button size="lg" variant="ghost" className="rounded-full px-12 h-14 text-base border border-foreground/10 hover:bg-foreground hover:text-background transition-all duration-500 uppercase tracking-widest" asChild>
                        <a href="/community">View All Creations</a>
                    </Button>
                </div>
            </div>
        </section>
    )
}
