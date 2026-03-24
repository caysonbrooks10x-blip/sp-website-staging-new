"use client"

import { useRef, useEffect } from "react"
import { gsap } from "gsap"
import { ArrowRight } from "lucide-react"

interface CTAStateProps {
    progress: number
    isVisible?: boolean
}

export function CTAState({ progress, isVisible = true }: CTAStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const textRef = useRef<HTMLHeadingElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const subtextRef = useRef<HTMLParagraphElement>(null)

    useEffect(() => {
        if (!isVisible) return

        
        
        

        
        

        const scale = 2 - progress 
        

        if (textRef.current) {
            gsap.set(textRef.current, {
                scale: Math.max(1, scale),
                opacity: progress, 
                y: (1 - progress) * 100 
            })
        }

        if (subtextRef.current) {
            gsap.set(subtextRef.current, {
                opacity: progress > 0.5 ? (progress - 0.5) * 2 : 0,
                y: (1 - progress) * 50
            })
        }

        if (buttonRef.current) {
            gsap.set(buttonRef.current, {
                scale: progress > 0.8 ? 1 : 0.8,
                opacity: progress > 0.8 ? (progress - 0.8) * 5 : 0
            })
        }

    }, [progress, isVisible])

    return (
        <section ref={containerRef} className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden pointer-events-none">

            {}
            <div
                className="absolute inset-x-0 bottom-0 h-[60vh] bg-gradient-to-t from-zinc-900 to-transparent opacity-50"
                style={{ opacity: progress * 0.5 }}
            />

            <div className="relative z-10 text-center px-4 pointer-events-auto">
                <h2
                    ref={textRef}
                    className="text-[15vw] leading-[0.8] font-bold font-serif text-white tracking-tighter origin-center will-change-transform"
                >
                    Create<br />
                    <span className="text-zinc-600">Futures.</span>
                </h2>

                <p
                    ref={subtextRef}
                    className="mt-8 text-xl md:text-2xl text-zinc-400 font-light max-w-xl mx-auto"
                >
                    The operating system for the next generation of storytellers.
                </p>

                <div className="mt-12 flex justify-center">
                    <button
                        ref={buttonRef}
                        className="group relative px-8 py-4 bg-white text-black rounded-full text-lg font-bold tracking-tight transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        Start Creating Free
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />

                        <div className="absolute inset-0 rounded-full ring-2 ring-white/50 animate-ping opacity-20" />
                    </button>
                </div>
            </div>

            {}
            <div className="absolute bottom-10 w-full text-center text-zinc-600 text-sm font-mono opacity-50">
                StudioX © 2026.
            </div>

        </section>
    )
}
