"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import type { Job } from "@/lib/types"

interface JobStatusCardProps {
  job: Job
  className?: string
}

export function JobStatusCard({ job, className }: JobStatusCardProps) {
  const statusConfig = {
    queued: {
      label: "Queued",
      description: "Your request is in queue",
      color: "bg-muted text-muted-foreground",
      icon: Clock,
    },
    warming: {
      label: "Warming up...",
      description: "Preparing AI engine",
      color: "bg-accent/20 text-accent-foreground",
      icon: Loader2,
    },
    processing: {
      label: "Processing",
      description: "Generating your content",
      color: "bg-accent/30 text-accent-foreground",
      icon: Loader2,
    },
    completed: {
      label: "Completed",
      description: "Your creation is ready",
      color: "bg-green-500/20 text-green-400",
      icon: CheckCircle2,
    },
    failed: {
      label: "Failed",
      description: "Something went wrong",
      color: "bg-destructive/20 text-destructive",
      icon: AlertCircle,
    },
  }

  const config = statusConfig[job.status]
  const StatusIcon = config.icon
  const isLoading = job.status === "warming" || job.status === "processing"

  return (
    <motion.div initial={{ y: 15 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className={className}>
      <Card className="p-6 space-y-4 border-border bg-card/80 backdrop-blur-sm">
        {/* Status Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <h3 className="text-sm font-semibold">{config.label}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        </div>

        {/* Progress Bar - Only show during warming/processing */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-accent h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${job.progress || 0}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{job.progress || 0}% complete</span>
                <span className="text-muted-foreground">
                  ~{Math.ceil((100 - (job.progress || 0)) / 30)} min remaining
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Preview - Only show when completed */}
        <AnimatePresence mode="wait">
          {job.status === "completed" && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="aspect-video bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg flex items-center justify-center border border-green-500/20"
            >
              <div className="text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto" />
                <p className="text-sm font-medium text-green-400">Generation Complete</p>
                <p className="text-xs text-muted-foreground">Your result is ready to download</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message - Only show when failed */}
        <AnimatePresence mode="wait">
          {job.status === "failed" && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-destructive">Generation Failed</p>
                  <p className="text-xs text-destructive/80">
                    {job.error || "Something went wrong. Please try again."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timestamp */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Started: {new Date(job.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
      </Card>
    </motion.div>
  )
}
