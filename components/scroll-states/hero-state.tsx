"use client"

import { useRef, useLayoutEffect, useEffect, useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Plus, Workflow, SlidersHorizontal, MessageCircle, History, LayoutGrid } from "lucide-react"
import { ASSET_BASE } from "@/lib/assets"
import { gsap } from "gsap"

interface HeroStateProps {
    register: (cb: (progress: number, index: number) => void) => () => void
}

// Wireframe connections: [fromCard, toCard]
const CONNECTIONS: [string, string][] = [
    ['reference', 'imageGen'],
    ['reference', 'videoGen'],
    ['imageGen', 'prompt'],
    ['videoGen', 'prompt'],
]

export function HeroState({ register }: HeroStateProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const buttonsRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLDivElement>(null)
    const canvasInnerRef = useRef<HTMLDivElement>(null)
    const dotCanvasRef = useRef<HTMLCanvasElement>(null)
    const shimmerCanvasRef = useRef<HTMLCanvasElement>(null)
    const hintRef = useRef<HTMLDivElement>(null)

    // Card refs for pixel-accurate wire tracking
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({
        prompt: null, reference: null, imageGen: null, videoGen: null,
    })
    const innerCardRefs = useRef<Record<string, HTMLDivElement | null>>({
        prompt: null, reference: null, imageGen: null, videoGen: null,
    })

    const [mounted, setMounted] = useState(false)
    const [dragging, setDragging] = useState<string | null>(null)
    const [wireUpdate, setWireUpdate] = useState(0)
    const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

    // Initial positions (percentage of canvas inner) - Perfectly matched to screenshot
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({
        reference: { x: 2.3, y: 14.8 },
        imageGen: { x: 38.3, y: 2.5 },
        videoGen: { x: 30.5, y: 46.0 },
        prompt: { x: 68.5, y: 37.0 },
    })

    useEffect(() => {
        setMounted(true)
        if (window.innerWidth < 768) {
            setPositions({
                reference: { x: -8, y: 30 },
                imageGen: { x: 38, y: 2 },
                videoGen: { x: 38, y: 56 },
                prompt: { x: 58, y: 34 },
            })
        }
    }, [])

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
            const maxX = canvas.clientWidth - el.clientWidth
            const maxY = canvas.clientHeight - el.clientHeight
            el.style.left = `${Math.max(0, Math.min(maxX, newX))}px`
            el.style.top = `${Math.max(0, Math.min(maxY, newY))}px`
            el.style.position = 'absolute'
            setWireUpdate(v => v + 1)
        }
        const handleUp = () => setDragging(null)
        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
        return () => { window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp) }
    }, [dragging])

    // --- Get card edge lateral centers for perfect wire attachment ---
    const getCardEdge = useCallback((fromId: string, toId: string): { x1: number; y1: number; x2: number; y2: number } | null => {
        const fromParent = cardRefs.current[fromId]
        const toParent = cardRefs.current[toId]
        const fromInner = innerCardRefs.current[fromId]
        const toInner = innerCardRefs.current[toId]

        if (!fromParent || !toParent || !fromInner || !toInner) return null

        // X1: Right edge of 'from' glossy card
        const x1 = fromParent.offsetLeft + fromInner.offsetLeft + fromInner.offsetWidth
        // Y1: Vertical center of 'from' glossy card
        const y1 = fromParent.offsetTop + fromInner.offsetTop + fromInner.offsetHeight / 2

        // X2: Left edge of 'to' glossy card
        const x2 = toParent.offsetLeft + toInner.offsetLeft
        // Y2: Vertical center of 'to' glossy card
        const y2 = toParent.offsetTop + toInner.offsetTop + toInner.offsetHeight / 2

        return { x1, y1, x2, y2 }
    }, [])

    // ── Radial Proximity Dot Grid (TapNow effect) ──
    useEffect(() => {
        if (!mounted) return
        const dotCanvas = dotCanvasRef.current
        if (!dotCanvas) return

        const ctx2d = dotCanvas.getContext('2d')
        if (!ctx2d) return

        const GAP = 28
        const RADIUS = 140
        const BASE = 0.04
        const PEAK = 0.32
        const DOT_R = 1.0

        let mouseX = -9999
        let mouseY = -9999
        let rafId: number | null = null
        let needsRedraw = true

        const resize = () => {
            const parent = dotCanvas.parentElement
            if (!parent) return
            const dpr = window.devicePixelRatio || 1
            const w = parent.clientWidth
            const h = parent.clientHeight
            dotCanvas.width = w * dpr
            dotCanvas.height = h * dpr
            dotCanvas.style.width = `${w}px`
            dotCanvas.style.height = `${h}px`
            ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
            needsRedraw = true
        }

        const draw = () => {
            rafId = null
            if (!needsRedraw) return
            needsRedraw = false

            const w = dotCanvas.clientWidth
            const h = dotCanvas.clientHeight
            ctx2d.clearRect(0, 0, w, h)

            for (let x = GAP / 2; x < w; x += GAP) {
                for (let y = GAP / 2; y < h; y += GAP) {
                    const dist = Math.hypot(x - mouseX, y - mouseY)
                    const t = Math.max(0, 1 - dist / RADIUS)
                    const op = BASE + (PEAK - BASE) * t * t // t² ease-in
                    ctx2d.fillStyle = `rgba(255,255,255,${op})`
                    ctx2d.beginPath()
                    ctx2d.arc(x, y, DOT_R, 0, Math.PI * 2)
                    ctx2d.fill()
                }
            }
        }

        const scheduleRedraw = () => {
            needsRedraw = true
            if (!rafId) rafId = requestAnimationFrame(draw)
        }

        const onMouseMove = (e: MouseEvent) => {
            const rect = dotCanvas.getBoundingClientRect()
            mouseX = e.clientX - rect.left
            mouseY = e.clientY - rect.top
            scheduleRedraw()
        }

        const onMouseLeave = () => {
            mouseX = -9999
            mouseY = -9999
            scheduleRedraw()
        }

        resize()
        draw()

        // Listen on the canvas viewport (parent), not just the dotCanvas
        const viewport = canvasRef.current
        viewport?.addEventListener('mousemove', onMouseMove)
        viewport?.addEventListener('mouseleave', onMouseLeave)
        window.addEventListener('resize', resize)

        return () => {
            viewport?.removeEventListener('mousemove', onMouseMove)
            viewport?.removeEventListener('mouseleave', onMouseLeave)
            window.removeEventListener('resize', resize)
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [mounted])

    // Canvas + text entry animations
    useEffect(() => {
        if (!mounted) return
        const ctx = gsap.context(() => {
            if (canvasRef.current) {
                gsap.fromTo(canvasRef.current, { opacity: 0, y: 60, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 1.6, delay: 0.5, ease: "power3.out" })
            }
        }, containerRef)
        setTimeout(() => setWireUpdate(v => v + 1), 200)
        return () => ctx.revert()
    }, [mounted])

    // Text entry
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
            gsap.set([headingRef.current, buttonsRef.current], { opacity: 0, y: 30 })
            tl.to(headingRef.current, { opacity: 1, y: 0, duration: 0.9 })
                .to(buttonsRef.current, { opacity: 1, y: 0, duration: 0.7 }, "-=0.4")
        }, containerRef)
        return () => ctx.revert()
    }, [])

    // Hint pulsing
    useEffect(() => {
        if (!hintRef.current) return
        gsap.fromTo(hintRef.current, { opacity: 0 }, { opacity: 0.5, duration: 1, delay: 2, ease: "power2.out" })
    }, [])

    // Scroll exit
    useEffect(() => {
        const unregister = register((globalProgress) => {
            if (!contentRef.current) return
            const TOTAL = 4
            const slice = 1 / TOTAL
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

    // Wire configs: speed (path-units/ms), phase (0–1 offset)
    const WIRE_CONFIGS = useMemo(() => [
        { speed: 0.00055, phase: 0.00 },
        { speed: 0.00048, phase: 0.40 },
        { speed: 0.00060, phase: 0.70 },
    ], [])

    // Compute wire paths with S-curve bezier
    const wirePaths = useMemo(() => {
        if (!mounted) return []
        return CONNECTIONS.map(([from, to], i) => {
            const edge = getCardEdge(from, to)
            if (!edge) return null
            const { x1, y1, x2, y2 } = edge
            // S-curve: both control points at horizontal midpoint
            const mx = x1 + (x2 - x1) * 0.5
            const cfg = WIRE_CONFIGS[i % WIRE_CONFIGS.length]
            return {
                x1, y1, x2, y2,
                cp1x: mx, cp1y: y1,
                cp2x: mx, cp2y: y2,
                speed: cfg.speed,
                phase: cfg.phase,
                // Pre-compute bezier control points as {x,y} for canvas math
                p1: { x: x1, y: y1 },
                c1: { x: mx, y: y1 },
                c2: { x: mx, y: y2 },
                p2: { x: x2, y: y2 },
            }
        }).filter(Boolean) as any[]
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, wireUpdate, getCardEdge, WIRE_CONFIGS])

    // ── Shimmer Canvas Animation (TapNow Gaussian glow) ──
    useEffect(() => {
        if (!mounted || wirePaths.length === 0) return
        const shimmerCanvas = shimmerCanvasRef.current
        const canvasInner = canvasInnerRef.current
        if (!shimmerCanvas || !canvasInner) return

        const ctx = shimmerCanvas.getContext('2d')
        if (!ctx) return

        const SIGMA = 0.10  // glow spread — 10% of path on each side
        const STEPS = 120   // sample density per wire

        // Cubic bezier point at t
        function bezPt(p1: {x:number,y:number}, c1: {x:number,y:number}, c2: {x:number,y:number}, p2: {x:number,y:number}, t: number) {
            const u = 1 - t
            const uu = u * u, uuu = uu * u
            const tt = t * t, ttt = tt * t
            return {
                x: uuu * p1.x + 3 * uu * t * c1.x + 3 * u * tt * c2.x + ttt * p2.x,
                y: uuu * p1.y + 3 * uu * t * c1.y + 3 * u * tt * c2.y + ttt * p2.y,
            }
        }

        let dpr = 1
        const resize = () => {
            dpr = window.devicePixelRatio || 1
            const w = canvasInner.clientWidth
            const h = canvasInner.clientHeight
            shimmerCanvas.width = w * dpr
            shimmerCanvas.height = h * dpr
            shimmerCanvas.style.width = `${w}px`
            shimmerCanvas.style.height = `${h}px`
        }
        resize()
        window.addEventListener('resize', resize)

        let rafId: number
        const draw = (timestamp: number) => {
            rafId = requestAnimationFrame(draw)
            const w = shimmerCanvas.clientWidth
            const h = shimmerCanvas.clientHeight
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, w, h)

            for (const wire of wirePaths) {
                // center position moves 0→1 continuously, loops seamlessly
                const center = (timestamp * wire.speed + wire.phase) % 1.0

                for (let i = 0; i <= STEPS; i++) {
                    const s = i / STEPS

                    // Wrapped distance — seamless loop, no pop
                    let d = s - center
                    if (d > 0.5) d -= 1
                    if (d < -0.5) d += 1

                    // Gaussian: bright at center, tapers to nothing
                    const alpha = Math.exp(-(d * d) / (2 * SIGMA * SIGMA))
                    if (alpha < 0.008) continue // skip invisible

                    const pt = bezPt(wire.p1, wire.c1, wire.c2, wire.p2, s)

                    // Pass 1: Wide glow (r=5)
                    ctx.beginPath()
                    ctx.arc(pt.x, pt.y, 5.0, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.055).toFixed(4)})`
                    ctx.fill()

                    // Pass 2: Halo (r=2.2)
                    ctx.beginPath()
                    ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.22).toFixed(4)})`
                    ctx.fill()

                    // Pass 3: Crisp core (r=0.9)
                    ctx.beginPath()
                    ctx.arc(pt.x, pt.y, 0.9, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.98).toFixed(4)})`
                    ctx.fill()
                }
            }
        }
        rafId = requestAnimationFrame(draw)

        return () => {
            cancelAnimationFrame(rafId)
            window.removeEventListener('resize', resize)
        }
    }, [mounted, wirePaths])

    return (
        <section
            ref={containerRef}
            className="md:absolute md:inset-0 relative w-full h-auto min-h-[100svh] flex flex-col items-start overflow-hidden pt-36 md:pt-32 pb-16"
            style={{
                background: 'linear-gradient(135deg, #2d3a2e 0%, #4a5d3a 18%, #7a8a5a 35%, #c8b88a 55%, #e8c8a0 70%, #f0b8a0 85%, #e8a8a0 100%)',
            }}
        >
            {/* Gradient ambient orbs for depth */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Deep green orb — top left */}
                <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: '800px', height: '600px',
                        background: 'radial-gradient(ellipse, rgba(45,80,45,0.35) 0%, transparent 70%)',
                        top: '-10%', left: '-150px',
                        filter: 'blur(100px)',
                        animation: 'heroOrbDrift1 12s ease-in-out infinite alternate',
                    }}
                />
                {/* Warm peach/salmon orb — right side */}
                <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: '700px', height: '500px',
                        background: 'radial-gradient(ellipse, rgba(240,168,140,0.4) 0%, transparent 70%)',
                        top: '10%', right: '-100px',
                        filter: 'blur(120px)',
                        animation: 'heroOrbDrift2 15s ease-in-out infinite alternate',
                    }}
                />
                {/* Olive/sage accent — center */}
                <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: '500px', height: '400px',
                        background: 'radial-gradient(ellipse, rgba(160,170,120,0.25) 0%, transparent 70%)',
                        top: '40%', left: '30%',
                        filter: 'blur(100px)',
                        animation: 'heroOrbDrift1 18s ease-in-out infinite alternate-reverse',
                    }}
                />
                {/* Bottom pink/coral glow */}
                <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width: '600px', height: '400px',
                        background: 'radial-gradient(ellipse, rgba(232,168,160,0.3) 0%, transparent 70%)',
                        bottom: '-5%', right: '10%',
                        filter: 'blur(110px)',
                        animation: 'heroOrbDrift2 20s ease-in-out infinite alternate-reverse',
                    }}
                />
            </div>

            {/* Content */}
            <div ref={contentRef} className="relative z-20 w-full max-w-[1100px] mx-auto px-6 sm:px-8 lg:px-12 will-change-transform" style={{ pointerEvents: 'auto' }}>

                {/* Hero headline + CTA */}
                <div className="mb-10 md:mb-14 flex flex-col items-start text-left">
                    <h1
                        ref={headingRef}
                        className="opacity-0 text-[2.8rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-semibold tracking-[-0.04em] leading-[1.05] text-[#0a0a0a] mb-4"
                        style={{ fontFamily: 'var(--font-sans)' }}
                    >
                        Lightning fast creation
                        <br className="hidden md:block" />
                        meets cinematic motion.
                    </h1>
                    <p className="text-base md:text-xl text-zinc-800/80 max-w-2xl mb-8 font-normal leading-relaxed tracking-tight">
                        Half the cost and twice the quality in every single frame.
                    </p>
                    <div ref={buttonsRef} className="opacity-0 flex flex-wrap items-center gap-4" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}>
                        <Button size="lg" className="h-12 px-8 rounded-full text-sm bg-[#0a0a0a] text-white hover:bg-zinc-800 hover:scale-[1.02] transition-all duration-300 font-semibold group shadow-lg" asChild>
                            <a href="/studio">Start Creating<ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></a>
                        </Button>
                        <Button size="lg" variant="outline" className="h-12 px-8 rounded-full text-sm bg-black/5 backdrop-blur-md border-black/10 hover:bg-black/10 transition-all duration-300 font-medium group text-zinc-700" asChild>
                            <a href="#collective"><Play className="mr-2 h-4 w-4 fill-zinc-500 group-hover:fill-zinc-800 transition-all" />Watch Demo</a>
                        </Button>
                    </div>
                </div>

                {/* ========= TAPNOW-STYLE CANVAS VIEWPORT ========= */}
                <div
                    ref={canvasRef}
                    className="relative rounded-[20px] overflow-hidden pointer-events-auto"
                    style={{
                        opacity: 0,
                        background: 'rgba(10,10,10,0.92)',
                        border: '1px solid rgba(0,0,0,0.12)',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.18), 0 2px 20px rgba(0,0,0,0.08)',
                    }}
                >

                    {/* Interactive proximity dot grid (HTML5 Canvas) */}
                    <canvas
                        ref={dotCanvasRef}
                        className="absolute inset-0 pointer-events-none z-[1]"
                    />

                    {/* Left Sidebar Toolbar */}
                    <div
                        className="absolute left-0 top-0 bottom-0 z-30 flex flex-col items-center py-4 gap-1"
                        style={{
                            width: '48px',
                            background: 'rgba(14,14,14,0.95)',
                            borderRight: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <SidebarBtn icon={<Plus className="w-4 h-4" />} active />
                        <SidebarBtn icon={<Workflow className="w-3.5 h-3.5" />} />
                        <SidebarBtn icon={<SlidersHorizontal className="w-3.5 h-3.5" />} />
                        <SidebarBtn icon={<MessageCircle className="w-3.5 h-3.5" />} />
                        <SidebarBtn icon={<History className="w-3.5 h-3.5" />} />
                        <SidebarBtn icon={<LayoutGrid className="w-3.5 h-3.5" />} />
                        {/* Avatar at bottom */}
                        <div className="mt-auto">
                            <div
                                className="w-7 h-7 rounded-full"
                                style={{ background: 'linear-gradient(135deg, #f472b6, #fb923c)' }}
                            />
                        </div>
                    </div>

                    {/* Canvas Inner Area */}
                    <div
                        ref={canvasInnerRef}
                        className="relative min-h-[420px] md:min-h-[540px]"
                        style={{ marginLeft: '48px', cursor: dragging ? 'grabbing' : 'default' }}
                    >

                        {/* Subtle warm glow behind cards */}
                        <div className="absolute top-[15%] left-[25%] w-[300px] h-[200px] rounded-full pointer-events-none opacity-[0.06] blur-[60px]"
                            style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
                        <div className="absolute bottom-[15%] right-[15%] w-[250px] h-[250px] rounded-full pointer-events-none opacity-[0.04] blur-[50px]"
                            style={{ background: 'radial-gradient(circle, #c084fc 0%, transparent 70%)' }} />

                        {/* Shimmer Canvas Layer — Gaussian glow traveling along wires */}
                        <canvas
                            ref={shimmerCanvasRef}
                            className="absolute inset-0 pointer-events-none z-[9]"
                        />

                        {/* SVG WIRES — Static tracks + port dots */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
                            {wirePaths.map((w: any, i: number) => {
                                const d = `M ${w.x1},${w.y1} C ${w.cp1x},${w.cp1y} ${w.cp2x},${w.cp2y} ${w.x2},${w.y2}`
                                return (
                                    <g key={i}>
                                        {/* Static wire — 1px, subtle white */}
                                        <path
                                            d={d}
                                            stroke="rgba(255,255,255,0.22)"
                                            strokeWidth="1"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                        {/* Port: outer ring (r=6) + inner dot (r=2) — start */}
                                        <circle cx={w.x1} cy={w.y1} r="6" fill="#0d0d0d" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
                                        <circle cx={w.x1} cy={w.y1} r="2" fill="rgba(255,255,255,0.4)" />
                                        {/* Port: outer ring (r=6) + inner dot (r=2) — end */}
                                        <circle cx={w.x2} cy={w.y2} r="6" fill="#0d0d0d" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
                                        <circle cx={w.x2} cy={w.y2} r="2" fill="rgba(255,255,255,0.4)" />
                                    </g>
                                )
                            })}
                        </svg>

                        {/* === DRAGGABLE CARDS (TapNow node style) === */}

                        {/* Reference Card */}
                        <div
                            ref={el => { cardRefs.current.reference = el }}
                            className="absolute z-20 select-none group touch-none"
                            style={{
                                left: `${positions.reference.x}%`,
                                top: `${positions.reference.y}%`,
                                cursor: dragging === 'reference' ? 'grabbing' : 'grab',
                            }}
                            onPointerDown={e => handlePointerDown('reference', e)}
                        >
                            <div className="text-[11px] mb-2 font-normal tracking-wide px-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Reference
                            </div>
                            <div
                                ref={el => { innerCardRefs.current.reference = el }}
                                className="w-[130px] md:w-[190px] h-[95px] md:h-[138px] rounded-[14px] overflow-hidden transition-all duration-300 group-hover:-translate-y-[3px] group-hover:scale-[1.01] group-active:scale-[0.98]"
                                style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                                    background: 'rgba(18,18,18,0.95)',
                                }}
                            >
                                <img src="https://pub-68982972900648a6b75dcc11da69a242.r2.dev/public/hero-section-card/reference_image.png" alt="" className="w-full h-full object-cover" draggable={false} />
                            </div>
                        </div>

                        {/* Image Generation Card */}
                        <div
                            ref={el => { cardRefs.current.imageGen = el }}
                            className="absolute z-20 select-none group touch-none"
                            style={{
                                left: `${positions.imageGen.x}%`,
                                top: `${positions.imageGen.y}%`,
                                cursor: dragging === 'imageGen' ? 'grabbing' : 'grab',
                            }}
                            onPointerDown={e => handlePointerDown('imageGen', e)}
                        >
                            <div className="text-[11px] mb-2 font-normal tracking-wide text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Image Generation
                            </div>
                            <div
                                ref={el => { innerCardRefs.current.imageGen = el }}
                                className="w-[160px] md:w-[244px] h-[120px] md:h-[190px] rounded-[16px] overflow-hidden transition-all duration-300 group-hover:-translate-y-[3px] group-hover:scale-[1.01] group-active:scale-[0.98]"
                                style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 25px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)',
                                    background: 'rgba(18,18,18,0.95)',
                                }}
                            >
                                <img src="https://pub-68982972900648a6b75dcc11da69a242.r2.dev/public/hero-section-card/generated_image.png" alt="" className="w-full h-full object-cover" draggable={false} />
                            </div>
                        </div>

                        {/* Video Generation Card */}
                        <div
                            ref={el => { cardRefs.current.videoGen = el }}
                            className="absolute z-20 select-none group touch-none"
                            style={{
                                left: `${positions.videoGen.x}%`,
                                top: `${positions.videoGen.y}%`,
                                cursor: dragging === 'videoGen' ? 'grabbing' : 'grab',
                            }}
                            onPointerDown={e => handlePointerDown('videoGen', e)}
                        >
                            <div className="text-[11px] mb-2 font-normal tracking-wide px-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Video Generation
                            </div>
                            <div
                                ref={el => { innerCardRefs.current.videoGen = el }}
                                className="w-[160px] md:w-[244px] h-[115px] md:h-[175px] rounded-[16px] overflow-hidden transition-all duration-300 group-hover:-translate-y-[3px] group-hover:scale-[1.01] group-active:scale-[0.98]"
                                style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 25px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)',
                                    background: 'rgba(18,18,18,0.95)',
                                }}
                            >
                                <video
                                    src="https://pub-68982972900648a6b75dcc11da69a242.r2.dev/public/hero-section-card/video.mp4"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        {/* Prompt / Poem Text Card */}
                        <div
                            ref={el => { cardRefs.current.prompt = el }}
                            className="absolute z-20 select-none group touch-none"
                            style={{
                                right: '2%',
                                top: `${positions.prompt.y}%`,
                                cursor: dragging === 'prompt' ? 'grabbing' : 'grab',
                            }}
                            onPointerDown={e => handlePointerDown('prompt', e)}
                        >
                            <div className="text-[11px] mb-2 font-normal tracking-wide px-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Prompt
                            </div>
                            <div
                                ref={el => { innerCardRefs.current.prompt = el }}
                                className="px-3.5 py-4 rounded-[14px] w-[140px] md:w-[168px] transition-all duration-300 group-hover:-translate-y-[3px] group-hover:scale-[1.01] group-active:scale-[0.98]"
                                style={{
                                    background: 'rgba(18,18,18,0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                                }}
                            >
                                <p className="text-[10px] md:text-[10.5px] leading-[1.45] font-light" style={{ color: 'rgba(240,237,232,0.7)' }}>
                                    A futuristic black supercar racing through a neon cyberpunk city at night. Cinematic Unreal Engine 5 render.
                                </p>
                            </div>
                        </div>

                        {/* Floating particles */}
                        {[
                            { left: '15%', top: '20%', dur: '5s', delay: '0s', ty: '-12px', tx: '8px' },
                            { left: '70%', top: '60%', dur: '7s', delay: '1s', ty: '10px', tx: '-6px' },
                            { left: '85%', top: '25%', dur: '6s', delay: '2s', ty: '-8px', tx: '12px' },
                            { left: '40%', top: '80%', dur: '8s', delay: '0.5s', ty: '6px', tx: '-10px' },
                            { left: '55%', top: '15%', dur: '5.5s', delay: '1.5s', ty: '-15px', tx: '5px' },
                        ].map((p, i) => (
                            <div
                                key={i}
                                className="absolute w-[3px] h-[3px] rounded-full pointer-events-none z-0"
                                style={{
                                    left: p.left, top: p.top,
                                    background: 'rgba(255,255,255,0.25)',
                                    animation: `heroParticleFloat ${p.dur} ease-in-out ${p.delay} infinite alternate`,
                                    '--hero-ty': p.ty, '--hero-tx': p.tx,
                                } as any}
                            />
                        ))}
                    </div>

                    {/* Bottom bar */}
                    <div
                        className="relative z-30 flex items-center px-4 gap-3"
                        style={{
                            height: '38px',
                            marginLeft: '48px',
                            background: 'rgba(14,14,14,0.9)',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <History className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.45)' }} />
                        </div>
                        <span className="ml-auto text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.45)' }}>100%</span>
                    </div>
                </div>

                {/* Drag hint */}
                <div ref={hintRef} className="flex justify-center mt-7 opacity-0">
                    <p className="text-[11px] tracking-[0.5px] font-light" style={{ color: 'rgba(100,100,100,0.6)' }}>
                        Drag nodes · Connect ideas · Generate
                    </p>
                </div>
            </div>

            {/* Scroll hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-20 animate-bounce z-30 pointer-events-none">
                <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-zinc-600 to-transparent rounded-full" />
            </div>

            {/* CSS keyframes via style tag (scoped to component animations) */}
            <style jsx>{`
                @keyframes heroOrbDrift1 {
                    from { transform: translate(0, 0) scale(1); }
                    to { transform: translate(30px, 20px) scale(1.05); }
                }
                @keyframes heroOrbDrift2 {
                    from { transform: translate(0, 0) scale(1); }
                    to { transform: translate(-20px, 30px) scale(1.08); }
                }
                @keyframes heroParticleFloat {
                    from { transform: translateY(0) translateX(0); opacity: 0.15; }
                    to { transform: translateY(var(--hero-ty)) translateX(var(--hero-tx)); opacity: 0.5; }
                }
            `}</style>
        </section>
    )
}

// Sidebar button component
function SidebarBtn({ icon, active }: { icon: React.ReactNode; active?: boolean }) {
    return (
        <button
            className="w-[34px] h-[34px] rounded-lg border-none flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-white/[0.07]"
            style={{
                background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: active ? 'rgba(240,237,232,0.9)' : 'rgba(255,255,255,0.3)',
            }}
        >
            {icon}
        </button>
    )
}
