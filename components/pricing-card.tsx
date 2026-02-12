"use client"

import { Button } from "@/components/ui/button"
import { Check, Sparkles, ArrowRight } from "lucide-react"
import type { PricingPlan } from "@/lib/types"
import { motion, useMotionTemplate, useMotionValue } from "framer-motion"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
// Removed UnifiedCard import to build a custom premium card

interface PricingCardProps {
  plan: PricingPlan
  index?: number
  billingCycle?: "monthly" | "yearly"
}

export function PricingCard({ plan, index = 0, billingCycle = "monthly" }: PricingCardProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [loading, setLoading] = useState(false)

  // Calculate price based on billing cycle (simple mock logic: 20% off for year)
  const displayPrice =
    billingCycle === "yearly" ? Math.floor(plan.price * 0.8) : plan.price

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  const handlePurchase = async () => {
    if (loading) return
    setLoading(true)
    try {
      console.log("Purchasing plan:", plan.name)
      // Simulate or perform purchase/credit addition
      await api.adminCredits({
        amount: plan.credits,
        plan: plan.id,
        description: `Purchase of ${plan.name} plan`
      })
      alert(`Successfully purchased ${plan.name} plan! Credentials added.`)
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
        "relative group rounded-3xl border border-white/10 bg-gray-900/40 backdrop-blur-md overflow-hidden",
        plan.popular ? "z-10 bg-gray-900/60 shadow-2xl shadow-primary/20 scale-105 border-primary/50 ring-1 ring-primary/20" : "hover:bg-gray-900/60 hover:border-white/20"
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight Effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 255, 255, 0.1),
              transparent 80%
            )
          `,
        }}
      />

      {/* Content */}
      <div className="relative p-8 h-full flex flex-col">
        {plan.popular && (
          <div className="absolute top-0 right-0 p-4">
            <div className="bg-primary/20 backdrop-blur-md border border-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-primary/10">
              <Sparkles className="w-3 h-3" />
              MOST POPULAR
            </div>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-lg font-medium text-muted-foreground uppercase tracking-wider mb-2">{plan.name}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-foreground transition-all duration-300">
              ${displayPrice}
            </span>
            <span className="text-muted-foreground font-medium">/mo</span>
          </div>
          {billingCycle === "yearly" && plan.price > 0 && (
            <p className="text-xs text-emerald-400 mt-2 font-medium">
              Billed ${displayPrice * 12} yearly
            </p>
          )}
        </div>

        {/* Features List */}
        <div className="space-y-4 flex-grow mb-8">
          {plan.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-foreground/80">
              <div className={cn(
                "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                plan.popular ? "bg-primary text-primary-foreground" : "bg-white/10 text-foreground"
              )}>
                <Check className="w-3 h-3" />
              </div>
              <span className="leading-tight">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={handlePurchase}
          disabled={loading}
          className={cn(
            "w-full h-12 rounded-xl text-base font-semibold group-hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden",
            plan.popular
              ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-white/10 hover:bg-white/20 text-foreground border border-white/10"
          )}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? "Processing..." : "Get Started"}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </span>
          {/* Subtle shine effect for popular button */}
          {plan.popular && !loading && (
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
          )}
        </Button>
      </div>
    </motion.div>
  )
}
