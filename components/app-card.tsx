"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import type { App } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AppCardProps {
  app: App
  onTryNow?: (appId: string) => void
}

export function AppCard({ app, onTryNow }: AppCardProps) {
  return (
    <div className="relative h-full w-full group">
      <div
        className={cn(
          "relative h-full flex flex-col rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md transition-all duration-500 ease-out overflow-hidden hover:border-white/20 hover:bg-zinc-900/60 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/50"
        )}
      >
        {app.image && (
          <div className="absolute inset-0 h-[70%] z-0 overflow-hidden">
            {app.type === "video" ? (
              <video
                src={app.image}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-70 group-hover:opacity-100"
              />
            ) : (
              <img
                src={app.image}
                alt={app.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-70 group-hover:opacity-100"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
          </div>
        )}

        <div className="relative z-20 flex flex-col h-full p-5 mt-auto">
          <div className="mt-auto space-y-4">
            <div className="flex justify-end gap-2">
              {app.isNew && (
                <Badge className="bg-blue-500/20 text-blue-300 border-0 px-2 py-0.5 text-[10px] font-semibold tracking-wider font-sans">
                  NEW
                </Badge>
              )}
              {app.isPro && (
                <Badge className="bg-purple-500/20 text-purple-300 border-0 px-2 py-0.5 text-[10px] font-semibold tracking-wider font-sans">
                  PRO
                </Badge>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold font-sans text-white tracking-tight mb-1.5">
                {app.name}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2 font-sans opacity-80">
                {app.description}
              </p>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {app.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium px-2 py-1 rounded-md bg-white/5"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <Link href={`/studio?mode=${app.type}&prompt=${encodeURIComponent(app.prompt)}&previewUrl=${encodeURIComponent(app.image || "")}`}>
                <Button
                  size="sm"
                  className="h-8 px-4 rounded-full bg-white/10 hover:bg-white hover:text-black text-white border border-white/5 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 text-xs font-medium"
                >
                  Use Template
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}