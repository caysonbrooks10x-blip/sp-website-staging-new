"use client"

import { useEffect, useRef, useState } from "react"

// Globally-recognized brands rendered via Simple Icons CDN. Mix of AI/creative
// leaders (the platform's actual peer set) and household names so the strip
// reads as both contextual and aspirational.
const BRANDS: { name: string; slug: string }[] = [
    { name: "OpenAI", slug: "openai" },
    { name: "Anthropic", slug: "anthropic" },
    { name: "Google", slug: "google" },
    { name: "Microsoft", slug: "microsoft" },
    { name: "Apple", slug: "apple" },
    { name: "Meta", slug: "meta" },
    { name: "Amazon", slug: "amazon" },
    { name: "Adobe", slug: "adobe" },
    { name: "Nvidia", slug: "nvidia" },
    { name: "Figma", slug: "figma" },
    { name: "Canva", slug: "canva" },
    { name: "Netflix", slug: "netflix" },
    { name: "Tesla", slug: "tesla" },
    { name: "Samsung", slug: "samsung" },
    { name: "Spotify", slug: "spotify" },
    { name: "Discord", slug: "discord" },
]

function BrandIcon({ slug, name }: { slug: string; name: string }) {
    const [broken, setBroken] = useState(false)
    if (broken) return null
    return (
        <div
            className="w-7 h-7 md:w-9 md:h-9 flex-shrink-0 flex items-center justify-center"
            title={name}
        >
            <img
                src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`}
                alt={name}
                className="w-full h-full object-contain opacity-50 hover:opacity-90 transition-opacity"
                loading="lazy"
                onError={() => setBroken(true)}
            />
        </div>
    )
}

export function BrandScroll() {
    const trackRef = useRef<HTMLDivElement>(null)
    const singleSetRef = useRef<number>(0)

    useEffect(() => {
        const track = trackRef.current
        if (!track) return

        const measureTimer = setTimeout(() => {
            singleSetRef.current = track.scrollWidth / 4
        }, 100)

        let lastTime = 0
        let offset = 0
        let rafId: number
        const SPEED = 30

        const animate = (timestamp: number) => {
            if (!lastTime) lastTime = timestamp
            const delta = timestamp - lastTime
            lastTime = timestamp

            const setWidth = singleSetRef.current
            if (setWidth > 0) {
                offset = (offset + (SPEED * delta) / 1000) % setWidth
                track.style.transform = `translate3d(${-offset}px, 0, 0)`
            }

            rafId = requestAnimationFrame(animate)
        }

        rafId = requestAnimationFrame(animate)
        return () => {
            clearTimeout(measureTimer)
            cancelAnimationFrame(rafId)
        }
    }, [])

    const allBrands = [...BRANDS, ...BRANDS, ...BRANDS, ...BRANDS]

    return (
        <div className="w-full overflow-hidden relative" style={{ padding: '18px 0' }}>
            <div
                className="overflow-hidden"
                style={{
                    maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
                }}
            >
                <div
                    ref={trackRef}
                    className="flex items-center"
                    style={{ willChange: 'transform', gap: '52px' }}
                >
                    {allBrands.map((brand, i) => (
                        <BrandIcon key={`${brand.slug}-${i}`} slug={brand.slug} name={brand.name} />
                    ))}
                </div>
            </div>
        </div>
    )
}
