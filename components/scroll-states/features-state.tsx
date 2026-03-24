"use client"

import { useRef, useEffect } from "react"
import { Layers, Cpu, Fingerprint, Scale } from "lucide-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Image from "next/image"
import { ASSET_BASE } from "@/lib/assets"

gsap.registerPlugin(ScrollTrigger)


const IMAGES = [
    { src: `${ASSET_BASE}/capabilities/capabilities1.png`, top: "-10%", left: "8%", size: "16rem", depth: 3.5, rotate: -4, blur: 0, z: 20 },
    { src: `${ASSET_BASE}/capabilities/capabilities2.png`, top: "5%", left: "78%", size: "20rem", depth: -2.5, rotate: 6, blur: 4, z: 5 },
    { src: `${ASSET_BASE}/capabilities/capabilities3.png`, top: "45%", left: "-5%", size: "22rem", depth: 4.0, rotate: 2, blur: 0, z: 30 },
    { src: `${ASSET_BASE}/capabilities/capabilities4.png`, top: "60%", left: "85%", size: "14rem", depth: 2.2, rotate: -8, blur: 1, z: 25 },
    { src: `${ASSET_BASE}/capabilities/capabilities5.png`, top: "20%", left: "22%", size: "10rem", depth: -3.5, rotate: 12, blur: 6, z: 2 },
    { src: `${ASSET_BASE}/capabilities/capabilities6.png`, top: "30%", left: "88%", size: "18rem", depth: 1.5, rotate: -3, blur: 2, z: 15 },
    { src: `${ASSET_BASE}/capabilities/capabilities7.png`, top: "75%", left: "12%", size: "12rem", depth: -1.8, rotate: -15, blur: 5, z: 4 },
    { src: `${ASSET_BASE}/capabilities/capabilities8.png`, top: "85%", left: "42%", size: "18rem", depth: 3.2, rotate: 5, blur: 0, z: 22 },
    { src: `${ASSET_BASE}/capabilities/capabilities9.png`, top: "-5%", left: "45%", size: "14rem", depth: 2.8, rotate: -6, blur: 0, z: 18 },
    { src: `${ASSET_BASE}/capabilities/capabilities10.png`, top: "95%", left: "75%", size: "11rem", depth: -2.5, rotate: 18, blur: 8, z: 1 },
    { src: `${ASSET_BASE}/capabilities/capabilities11.png`, top: "35%", left: "10%", size: "11rem", depth: 1.8, rotate: 4, blur: 3, z: 12 },
    { src: `${ASSET_BASE}/capabilities/capabilities12.png`, top: "15%", left: "55%", size: "9rem", depth: -4.0, rotate: -10, blur: 7, z: 0 },
    { src: `${ASSET_BASE}/capabilities/capabilities13.png`, top: "80%", left: "95%", size: "15rem", depth: 2.0, rotate: -5, blur: 2, z: 16 },
    { src: `${ASSET_BASE}/capabilities/capabilities14.png`, top: "50%", left: "70%", size: "13rem", depth: -1.5, rotate: 8, blur: 4, z: 6 },
]

const FEATURES = [
    {
        icon: Layers,
        title: "Remix Engine",
        description: "Build on community creations and iterate with one click. Experience the fluidity of creation without limits.",
    },
    {
        icon: Cpu,
        title: "Hybrid Routing",
        description: "Intelligent model selection for optimal quality and speed. Our engine anticipates and adapts to your workflow instantaneously.",
    },
    {
        icon: Fingerprint,
        title: "Ethical Core",
        description: "Consent-based generation anchored by identity-safe practices. Craft fearlessly, with security built into the foundation.",
    },
    {
        icon: Scale,
        title: "Fair Credits",
        description: "Transparent pricing powered by a flexible control system. Generate assets exactly tailored to fit your ultimate vision.",
    },
]

interface FeaturesStateProps {
    register: (cb: (progress: number, index: number) => void) => () => void
}

export function FeaturesState({ register }: FeaturesStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const imagesRef = useRef<(HTMLDivElement | null)[]>([])
    const textRef = useRef<(HTMLDivElement | null)[]>([])
    const dotsRef = useRef<(HTMLDivElement | null)[]>([])
    const glowRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const updateAnimation = (localProgress: number) => {
            
            IMAGES.forEach((img, i) => {
                const el = imagesRef.current[i]
                if (el) {
                    const progressNormalized = localProgress - 0.5 

                    
                    
                    const isMobile = window.innerWidth < 768
                    const moveMulti = isMobile ? 0.6 : 1

                    const yOffset = progressNormalized * img.depth * -500 * moveMulti
                    const xOffset = progressNormalized * img.depth * 80 * moveMulti

                    
                    if (isMobile) {
                        
                        const dynamicRotation = img.rotate + (progressNormalized * img.depth * 5)
                        const distFromCenter = Math.abs(progressNormalized)
                        const scaleEffect = img.depth > 0 ? 1 + (0.04 * (1 - distFromCenter * 2)) : 1

                        gsap.set(el, {
                            y: yOffset,
                            x: xOffset,
                            rotation: dynamicRotation,
                            scale: scaleEffect,
                            force3D: true
                        })
                    } else {
                        const dynamicRotation = img.rotate + (progressNormalized * img.depth * 15)
                        const distFromCenter = Math.abs(progressNormalized)
                        const scaleEffect = img.depth > 0 ? 1 + (0.1 * (1 - distFromCenter * 2)) : 1

                        gsap.set(el, {
                            y: yOffset,
                            x: xOffset,
                            rotation: dynamicRotation,
                            scale: scaleEffect,
                            force3D: true
                        })
                    }
                }
            })

            
            if (glowRef.current) {
                gsap.set(glowRef.current, {
                    
                    rotation: window.innerWidth < 768 ? 0 : localProgress * 180,
                    opacity: 0.3 + (Math.sin(localProgress * Math.PI) * 0.2)
                })
            }

            
            const itemsCount = FEATURES.length
            const progressPerItem = 1 / itemsCount

            FEATURES.forEach((_, i) => {
                const el = textRef.current[i]
                const dotEl = dotsRef.current[i]

                const itemProgressStart = i * progressPerItem
                const itemProgressEnd = (i + 1) * progressPerItem
                const center = (itemProgressStart + itemProgressEnd) / 2

                const distFromCenter = Math.abs(localProgress - center)
                const normalizedDist = distFromCenter / (progressPerItem / 2)

                let opacity = 0
                let yPos = 100 
                let scale = 0.90 
                let blur = 20 
                let isDotActive = false

                if (normalizedDist <= 1) {
                    const easeIn = 1 - Math.pow(normalizedDist, 3.5) 
                    opacity = easeIn

                    const direction = localProgress - center
                    const signedNormalized = direction / (progressPerItem / 2)

                    yPos = signedNormalized * -100
                    scale = 0.90 + (0.10 * easeIn)
                    blur = normalizedDist * 16 

                    if (easeIn > 0.85) isDotActive = true
                }

                
                if (localProgress <= itemProgressStart && i === 0) {
                    opacity = 1
                    yPos = 0
                    scale = 1
                    blur = 0
                    isDotActive = true
                }
                if (localProgress >= itemProgressEnd && i === itemsCount - 1) {
                    opacity = 1
                    yPos = 0
                    scale = 1
                    blur = 0
                    isDotActive = true
                }

                if (el) {
                    gsap.set(el, {
                        opacity: Math.max(0, Math.min(1, opacity)),
                        y: yPos,
                        scale: scale,
                        filter: `blur(${blur}px)`,
                        pointerEvents: opacity > 0.8 ? 'auto' : 'none'
                    })
                }

                if (dotEl) {
                    gsap.set(dotEl, {
                        backgroundColor: isDotActive ? '#09090b' : '#e4e4e7', 
                        scale: isDotActive ? 1.3 : 1
                    })
                }
            })
        }

        
        updateAnimation(0)

        
        const unregister = register((globalProgress, index) => {
            if (window.innerWidth >= 768) {
                const TOTAL = 4
                const start = 1 / TOTAL
                const end = 2 / TOTAL
                const slice = 1 / TOTAL

                let localProgress = 0
                if (globalProgress < start) localProgress = 0
                else if (globalProgress > end) localProgress = 1
                else localProgress = (globalProgress - start) / slice

                updateAnimation(localProgress)
            }
        })

        
        const ctx = gsap.context(() => {
            ScrollTrigger.matchMedia({
                "(max-width: 767px)": () => {
                    ScrollTrigger.create({
                        trigger: containerRef.current,
                        start: "top top",
                        end: "+=400%", 
                        pin: true,
                        scrub: 1.5, 
                        onUpdate: (self) => {
                            updateAnimation(self.progress)
                        }
                    })
                }
            })
        }, containerRef)

        return () => {
            unregister && unregister()
            ctx.revert()
        }
    }, [register])

    return (
        <section ref={containerRef} className="md:absolute md:inset-0 relative w-full h-auto min-h-[100svh] flex flex-col items-center justify-center overflow-hidden bg-white origin-center no-scrollbar">

            {}
            <div className="absolute inset-0 z-0 pointer-events-none w-full h-full overflow-hidden">
                {}
                <div
                    className="absolute inset-0 opacity-[0.015] mix-blend-multiply z-10"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
                />

                {}
                <div className="absolute inset-0 w-full h-full origin-center scale-[0.6] sm:scale-[0.8] md:scale-100 pointer-events-none">
                    {IMAGES.map((img, i) => (
                        <div
                            key={i}
                            ref={el => { imagesRef.current[i] = el }}
                            className="absolute will-change-[transform,filter]"
                            style={{
                                top: img.top,
                                left: img.left,
                                width: img.size,
                                height: img.size,
                                zIndex: img.z,
                                filter: img.blur > 0 ? `blur(${img.blur}px)` : 'drop-shadow(0 30px 40px rgba(0,0,0,0.06)) drop-shadow(0 15px 20px rgba(0,0,0,0.03))',
                            }}
                        >
                            {}
                            <Image
                                src={img.src}
                                alt={`Capability visual ${i}`}
                                fill
                                sizes="(max-width: 768px) 40vw, 25vw"
                                priority={i < 5}
                                className="object-cover"
                                style={{
                                    borderRadius: '2.5rem', 
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    WebkitMaskImage: '-webkit-radial-gradient(white, black)', 
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {}
            {}
            <div className="relative z-30 w-[95%] md:w-[85%] max-w-6xl h-[70vh] md:h-[60vh] rounded-[3.5rem] bg-white/30 backdrop-blur-[30px] md:backdrop-blur-[80px] border border-white/60 shadow-xl md:shadow-[0_8px_32px_rgba(0,0,0,0.02),0_1px_3px_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(255,255,255,0.4)] flex flex-col items-center justify-center text-center overflow-hidden">

                {}
                <div
                    ref={glowRef}
                    className="absolute inset-0 z-0 overflow-hidden pointer-events-none w-[150%] h-[150%] -top-[25%] -left-[25%] flex items-center justify-center origin-center transition-opacity duration-1000"
                >
                    {}
                    <div className="w-[1000px] h-[1000px] bg-[radial-gradient(circle_at_center,rgba(250,250,255,0.9)_0%,rgba(255,255,255,0)_60%)] rotate-45 scale-y-50 blur-[15px]" />
                </div>

                {}
                <div className="absolute inset-0 rounded-[3.5rem] ring-1 ring-inset ring-white/50 pointer-events-none z-10" />

                {}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20">
                    <div className="flex items-center gap-2 group cursor-default">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 shadow-[0_0_15px_rgba(0,0,0,0.3)] ring-1 ring-zinc-950/20" />
                        <span className="uppercase tracking-[0.3em] text-[10px] font-bold text-zinc-600">
                            The Paradigm
                        </span>
                    </div>
                </div>

                {}
                <div className="relative z-20 w-full h-full flex items-center justify-center px-6 md:px-24">
                    {FEATURES.map((feature, i) => {
                        const Icon = feature.icon
                        return (
                            <div
                                key={i}
                                ref={el => { textRef.current[i] = el }}
                                className="absolute inset-x-8 md:inset-x-24 top-0 bottom-0 flex flex-col items-center justify-center will-change-[transform,opacity,filter]"
                            >
                                <div className="p-4 bg-white shadow-[0_8px_16px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)] rounded-[1.3rem] mb-8 text-zinc-950 border border-zinc-100/50">
                                    <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={2} />
                                </div>
                                <h3 className="text-5xl md:text-7xl font-sans font-semibold tracking-[-0.03em] text-zinc-950 leading-[1.05] mb-6 drop-shadow-[0_2px_40px_rgba(255,255,255,0.8)]">
                                    {feature.title}.
                                </h3>
                                <p className="text-lg md:text-2xl text-zinc-500 font-medium max-w-2xl mx-auto leading-[1.65] tracking-tight">
                                    {feature.description}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                    {FEATURES.map((_, i) => (
                        <div
                            key={i}
                            ref={el => { dotsRef.current[i] = el }}
                            className={`w-1.5 h-1.5 rounded-full ring-1 ring-white shadow-sm transition-all duration-300`}
                            id={`feature-dot-${i}`}
                        />
                    ))}
                </div>
            </div>

        </section>
    )
}
