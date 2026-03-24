"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ASSET_BASE } from "@/lib/assets"

interface BackgroundSystemProps {
    register: (cb: (progress: number, index: number) => void) => () => void
}

interface EnvironmentConfig {
    id: string
    video?: string
    image?: string
    background?: string
    opacity: number
}


const ENVIRONMENTS = [
    {
        id: "hero",
        background: "linear-gradient(135deg, #2d3a2e 0%, #4a5d3a 18%, #7a8a5a 35%, #c8b88a 55%, #e8c8a0 70%, #f0b8a0 85%, #e8a8a0 100%)",
        opacity: 1
    },
    {
        id: "features",
        video: `${ASSET_BASE}/features-bg.mp4`,
        opacity: 0.5
    },
    {
        id: "refine",
        
        background: `
            radial-gradient(1200px circle at 50% 70%, rgba(225, 29, 72, 0.15), transparent 60%),
            linear-gradient(to bottom, #000000 0%, #0f0505 100%)
        `,
        opacity: 1
    },
    {
        id: "create",
        
        background: `
            radial-gradient(1200px circle at 50% 70%, rgba(20, 184, 166, 0.15), transparent 60%),
            linear-gradient(to bottom, #000000 0%, #020617 100%)
        `,
        opacity: 1
    },
    {
        id: "publish",
        
        background: `
            radial-gradient(1200px circle at 50% 70%, rgba(124, 58, 237, 0.18), transparent 60%),
            linear-gradient(to bottom, #000000 0%, #0b0217 100%)
        `,
        opacity: 1
    },
    {
        id: "scale",
        
        background: `
            radial-gradient(1400px circle at 50% 80%, rgba(56, 189, 248, 0.15), transparent 60%),
            linear-gradient(to bottom, #000000 0%, #020817 100%)
        `,
        opacity: 1
    },
    {
        id: "workflow",
        image: `${ASSET_BASE}/howitworks-bg.jpg`,
        opacity: 0.4
    },

    {
        id: "carousel",
        
        background: "#000000",
        opacity: 1
    },
    {
        id: "marketplace",
        background: "linear-gradient(135deg, #020617 0%, #000000 100%)",
        opacity: 1
    },
    {
        id: "community",
        background: "radial-gradient(circle at 20% 80%, #1c1917 0%, #000000 70%)",
        opacity: 1
    },
    {
        id: "cta",
        image: `${ASSET_BASE}/cta.jpg`,
        opacity: 0.6
    }
]






export function BackgroundSystem({ register }: BackgroundSystemProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const parallaxRef = useRef<HTMLDivElement>(null)
    const stateRefs = useRef<(HTMLDivElement | null)[]>([])
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

    
    const currentStateRef = useRef<number>(0)

    
    const xTo = useRef<gsap.QuickToFunc | null>(null)
    const yTo = useRef<gsap.QuickToFunc | null>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            if (parallaxRef.current) {
                xTo.current = gsap.quickTo(parallaxRef.current, "x", { duration: 1.2, ease: "power2.out" })
                yTo.current = gsap.quickTo(parallaxRef.current, "y", { duration: 1.2, ease: "power2.out" })
            }
        }, containerRef)

        const handleMouseMove = (e: MouseEvent) => {
            if (!xTo.current || !yTo.current) return

            const { innerWidth, innerHeight } = window
            const x = (e.clientX / innerWidth - 0.5) * -30 
            const y = (e.clientY / innerHeight - 0.5) * -30

            xTo.current(x)
            yTo.current(y)
        }

        window.addEventListener("mousemove", handleMouseMove)

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            ctx.revert()
        }
    }, [])

    useEffect(() => {
        const unregister = register((globalProgress, currentIndex) => {
            
            
            if (parallaxRef.current) {
                const drift = globalProgress * 100 
                gsap.set(parallaxRef.current, { y: -drift })
            }

            
            if (currentIndex !== currentStateRef.current) {
                
                const prevIndex = currentStateRef.current
                currentStateRef.current = currentIndex

                
                const prevEl = stateRefs.current[prevIndex]
                if (prevEl) {
                    gsap.to(prevEl, { opacity: 0, duration: 1.5, ease: "power2.inOut" })
                    
                    const prevVid = videoRefs.current[prevIndex]
                    if (prevVid) prevVid.pause()
                }

                
                const nextEl = stateRefs.current[currentIndex]
                if (nextEl) {
                    gsap.to(nextEl, { opacity: 1, duration: 1.5, ease: "power2.inOut" })
                    
                    const nextVid = videoRefs.current[currentIndex]
                    if (nextVid) nextVid.play().catch(() => { })
                }
            }
        })

        return () => unregister && unregister()
    }, [register])

    
    useEffect(() => {
        
        stateRefs.current.forEach((el, i) => {
            if (el) {
                gsap.set(el, { opacity: i === 0 ? 1 : 0 })
                if (i === 0 && videoRefs.current[i]) {
                    videoRefs.current[i]?.play().catch(() => { })
                }
            }
        })
    }, [])


    return (
        <div ref={containerRef} className="fixed inset-0 w-full h-full -z-50 pointer-events-none bg-background overflow-hidden">
            {}
            <div 
                ref={parallaxRef} 
                className="absolute inset-x-[-2%] -top-[2%] -bottom-[10%] w-[104%] h-[112%] will-change-transform"
            >
                {ENVIRONMENTS.map((env, index) => (
                    <div
                        key={index}
                        ref={(el) => { stateRefs.current[index] = el }}
                        className="absolute inset-0 w-full h-full"
                        style={{
                            background: env.background || '#000000',
                            opacity: index === 0 ? 1 : 0 
                        }}
                    >
                        {env.video && (
                            <video
                                ref={(el) => { videoRefs.current[index] = el }}
                                muted
                                loop
                                playsInline
                                preload="auto"
                                className="absolute inset-0 w-full h-full object-cover bg-black grayscale-[0.3]"
                                style={{ opacity: env.opacity }}
                            >
                                <source src={env.video} type="video/mp4" />
                            </video>
                        )}

                        {env.image && (
                            <div
                                className="absolute inset-0 w-full h-full bg-cover bg-center grayscale-[0.3]"
                                style={{
                                    backgroundImage: `url(${env.image})`,
                                    opacity: env.opacity
                                }}
                            />
                        )}

                        {}
                        <div className="absolute inset-0 bg-black/20" />

                        {}
                    </div>
                ))}
            </div>

            {}
        </div>
    )
}
