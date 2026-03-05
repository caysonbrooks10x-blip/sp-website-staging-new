"use client"

import { Button } from "@/components/ui/button"
import { Check, Sparkles, ArrowRight } from "lucide-react"
import type { PricingPlan } from "@/lib/types"
import { motion, useMotionTemplate, useMotionValue, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

interface PricingCardProps {
  plan: PricingPlan
  index?: number
  billingCycle?: "monthly" | "yearly"
}

export function PricingCard({ plan, index = 0, billingCycle = "monthly" }: PricingCardProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [loading, setLoading] = useState(false)
  const [tierIndex, setTierIndex] = useState(0)

  const currentTier = plan.tiers ? plan.tiers[tierIndex] : null
  const activePrice = currentTier ? currentTier.price : plan.price
  const activeYearlyPrice = currentTier ? currentTier.yearlyPrice : plan.yearlyPrice
  const activeCredits = currentTier ? currentTier.credits : plan.credits

  const effectiveMonthlyPrice =
    billingCycle === "yearly"
      ? Math.round((activeYearlyPrice / 12) * 100) / 100
      : activePrice
  const yearlySavings = activePrice * 12 - activeYearlyPrice

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  const handlePurchase = async () => {
    if (loading) return
    setLoading(true)
    try {
      await api.adminCredits({
        amount: plan.credits,
        plan: plan.id,
        description: `Purchase of ${plan.name} plan`
      })
      alert(`Successfully purchased ${plan.name} plan!`)
    } catch (e) {
      console.error("Purchase failed:", e)
      alert("Purchase failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: "circOut" }}
      className={cn(
        "relative group rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl",
        plan.popular
          ? "border border-cyan-400/40 shadow-[0_0_40px_-12px_rgba(6,182,212,0.3)] bg-[#0a1520]/90 scale-[1.03] hover:shadow-cyan-500/20"
          : "border border-white/[0.08] bg-[#0d1117]/70 hover:border-white/[0.2] hover:bg-[#0d1117]/90 hover:shadow-white/10"
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight hover effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              500px circle at ${mouseX}px ${mouseY}px,
              ${plan.popular ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.04)'},
              transparent 80%
            )
          `,
        }}
      />

      {/* Content */}
      <div className="relative p-8 h-full flex flex-col">
        {/* Popular badge */}
        {plan.popular && (
          <div className="absolute top-0 right-0 p-4">
            <div className="bg-cyan-500/10 backdrop-blur-md border border-cyan-400/20 text-cyan-400 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              Most Popular
            </div>
          </div>
        )}

        {/* Plan name */}
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-[0.2em] mb-1">
          {plan.name}
        </h3>

        {/* Best for */}
        <p className="text-xs text-zinc-500 mb-6">{plan.bestFor}</p>

        {/* Tier Slider (if config exists) */}
        {plan.tiers && plan.tiers.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="flex justify-between text-xs font-semibold text-zinc-400">
              {plan.tiers.map((tier, i) => (
                <span
                  key={i}
                  className={cn(
                    "cursor-pointer transition-colors px-1",
                    tierIndex === i ? "text-cyan-400" : "hover:text-white"
                  )}
                  onClick={() => setTierIndex(i)}
                >
                  {tier.credits >= 1000 ? `${tier.credits / 1000}k` : tier.credits}
                </span>
              ))}
            </div>

            <div className="relative h-1.5 w-full bg-white/[0.08] rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 pointer-events-none"
                style={{ width: `${(tierIndex / (plan.tiers.length - 1)) * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={plan.tiers.length - 1}
                value={tierIndex}
                onChange={(e) => setTierIndex(Number(e.target.value))}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="absolute top-1/2 -mt-2.5 -ml-2.5 w-5 h-5 bg-white border-2 border-cyan-500 rounded-full shadow-lg shadow-cyan-500/50 transition-all duration-300 pointer-events-none"
                style={{ left: `${(tierIndex / (plan.tiers.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Price */}
        <div className="mb-2 h-14">
          <div className="flex items-baseline gap-2 h-full">
            <div className="relative inline-flex items-baseline h-full overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={`${billingCycle}-${activePrice}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-5xl font-bold text-white tracking-tight"
                >
                  ${billingCycle === "yearly" ? effectiveMonthlyPrice.toFixed(0) : activePrice}
                </motion.span>
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              {billingCycle === "yearly" ? (
                <motion.span
                  key={`strike-yearly-${activePrice}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg text-zinc-500 line-through font-medium"
                >
                  ${activePrice}
                </motion.span>
              ) : (
                <motion.span
                  key={`strike-monthly-${activePrice}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-lg text-zinc-500 line-through font-medium"
                >
                  ${Math.round(activePrice / 0.85)}
                </motion.span>
              )}
            </AnimatePresence>
            <span className="text-zinc-500 text-sm font-medium">/Month</span>

            {/* Bonus Badge for high tiers */}
            {activeCredits >= 48000 && activeCredits < 60000 && (
              <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">+7% Bonus</span>
            )}
            {activeCredits >= 60000 && (
              <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">+15% Bonus</span>
            )}
          </div>
        </div>

        {/* Billing info & Credit Box */}
        <div className="mb-6 flex flex-col gap-4">
          <AnimatePresence mode="sync">
            {billingCycle === "yearly" && (
              <motion.div
                key="yearly-text"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-1 overflow-hidden"
              >
                <p className="text-xs text-zinc-500 pt-1">
                  Billed annually, total <span className="text-zinc-300">${activeYearlyPrice.toLocaleString()}</span>/year
                </p>
                {yearlySavings > 0 && (
                  <p className="text-xs text-emerald-400 font-medium">
                    You save ${yearlySavings}/yr
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Credit/Top-up Box System Always Visible */}
          <div className="relative mt-2">
            {/* Overlapping Badge */}
            <div className="absolute -top-3 left-4 z-10 flex items-center gap-2">
              <span className="text-[11px] text-cyan-400 bg-[#042021] border border-cyan-500/20 px-2.5 py-1 rounded-md font-medium">
                Spend top-ups first
              </span>
            </div>

            {/* Main Box containing both Monthly Credit and Top-up info */}
            <div className="pt-6 pb-4 px-4 rounded-xl bg-[#1a1f26] border border-white/[0.08] flex flex-col gap-4 transition-colors hover:bg-[#1a1f26]/80">
              {/* Monthly Credit info */}
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-300">Monthly Credit <span className="text-[11px] font-normal text-zinc-500 ml-1">(No rollover)</span></span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={activeCredits}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 10, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="inline-block"
                      >
                        {activeCredits.toLocaleString()}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="text-base font-medium text-zinc-300">Credits</span>
                </div>
              </div>

              <div className="h-px w-full bg-white/[0.06]" />

              {/* Next top-up info */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-400">Next top-up</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold text-white tracking-tight">$1=200</span>
                  <span className="text-sm font-medium text-zinc-400">Credits <span className="text-[11px] ml-1 text-emerald-500/80">(Never expire)</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Generation Estimates */}
        <div className="mb-6 rounded-xl bg-cyan-950/20 border border-cyan-500/10 p-3">
          <p className="text-[11px] text-cyan-200/70 leading-relaxed text-center font-medium">
            Up to <strong className="text-cyan-300">~{Math.floor(activeCredits / 12).toLocaleString()}</strong> GPT-4o | <strong className="text-cyan-300">~{Math.floor(activeCredits / 27).toLocaleString()}</strong> Seedance 1.5 | <strong className="text-cyan-300">~{Math.floor(activeCredits / 60).toLocaleString()}</strong> AI Music | <strong className="text-cyan-300">~{Math.floor(activeCredits / 300).toLocaleString()}</strong> Sora 2 Pro | <strong className="text-cyan-300">~{Math.floor(activeCredits / 4).toLocaleString()}</strong> Lyrics
          </p>
        </div>

        {/* CTA */}
        <Button
          onClick={handlePurchase}
          disabled={loading}
          className={cn(
            "w-full h-12 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden mb-8",
            plan.popular
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02]"
              : "bg-gradient-to-r from-cyan-500/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-600 text-white hover:scale-[1.02]"
          )}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? "Processing..." : "Subscribe"}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </span>
        </Button>

        {/* Divider */}
        <div className="border-t border-white/[0.06] mb-6" />

        {/* Features */}
        <div className="space-y-3.5 flex-grow">
          {plan.features.map((feature, i) => {
            let displayText = feature
            // Identify and dynamically update the "credits/month" text
            if (i === 0 && feature.includes("credits/month")) {
              displayText = `${activeCredits.toLocaleString()} credits/month`
            }
            return (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="text-zinc-300 leading-tight">{displayText}</span>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
