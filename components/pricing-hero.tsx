"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PricingHeroProps {
    billingCycle: "monthly" | "yearly"
    setBillingCycle: (cycle: "monthly" | "yearly") => void
}

export function PricingHero({ billingCycle, setBillingCycle }: PricingHeroProps) {
    return (
        <section className="relative pt-32 md:pt-44 pb-12 md:pb-20 px-4 overflow-hidden">
            <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6 md:space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-5"
                >
                    <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-white">
                        Select your plan
                    </h1>
                    <p className="text-base md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        The plan isn't about limits. It's about how fast you bring ideas to life.
                    </p>
                </motion.div>

                {/* Billing Toggle */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="flex justify-center"
                >
                    <div className="flex items-center gap-1 bg-white/[0.06] backdrop-blur-sm border border-white/10 p-1 rounded-full">
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={cn(
                                "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative",
                                billingCycle === "monthly"
                                    ? "bg-white text-black shadow-lg"
                                    : "text-zinc-400 hover:text-white"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle("yearly")}
                            className={cn(
                                "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative flex items-center gap-2",
                                billingCycle === "yearly"
                                    ? "bg-white text-black shadow-lg"
                                    : "text-zinc-400 hover:text-white"
                            )}
                        >
                            Annual
                            <span className={cn(
                                "text-[11px] font-bold px-1.5 py-0.5 rounded-md transition-colors duration-300",
                                billingCycle === "yearly"
                                    ? "text-cyan-600"
                                    : "text-cyan-400"
                            )}>
                                SAVE 20%
                            </span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
