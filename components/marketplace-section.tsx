"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AppCard } from "@/components/app-card"
import { TypewriterText } from "@/components/typewriter-text"
import gsap from "gsap"
import ScrollTrigger from "gsap/ScrollTrigger"
import type { App } from "@/lib/types"


import { marketplaceApps } from "@/lib/apps"

const apps = marketplaceApps

export function MarketplaceSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        const mm = gsap.matchMedia()

        const ctx = gsap.context(() => {
            // Desktop Logic
            mm.add("(min-width: 768px)", () => {
                if (sectionRef.current && contentRef.current) {
                    ScrollTrigger.create({
                        trigger: sectionRef.current,
                        start: "bottom bottom",
                        end: "+=100%",
                        pin: true,
                        pinSpacing: false, // Page flap effect
                        scrub: true,
                    })

                    gsap.to(contentRef.current, {
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: "bottom bottom",
                            end: "bottom top",
                            scrub: true,
                        },
                        scale: 0.95,
                        opacity: 0.5,
                        ease: "power1.inOut",
                    })

                    gsap.to(".app-card-wrapper > div", {
                        y: i => (i % 2 === 0 ? -40 : 20),
                        ease: "none",
                        scrollTrigger: {
                            trigger: contentRef.current,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: 1.5,
                        },
                    })

                    // Desktop Entry
                    gsap.from(".app-card-wrapper", {
                        scrollTrigger: {
                            trigger: contentRef.current,
                            start: "top 60%",
                        },
                        y: 100,
                        opacity: 0,
                        duration: 1.2,
                        stagger: 0.1,
                        ease: "power3.out",
                    })
                }
            })

            // Mobile Logic
            mm.add("(max-width: 767px)", () => {
                // Simple fade up for cards
                gsap.from(".app-card-wrapper", {
                    scrollTrigger: {
                        trigger: contentRef.current,
                        start: "top 80%",
                    },
                    y: 30,
                    opacity: 0,
                    duration: 0.6,
                    stagger: 0.05,
                    ease: "power3.out",
                })
            })
        }, sectionRef)

        return () => {
            ctx.revert()
            mm.revert()
        }
    }, [])

    return (
        <section
            id="collective"
            ref={sectionRef}
            className="py-24 bg-zinc-950 relative z-40 min-h-screen flex flex-col justify-center overflow-hidden"
        >
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] opacity-30 mix-blend-screen" />
                <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] opacity-30 mix-blend-screen" />
            </div>

            <div
                ref={contentRef}
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full flex flex-col justify-center"
            >
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-20">
                    <div className="flex flex-col gap-4">
                        <TypewriterText
                            text="Collective"
                            className="text-3xl md:text-4xl font-bold font-sans text-white tracking-tighter"
                            cursor={false}
                        />
                        <TypewriterText
                            text="Explore masterpieces from the collective soul"
                            className="text-zinc-400 text-lg font-sans tracking-wide"
                            delay={0.5}
                            stagger={0.02}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {apps.map(app => (
                        <div key={app.id} className="app-card-wrapper h-[420px]">
                            <AppCard app={app} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
