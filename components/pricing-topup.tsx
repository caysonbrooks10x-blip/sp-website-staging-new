"use client"

import { cn } from "@/lib/utils"
import { Sparkles, Infinity as InfinityIcon, Zap } from "lucide-react"

interface TopUpPack {
  price: number
  credits: number
  highlight?: boolean
  badge?: string
  stripeLink?: string
}

const TOPUP_PACKS: TopUpPack[] = [
  { price: 10, credits: 2000 },
  { price: 50, credits: 10000 },
  { price: 100, credits: 20000, highlight: true, badge: "Popular" },
  { price: 200, credits: 40000 },
  { price: 500, credits: 100000, badge: "Best value" },
]

export function PricingTopUp() {
  return (
    <section id="top-up" className="relative z-10 pb-24 px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
            <Zap className="w-3.5 h-3.5" /> Buy Credits
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-white">
            Top up anytime — <span className="text-cyan-400">never expire</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
            One-time credit packs work on any plan. $1 = 200 credits, always.
            Top-up credits are consumed before your monthly subscription credits and never expire.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {TOPUP_PACKS.map((pack) => (
            <div
              key={pack.price}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5",
                pack.highlight
                  ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent shadow-[0_20px_60px_rgba(6,182,212,0.15)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              )}
            >
              {pack.badge && (
                <div className={cn(
                  "absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.14em] border whitespace-nowrap",
                  pack.highlight
                    ? "bg-cyan-500 text-black border-cyan-500"
                    : "bg-white/10 text-zinc-200 border-white/20"
                )}>
                  {pack.badge}
                </div>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">${pack.price}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-semibold">{pack.credits.toLocaleString()}</span>
                <span className="text-zinc-500">credits</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                $0.005 / credit
              </div>
              <div className="mt-4 flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                <InfinityIcon className="w-3 h-3" /> Never expire
              </div>
              <button
                type="button"
                onClick={() => {
                  if (pack.stripeLink) window.location.href = pack.stripeLink
                }}
                className={cn(
                  "mt-5 h-10 rounded-lg text-[11px] font-bold uppercase tracking-[0.16em] transition-all",
                  pack.highlight
                    ? "bg-cyan-500 text-black hover:bg-cyan-400"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                )}
              >
                Buy now
              </button>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-zinc-500">
          Top-ups apply to any active plan. Subscription credits refresh monthly (no rollover). Top-up credits never expire and are spent first.
        </p>
      </div>
    </section>
  )
}
