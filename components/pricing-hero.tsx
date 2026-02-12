"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface PricingHeroProps {
    billingCycle: "monthly" | "yearly"
    setBillingCycle: (cycle: "monthly" | "yearly") => void
}

const content = [
    { line1: "Simple, Transparent", line2: "Pricing" },
    { line1: "Powerful, Creative", line2: "Tools" },
    { line1: "Unmatched, Flexible", line2: "Plans" },
    { line1: "Scale Your", line2: "Vision" }
]

export function PricingHero({ billingCycle, setBillingCycle }: PricingHeroProps) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % content.length)
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-60 pointer-events-none blur-3xl" />

            <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                >
                    <div className="h-[140px] md:h-[180px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.h1
                                key={index}
                                initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                                animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                                exit={{ opacity: 0, filter: "blur(10px)", scale: 1.05 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="text-5xl md:text-7xl font-bold tracking-tight text-foreground"
                            >
                                {content[index].line1}<br />
                                <span className="text-primary/90">{content[index].line2}</span>
                            </motion.h1>
                        </AnimatePresence>
                    </div>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Choose the perfect plan for your creative journey. <br className="hidden md:block" />
                        Unlock the full potential of StudioX.
                    </p>
                </motion.div>

                {/* Toggle */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="flex justify-center"
                >
                    <div className="flex items-center gap-4 bg-secondary/30 backdrop-blur-sm border border-border/50 p-1.5 rounded-full relative">
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 relative z-10",
                                billingCycle === "monthly" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Monthly
                            {billingCycle === "monthly" && (
                                <motion.div
                                    layoutId="billing-tab"
                                    className="absolute inset-0 bg-primary rounded-full -z-10 shadow-lg shadow-primary/25"
                                />
                            )}
                        </button>
                        <button
                            onClick={() => setBillingCycle("yearly")}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 relative z-10",
                                billingCycle === "yearly" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Yearly
                            {billingCycle === "yearly" && (
                                <motion.div
                                    layoutId="billing-tab"
                                    className="absolute inset-0 bg-primary rounded-full -z-10 shadow-lg shadow-primary/25"
                                />
                            )}
                        </button>
                        {/* Discount Badge */}
                        <div className="absolute -right-24 top-1/2 -translate-y-1/2 hidden md:block">
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-accent/10 border border-accent/20 text-accent text-xs font-semibold px-2 py-1 rounded-md"
                            >
                                Save 20%
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
