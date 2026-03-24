"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Loader2 } from "lucide-react"
import { gsap } from "gsap"
import { ProtectedRoute } from "@/components/protected-route"
import { CreationCard } from "@/components/profile/creation-card"
import { useAuth } from "@/context/auth-context"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebaseClient"

function CreationsContent() {
  const { user } = useAuth()
  const [creations, setCreations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    let isMounted = true;
    async function loadCreations() {
      setLoading(true)
      try {
        const getUserCreations = httpsCallable(functions, "getUserCreations")
        const result = await getUserCreations()
        if (isMounted) {
          const data = result.data as any
          if (Array.isArray(data)) {
            setCreations(data)
          } else {
            setCreations(data.creations || [])
          }
        }
      } catch (err) {
        console.error("Failed to fetch user creations:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadCreations()
    return () => { isMounted = false }
  }, [user])

  const handleDeleteCreation = (id: string) => {
    setCreations(prev => prev.filter(c => c.id !== id))
  }

  
  useEffect(() => {
    if (gridRef.current && !loading && creations.length > 0) {
      const cards = gridRef.current.querySelectorAll(".creation-card-anim")
      gsap.fromTo(
        cards,
        { opacity: 0, scale: 0.95, y: 30 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.05,
          ease: "expo.out",
          clearProps: "all"
        }
      )
    }
  }, [loading, creations])

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-100">

      {}
      <section className="relative border-b border-white/5 bg-[#050505] overflow-hidden">
        {}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505] pointer-events-none" />

        <div className="relative mx-auto max-w-[1600px] px-6 lg:px-12 py-20 md:py-32">
          <div className="max-w-4xl relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
              My Creations
            </h1>
            <p className="text-lg md:text-2xl text-slate-400 font-light leading-relaxed max-w-2xl text-balance">
              Your personal creative archive. <br />
              All your AI-generated assets, perfectly organized.
            </p>
          </div>

          {}
          <div className="absolute top-1/2 right-10 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
        </div>
      </section>

      {}
      <section className="mx-auto max-w-[1600px] px-6 lg:px-12 py-16 min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full blur-xl bg-purple-500/30 animate-pulse-slow" />
              <Loader2 className="w-10 h-10 text-white animate-spin relative z-10" />
            </div>
            <p className="text-slate-400 tracking-widest uppercase text-sm font-bold animate-pulse">Loading Archive</p>
          </div>
        ) : creations.length > 0 ? (
          <div
            ref={gridRef}
            className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-8 space-y-8"
          >
            {creations.map((c, i) => {
              const mappedItem = {
                id: c.id,
                appName: c.title || c.prompt || "Untitled Creation",
                previewUrl: c.outputUrl || c.thumbnailUrl || "",
                type: c.type || (c.outputUrl?.includes('.mp4') ? 'video' : 'image'),
                remixCount: 0,
                likes: 0,
                date: new Date(c.createdAt?._seconds ? c.createdAt._seconds * 1000 : c.createdAt).toLocaleDateString(),
                model: c.model,
                prompt: c.prompt
              };
              return (
                <div key={c.id} className="creation-card-anim break-inside-avoid mb-8">
                  <CreationCard item={mappedItem} index={i} onDelete={handleDeleteCreation} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.02] rounded-3xl border border-white/5">
            <div className="relative mb-8 group">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative h-24 w-24 rounded-full bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md transition-transform duration-500 group-hover:scale-105">
                <LayoutGrid className="h-8 w-8 text-zinc-400 group-hover:text-purple-400 transition-colors duration-300" />
              </div>
            </div>

            <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">
              Your Archive is Empty
            </h3>
            <p className="text-zinc-500 max-w-md mb-10 leading-relaxed font-light text-lg">
              Generate your first piece of art to start building your personal gallery.
            </p>

            <Button
              size="lg"
              className="rounded-xl px-10 h-14 bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-300 shadow-[0_10px_40px_rgba(79,70,229,0.3)] hover:shadow-[0_10px_60px_rgba(79,70,229,0.5)] font-semibold tracking-wide text-base hover:-translate-y-1"
              asChild
            >
              <a href="/studio">
                Open Studio
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

