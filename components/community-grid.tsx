"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { CommunityPostCard } from "@/components/community-post-card"
import { communityPosts } from "@/lib/community-data"

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

export function CommunityGrid() {
    const gridRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Masonry Entrance
            const cards = gsap.utils.toArray<HTMLElement>(".community-card-inner")

            // Set initial state
            gsap.set(cards, { opacity: 0, y: 30 })

            ScrollTrigger.batch(cards, {
                onEnter: (batch) => {
                    gsap.to(batch, {
                        opacity: 1,
                        y: 0,
                        duration: 0.8,
                        stagger: 0.08,
                        ease: "power2.out",
                        overwrite: true
                    })
                },
                start: "top 95%",
                once: true
            })
        }, gridRef)

        // Trigger refresh slightly after mount to ensure layout is ready
        const timer = setTimeout(() => {
            ScrollTrigger.refresh()
        }, 100)

        return () => {
            ctx.revert()
            clearTimeout(timer)
        }
    }, [])

    return (
        <div ref={gridRef} className="columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-6 space-y-6">
            {communityPosts.map((post, index) => (
                <div
                    key={post.id}
                    className="break-inside-avoid mb-6"
                >
                    <div className="community-card-inner opacity-0 translate-y-8 rounded-xl overflow-hidden block">
                        <CommunityPostCard post={post} index={index} />
                    </div>
                </div>
            ))}
        </div>
    )
}
