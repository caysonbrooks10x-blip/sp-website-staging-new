"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"

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

// Visual definitions for each state background
const ENVIRONMENTS = [
    {
        id: "hero",
        background: "#ffffff",
        opacity: 1
    },
    {
        id: "features",
        video: "/features-bg.mp4",
        opacity: 0.5
    },
    {
        id: "create",
        // Teal / Cyan -> Richer, darker base
        background: `
            radial-gradient(1200px circle at 50% 70%, rgba(20, 184, 166, 0.15), transparent 60%),
            linear-gradient(to bottom, #000000 0%, #020617 100%)
        `,
        opacity: 1
    },
    {
        id: "refine",
        // Rose / Magenta -> More vibrant
        background: `
            radial-gradient(1200px circle at 50% 70%, rgba(225, 29, 72, 0.15), transparent 60%),
            linear-gradient(to bottom, #000000 0%, #0f0505 100%)
        `,
        opacity: 1
    },
    {
        id: "publish",
        // Indigo / Violet -> Deep cosmic
        background: `
            radial-gradient(1200px circle at 50% 70%, rgba(124, 58, 237, 0.18), transparent 60%),
            linear-gradient(to bottom, #000000 0%, #0b0217 100%)
        `,
        opacity: 1
    },
    {
        id: "scale",
        // Blue / Sky -> Infinite expansion
        background: `
            radial-gradient(1400px circle at 50% 80%, rgba(56, 189, 248, 0.15), transparent 60%),
            linear-gradient(to bottom, #000000 0%, #020817 100%)
        `,
        opacity: 1
    },
    {
        id: "workflow",
        image: "/howitworks-bg.jpg",
        opacity: 0.4
    },

    {
        id: "carousel",
        // Solid black fallback, Vanta handles the visuals
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
        image: "/cta.jpg",
        opacity: 0.6
    }
]

// We need to access children methods (play/pause) so we'll forward refs or use a command pattern.
// Since we are inside the same file, we can just manage the refs array in the parent and pass it down?
// Or we can just perform DOM queries? No, refs are better.
// Let's make BackgroundLayer expose an API or just use a simpler ref pattern.

export function BackgroundSystem({ register }: BackgroundSystemProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const parallaxRef = useRef<HTMLDivElement>(null)
    const stateRefs = useRef<(HTMLDivElement | null)[]>([])
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

    // Track current state to detect changes
    const currentStateRef = useRef<number>(0)

    // GSAP QuickSetters for high-performance mouse tracking
    const xTo = useRef<gsap.QuickToFunc | null>(null)
    const yTo = useRef<gsap.QuickToFunc | null>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            if (parallaxRef.current) {
                xTo.current = gsap.quickTo(parallaxRef.current, "x", { duration: 0.8, ease: "power3" })
                yTo.current = gsap.quickTo(parallaxRef.current, "y", { duration: 0.8, ease: "power3" })
            }
        }, containerRef)

        const handleMouseMove = (e: MouseEvent) => {
            if (!xTo.current || !yTo.current) return

            const { innerWidth, innerHeight } = window
            const x = (e.clientX / innerWidth - 0.5) * -50 // Move opposite to mouse, range 50px
            const y = (e.clientY / innerHeight - 0.5) * -50

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

            // 1. Parallax (Vertical Depth)
            if (parallaxRef.current) {
                // Direct translate is faster than GSAP .to() in a loop if we are careful,
                // but GSAP handles the transform string construction nicely.
                // using quickSetter or just .set is good.
                // Stronger Parallax for "Breathtaking" depth
                gsap.set(parallaxRef.current, {
                    yPercent: -25 * globalProgress
                })
            }

            // 2. State Switching
            if (currentIndex !== currentStateRef.current) {
                // State changed!
                const prevIndex = currentStateRef.current
                currentStateRef.current = currentIndex

                // Animate Out Previous
                const prevEl = stateRefs.current[prevIndex]
                if (prevEl) {
                    gsap.to(prevEl, { opacity: 0, duration: 1.5, ease: "power2.inOut" })
                    // Pause video if exists
                    const prevVid = videoRefs.current[prevIndex]
                    if (prevVid) prevVid.pause()
                }

                // Animate In New
                const nextEl = stateRefs.current[currentIndex]
                if (nextEl) {
                    gsap.to(nextEl, { opacity: 1, duration: 1.5, ease: "power2.inOut" })
                    // Play video if exists
                    const nextVid = videoRefs.current[currentIndex]
                    if (nextVid) nextVid.play().catch(() => { })
                }
            }
        })

        return () => unregister && unregister()
    }, [register])

    // Initial setup to ensure correct state is visible on mount
    useEffect(() => {
        // Hide all except current (0)
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
            {/* Parallax Container */}
            <div ref={parallaxRef} className="absolute inset-0 w-full h-full scale-125 will-change-transform">
                {ENVIRONMENTS.map((env, index) => (
                    <div
                        key={index}
                        ref={(el) => { stateRefs.current[index] = el }}
                        className="absolute inset-0 w-full h-full"
                        style={{
                            background: env.background || '#000000',
                            opacity: index === 0 ? 1 : 0 // Initial CSS state
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

                        {/* Gradient Overlay for text readability */}
                        <div className="absolute inset-0 bg-black/20" />

                        {/* Optional: Add subtle noise or grain overlay here that persists - REMOVED due to 404 */}
                    </div>
                ))}
            </div>

            {/* Global Ambient Glow - REMOVED */}
        </div>
    )
}
