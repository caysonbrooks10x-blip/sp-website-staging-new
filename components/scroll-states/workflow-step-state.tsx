"use client"

import { useRef, useEffect, useState } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Typewriter } from "@/components/ui/typewriter"

gsap.registerPlugin(ScrollTrigger)

interface WorkflowStepStateProps {
    register: (cb: (progress: number, index: number) => void) => () => void
    stepIndex: number
    totalSteps?: number
    title: string
    description: string
    semicircleColor?: string
}

export function WorkflowStepState({ 
    register, 
    stepIndex, 
    totalSteps = 4,
    title, 
    description, 
    semicircleColor = "rgba(100,100,255,0.15)" 
}: WorkflowStepStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    const descRef = useRef<HTMLParagraphElement>(null)
    const semicircleRef = useRef<HTMLDivElement>(null)
    const textContainerRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)

    
    const targetRef = useRef({ x: 0, y: 0 })
    const currentRef = useRef({ x: 0, y: 0 })
    const rafIdRef = useRef<number | null>(null)

    const [startTypewriter, setStartTypewriter] = useState(false)

    
    

    
    useEffect(() => {
        
        if (typeof window !== 'undefined') {
            targetRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
            currentRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return
            
            targetRef.current = { x: e.clientX, y: e.clientY }
        }

        window.addEventListener("mousemove", handleMouseMove)

        const loop = () => {
            
            
            
            
            currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.1
            currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.1

            const x = currentRef.current.x
            const y = currentRef.current.y

            
            if (semicircleRef.current) {
                const centerX = window.innerWidth / 2
                const centerY = window.innerHeight / 2
                const deltaX = (x - centerX) * 0.15
                const deltaY = (y - centerY) * 0.15

                semicircleRef.current.style.setProperty('--cursor-x', `${deltaX}px`)
                semicircleRef.current.style.setProperty('--cursor-y', `${deltaY}px`)
            }

            rafIdRef.current = requestAnimationFrame(loop)
        }
        loop()

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
        }
    }, [semicircleColor])


    
    useEffect(() => {
        const mm = gsap.matchMedia()

        
        const ctx = gsap.context(() => {
            const targets = [titleRef.current, descRef.current].filter((el) => el !== null) as HTMLElement[]

            
            mm.add("(min-width: 768px)", () => {
                if (targets.length > 0) {
                    gsap.set(targets, {
                        opacity: 0,
                        y: 60,
                        filter: "blur(12px)",
                        scale: 0.94
                    })
                }

                
                if (semicircleRef.current) {
                    gsap.set(semicircleRef.current, {
                        scale: 0.96,
                        yPercent: 20
                    })
                }
            })

            
            mm.add("(max-width: 767px)", () => {
                if (targets.length > 0) {
                    gsap.from(targets, {
                        scrollTrigger: {
                            trigger: containerRef.current,
                            start: "top 75%",
                            onEnter: () => setStartTypewriter(true),
                            onEnterBack: () => setStartTypewriter(true)
                        },
                        opacity: 0,
                        y: 40,
                        filter: "blur(5px)",
                        stagger: 0.2,
                        duration: 1.2,
                        ease: "power2.out"
                    })
                }
            })

        }, containerRef)

        
        
        
        const unregister = register((globalProgress, currentIndex) => {
            
            const TOTAL = totalSteps
            const start = stepIndex / TOTAL
            const end = (stepIndex + 1) / TOTAL
            const duration = end - start
            const localProgress = (globalProgress - start) / duration

            
            if (localProgress > 0.05 && !startTypewriter) {
                setStartTypewriter(true)
            }

            
            if (localProgress < -0.1) {
                
                const targets = [titleRef.current, descRef.current].filter((el) => el !== null) as HTMLElement[]
                if (targets.length > 0) {
                    gsap.killTweensOf(targets)
                    gsap.set(targets, { opacity: 0, y: 60, filter: "blur(12px)", scale: 0.94 })
                    setStartTypewriter(false)
                }

            } else if (localProgress >= 0) {
                
                const entryP = Math.min(1, localProgress / 0.2)

                
                const easedEntry = 1 - Math.pow(1 - entryP, 3) 

                
                const currentY = 60 * (1 - easedEntry) 
                const currentBlur = 12 * (1 - easedEntry) 
                const currentScale = 0.94 + (0.06 * easedEntry) 
                const currentOpacity = easedEntry

                
                
                const drift = Math.max(0, localProgress - 0.2) * 60 

                
                if (titleRef.current) {
                    gsap.set(titleRef.current, {
                        opacity: currentOpacity,
                        y: currentY - drift, 
                        filter: `blur(${currentBlur}px)`,
                        scale: currentScale
                    })
                }
                if (descRef.current) {
                    
                    gsap.set(descRef.current, {
                        opacity: currentOpacity,
                        y: currentY - (drift * 0.7),
                        filter: `blur(${currentBlur}px)`,
                        scale: currentScale
                    })
                }

                
                if (semicircleRef.current) {
                    
                    const scale = 0.5 + (localProgress * 1.5) 
                    const yPerc = 10 - (localProgress * 15) 
                    
                    
                    const isLast = stepIndex === TOTAL - 1
                    let opac
                    if (isLast && localProgress > 0.5) {
                        opac = 0.8 
                    } else {
                        opac = Math.sin(localProgress * Math.PI) * 0.8 
                    }

                    semicircleRef.current.style.setProperty('--scroll-scale', scale.toFixed(3))
                    semicircleRef.current.style.setProperty('--scroll-y', `${yPerc}%`)
                    semicircleRef.current.style.opacity = `${opac}`
                }
            }
        })

        return () => {
            ctx.revert()
            mm.revert()
            unregister()
        }
    }, [register, stepIndex])

    return (
        <section ref={containerRef} className="md:absolute md:inset-0 relative w-full h-auto min-h-[100svh] flex flex-col items-center justify-center overflow-hidden pointer-events-none bg-transparent">

            {}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div
                    ref={bgRef}
                    className="absolute inset-0 opacity-20 transition-colors duration-1000 ease-linear mix-blend-screen"
                />
            </div>

            {}
            <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                <div
                    ref={semicircleRef}
                    className="w-[50vw] h-[50vw] md:w-[30vw] md:h-[30vw] rounded-full blur-[100px] will-change-transform"
                    style={{
                        background: semicircleColor,
                        opacity: 0,
                        transform: `translate(var(--cursor-x, 0px), var(--cursor-y, 0px)) translateY(var(--scroll-y, 0%)) scale(var(--scroll-scale, 0.5))`
                    }}
                />
            </div>

            {}
            <div
                ref={textContainerRef}
                className="relative z-20 w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center gap-8"
            >
                <div className="overflow-hidden py-4">
                    <h2
                        ref={titleRef}
                        className="text-7xl md:text-8xl lg:text-[10rem] font-serif text-white tracking-tighter leading-none will-change-transform drop-shadow-2xl font-bold mix-blend-screen"
                    >
                        <Typewriter
                            text={title}
                            start={startTypewriter}
                            speed={50}
                            cursorClassName="hidden"
                        />
                    </h2>
                </div>

                <p
                    ref={descRef}
                    className="text-xl md:text-3xl text-zinc-300 font-light max-w-2xl leading-relaxed tracking-wide will-change-transform opacity-90 mt-4 md:mt-8"
                >
                    {description}
                </p>

                {}
                <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-30 mt-4" />
            </div>

        </section>
    )
}
