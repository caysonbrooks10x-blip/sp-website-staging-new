"use client"

import { motion } from "framer-motion"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreationCard } from "./creation-card"
import { Loader2 } from "lucide-react"

interface CreationsTabProps {
    items: Array<{
        id: string
        appName: string
        previewUrl: string
        remixCount: number
        likes: number
        date: string
        model?: string
        prompt?: string
        type?: "image" | "video"
    }>
    loading?: boolean
    onDelete?: (id: string) => void
}

export function CreationsTab({ items, loading, onDelete }: CreationsTabProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {}
            <div className="flex flex-col gap-2 pb-6 border-b border-white/5">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl tracking-tight text-white font-light">
                        Personal <span className="font-semibold text-purple-400">Gallery</span>
                    </h2>
                    <p className="text-slate-400 mt-2 text-sm md:text-base font-light">
                        Your private archive of AI-generated assets perfectly organized.
                    </p>
                </motion.div>
            </div>

            {loading ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-32 space-y-4"
                >
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                    <p className="text-slate-400 font-medium tracking-wide animate-pulse">Fetching your masterpieces...</p>
                </motion.div>
            ) : items.length > 0 ? (
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                    {items.map((recipe, i) => (
                        <div key={recipe.id} className="break-inside-avoid mb-6">
                            <CreationCard item={recipe} index={i} onDelete={onDelete} />
                        </div>
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center py-20 text-center space-y-6"
                >
                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <Search className="w-10 h-10 text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white tracking-tight">Archive is Empty</h3>
                    <p className="text-slate-400 max-w-md font-light leading-relaxed">
                        Your personalized studio is waiting. Start generating amazing content to populate your portfolio.
                    </p>
                    <Button variant="default" className="mt-4 rounded-full px-8 bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 cursor-pointer" asChild>
                        <a href="/studio">Open Studio</a>
                    </Button>
                </motion.div>
            )}
        </div>
    )
}
