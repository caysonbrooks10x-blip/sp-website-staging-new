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
            
            mm.add("(min-width: 768px)", () => {
                if (sectionRef.current && contentRef.current) {
                    ScrollTrigger.create({
                        trigger: sectionRef.current,
                        start: "bottom bottom",
                        end: "+=100%",
                        pin: true,
                        pinSpacing: false, 
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

            
            mm.add("(max-width: 767px)", () => {
                
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
            className="py-24 relative z-40 min-h-screen flex flex-col justify-center overflow-hidden"
            style={{ background: '#e8e6f8', isolation: 'isolate' }}
        >
            {/* SVG filter — feTurbulence + feDisplacementMap creates organic liquid blob edges */}
            <svg className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
                <defs>
                    <filter id="lg-blob-morph" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
                        <feTurbulence type="fractalNoise" baseFrequency="0.009 0.006" numOctaves="4" seed="7" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="55" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                        <feGaussianBlur in="displaced" stdDeviation="1" />
                    </filter>
                </defs>
            </svg>

            {/* Liquid blob layer — SVG distortion makes edges organic/wavy */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ filter: 'url(#lg-blob-morph)' }}>
                <div className="absolute lg-blob-1 rounded-full" style={{ width: '60vw', height: '60vw', top: '-18%', left: '-8%',  background: 'rgba(139,92,246,0.72)', filter: 'blur(60px)' }} />
                <div className="absolute lg-blob-2 rounded-full" style={{ width: '50vw', height: '50vw', top: '5%',   right: '-10%', background: 'rgba(59,130,246,0.65)',  filter: 'blur(55px)' }} />
                <div className="absolute lg-blob-3 rounded-full" style={{ width: '55vw', height: '55vw', bottom: '-8%', left: '18%',  background: 'rgba(236,72,153,0.58)',  filter: 'blur(65px)' }} />
                <div className="absolute lg-blob-4 rounded-full" style={{ width: '38vw', height: '38vw', top: '42%',  left: '38%',  background: 'rgba(16,185,129,0.50)',  filter: 'blur(50px)' }} />
                <div className="absolute lg-blob-5 rounded-full" style={{ width: '32vw', height: '32vw', bottom: '8%', right: '8%',   background: 'rgba(245,158,11,0.45)',  filter: 'blur(55px)' }} />
            </div>

            {/* CSS blob drift animations */}
            <style>{`
                @keyframes lg-drift-1 { 0%,100%{transform:translate(0,0) scale(1)}    40%{transform:translate(3%,5%) scale(1.06)}  70%{transform:translate(-2%,2%) scale(0.96)} }
                @keyframes lg-drift-2 { 0%,100%{transform:translate(0,0) scale(1)}    35%{transform:translate(-4%,3%) scale(1.04)} 65%{transform:translate(3%,-4%) scale(1.08)} }
                @keyframes lg-drift-3 { 0%,100%{transform:translate(0,0) scale(1)}    45%{transform:translate(2%,-4%) scale(1.05)} 75%{transform:translate(-3%,3%) scale(0.95)} }
                @keyframes lg-drift-4 { 0%,100%{transform:translate(0,0) scale(1)}    50%{transform:translate(-3%,-3%) scale(1.07)} }
                @keyframes lg-drift-5 { 0%,100%{transform:translate(0,0) scale(1)}    30%{transform:translate(4%,2%) scale(0.94)}  70%{transform:translate(-2%,-2%) scale(1.05)} }
                .lg-blob-1{animation:lg-drift-1 14s ease-in-out infinite}
                .lg-blob-2{animation:lg-drift-2 17s ease-in-out infinite}
                .lg-blob-3{animation:lg-drift-3 12s ease-in-out infinite}
                .lg-blob-4{animation:lg-drift-4 15s ease-in-out infinite}
                .lg-blob-5{animation:lg-drift-5 11s ease-in-out infinite}
            `}</style>

            {/* Frosted glass surface — heavy blur + saturate punches colours through */}
            <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: 'blur(55px) saturate(190%) brightness(1.06)', WebkitBackdropFilter: 'blur(55px) saturate(190%) brightness(1.06)', background: 'rgba(255,255,255,0.22)' }} />

            {/* Specular highlight — simulates light source top-left */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 50% at 20% 10%, rgba(255,255,255,0.40) 0%, transparent 55%)' }} />

            {/* Glass surface diagonal sheen */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 45%, rgba(255,255,255,0.08) 100%)' }} />

            {/* Rim highlights — top & left edge */}
            <div className="absolute inset-x-0 top-0 h-[1.5px] pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 35%, rgba(255,255,255,0.95) 65%, transparent 95%)' }} />
            <div className="absolute inset-y-0 left-0 w-[1.5px] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 60%)' }} />

            <div
                ref={contentRef}
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full flex flex-col justify-center"
            >
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-20">
                    <div className="flex flex-col gap-4">
                        <TypewriterText
                            text="Studio Collective"
                            className="text-3xl md:text-5xl font-bold font-sans text-zinc-900 tracking-tighter"
                            cursor={false}
                        />
                        <TypewriterText
                            text="Unlock cinematic blueprints from a world of visual intelligence."
                            className="text-zinc-500 text-lg font-sans tracking-wide max-w-2xl"
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
