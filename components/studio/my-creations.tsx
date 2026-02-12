"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Search,
    LayoutGrid,
    List as ListIcon,
    Filter,
    MoreHorizontal,
    Download,
    ExternalLink,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ImageIcon,
    Video,
    Mic
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

// --- Types & Mock Data ---

type CreationStatus = "completed" | "processing" | "failed"
type CreationType = "image" | "video" | "audio"

interface Creation {
    id: string
    title: string
    type: CreationType
    status: CreationStatus
    date: string
    thumbnailUrl?: string
}

const MOCK_CREATIONS: Creation[] = [
    { id: "1", title: "Cyberpunk Cityscape", type: "image", status: "completed", date: "2 mins ago", thumbnailUrl: "/createcard.jpeg" },
    { id: "2", title: "Abstract Fluid Motion", type: "video", status: "processing", date: "15 mins ago" },
    { id: "3", title: "Character Voiceover", type: "audio", status: "completed", date: "1 hour ago" },
    { id: "4", title: "Neon Noir Portrait", type: "image", status: "completed", date: "3 hours ago", thumbnailUrl: "/studiox.jpg" },
    { id: "5", title: "Failed Generation", type: "image", status: "failed", date: "Yesterday" },
    { id: "6", title: "Sunset Drone Shot", type: "video", status: "completed", date: "2 days ago" },
    { id: "7", title: "Product Showcase", type: "image", status: "completed", date: "3 days ago" },
    { id: "8", title: "Ambient Background", type: "audio", status: "completed", date: "1 week ago" },
]

export function MyCreations() {
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | CreationStatus>("all")
    const [sortOrder, setSortOrder] = useState("newest")

    // Filter Logic
    const filteredCreations = MOCK_CREATIONS.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === "all" || item.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="h-full flex flex-col bg-black/20">
            {/* 1. HERO / HEADER ZONE */}
            <div className="px-8 pt-10 pb-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className="max-w-[1600px] mx-auto w-full">
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">My Creations</h1>
                    <p className="text-slate-400 text-sm max-w-xl">
                        Manage, preview, and organize everything you’ve created in StudioX.
                    </p>
                </div>
            </div>

            {/* 2. TOOLBAR / CONTROLS */}
            <div className="px-8 py-4 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4">

                    {/* Left: Search & Filter */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative group w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors" />
                            <Input
                                placeholder="Search creations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 bg-white/5 border-white/10 text-white rounded-xl focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50 transition-all hover:bg-white/10"
                            />
                        </div>

                        <div className="h-8 w-[1px] bg-white/10 mx-1 hidden md:block" />

                        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                            <SelectTrigger className="w-[140px] h-10 bg-white/5 border-white/10 text-slate-300 rounded-xl hover:bg-white/10 hover:text-white transition-colors">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#0A0A0A] border-white/10 text-slate-300">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Right: Sort & View */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                            <SelectTrigger className="w-[140px] h-10 bg-transparent border-transparent text-slate-400 hover:text-white transition-colors text-xs uppercase tracking-wider font-medium">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0A0A0A] border-white/10 text-slate-300">
                                <SelectItem value="newest">Newest First</SelectItem>
                                <SelectItem value="oldest">Oldest First</SelectItem>
                                <SelectItem value="name">Name (A-Z)</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="bg-white/5 p-1 rounded-lg border border-white/5 flex gap-1">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "p-2 rounded-md transition-all",
                                    viewMode === "grid" ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "p-2 rounded-md transition-all",
                                    viewMode === "list" ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                <ListIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. CREATIONS GRID */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-[1600px] mx-auto w-full">

                    {filteredCreations.length === 0 ? (
                        /* OFF-RAMP / EMPTY STATE */
                        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                <Search className="w-6 h-6 text-slate-500" />
                            </div>
                            <h3 className="text-xl font-medium text-white">No creations found</h3>
                            <p className="text-slate-500 max-w-xs">
                                Try adjusting your filters or create something new.
                            </p>
                        </div>
                    ) : (
                        <div className={cn(
                            "grid gap-6",
                            viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "grid-cols-1"
                        )}>
                            <AnimatePresence mode="popLayout">
                                {filteredCreations.map((item, i) => (
                                    <CreationCard key={item.id} item={item} index={i} viewMode={viewMode} />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

// --- Sub-Component: Creation Card ---

function CreationCard({ item, index, viewMode }: { item: Creation, index: number, viewMode: "grid" | "list" }) {
    const isGrid = viewMode === "grid"

    const StatusIcon = {
        completed: CheckCircle2,
        processing: Loader2,
        failed: AlertCircle
    }[item.status]

    const TypeIcon = {
        image: ImageIcon,
        video: Video,
        audio: Mic
    }[item.type]

    return (
        <div
            className={cn(
                "group relative overflow-hidden transition-all duration-500",
                isGrid
                    ? "rounded-3xl aspect-[3/4] border border-white/10 bg-[#050505] hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)] hover:border-white/20"
                    : "rounded-xl flex flex-row h-20 items-center p-2 gap-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
            )}
        >
            {/* --- GRID VIEW LAYOUT --- */}
            {isGrid && (
                <>
                    {/* Full Bleed Image */}
                    <div className="absolute inset-0 z-0">
                        {item.status === 'processing' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-white/[0.02]">
                                <Loader2 className="w-10 h-10 text-purple-500 animate-spin opacity-50 mb-4" />
                                <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Processing</p>
                            </div>
                        ) : item.thumbnailUrl ? (
                            <Image
                                src={item.thumbnailUrl}
                                alt={item.title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                                <TypeIcon className="w-12 h-12 text-white/5" />
                            </div>
                        )}

                        {/* Cinematic Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-[#050505]/80 to-transparent z-10" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-[10px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                            <TypeIcon className="w-3 h-3 text-white" />
                            {item.type}
                        </div>
                        {item.status !== 'completed' && (
                            <div className={cn(
                                "px-2 py-1 rounded-md backdrop-blur-md border border-white/10 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5",
                                item.status === 'processing' ? "bg-purple-500/20 text-purple-200 border-purple-500/20" : "bg-red-500/20 text-red-200 border-red-500/20"
                            )}>
                                <StatusIcon className={cn("w-3 h-3", item.status === 'processing' && "animate-spin")} />
                                {item.status}
                            </div>
                        )}
                    </div>

                    {/* Content Overhead */}
                    <div className="absolute inset-0 z-20 flex flex-col justify-end p-6">
                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <h3 className="text-xl font-bold text-white leading-tight mb-2 drop-shadow-lg line-clamp-2">
                                {item.title}
                            </h3>

                            <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                                    <Clock className="w-3 h-3" /> {item.date}
                                </span>

                                <button className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* --- LIST VIEW LAYOUT --- */}
            {!isGrid && (
                <>
                    <div className="w-16 h-16 rounded-lg bg-white/5 relative overflow-hidden flex-shrink-0">
                        {item.thumbnailUrl ? (
                            <Image src={item.thumbnailUrl} alt={item.title} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center"><TypeIcon className="w-6 h-6 text-white/20" /></div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-200 truncate">{item.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <TypeIcon className="w-3 h-3" /> {item.type}
                            </span>
                            <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {item.date}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pr-2">
                        {item.status !== 'completed' && (
                            <div className={cn(
                                "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5",
                                item.status === 'processing' ? "bg-purple-500/10 text-purple-400" : "bg-red-500/10 text-red-400"
                            )}>
                                <StatusIcon className={cn("w-3 h-3", item.status === 'processing' && "animate-spin")} />
                                {item.status}
                            </div>
                        )}

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
