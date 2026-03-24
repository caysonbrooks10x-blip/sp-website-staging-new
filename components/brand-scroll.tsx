"use client"

import { useRef, useEffect } from "react"

const BRANDS = [
    {
        name: "OpenAI",
        svg: `<svg viewBox="0 0 32 32"><path fill="currentColor" d="M29.71 13.08A8.26 8.26 0 0 0 28.4 4.5a8.35 8.35 0 0 0-9-3.85A8.27 8.27 0 0 0 13.1.11 8.34 8.34 0 0 0 5.22 5.8a8.27 8.27 0 0 0-5.5 4 8.35 8.35 0 0 0 1.03 9.78 8.26 8.26 0 0 0 1.31 8.58 8.35 8.35 0 0 0 9 3.85 8.27 8.27 0 0 0 6.3.55 8.34 8.34 0 0 0 7.88-5.69 8.27 8.27 0 0 0 5.5-4 8.35 8.35 0 0 0-1.03-9.79zM18.9 28.47a6.2 6.2 0 0 1-3.98-1.45l.2-.11 6.6-3.81a1.07 1.07 0 0 0 .54-.93v-9.3l2.79 1.61a.1.1 0 0 1 .05.07v7.71a6.24 6.24 0 0 1-6.2 6.21zm-13.33-5.7a6.2 6.2 0 0 1-.74-4.18l.2.12 6.6 3.81a1.08 1.08 0 0 0 1.07 0l8.06-4.65v3.22a.1.1 0 0 1-.04.08l-6.67 3.85a6.24 6.24 0 0 1-8.48-2.25zM4.1 10.52a6.2 6.2 0 0 1 3.24-2.73v7.85a1.07 1.07 0 0 0 .54.93l8.06 4.65-2.79 1.61a.1.1 0 0 1-.09 0l-6.67-3.85A6.24 6.24 0 0 1 4.1 10.52zM25 15.61l-8.06-4.65 2.79-1.61a.1.1 0 0 1 .09 0l6.67 3.85a6.24 6.24 0 0 1-1.49 11.27v-7.93a1.07 1.07 0 0 0-.54-.93h.54zm2.77-4.26l-.2-.12-6.6-3.81a1.08 1.08 0 0 0-1.07 0l-8.06 4.65V8.85a.1.1 0 0 1 .04-.08l6.67-3.85a6.24 6.24 0 0 1 9.22 6.43zM9.31 17.35l-2.79-1.61a.1.1 0 0 1-.05-.07V7.96a6.24 6.24 0 0 1 10.24-4.78l-.2.11-6.6 3.81a1.07 1.07 0 0 0-.54.93l-.06 9.32zm1.51-3.26L16 11.1l5.18 2.99v5.98L16 23.06l-5.18-2.99v-5.98z"/></svg>`,
    },
    {
        name: "Adobe",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425h-3.71zm.342-21.244H24v19.25l-9.692-19.25zM9.692 1.38H0v19.25L9.692 1.38z"/></svg>`,
    },
    {
        name: "Nvidia",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8.948 8.798V6.56c.275-.023.551-.04.828-.04 4.539 0 8.21 3.285 8.21 7.335 0 .255-.014.507-.038.756l2.137.001c.028-.25.044-.502.044-.757 0-5.263-4.632-9.53-10.353-9.53-.285 0-.567.012-.848.032V2.4l-5.6 3.2 5.6 3.198zm0 2.604V9.68c.271-.032.546-.05.824-.05 3.361 0 6.088 2.428 6.088 5.424 0 .188-.01.374-.03.558l2.078.001c.024-.184.037-.37.037-.559 0-3.96-3.596-7.173-8.037-7.173-.328 0-.652.022-.972.06V8.8l-3.2 1.6 3.2 1.6.012-.598zm0 2.396v-1.478c.268-.047.541-.072.818-.072 2.189 0 3.964 1.584 3.964 3.537 0 .128-.007.254-.02.378l2.028.002c.016-.125.025-.252.025-.38 0-2.674-2.572-4.842-5.745-4.842-.37 0-.733.032-1.088.09v-.843l-2.4 1.2 2.4 1.2.018-.792z"/></svg>`,
    },
    {
        name: "Google",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-2.52 5.4-7.84 5.4-4.6 0-8.36-3.8-8.36-8.48s3.76-8.48 8.36-8.48c2.6 0 4.36 1.08 5.36 2.04l2.6-2.6C18.88 1.04 15.96 0 12.48 0 5.56 0 0 5.56 0 12.48s5.56 12.48 12.48 12.48c7.2 0 12-5.08 12-12.24 0-.84-.08-1.48-.2-2.12h-11.8z"/></svg>`,
    },
    {
        name: "Stability AI",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2.4 12c0-5.302 4.298-9.6 9.6-9.6S21.6 6.698 21.6 12s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.6 6h-1.2v5.4H6v1.2h5.4V18h1.2v-5.4H18v-1.2h-5.4V6z"/></svg>`,
    },
    {
        name: "Meta",
        svg: `<svg viewBox="0 0 36 36"><path fill="currentColor" d="M8.5 6C5.5 6 3 10.5 3 18s2.5 12 5.5 12c1.8 0 3.3-1.5 5-4l4.5-7.5L22.5 26c1.7 2.5 3.2 4 5 4 3 0 5.5-4.5 5.5-12S30.5 6 27.5 6c-1.8 0-3.3 1.5-5 4L18 17.5 13.5 10C11.8 7.5 10.3 6 8.5 6z"/></svg>`,
    },
    {
        name: "Microsoft",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/></svg>`,
    },
    {
        name: "Figma",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 24c2.21 0 4-1.79 4-4v-4H8c-2.21 0-4 1.79-4 4s1.79 4 4 4zm-4-12c0-2.21 1.79-4 4-4h4v8H8c-2.21 0-4-1.79-4-4zm0-8c0-2.21 1.79-4 4-4h4v8H8c-2.21 0-4-1.79-4-4zm8-4h4c2.21 0 4 1.79 4 4s-1.79 4-4 4h-4V0zm8 12c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z"/></svg>`,
    },
    {
        name: "Canva",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm2.073 16.702c-.533.236-1.322.366-2.073.366-3.01 0-5.454-2.328-5.454-5.2 0-2.871 2.444-5.2 5.454-5.2 1.257 0 2.36.347 3.163 1.017.284.237.394.44.394.646 0 .44-.394.85-.709.85-.157 0-.314-.079-.44-.189-.551-.44-1.414-.788-2.408-.788-2.07 0-3.54 1.564-3.54 3.664s1.47 3.664 3.54 3.664c.994 0 1.857-.347 2.408-.788.126-.11.283-.189.44-.189.315 0 .71.41.71.85 0 .206-.11.41-.394.646-.252.21-.558.394-.897.535z"/></svg>`,
    },
    {
        name: "Runway",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h18v3H3V3zm0 5h12v3H3V8zm0 5h18v3H3v-3zm0 5h12v3H3v-3z"/></svg>`,
    },
    {
        name: "Midjourney",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-1-1 3-3-3-3 1-1 4 4-4 4zm-4-4l3-3-1-1-4 4 4 4 1-1-3-3z"/></svg>`,
    },
    {
        name: "Luma AI",
        svg: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    },
]

function BrandIcon({ svgString }: { svgString: string }) {
    return (
        <div
            className="w-7 h-7 md:w-9 md:h-9 flex-shrink-0"
            style={{ color: 'rgba(0,0,0,0.5)' }}
            dangerouslySetInnerHTML={{ __html: svgString }}
        />
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
                        <BrandIcon key={i} svgString={brand.svg} />
                    ))}
                </div>
            </div>
        </div>
    )
}
