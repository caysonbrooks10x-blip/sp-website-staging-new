"use client"

import { useRef, useLayoutEffect, useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, Plus, Workflow, SlidersHorizontal, MessageCircle, History, LayoutGrid, RotateCcw } from "lucide-react"
import { ASSET_BASE } from "@/lib/assets"
import { gsap } from "gsap"
import { BrandScroll } from "@/components/brand-scroll"

interface HeroStateProps {
    register: (cb: (progress: number, index: number) => void) => () => void
}

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
    const videoRef = useRef<HTMLVideoElement>(null)

    
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({
        prompt: null, reference: null, imageGen: null, videoGen: null,
    })
    const innerCardRefs = useRef<Record<string, HTMLDivElement | null>>({
        prompt: null, reference: null, imageGen: null, videoGen: null,
    })

    const [mounted, setMounted] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [dragging, setDragging] = useState<string | null>(null)
    const [wireUpdate, setWireUpdate] = useState(0)
    const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

    
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({
        reference: { x: 2.3, y: 14.8 },
        imageGen: { x: 38.3, y: 2.5 },
        videoGen: { x: 30.5, y: 46.0 },
        prompt: { x: 68.5, y: 37.0 },
    })

    useEffect(() => {
        setMounted(true)
        const mobile = window.innerWidth < 768
        setIsMobile(mobile)
        if (mobile) {
            setPositions({
                reference: { x: 2, y: 15 },
                imageGen: { x: 34, y: 5 },
                videoGen: { x: 40, y: 55 },
                prompt: { x: 72, y: 30 },
            })
        }
    }, [])

    
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

    const resetCards = useCallback(() => {
        const isMobile = window.innerWidth < 768;
        const targets = isMobile ? {
            reference: { x: 2, y: 15 },
            imageGen: { x: 34, y: 5 },
            videoGen: { x: 40, y: 55 },
            prompt: { x: 72, y: 30 },
        } : {
            reference: { x: 2.3, y: 14.8 },
            imageGen: { x: 38.3, y: 2.5 },
            videoGen: { x: 30.5, y: 46.0 },
            prompt: { x: 68.5, y: 37.0 },
        };

        
        Object.entries(cardRefs.current).forEach(([id, el]) => {
            if (!el) return;
            const target = targets[id as keyof typeof targets];
            if (!target) return;

            gsap.to(el, {
                left: `${target.x}%`,
                top: `${target.y}%`,
                duration: 1.2,
                ease: "elastic.out(1, 0.8)",
                onUpdate: () => setWireUpdate(v => v + 1),
                onComplete: () => {
                    
                    setPositions(targets);
                }
            });
        });

        
        const refreshIcon = document.getElementById('hero-refresh-icon');
        if (refreshIcon) {
            gsap.fromTo(refreshIcon, { rotate: 0 }, { rotate: 360, duration: 0.8, ease: "power2.inOut" });
        }

        
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
        }
    }, []);

    
    const getCardEdge = useCallback((fromId: string, toId: string): { x1: number; y1: number; x2: number; y2: number } | null => {
        const fromParent = cardRefs.current[fromId]
        const toParent = cardRefs.current[toId]
        const fromInner = innerCardRefs.current[fromId]
        const toInner = innerCardRefs.current[toId]

        if (!fromParent || !toParent || !fromInner || !toInner) return null

        
        const x1 = fromParent.offsetLeft + fromInner.offsetLeft + fromInner.offsetWidth
        
        const y1 = fromParent.offsetTop + fromInner.offsetTop + fromInner.offsetHeight / 2

        
        const x2 = toParent.offsetLeft + toInner.offsetLeft
        
        const y2 = toParent.offsetTop + toInner.offsetTop + toInner.offsetHeight / 2

        return { x1, y1, x2, y2 }
    }, [])

    
    useEffect(() => {
        if (!mounted) return
        const dotCanvas = dotCanvasRef.current
        if (!dotCanvas) return

        const ctx2d = dotCanvas.getContext('2d')
        if (!ctx2d) return

        const GAP = 28
        const RADIUS = 140
        const BASE = 0.12
        const PEAK = 0.35
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
                    const op = BASE + (PEAK - BASE) * t * t 
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

    
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
            gsap.set([headingRef.current, buttonsRef.current], { opacity: 0, y: 30 })
            tl.to(headingRef.current, { opacity: 1, y: 0, duration: 0.9 })
                .to(buttonsRef.current, { opacity: 1, y: 0, duration: 0.7 }, "-=0.4")
        }, containerRef)
        return () => ctx.revert()
    }, [])


    
    useEffect(() => {
        const unregister = register((globalProgress) => {
            if (!contentRef.current) return
            const TOTAL = 4
            const slice = 1 / TOTAL
            const heroProgress = Math.min(1, globalProgress / slice)

            const SCROLL_PHASE = 0.7
            const MAX_SCROLL = 250

            if (heroProgress <= SCROLL_PHASE) {
                const scrollP = heroProgress / SCROLL_PHASE
                gsap.set(contentRef.current, {
                    y: -(scrollP * MAX_SCROLL),
                    opacity: 1,
                    scale: 1,
                    force3D: true,
                })
            } else {
                const exitP = (heroProgress - SCROLL_PHASE) / (1 - SCROLL_PHASE)
                const eased = exitP * exitP 
                gsap.set(contentRef.current, {
                    y: -(MAX_SCROLL + eased * 80),
                    opacity: 1 - eased,
                    scale: 1 - 0.02 * eased,
                    force3D: true,
                })
            }
        })
        return () => unregister?.()
    }, [register])

    
    const WIRE_CONFIGS = useMemo(() => [
        { speed: 0.00055, phase: 0.00 },
        { speed: 0.00048, phase: 0.40 },
        { speed: 0.00060, phase: 0.70 },
    ], [])

    
    const wirePaths = useMemo(() => {
        if (!mounted) return []
        return CONNECTIONS.map(([from, to], i) => {
            const edge = getCardEdge(from, to)
            if (!edge) return null
            const { x1, y1, x2, y2 } = edge
            
            const mx = x1 + (x2 - x1) * 0.5
            const cfg = WIRE_CONFIGS[i % WIRE_CONFIGS.length]
            return {
                x1, y1, x2, y2,
                cp1x: mx, cp1y: y1,
                cp2x: mx, cp2y: y2,
                speed: cfg.speed,
                phase: cfg.phase,
                
                p1: { x: x1, y: y1 },
                c1: { x: mx, y: y1 },
                c2: { x: mx, y: y2 },
                p2: { x: x2, y: y2 },
            }
        }).filter(Boolean) as any[]
        
    }, [mounted, wireUpdate, getCardEdge, WIRE_CONFIGS])

    
    useEffect(() => {
        if (!mounted || wirePaths.length === 0) return
        const shimmerCanvas = shimmerCanvasRef.current
        const canvasInner = canvasInnerRef.current
        if (!shimmerCanvas || !canvasInner) return

        const ctx = shimmerCanvas.getContext('2d')
        if (!ctx) return

        const SIGMA = 0.10  
        const STEPS = 120   

        
        function bezPt(p1: { x: number, y: number }, c1: { x: number, y: number }, c2: { x: number, y: number }, p2: { x: number, y: number }, t: number) {
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
                
                const center = (timestamp * wire.speed + wire.phase) % 1.0

                for (let i = 0; i <= STEPS; i++) {
                    const s = i / STEPS

                    
                    let d = s - center
                    if (d > 0.5) d -= 1
                    if (d < -0.5) d += 1

                    
                    const alpha = Math.exp(-(d * d) / (2 * SIGMA * SIGMA))
                    if (alpha < 0.008) continue 

                    const pt = bezPt(wire.p1, wire.c1, wire.c2, wire.p2, s)

                    
                    ctx.beginPath()
                    ctx.arc(pt.x, pt.y, 5.0, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.055).toFixed(4)})`
                    ctx.fill()

                    
                    ctx.beginPath()
                    ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.22).toFixed(4)})`
                    ctx.fill()

                    
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
            className="md:absolute md:inset-0 relative w-full h-auto min-h-[100svh] flex flex-col items-start overflow-hidden pt-24 md:pt-28 2xl:pt-40 pb-6 2xl:pb-12"
            style={{
                background: 'linear-gradient(135deg, #2d3a2e 0%, #4a5d3a 18%, #7a8a5a 35%, #c8b88a 55%, #e8c8a0 70%, #f0b8a0 85%, #e8a8a0 100%)',
            }}
        >
            {}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {}
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
                {}
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
                {}
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
                {}
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

            {}
            <div ref={contentRef} className="relative z-20 w-full max-w-[1100px] mx-auto px-6 sm:px-8 lg:px-12 will-change-transform" style={{ pointerEvents: 'auto' }}>

                {}
                <div className="mb-5 md:mb-4 2xl:mb-10 flex flex-col items-start text-left">
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

                {}
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

                    {}
                    <canvas
                        ref={dotCanvasRef}
                        className="absolute inset-0 pointer-events-none z-[1]"
                    />

                    {}
                    <div
                        className="absolute left-0 top-0 bottom-0 z-30 flex flex-col items-center py-4 px-1 md:px-1.5 gap-1.5 md:gap-2"
                        style={{
                            width: isMobile ? '40px' : '52px',
                            background: 'rgba(12, 12, 12, 0.85)',
                            backdropFilter: 'blur(12px)',
                            borderRight: '1px solid rgba(255,255,255,0.05)',
                        }}
                    >
                        <SidebarBtn icon={<Plus className="w-4 h-4" />} active label="Create New" href="/studio" />
                        <SidebarBtn icon={<Workflow className="w-3.5 h-3.5" />} label="Workflow" href="/studio" />
                        <SidebarBtn icon={<SlidersHorizontal className="w-3.5 h-3.5" />} label="Settings" href="/profile" />
                        <SidebarBtn icon={<MessageCircle className="w-3.5 h-3.5" />} label="Messages" href="/community" />
                        <SidebarBtn icon={<History className="w-3.5 h-3.5" />} label="History" href="/creations" />
                        <SidebarBtn icon={<LayoutGrid className="w-3.5 h-3.5" />} label="Studio" href="/studio" />
                        {}
                        <div className="mt-auto group flex items-center justify-center p-1 cursor-pointer">
                            <div
                                className="w-7 h-7 rounded-full border border-white/10 transition-transform duration-300 group-hover:scale-110 group-active:scale-95 shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #f472b6, #fb923c)' }}
                            />
                        </div>
                    </div>

                    {}
                    <div
                        ref={canvasInnerRef}
                        className="relative min-h-[240px] sm:min-h-[280px] md:min-h-[280px] lg:min-h-[340px] xl:min-h-[360px] 2xl:min-h-[480px]"
                        style={{ marginLeft: isMobile ? '36px' : '48px', cursor: dragging ? 'grabbing' : 'default' }}
                    >

                        {}
                        <div className="absolute top-[15%] left-[25%] w-[300px] h-[200px] rounded-full pointer-events-none opacity-[0.06] blur-[60px]"
                            style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
                        <div className="absolute bottom-[15%] right-[15%] w-[250px] h-[250px] rounded-full pointer-events-none opacity-[0.04] blur-[50px]"
                            style={{ background: 'radial-gradient(circle, #c084fc 0%, transparent 70%)' }} />

                        {}
                        <canvas
                            ref={shimmerCanvasRef}
                            className="absolute inset-0 pointer-events-none z-[9]"
                        />

                        {}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
                            {wirePaths.map((w: any, i: number) => {
                                const d = `M ${w.x1},${w.y1} C ${w.cp1x},${w.cp1y} ${w.cp2x},${w.cp2y} ${w.x2},${w.y2}`
                                return (
                                    <g key={i}>
                                        {}
                                        <path
                                            d={d}
                                            stroke="rgba(255,255,255,0.22)"
                                            strokeWidth="1"
                                            fill="none"
                                            strokeLinecap="round"
                                        />
                                        {}
                                        <circle cx={w.x1} cy={w.y1} r="6" fill="#0d0d0d" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
                                        <circle cx={w.x1} cy={w.y1} r="2" fill="rgba(255,255,255,0.4)" />
                                        {}
                                        <circle cx={w.x2} cy={w.y2} r="6" fill="#0d0d0d" stroke="rgba(255,255,255,0.24)" strokeWidth="1" />
                                        <circle cx={w.x2} cy={w.y2} r="2" fill="rgba(255,255,255,0.4)" />
                                    </g>
                                )
                            })}
                        </svg>

                        {}

                        {}
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
                                className="w-[70px] sm:w-[90px] md:w-[145px] xl:w-[165px] 2xl:w-[190px] h-[50px] sm:h-[65px] md:h-[105px] xl:h-[120px] 2xl:h-[138px] rounded-[8px] sm:rounded-[10px] lg:rounded-[14px] overflow-hidden transition-all duration-300 group-hover:-translate-y-[3px] group-hover:scale-[1.01] group-active:scale-[0.98]"
                                style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                                    background: 'rgba(18,18,18,0.95)',
                                }}
                            >
                                <img src="https://pub-68982972900648a6b75dcc11da69a242.r2.dev/public/hero-section-card/reference_image.png" alt="" className="w-full h-full object-cover" draggable={false} />
                            </div>
                        </div>

                        {}
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
                                className="w-[85px] sm:w-[105px] md:w-[145px] xl:w-[165px] 2xl:w-[220px] h-[60px] sm:h-[76px] md:h-[105px] xl:h-[120px] 2xl:h-[160px] rounded-[8px] sm:rounded-[12px] lg:rounded-[16px] overflow-hidden transition-all duration-300 group-hover:-translate-y-[3px] group-hover:scale-[1.01] group-active:scale-[0.98]"
                                style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 25px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)',
                                    background: 'rgba(18,18,18,0.95)',
                                }}
                            >
                                <img src="https://pub-68982972900648a6b75dcc11da69a242.r2.dev/public/hero-section-card/generated_image.png" alt="" className="w-full h-full object-cover" draggable={false} />
                            </div>
                        </div>

                        {}
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
                                className="w-[85px] sm:w-[105px] md:w-[145px] xl:w-[165px] 2xl:w-[220px] h-[60px] sm:h-[76px] md:h-[105px] xl:h-[120px] 2xl:h-[160px] rounded-[8px] sm:rounded-[12px] lg:rounded-[16px] overflow-hidden transition-all duration-300 group-hover:-translate-y-[3px] group-hover:scale-[1.01] group-active:scale-[0.98]"
                                style={{
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 25px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)',
                                    background: 'rgba(18,18,18,0.95)',
                                }}
                            >
                                <video
                                    ref={videoRef}
                                    src="https://pub-68982972900648a6b75dcc11da69a242.r2.dev/public/hero-section-card/video.mp4"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        {}
                        <div
                            ref={el => { cardRefs.current.prompt = el }}
                            className="absolute z-20 select-none group touch-none"
                            style={{
                                left: `${positions.prompt.x}%`,
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
                                className="px-2 sm:px-2.5 md:px-3 py-2 sm:py-3 md:py-3 rounded-[8px] sm:rounded-[10px] lg:rounded-[14px] w-[75px] sm:w-[95px] md:w-[145px] xl:w-[160px] 2xl:w-[168px] transition-all duration-300 group-hover:-translate-y-[3px] group-hover:scale-[1.01] group-active:scale-[0.98]"
                                style={{
                                    background: 'rgba(18,18,18,0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                                }}
                            >
                                <p className="text-[7px] sm:text-[8px] md:text-[10.5px] leading-[1.3] sm:leading-[1.35] md:leading-[1.45] font-light" style={{ color: 'rgba(240,237,232,0.7)' }}>
                                    A futuristic black supercar racing through a neon cyberpunk city at night. Cinematic Unreal Engine 5 render.
                                </p>
                            </div>
                        </div>

                        {}
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

                    {}
                    <div
                        className="relative z-30 flex items-center px-3 md:px-4 gap-3"
                        style={{
                            height: '38px',
                            marginLeft: isMobile ? '36px' : '48px',
                            background: 'rgba(14,14,14,0.9)',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors group"
                            onClick={resetCards}
                            title="Reset Positions"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <RotateCcw id="hero-refresh-icon" className="w-3 h-3 transition-colors group-hover:text-white" style={{ color: 'rgba(255,255,255,0.45)' }} />
                        </div>
                        <span className="ml-auto text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.45)' }}>100%</span>
                    </div>
                </div>

                {}
                <div className="w-full mt-8">
                    <BrandScroll />
                </div>
            </div>

            {}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-20 animate-bounce z-30 pointer-events-none">
                <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-zinc-600 to-transparent rounded-full" />
            </div>

            {}
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


function SidebarBtn({ icon, active, label, href }: { icon: React.ReactNode; active?: boolean; label: string; href: string }) {
    return (
        <Link href={href}>
            <button
                className="group relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center cursor-pointer transition-all duration-300 outline-none"
            >
                {}
                <div
                    className="absolute left-[58px] px-4 py-2 rounded-xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/[0.08] whitespace-nowrap opacity-0 -translate-x-4 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:translate-x-0 z-50 flex items-center gap-2.5"
                    style={{
                        boxShadow: '0 20px 50px -12px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.05)',
                    }}
                >
                    <div className="w-[3px] h-[3px] rounded-full bg-white/40" />
                    <span className="text-[11px] font-semibold tracking-[0.08em] text-white/90 font-sans uppercase">{label}</span>
                </div>

                {}
                <div
                    className={`absolute inset-0 rounded-[14px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                        ${active
                            ? 'bg-white/10 opacity-100 scale-100'
                            : 'bg-white/10 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 group-active:scale-90'
                        }`}
                />

                {}
                {active && (
                    <div className="absolute left-0 w-0.5 h-3 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                )}

                {}
                <div
                    className={`relative z-10 transition-all duration-300 ease-out transform group-hover:scale-110 
                        ${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-200'}`}
                >
                    {icon}
                </div>
            </button>
        </Link>
    )
}
