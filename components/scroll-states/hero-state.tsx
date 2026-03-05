"use client"

import { useRef, useLayoutEffect, useEffect, useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, Play } from "lucide-react"
import { Typewriter } from "@/components/ui/typewriter"
import { gsap } from "gsap"

interface HeroStateProps {
    register: (cb: (progress: number, index: number) => void) => () => void
}

const FLOAT_COUNT = 14

const IMAGE_TINTS = [
    'from-indigo-500/30 to-transparent', 'from-pink-500/25 to-transparent',
    'from-cyan-500/30 to-transparent', 'from-amber-400/25 to-transparent',
    'from-emerald-500/25 to-transparent', 'from-rose-500/25 to-transparent',
    'from-violet-500/30 to-transparent', 'from-sky-500/25 to-transparent',
    'from-fuchsia-500/25 to-transparent', 'from-orange-400/25 to-transparent',
    'from-teal-500/25 to-transparent', 'from-purple-500/30 to-transparent',
    'from-blue-500/25 to-transparent', 'from-lime-500/20 to-transparent',
]

const BORDER_COLORS = [
    'border-indigo-300/40', 'border-pink-300/40', 'border-cyan-300/40',
    'border-amber-300/40', 'border-emerald-300/40', 'border-rose-300/40',
    'border-violet-300/40', 'border-sky-300/40', 'border-fuchsia-300/40',
    'border-orange-300/40', 'border-teal-300/40', 'border-purple-300/40',
    'border-blue-300/40', 'border-lime-300/40',
]

interface FloatConfig {
    id: number; src: string; width: number; height: number
    left: string; top: string; depth: number; floatDuration: number; floatDelay: number
}

// Wireframe connections: [fromCard, toCard, color, label]
// We use a neutral hex color matching the reference image and remove labels.
const CONNECTIONS: [string, string, string, string][] = [
    ['reference', 'imageGen', '#a1a1aa', ''],
    ['imageGen', 'videoGen', '#a1a1aa', ''],
    ['imageGen', 'prompt', '#a1a1aa', ''],
]

export function HeroState({ register }: HeroStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const descRef = useRef<HTMLParagraphElement>(null)
    const buttonsRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const canvasInnerRef = useRef<HTMLDivElement>(null)
    const floatsRef = useRef<(HTMLDivElement | null)[]>([])
    const cursorRef = useRef({ x: 0, y: 0 })
    const requestIdRef = useRef<number | null>(null)

    // Card refs for pixel-accurate wire tracking
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({
        prompt: null, reference: null, imageGen: null, videoGen: null,
    })

    const [mounted, setMounted] = useState(false)
    const [dragging, setDragging] = useState<string | null>(null)
    const [wireUpdate, setWireUpdate] = useState(0) // trigger re-render for wires
    const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

    // Initial positions (percentage of canvas inner)
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({
        reference: { x: 5, y: 25 },
        imageGen: { x: 35, y: 5 },
        videoGen: { x: 30, y: 50 },
        prompt: { x: 65, y: 35 },
    })

    useEffect(() => {
        setMounted(true)
        if (window.innerWidth < 768) {
            setPositions({
                reference: { x: 2, y: 30 },
                imageGen: { x: 45, y: 5 },
                videoGen: { x: 25, y: 55 },
                prompt: { x: 70, y: 35 },
            })
        }
    }, [])

    const floats = useMemo<FloatConfig[]>(() => {
        if (typeof window === 'undefined') return []
        const items: FloatConfig[] = []
        for (let i = 0; i < FLOAT_COUNT; i++) {
            let x: number, y: number, valid = false
            while (!valid) {
                x = Math.random() * 90 + 5; y = Math.random() * 85 + 5
                if (!(x > 15 && x < 85 && y > 25 && y < 75)) valid = true
            }
            items.push({
                id: i, src: `/seamless-animate/bg${(i % 25) + 1}.jpg`,
                width: 100 + Math.random() * 100, height: 100 + Math.random() * 100,
                left: `${x!}%`, top: `${y!}%`, depth: 0.3 + Math.random() * 0.7,
                floatDuration: 8 + Math.random() * 6, floatDelay: Math.random() * -6,
            })
        }
        return items
    }, [])

    // mounted check handled in initial positions effect

    // ---- Drag logic ----
    const handlePointerDown = useCallback((cardId: string, e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation()
        const el = cardRefs.current[cardId]
        if (!el) return
        setDragging(cardId)
        dragStart.current = { mx: e.clientX, my: e.clientY, ox: el.offsetLeft, oy: el.offsetTop }
    }, [])

    useEffect(() => {
        if (!dragging) return
        const canvas = canvasInnerRef.current
        if (!canvas) return
        const handleMove = (e: PointerEvent) => {
            const el = cardRefs.current[dragging]
            if (!el) return
            const dx = e.clientX - dragStart.current.mx
            const dy = e.clientY - dragStart.current.my
            const newX = dragStart.current.ox + dx
            const newY = dragStart.current.oy + dy
            // Clamp within canvas
            const maxX = canvas.clientWidth - el.clientWidth
            const maxY = canvas.clientHeight - el.clientHeight
            el.style.left = `${Math.max(0, Math.min(maxX, newX))}px`
            el.style.top = `${Math.max(0, Math.min(maxY, newY))}px`
            el.style.position = 'absolute'
            // Force wire update
            setWireUpdate(v => v + 1)
        }
        const handleUp = () => setDragging(null)
        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
        return () => { window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp) }
    }, [dragging])

    // --- Get card edge center for wires ---
    const getCardEdge = useCallback((fromId: string, toId: string): { x1: number; y1: number; x2: number; y2: number } | null => {
        const canvas = canvasInnerRef.current
        const fromEl = cardRefs.current[fromId]
        const toEl = cardRefs.current[toId]
        if (!canvas || !fromEl || !toEl) return null
        const cr = canvas.getBoundingClientRect()
        const fr = fromEl.getBoundingClientRect()
        const tr = toEl.getBoundingClientRect()
        // Centers relative to canvas
        const fcx = (fr.left + fr.width / 2) - cr.left
        const fcy = (fr.top + fr.height / 2) - cr.top
        const tcx = (tr.left + tr.width / 2) - cr.left
        const tcy = (tr.top + tr.height / 2) - cr.top
        // Find edge intersection points
        const angle = Math.atan2(tcy - fcy, tcx - fcx)
        const fromEdge = edgePoint(fcx, fcy, fr.width / 2, fr.height / 2, angle)
        const backAngle = Math.atan2(fcy - tcy, fcx - tcx)
        const toEdge = edgePoint(tcx, tcy, tr.width / 2, tr.height / 2, backAngle)
        return { x1: fromEdge.x, y1: fromEdge.y, x2: toEdge.x, y2: toEdge.y }
    }, [])

    // Cursor parallax
    useEffect(() => {
        if (!mounted) return
        const handleMouseMove = (e: MouseEvent) => { cursorRef.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 } }
        window.addEventListener("mousemove", handleMouseMove)
        const update = () => {
            floatsRef.current.forEach((el, i) => {
                if (!el || !floats[i]) return
                const d = floats[i].depth
                const tx = cursorRef.current.x * 12 * d, ty = cursorRef.current.y * 12 * d
                const cx = (gsap.getProperty(el, "x") as number) || 0, cy = (gsap.getProperty(el, "y") as number) || 0
                gsap.set(el, { x: cx + (tx - cx) * 0.06, y: cy + (ty - cy) * 0.06 })
            })
            requestIdRef.current = requestAnimationFrame(update)
        }
        update()
        return () => { window.removeEventListener("mousemove", handleMouseMove); if (requestIdRef.current) cancelAnimationFrame(requestIdRef.current) }
    }, [mounted, floats])

    // Float & canvas animations
    useEffect(() => {
        if (!mounted) return
        const ctx = gsap.context(() => {
            gsap.fromTo(floatsRef.current.filter(Boolean), { opacity: 0, scale: 0.8 }, { opacity: 0.7, scale: 1, duration: 1.6, stagger: 0.12, ease: "power2.out" })
            floatsRef.current.forEach((el, i) => {
                if (!el || !floats[i]) return
                gsap.to(el, { yPercent: Math.random() > 0.5 ? 20 : -20, xPercent: Math.random() > 0.5 ? 8 : -8, rotation: (Math.random() - 0.5) * 6, duration: floats[i].floatDuration, delay: floats[i].floatDelay, ease: "sine.inOut", repeat: -1, yoyo: true })
            })
            if (canvasRef.current) {
                gsap.fromTo(canvasRef.current, { opacity: 0, y: 60, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 1.4, delay: 0.6, ease: "power3.out" })
            }
        }, containerRef)
        // Initial wire positions after cards mount
        setTimeout(() => setWireUpdate(v => v + 1), 100)
        return () => ctx.revert()
    }, [mounted, floats])

    // Text entry
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
            gsap.set([headingRef.current, descRef.current, buttonsRef.current], { opacity: 0, y: 30 })
            tl.to(headingRef.current, { opacity: 1, y: 0, duration: 0.8 })
                .to(descRef.current, { opacity: 1, y: 0, duration: 0.7 }, "-=0.4")
                .to(buttonsRef.current, { opacity: 1, y: 0, duration: 0.7 }, "-=0.4")
        }, containerRef)
        return () => ctx.revert()
    }, [])

    // Scroll exit
    useEffect(() => {
        const unregister = register((globalProgress) => {
            if (!contentRef.current) return
            const slice = 1 / 7
            if (globalProgress < slice) gsap.set(contentRef.current, { y: globalProgress * 500 })
            const exitStart = slice * 0.6
            if (globalProgress > exitStart) {
                const p = Math.min(1, (globalProgress - exitStart) / (slice - exitStart))
                gsap.set(contentRef.current, { opacity: 1 - p, scale: 1 - 0.05 * p, filter: `blur(${p * 10}px)` })
            } else {
                gsap.set(contentRef.current, { opacity: 1, scale: 1, filter: "blur(0px)" })
            }
        })
        return () => unregister?.()
    }, [register])



    // Compute wire paths for current card positions
    const wirePaths = useMemo(() => {
        if (!mounted) return []
        return CONNECTIONS.map(([from, to, color, label]) => {
            const edge = getCardEdge(from, to)
            if (!edge) return null
            const { x1, y1, x2, y2 } = edge
            const dx = x2 - x1, dy = y2 - y1

            // Adjust bezier control points to be more "s-curve" like the reference
            const cp1x = x1 + dx * 0.5
            const cp1y = y1
            const cp2x = x1 + dx * 0.5
            const cp2y = y2

            return { x1, y1, x2, y2, cp1x, cp1y, cp2x, cp2y, color, label }
        }).filter(Boolean) as any[]
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, wireUpdate, getCardEdge])

    return (
        <section
            ref={containerRef}
            className="md:absolute md:inset-0 relative w-full h-auto min-h-[100svh] flex items-center justify-center overflow-hidden pointer-events-none bg-white pt-20 pb-32"
        >
            {/* Ambient glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-[150px] -left-[150px] w-[600px] h-[600px] rounded-full opacity-[0.15] blur-[100px]" style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)' }} />
                <div className="absolute -bottom-[150px] -right-[150px] w-[550px] h-[550px] rounded-full opacity-[0.12] blur-[100px]" style={{ background: 'radial-gradient(circle, #c084fc 0%, transparent 70%)' }} />
                <div className="absolute top-[15%] right-[10%] w-[350px] h-[350px] rounded-full opacity-[0.10] blur-[90px]" style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }} />
                <div className="absolute bottom-[30%] left-[20%] w-[300px] h-[300px] rounded-full opacity-[0.08] blur-[90px]" style={{ background: 'radial-gradient(circle, #fb923c 0%, transparent 70%)' }} />
            </div>

            {/* === GLOWING AURORA ORBS / PARTICLES === */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ filter: 'blur(60px)' }}>
                {/* We'll place 20 bright, soft orbs floating around the edges and background */}

                {/* Top Left Cluster */}
                <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-500/40 mix-blend-multiply animate-pulse" />
                <div className="absolute top-[5%] left-[5%] w-[350px] h-[350px] rounded-full bg-cyan-400/30 mix-blend-multiply animation-delay-2000" style={{ animation: 'pulse 8s infinite' }} />
                <div className="absolute top-[15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/25 mix-blend-multiply animation-delay-4000" style={{ animation: 'pulse 10s infinite' }} />

                {/* Top Right Cluster */}
                <div className="absolute top-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full bg-purple-500/35 mix-blend-multiply" style={{ animation: 'pulse 9s infinite' }} />
                <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] rounded-full bg-pink-500/30 mix-blend-multiply animation-delay-3000" style={{ animation: 'pulse 7s infinite' }} />
                <div className="absolute top-[5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-fuchsia-500/25 mix-blend-multiply animation-delay-1000" style={{ animation: 'pulse 11s infinite' }} />

                {/* Bottom Left Cluster */}
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/25 mix-blend-multiply" style={{ animation: 'pulse 12s infinite' }} />
                <div className="absolute bottom-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-teal-400/30 mix-blend-multiply animation-delay-5000" style={{ animation: 'pulse 8s infinite' }} />
                <div className="absolute bottom-[-5%] left-[15%] w-[450px] h-[450px] rounded-full bg-cyan-500/20 mix-blend-multiply animation-delay-2000" style={{ animation: 'pulse 9s infinite' }} />

                {/* Bottom Right Cluster */}
                <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-rose-500/30 mix-blend-multiply" style={{ animation: 'pulse 10s infinite' }} />
                <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] rounded-full bg-orange-400/25 mix-blend-multiply animation-delay-4000" style={{ animation: 'pulse 8s infinite' }} />
                <div className="absolute bottom-[15%] right-[-10%] w-[350px] h-[350px] rounded-full bg-amber-500/20 mix-blend-multiply animation-delay-1000" style={{ animation: 'pulse 11s infinite' }} />

                {/* Center / Midground scattered orbs */}
                <div className="absolute top-[40%] left-[30%] w-[250px] h-[250px] rounded-full bg-indigo-400/20 mix-blend-multiply" style={{ animation: 'pulse 6s infinite' }} />
                <div className="absolute top-[60%] right-[30%] w-[300px] h-[300px] rounded-full bg-purple-400/20 mix-blend-multiply animation-delay-3000" style={{ animation: 'pulse 9s infinite' }} />
                <div className="absolute top-[30%] right-[40%] w-[200px] h-[200px] rounded-full bg-sky-400/20 mix-blend-multiply animation-delay-5000" style={{ animation: 'pulse 7s infinite' }} />
                <div className="absolute top-[70%] left-[40%] w-[280px] h-[280px] rounded-full bg-pink-400/20 mix-blend-multiply" style={{ animation: 'pulse 10s infinite' }} />

                {/* Extra bright core spots */}
                <div className="absolute top-[20%] left-[20%] w-[150px] h-[150px] rounded-full bg-white/40 mix-blend-overlay" style={{ animation: 'pulse 4s infinite' }} />
                <div className="absolute bottom-[20%] right-[20%] w-[150px] h-[150px] rounded-full bg-white/40 mix-blend-overlay animation-delay-2000" style={{ animation: 'pulse 5s infinite' }} />
                <div className="absolute top-[30%] right-[15%] w-[100px] h-[100px] rounded-full bg-white/30 mix-blend-overlay" style={{ animation: 'pulse 3s infinite' }} />
                <div className="absolute bottom-[30%] left-[15%] w-[100px] h-[100px] rounded-full bg-white/30 mix-blend-overlay animation-delay-1000" style={{ animation: 'pulse 6s infinite' }} />
            </div>

            {/* Content */}
            <div ref={contentRef} className="relative z-20 w-full max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 will-change-transform">
                <div className="mt-32 md:mt-40 lg:mt-48 mb-12 md:mb-16 flex flex-col items-start text-left">

                    <h1 ref={headingRef} className="opacity-0 text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-medium tracking-tight leading-[1.1] text-zinc-900 mb-6">
                        Lightning fast creation meets<br />professional cinematic motion.
                    </h1>
                    <p ref={descRef} className="opacity-0 text-base md:text-lg text-zinc-600 max-w-xl leading-relaxed font-medium">
                        Half the cost and twice the quality in every single frame.
                    </p>
                    <div ref={buttonsRef} className="opacity-0 flex flex-wrap items-center gap-4 mt-8 pointer-events-auto">
                        <Button size="lg" className="h-12 px-8 rounded-lg text-sm bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-[1.02] transition-all duration-300 font-semibold group shadow-lg" asChild>
                            <a href="/studio">Start Creating<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></a>
                        </Button>
                        <Button size="lg" variant="outline" className="h-12 px-8 rounded-lg text-sm bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-300 font-medium group shadow-sm" asChild>
                            <a href="#collective"><Play className="mr-2 h-4 w-4 fill-zinc-300 group-hover:fill-zinc-500 transition-all" />Watch Demo</a>
                        </Button>
                    </div>
                </div>

                {/* ========= DARK GLASS CANVAS ========= */}
                <div ref={canvasRef} className="relative rounded-2xl overflow-hidden pointer-events-auto"
                    style={{
                        opacity: 0,
                        background: 'rgba(10,10,12,0.92)',
                        backdropFilter: 'blur(28px) saturate(1.3)',
                        WebkitBackdropFilter: 'blur(28px) saturate(1.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 25px 80px -15px rgba(0,0,0,0.5), 0 8px 30px -10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}>

                    {/* Dark dot grid */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.15]"
                        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    {/* Subtle warm glow behind cards */}
                    <div className="absolute top-[20%] left-[30%] w-[300px] h-[200px] rounded-full pointer-events-none opacity-[0.06] blur-[60px]"
                        style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
                    <div className="absolute bottom-[20%] right-[20%] w-[250px] h-[250px] rounded-full pointer-events-none opacity-[0.04] blur-[50px]"
                        style={{ background: 'radial-gradient(circle, #c084fc 0%, transparent 70%)' }} />

                    {/* Canvas area */}
                    <div ref={canvasInnerRef} className="relative py-8 px-5 md:px-16 min-h-[380px] md:min-h-[440px]" style={{ cursor: dragging ? 'grabbing' : 'default' }}>

                        {/* SVG WIRES */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
                            <defs>
                                {CONNECTIONS.map(([, , color], i) => (
                                    <filter key={`glow-${i}`} id={`wire-glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="2" result="blur" />
                                        <feFlood floodColor={color} floodOpacity="0.3" result="color" />
                                        <feComposite in="color" in2="blur" operator="in" result="glow" />
                                        <feMerge>
                                            <feMergeNode in="glow" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                ))}
                            </defs>
                            {wirePaths.map((w, i) => {
                                const pathD = `M ${w.x1} ${w.y1} C ${w.cp1x} ${w.cp1y}, ${w.cp2x} ${w.cp2y}, ${w.x2} ${w.y2}`
                                return (
                                    <g key={i}>
                                        {/* Subtle elegant line */}
                                        <path d={pathD} stroke={w.color} strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round" filter={`url(#wire-glow-${i})`} />
                                        {/* Animated traveling particle */}
                                        <circle r="2" fill="#e4e4e7" opacity="0.8">
                                            <animateMotion dur="3s" repeatCount="indefinite">
                                                <mpath href={`#motion-path-${i}`} />
                                            </animateMotion>
                                        </circle>
                                        <path id={`motion-path-${i}`} d={pathD} fill="none" stroke="none" />
                                        {/* Start point */}
                                        {/*<circle cx={w.x1} cy={w.y1} r="2.5" fill={w.color} opacity="0.8" />*/}
                                        {/* End point */}
                                        {/*<circle cx={w.x2} cy={w.y2} r="2.5" fill={w.color} opacity="0.8" />*/}
                                    </g>
                                )
                            })}
                        </svg>

                        {/* === DRAGGABLE CARDS === */}

                        {/* Reference Card */}
                        <div
                            ref={el => { cardRefs.current.reference = el }}
                            className="absolute z-20 select-none group touch-none"
                            style={{ left: `${positions.reference.x}%`, top: `${positions.reference.y}%`, cursor: dragging === 'reference' ? 'grabbing' : 'grab' }}
                            onPointerDown={e => handlePointerDown('reference', e)}
                        >
                            <div className="text-[11px] md:text-[12px] text-zinc-400 mb-2 md:mb-2 font-medium flex items-center gap-1.5 px-1">
                                Reference
                            </div>
                            <div className="w-[100px] md:w-[150px] h-[75px] md:h-[110px] rounded-xl overflow-hidden transition-all duration-200 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] group-active:scale-[0.97]"
                                style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                                <img src="/seamless-animate/bg3.jpg" alt="" className="w-full h-full object-cover" />
                            </div>
                        </div>

                        {/* Image Generation Card */}
                        <div
                            ref={el => { cardRefs.current.imageGen = el }}
                            className="absolute z-20 select-none group touch-none"
                            style={{ left: `${positions.imageGen.x}%`, top: `${positions.imageGen.y}%`, cursor: dragging === 'imageGen' ? 'grabbing' : 'grab' }}
                            onPointerDown={e => handlePointerDown('imageGen', e)}
                        >
                            <div className="text-[11px] md:text-[12px] text-zinc-400 mb-2 md:mb-2 font-medium flex items-center gap-1.5 px-1 w-full justify-center">
                                Image Generation
                            </div>
                            <div className="w-[140px] md:w-[200px] h-[100px] md:h-[140px] rounded-xl overflow-hidden transition-all duration-200 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.08)] group-active:scale-[0.97]"
                                style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', margin: '0 auto' }}>
                                <img src="/seamless-animate/bg1.jpg" alt="" className="w-full h-full object-cover" />
                            </div>
                        </div>

                        {/* Video Generation Card */}
                        <div
                            ref={el => { cardRefs.current.videoGen = el }}
                            className="absolute z-20 select-none group touch-none"
                            style={{ left: `${positions.videoGen.x}%`, top: `${positions.videoGen.y}%`, cursor: dragging === 'videoGen' ? 'grabbing' : 'grab' }}
                            onPointerDown={e => handlePointerDown('videoGen', e)}
                        >
                            <div className="text-[11px] md:text-[12px] text-zinc-400 mb-2 md:mb-2 font-medium flex items-center gap-1.5 px-1">
                                Video Generation
                            </div>
                            <div className="w-[140px] md:w-[200px] h-[100px] md:h-[140px] rounded-xl overflow-hidden transition-all duration-200 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] group-active:scale-[0.97]"
                                style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                                <video
                                    src="/pinterest_video.mp4"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        {/* Poem Card (small text card) */}
                        <div
                            ref={el => { cardRefs.current.prompt = el }}
                            className="absolute z-20 select-none group touch-none flex flex-col items-start gap-2"
                            style={{ left: `${positions.prompt.x}%`, top: `${positions.prompt.y}%`, cursor: dragging === 'prompt' ? 'grabbing' : 'grab' }}
                            onPointerDown={e => handlePointerDown('prompt', e)}
                        >
                            <div className="text-[11px] md:text-[12px] text-zinc-400 font-medium px-2">
                                Prompt
                            </div>
                            <div className="px-3 py-3 md:px-4 md:py-4 rounded-xl w-[120px] md:w-[150px] transition-all duration-200 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.06)] group-active:scale-[0.97]"
                                style={{ background: '#1c1c20', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                                <p className="text-[10px] md:text-[11px] text-zinc-400 leading-snug font-light">
                                    A woman dressed in flowing<br />golden fabric, eyes closed,<br />serene expression. Ethereal<br />lighting runs across, soft shadows<br />in shadowed.
                                </p>
                            </div>
                        </div>

                        {/* Refresh / Regenerate button */}
                        <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-30">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-all duration-200 group"
                                style={{ background: 'rgba(28,28,32,0.9)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
                                <svg className="w-4 h-4 md:w-5 md:h-5 text-zinc-400 group-hover:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll hint */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-20 animate-bounce">
                <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-zinc-400 to-transparent rounded-full" />
            </div>
        </section>
    )
}

// Helper: find the point on a rectangle edge closest to a given angle
function edgePoint(cx: number, cy: number, hw: number, hh: number, angle: number) {
    const cos = Math.cos(angle), sin = Math.sin(angle)
    const absCos = Math.abs(cos), absSin = Math.abs(sin)
    let x: number, y: number
    if (absCos * hh > absSin * hw) {
        // Intersects left/right edge
        const sign = cos > 0 ? 1 : -1
        x = cx + sign * hw
        y = cy + sign * hw * (sin / cos)
    } else {
        // Intersects top/bottom edge
        const sign = sin > 0 ? 1 : -1
        x = cx + sign * hh * (cos / sin)
        y = cy + sign * hh
    }
    return { x, y }
}
