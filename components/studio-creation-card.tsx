"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Creation } from "@/lib/types"
import { motion } from "framer-motion"
import { Eye, ExternalLink } from "lucide-react"

interface StudioCreationCardProps {
    creation: Creation
    layout?: "grid" | "list"
    onClick?: () => void
}

export function StudioCreationCard({
    creation,
    layout = "grid",
    onClick
}: StudioCreationCardProps) {
    const statusConfig = {
        draft: {
            label: "Draft",
            className: "bg-zinc-800 text-zinc-400 border-zinc-700"
        },
        generating: {
            label: "Processing",
            className: "bg-blue-500/10 text-blue-400 border-blue-500/20"
        },
        completed: {
            label: "Completed",
            className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        },
        failed: {
            label: "Failed",
            className: "bg-red-500/10 text-red-400 border-red-500/20"
        }
    }

    // Handle potential statuses that might not be in the config type fully but exist in data
    const statusKey = creation.status as keyof typeof statusConfig
    const config = statusConfig[statusKey] || statusConfig.draft

    if (layout === "list") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex items-center gap-4 p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer"
                onClick={onClick}
            >
                {/* Thumbnail */}
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                    {creation.thumbnail ? (
                        <img
                            src={creation.thumbnail}
                            alt={creation.appName}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                        {creation.appName}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        {creation.appId} • {new Date(creation.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                </div>

                {/* Status */}
                <div className="shrink-0 flex items-center gap-4">
                    <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-normal border", config.className)}>
                        {config.label}
                    </Badge>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                            <Eye className="w-4 h-4 text-zinc-400" />
                        </div>
                    </div>
                </div>
            </motion.div>
        )
    }

    // Grid Layout
    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
            className="group relative flex flex-col rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/5 hover:border-white/10 shadow-sm hover:shadow-xl hover:shadow-black/20 overflow-hidden cursor-pointer transition-colors duration-300"
            onClick={onClick}
        >
            {/* Thumbnail Area */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-800/50">
                {creation.thumbnail ? (
                    <img
                        src={creation.thumbnail}
                        alt={creation.appName}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                        <Eye className="w-4 h-4" />
                        <span>View Creation</span>
                    </div>
                </div>
            </div>

            {/* Metadata */}
            <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                            {creation.appName}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 truncate">
                            {creation.appId}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                    <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-normal border", config.className)}>
                        {config.label}
                    </Badge>
                    <span className="text-[10px] text-zinc-600 font-medium">
                        {new Date(creation.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                        })}
                    </span>
                </div>
            </div>
        </motion.div>
    )
}
