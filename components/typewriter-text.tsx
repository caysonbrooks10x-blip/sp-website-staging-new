"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { cn } from "@/lib/utils"

interface TypewriterTextProps {
    text: string
    className?: string
    delay?: number
    duration?: number
    trigger?: string
    stagger?: number
    cursor?: boolean
}

export function TypewriterText({
    text,
    className,
    delay = 0,
    duration = 0.05,
    stagger = 0.03,
    cursor = true,
}: TypewriterTextProps) {
    const textRef = useRef<HTMLDivElement>(null)
    const cursorRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const el = textRef.current
        if (!el) return

        // Split text into characters manually to avoid extra dependencies if possible
        // But for accessibility and simple DOM structure, we'll create a span for each char
        const chars = text.split("").map((char) => {
            const span = document.createElement("span")
            span.textContent = char
            span.style.opacity = "0"
            span.className = "inline-block" // Allows transform
            if (char === " ") span.style.width = "0.3em" // Preserve space width
            return span
        })

        el.innerHTML = ""
        chars.forEach((span) => el.appendChild(span))

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: el,
                    start: "top 85%",
                    toggleActions: "play none none reverse",
                }
            })

            tl.to(chars, {
                opacity: 1,
                y: 0,
                duration: duration,
                stagger: stagger,
                ease: "none",
                delay: delay
            })

            if (cursor && cursorRef.current) {
                // Blink cursor forever
                gsap.to(cursorRef.current, {
                    opacity: 0,
                    repeat: -1,
                    yoyo: true,
                    duration: 0.5,
                    ease: "steps(1)"
                })

                // Hide cursor after typing matches end
                const totalTime = delay + (chars.length * stagger) + duration
                gsap.to(cursorRef.current, {
                    opacity: 0,
                    delay: totalTime + 1, // Keep blinking for a second after typing
                    onComplete: () => {
                        if (cursorRef.current) cursorRef.current.style.display = "none"
                    }
                })
            }

        }, textRef)

        return () => ctx.revert()
    }, [text, delay, duration, stagger, cursor])

    return (
        <div className={cn("inline-flex items-center flex-wrap tracking-wide", className)}>
            <div ref={textRef} aria-label={text} className="inline-block" />
            {cursor && (
                <span
                    ref={cursorRef}
                    className="inline-block w-[3px] h-[1.1em] bg-accent ml-1 align-middle"
                />
            )}
        </div>
    )
}
