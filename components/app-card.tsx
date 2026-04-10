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
          "relative h-full flex flex-col rounded-2xl overflow-hidden transition-all duration-500 ease-out",
          "hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
        )}
        style={{
          background: 'rgba(255,255,255,0.22)',
          border: '1px solid rgba(255,255,255,0.50)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,0.70)',
        }}
      >
        {/* Inner top rim highlight — glass edge catching light */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] z-30 pointer-events-none rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.9) 70%, transparent 95%)' }}
        />

        {app.image && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            {app.type === "video" ? (
              <video
                src={app.image}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-85 group-hover:opacity-100"
                style={{
                  objectPosition: 'center center',
                  scale: String(app.videoScale ?? 1),
                }}
              />
            ) : (
              <img
                src={app.image}
                alt={app.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-85 group-hover:opacity-100"
                style={{ objectPosition: 'center top' }}
              />
            )}
            {/* Glass gradient — frosted white rising from bottom */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to top, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.55) 38%, rgba(255,255,255,0.10) 65%, transparent 100%)'
            }} />
          </div>
        )}

        {/* Specular highlight on hover */}
        <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.28) 0%, transparent 60%)' }}
        />

        <div className="relative z-20 flex flex-col h-full p-5 mt-auto">
          <div className="mt-auto space-y-3">
            {(app.isNew || app.isPro) && (
              <div className="flex justify-end gap-2">
                {app.isNew && (
                  <Badge className="bg-blue-500/15 text-blue-700 border-0 px-2 py-0.5 text-[10px] font-semibold tracking-wider font-sans backdrop-blur-sm">
                    NEW
                  </Badge>
                )}
                {app.isPro && (
                  <Badge className="bg-purple-500/15 text-purple-700 border-0 px-2 py-0.5 text-[10px] font-semibold tracking-wider font-sans backdrop-blur-sm">
                    PRO
                  </Badge>
                )}
              </div>
            )}

            <div>
              <h3 className="text-xl font-semibold font-sans text-zinc-900 tracking-tight mb-1.5 drop-shadow-sm">
                {app.name}
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed line-clamp-2 font-sans">
                {app.description}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {app.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium px-2 py-1 rounded-md"
                    style={{ background: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(4px)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <Link href={`/studio?mode=${app.type}&prompt=${encodeURIComponent(app.prompt)}&previewUrl=${encodeURIComponent(app.image || "")}`}>
                <Button
                  size="sm"
                  className="h-8 px-4 rounded-full text-zinc-900 font-medium text-xs border border-white/50 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                  style={{ background: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(12px)' }}
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
