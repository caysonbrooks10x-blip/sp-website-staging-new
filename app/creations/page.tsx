"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { StudioCreationCard } from "@/components/studio-creation-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, LayoutGrid, List as ListIcon, Filter } from "lucide-react"
import { gsap } from "gsap"
import type { Creation } from "@/lib/types"
import { ProtectedRoute } from "@/components/protected-route"

// Extended mock data to test various states
// Mock data removed per user request

type FilterType = "all" | "completed" | "processing" | "draft" | "failed"
type SortType = "newest" | "oldest" | "name"

function CreationsContent() {
  const [layout, setLayout] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [sort, setSort] = useState<SortType>("newest")
  const gridRef = useRef<HTMLDivElement>(null)

  // No mock data - waiting for real backend integration
  const filteredCreations: Creation[] = []

  /* 
   * Filter/Sort logic reserved for future data integration
   * 
   * const filteredCreations = creations
   *   .filter(...)
   *   .sort(...)
   */

  // GSAP Entry Animation
  useEffect(() => {
    // ... animation logic remains same or simplified
  }, [layout, filter, sort, search])

  // GSAP Entry Animation
  useEffect(() => {
    // Basic stagger for cards when layout or filter changes
    if (gridRef.current) {
      const cards = gridRef.current.querySelectorAll(".creation-card-anim")
      gsap.fromTo(
        cards,
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out",
          clearProps: "all"
        }
      )
    }
  }, [layout, filter, sort, search])

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">

      {/* 1. HERO / HEADER ZONE */}
      <section className="relative border-b border-white/5 bg-[#09090b]">
        {/* Subtle decorative gradient */}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/10 via-[#09090b] to-[#09090b] pointer-events-none" />

        <div className="relative mx-auto max-w-[1600px] px-6 lg:px-12 py-20 md:py-32">
          <div className="max-w-4xl relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-zinc-500 mb-6 font-serif">
              My Personal Studio
            </h1>
            <p className="text-lg md:text-2xl text-zinc-400 font-light leading-relaxed max-w-2xl text-balance">
              Review, manage, and showcase your generations. <br />
              Your personal archive of AI-generated assets.
            </p>
          </div>

          {/* Decorative Glow */}
          <div className="absolute top-1/2 right-10 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
        </div>
      </section>

      {/* 3. CREATIONS GRID */}
      <section className="mx-auto max-w-[1600px] px-6 lg:px-12 py-12 min-h-[500px]">
        {filteredCreations.length > 0 ? (
          <div
            ref={gridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredCreations.map((creation) => (
              <div key={creation.id} className="creation-card-anim">
                <StudioCreationCard creation={creation} layout="grid" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="relative mb-8 group">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative h-24 w-24 rounded-full bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:scale-105 transition-transform duration-500">
                <LayoutGrid className="h-8 w-8 text-zinc-400 group-hover:text-purple-400 transition-colors duration-300" />
              </div>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
              Your Studio Archive
            </h3>
            <p className="text-zinc-500 max-w-md mb-10 leading-relaxed font-light text-lg">
              This space is reserved for your future masterpieces. <br />
              Ready to create something extraordinary?
            </p>

            <Button
              size="lg"
              className="rounded-full px-10 h-14 bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] font-medium text-base"
              asChild
            >
              <a href="/studio">
                Open Creative Studio
              </a>
            </Button>
          </div>
        )}
      </section>
    </main>
  )
}

export default function CreationsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <CreationsContent />
      </Suspense>
    </ProtectedRoute>
  )
}

