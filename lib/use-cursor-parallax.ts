"use client"

import { useEffect, useRef } from "react"

interface ParallaxOptions {
  strength?: number
  enabled?: boolean
}

export function useCursorParallax<T extends HTMLElement>(options: ParallaxOptions = {}) {
  const { strength = 20, enabled = true } = options
  const elementRef = useRef<T>(null)

  useEffect(() => {
    if (!enabled || !elementRef.current) return

    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mediaQuery.matches) return

    // Check if device is touch-enabled
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches
    if (isTouchDevice) return

    const element = elementRef.current

    const handleMouseMove = (e: MouseEvent) => {
      if (!element) return

      const rect = element.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2

      const moveX = (x / rect.width) * strength
      const moveY = (y / rect.height) * strength

      element.style.transform = `translate(${moveX}px, ${moveY}px)`
    }

    const handleMouseLeave = () => {
      if (!element) return
      element.style.transform = "translate(0, 0)"
    }

    element.addEventListener("mousemove", handleMouseMove)
    element.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      element.removeEventListener("mousemove", handleMouseMove)
      element.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [strength, enabled])

  return elementRef
}
