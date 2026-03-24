"use client"

import { useRef, useEffect, useState } from "react"
import { gsap } from "gsap"
import { Badge } from "@/components/ui/badge"
import { ASSET_BASE } from "@/lib/assets"

interface WorkflowStateProps {
    register: (cb: (progress: number, index: number) => void) => () => void
}


const IMAGE_COUNT = 25
const IMAGE_SIZES = [
    { width: 80, height: 80, label: 'small' },
    { width: 120, height: 120, label: 'medium' },
    { width: 160, height: 160, label: 'large' },
]

export function WorkflowState({ register }: WorkflowStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const imagesRef = useRef<(HTMLImageElement | null)[]>([])
    const textContentRef = useRef<HTMLDivElement>(null)
    const cursorRef = useRef({ x: 0, y: 0 })
    const requestIdRef = useRef<number | null>(null)

    
    const [mounted, setMounted] = useState(false)
    const [images, setImages] = useState<ImageConfig[]>([])

    
    useEffect(() => {
        setMounted(true)

        
        const imgs: ImageConfig[] = []
        for (let i = 1; i <= IMAGE_COUNT; i++) {
            
            const size = IMAGE_SIZES[Math.floor(Math.random() * IMAGE_SIZES.length)]

            
            let x, y
            let valid = false
            while (!valid) {
                x = Math.random() * 100 
                y = Math.random() * 100 

                
                const inCenterX = x > 30 && x < 70
                const inCenterY = y > 35 && y < 65

                if (!inCenterX || !inCenterY) {
                    valid = true
                }
            }

            
            const depth = 0.5 + Math.random()

            imgs.push({
                id: i,
                src: `${ASSET_BASE}/seamless-animate/bg${i}.jpg`,
                width: size.width,
                height: size.height,
                left: `${x}%`,
                top: `${y}%`,
                depth,
                floatDuration: 6 + Math.random() * 6,
                floatDelay: Math.random() * -10,
            })
        }
        setImages(imgs)
    }, [])

    useEffect(() => {
        if (!mounted || images.length === 0) return

        
        const handleMouseMove = (e: MouseEvent) => {
            
            cursorRef.current = {
                x: (e.clientX / window.innerWidth) * 2 - 1,
                y: (e.clientY / window.innerHeight) * 2 - 1
            }
        }
        window.addEventListener("mousemove", handleMouseMove)

        
        const update = () => {
            if (!containerRef.current) return

            const cursorXTarget = cursorRef.current.x
            const cursorYTarget = cursorRef.current.y

            imagesRef.current.forEach((img, i) => {
                if (!img || !images[i]) return

                const depth = images[i].depth

                
                const cursorX = cursorXTarget * 15 * depth
                const cursorY = cursorYTarget * 15 * depth

                
                const scrollY = images[i].scrollY || 0

                
                const currentX = gsap.getProperty(img, "x") as number || 0
                const currentY = gsap.getProperty(img, "y") as number || 0

                
                const targetFinalY = scrollY + cursorY

                
                const nextX = currentX + (cursorX - currentX) * 0.1
                const nextY = currentY + (targetFinalY - currentY) * 0.1

                gsap.set(img, { x: nextX, y: nextY })
            })

            requestIdRef.current = requestAnimationFrame(update)
        }
        update()

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            if (requestIdRef.current) cancelAnimationFrame(requestIdRef.current)
        }
    }, [mounted, images])


    useEffect(() => {
        if (!mounted || images.length === 0) return

        
        const ctx = gsap.context(() => {

            
            gsap.fromTo(imagesRef.current,
                { opacity: 0, scale: 0.95, y: 20 },
                {
                    opacity: 0.85,
                    scale: 1,
                    y: 0,
                    duration: 1.2,
                    stagger: { amount: 0.8, from: "random" },
                    ease: "power3.out"
                }
            )

            
            imagesRef.current.forEach((img, i) => {
                if (!img || !images[i]) return
                const data = images[i]

                const rot = 2 + Math.random() * 2

                gsap.to(img, {
                    yPercent: Math.random() > 0.5 ? 15 : -15,
                    xPercent: Math.random() > 0.5 ? 5 : -5,
                    rotation: Math.random() > 0.5 ? rot : -rot,
                    duration: data.floatDuration,
                    delay: data.floatDelay,
                    ease: "sine.inOut",
                    repeat: -1,
                    yoyo: true
                })
            })

        }, containerRef)

        
        const unregister = register((globalProgress, index) => {
            
            
            
            
            

            
            
            
            
            
            

            
            
            
            

            
            

            
            

            
            
            const p = globalProgress * 10

            
            imagesRef.current.forEach((img, i) => {
                if (!img || !images[i]) return
                const depth = images[i].depth

                
                const dist = (p * 50 * depth) 

                
                
                images[i].scrollY = -dist
            })

            
            
            if (index > 2) { 
                gsap.to(containerRef.current, { scale: 0.96, duration: 0.5, overwrite: true })
            } else {
                gsap.to(containerRef.current, { scale: 1, duration: 0.5, overwrite: true })
            }
        })

        return () => {
            ctx.revert()
            unregister()
        }
    }, [register, mounted, images])

    return (
        <section ref={containerRef} className="md:absolute md:inset-0 relative w-full h-auto min-h-[100svh] overflow-hidden bg-white">

            {}
            {mounted && (
                <div className="absolute inset-0 pointer-events-none">
                    {images.map((img, i) => (
                        <img
                            key={img.id}
                            ref={(el) => { imagesRef.current[i] = el }}
                            src={img.src}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="absolute rounded-[14px] object-cover will-change-transform shadow-[0_10px_30px_rgba(0,0,0,0.08)] bg-gray-100"
                            style={{
                                width: img.width,
                                height: img.height,
                                left: img.left,
                                top: img.top,
                                zIndex: Math.floor(img.depth * 10),
                                opacity: 0 
                            }}
                        />
                    ))}
                </div>
            )}

            {}
            <div
                ref={textContentRef}
                className="absolute inset-0 flex flex-col items-center justify-center z-50 text-center pointer-events-none px-4"
            >
                <div className="space-y-6 max-w-2xl backdrop-blur-sm bg-white/30 p-8 rounded-2xl border border-white/20 shadow-sm">
                    <Badge variant="outline" className="border-black/10 text-black/60 px-3 py-1 bg-white/50 backdrop-blur-md rounded-full tracking-widest text-[10px] uppercase mb-4">
                        Seamless Creations
                    </Badge>
                    <h2 className="text-5xl md:text-7xl font-serif text-black tracking-tight leading-tight">
                        Craft without <br /> limits.
                    </h2>
                    <p className="text-lg md:text-xl text-black/60 font-light leading-relaxed max-w-lg mx-auto">
                        Experience the fluidity of creation. Our engine adapts to your workflow, generating assets that fit perfectly into your vision.
                    </p>
                </div>
            </div>

        </section>
    )
}

interface ImageConfig {
    id: number
    src: string
    width: number
    height: number
    left: string
    top: string
    depth: number
    floatDuration: number
    floatDelay: number
    scrollY?: number
}
