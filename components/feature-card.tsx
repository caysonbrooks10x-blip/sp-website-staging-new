"use client"

import React, { useRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface FeatureCardProps {
    title: string
    description: string
    icon: LucideIcon
    className?: string
}

export function FeatureCard({ title, description, icon: Icon, className }: FeatureCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [rotation, setRotation] = useState({ x: 0, y: 0 })
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isHovering, setIsHovering] = useState(false)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return

        const rect = cardRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const x = e.clientX - centerX
        const y = e.clientY - centerY

        // Calculate rotation (tilt)
        // Max rotation roughly 10 deg
        const rotateX = (y / (rect.height / 2)) * -10
        const rotateY = (x / (rect.width / 2)) * 10

        setRotation({ x: rotateX, y: rotateY })

        // Calculate spotlight position relative to card
        setPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        })
    }

    const handleMouseEnter = () => setIsHovering(true)
    const handleMouseLeave = () => {
        setIsHovering(false)
        setRotation({ x: 0, y: 0 })
    }

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "relative group h-full rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-md overflow-hidden transition-all duration-300 ease-out",
                className
            )}
            style={{
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                transformStyle: "preserve-3d",
            }}
        >
            {/* Spotlight Effect */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transitionDuration-300 group-hover:opacity-100 z-10"
                style={{
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.1), transparent 40%)`,
                }}
            />

            {/* Glowing Border Gradient */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
                style={{
                    background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.15), transparent 40%)`,
                    maskImage: `linear-gradient(black, black) content-box, linear-gradient(black, black)`,
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    padding: '1px',
                }}
            />

            <div className="relative z-20 p-8 h-full flex flex-col items-start gap-4">
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-zinc-800/50 p-3 ring-1 ring-white/10 group-hover:bg-zinc-700/50 group-hover:scale-110 transition-all duration-500">
                    <Icon className="h-6 w-6 text-zinc-300 group-hover:text-white transition-colors duration-500" />
                </div>

                <h3 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors duration-300 font-serif tracking-tight">
                    {title}
                </h3>

                <p className="text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
                    {description}
                </p>
            </div>

            {/* Bottom shine */}
            <div
                className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"
            />
        </div>
    )
}
