"use client"

import { Badge } from "@/components/ui/badge"
import type { Creation } from "@/lib/types"
import { motion } from "framer-motion"
import { UnifiedCard } from "./unified-card"

interface CreationCardProps {
  creation: Creation
  layout?: "grid" | "list"
}

export function CreationCard({ creation, layout = "grid" }: CreationCardProps) {
  const statusConfig = {
    draft: { label: "Draft", variant: "outline" as const },
    generating: { label: "Generating", variant: "secondary" as const },
    completed: { label: "Completed", variant: "default" as const },
  }

  const config = statusConfig[creation.status]

  if (layout === "list") {
    return (
      <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <UnifiedCard className="p-4 flex items-center justify-between" hoverLift={false}>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/60 rounded-lg flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{creation.appName}</p>
              <p className="text-xs text-muted-foreground">{new Date(creation.createdAt).toLocaleDateString("en-US")}</p>
            </div>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </UnifiedCard>
      </motion.div>
    )
  }

  return (
    <UnifiedCard className="overflow-hidden group cursor-pointer">
      <div className="aspect-square bg-gradient-to-br from-secondary to-secondary/60 relative flex items-center justify-center group-hover:from-accent/15 group-hover:to-secondary/50 transition-all duration-300">
        <Badge className="absolute bottom-3 right-3" variant={config.variant}>
          {config.label}
        </Badge>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-sm font-medium group-hover:text-accent transition-colors">{creation.appName}</p>
        <p className="text-xs text-muted-foreground">{new Date(creation.createdAt).toLocaleDateString("en-US")}</p>
      </div>
    </UnifiedCard>
  )
}
