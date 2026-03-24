"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface UnifiedCardProps {
  children: ReactNode
  className?: string
  hoverLift?: boolean
  emphasize?: boolean
}

export function UnifiedCard({ children, className, hoverLift = true, emphasize = false }: UnifiedCardProps) {
  return (
    <motion.div
      whileHover={hoverLift ? { y: -5, scale: 1.02 } : undefined}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full"
    >
      <Card
        className={cn(
          "h-full border bg-card/40 backdrop-blur-xl transition-all duration-300",
          "border-white/10 shadow-lg shadow-black/5",
          hoverLift && "hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10 hover:bg-card/60",
          emphasize && "border-accent/60 ring-1 ring-accent/20",
          className,
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        {children}
      </Card>
    </motion.div>
  )
}
