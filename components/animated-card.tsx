"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  hoverLift?: boolean
  delay?: number
}

export function AnimatedCard({ children, className, hoverLift = true, delay = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ y: 20 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={hoverLift ? { y: -4, transition: { duration: 0.2, ease: "easeOut" } } : undefined}
    >
      <Card
        className={cn(
          "border-border bg-card transition-all duration-200",
          hoverLift && "hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10",
          className,
        )}
      >
        {children}
      </Card>
    </motion.div>
  )
}
