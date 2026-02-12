"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Lenis from "lenis"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export function SmoothScroll({ children }: { children: React.ReactNode }) {
    const lenisRef = useRef<Lenis | null>(null)
    const rafRef = useRef<((time: number) => void) | null>(null)

    const pathname = usePathname()

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)

        const lenis = new Lenis({
            duration: 1.5,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 0.8,
            touchMultiplier: 1.5,
        })

        lenisRef.current = lenis

        ScrollTrigger.scrollerProxy(document.body, {
            scrollTop(value) {
                return arguments.length
                    ? lenis.scrollTo(value!, { immediate: true })
                    : lenis.scroll
            },
            getBoundingClientRect() {
                return {
                    top: 0,
                    left: 0,
                    width: window.innerWidth,
                    height: window.innerHeight,
                }
            },
            pinType: document.body.style.transform ? "transform" : "fixed",
        })

        lenis.on("scroll", ScrollTrigger.update)

        rafRef.current = (time: number) => {
            lenis.raf(time * 1000)
        }

        gsap.ticker.add(rafRef.current)
        gsap.ticker.lagSmoothing(0)

        // Initial refresh
        requestAnimationFrame(() => {
            ScrollTrigger.refresh()
        })

        return () => {
            // We don't destroy lenis here because it might be needed fast? 
            // actually standard cleanup is fine.
            lenis.destroy()
            if (rafRef.current) gsap.ticker.remove(rafRef.current)
            ScrollTrigger.killAll()
        }
    }, [])

    // Handle Route Changes
    // Handle Route Changes
    useEffect(() => {
        if (!lenisRef.current) return

        // Instant jump to top to prevent "laggy" scrollback
        lenisRef.current.scrollTo(0, { immediate: true })

        // Debounced Refresh: Wait for rapid navigation to settle
        const timer = setTimeout(() => {
            ScrollTrigger.refresh()
        }, 150) // 150ms delay to catch rapid clicks

        return () => clearTimeout(timer)
    }, [pathname])

    return <>{children}</>
}