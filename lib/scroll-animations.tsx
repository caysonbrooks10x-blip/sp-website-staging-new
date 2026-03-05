"use client"

import { useEffect, useRef, type RefObject } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Register plugin only once on client
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

export interface ScrollAnimationConfig {
  y?: number
  x?: number
  opacity?: number
  scale?: number
  duration?: number
  delay?: number
  stagger?: number
  start?: string
  ease?: string
}

const defaultConfig: ScrollAnimationConfig = {
  y: 40,
  opacity: 0,
  duration: 0.6,
  delay: 0,
  stagger: 0.1,
  start: "top 85%",
  ease: "power2.out",
}

export function useScrollAnimation<T extends HTMLElement>(
  selector: string,
  config: ScrollAnimationConfig = {},
): RefObject<T | null> {
  const containerRef = useRef<T>(null)
  const mergedConfig = { ...defaultConfig, ...config }

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mediaQuery.matches) return

    // Check if mobile - disable heavy animations
    const isMobile = window.innerWidth < 768
    if (isMobile && mergedConfig.stagger && mergedConfig.stagger > 0.05) {
      mergedConfig.stagger = 0.05
      mergedConfig.duration = 0.4
    }

    const ctx = gsap.context(() => {
      const elements = containerRef.current?.querySelectorAll(selector)
      if (!elements?.length) return

      gsap.from(elements, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: mergedConfig.start,
          once: true, // Only animate once, no re-trigger on scroll up
        },
        y: mergedConfig.y,
        x: mergedConfig.x,
        opacity: mergedConfig.opacity,
        scale: mergedConfig.scale,
        duration: config.duration,
        delay: config.delay,
        stagger: config.stagger,
        ease: mergedConfig.ease,
      })
    }, containerRef)

    return () => ctx.revert()
  }, [selector, config])

  return containerRef
}

export function useHeroAnimation<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mediaQuery.matches) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

      tl.from(".hero-badge", { opacity: 0, y: 20, duration: 0.5 })
        .from(".hero-title", { opacity: 0, y: 30, duration: 0.7 }, "-=0.3")
        .from(".hero-subtitle", { opacity: 0, y: 20, duration: 0.6 }, "-=0.4")
        .from(".hero-cta", { opacity: 0, y: 15, duration: 0.5 }, "-=0.3")
        .from(".hero-search", { opacity: 0, y: 10, duration: 0.4 }, "-=0.2")
    }, ref)

    return () => ctx.revert()
  }, [])

  return ref
}
