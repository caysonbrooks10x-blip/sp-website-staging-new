"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, SlidersHorizontal, ArrowUpDown, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreationCard } from "./creation-card"
import { cn } from "@/lib/utils"

interface CreationsTabProps {
    items: Array<{
        id: string
        appName: string
        previewUrl: string
        remixCount: number
        likes: number
        date: string
    }>
}

export function CreationsTab({ items }: CreationsTabProps) {
    const [filter, setFilter] = useState("all")

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Cinematic Header */}
            <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#0A0A0A] p-8 md:p-12">
                {/* Ambient background glow */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[200px] h-[200px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">My Creations</h2>
                            <p className="text-slate-400 text-lg md:text-xl font-light leading-relaxed">
                                A curated collection of your <span className="text-purple-400 font-medium">AI-generated</span> masterpieces.
                                Organize, remix, and share your journey.
                            </p>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="flex flex-wrap gap-3 w-full md:w-auto"
                    >
                        <div className="relative group flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                            <Input
                                placeholder="Search creations..."
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:border-purple-500/50 transition-all rounded-xl"
                            />
                        </div>
                        <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all rounded-xl aspect-square p-0 w-10">
                            <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                    </motion.div>
                </div>

                {/* Filters Row */}
                <div className="relative z-10 mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-6">
                    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5 overflow-x-auto max-w-full no-scrollbar">
                        {["All", "Images", "Videos", "Audio", "3D"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab.toLowerCase())}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap",
                                    filter === tab.toLowerCase()
                                        ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="hidden sm:inline">Sort by:</span>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-400 hover:text-white">
                            Newest <ArrowUpDown className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Grid Layout */}
            {/* Grid Layout or Empty State */}
            {items.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
                    {items.map((recipe, i) => (
                        <CreationCard key={recipe.id} item={recipe} index={i} />
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center py-20 text-center space-y-6"
                >
                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Search className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">No creations yet</h3>
                    <p className="text-slate-400 max-w-md">
                        Your personalized studio is waiting. Start generating amazing content to populate your portfolio.
                    </p>
                    <Button variant="default" className="mt-4 rounded-full px-8 bg-purple-600 hover:bg-purple-500 text-white">
                        Start Creating
                    </Button>
                </motion.div>
            )}

            {items.length > 0 && (
                <div className="flex justify-center mt-12">
                    <Button variant="outline" size="lg" className="rounded-full px-8 py-6 border-white/10 bg-gradient-to-b from-white/5 to-transparent hover:from-white/10 hover:to-white/5 text-slate-300 hover:text-white transition-all duration-500 group">
                        Load More Creations <span className="ml-2 group-hover:translate-y-0.5 transition-transform duration-300">↓</span>
                    </Button>
                </div>
            )}
        </div>
    )
}
