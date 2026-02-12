"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Image as ImageIcon, Film, Globe, Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
// Imports removed as unused

interface UploadModalProps {
    isOpen: boolean
    onClose: () => void
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [isPublic, setIsPublic] = useState(true)
    const [allowRemix, setAllowRemix] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)

            const reader = new FileReader()
            reader.onload = (e) => {
                setPreview(e.target?.result as string)
            }
            reader.readAsDataURL(selectedFile)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0]
            setFile(selectedFile)

            const reader = new FileReader()
            reader.onload = (e) => {
                setPreview(e.target?.result as string)
            }
            reader.readAsDataURL(selectedFile)
        }
    }

    const handlePublish = async () => {
        if (!file) return

        setIsUploading(true)

        // Mock upload delay
        await new Promise(resolve => setTimeout(resolve, 2000))

        setIsUploading(false)
        onClose()
        setFile(null)
        setPreview(null)
        setTitle("")
        setDescription("")

        // Refresh to show new post
        router.push("/community")
        router.refresh()

        // Use a simpler alert or just let it close silently as per user request to "remove everything"
        // But maybe a success indication is nice.
        // toast.success("Published (Mock)") // assuming toast is available or just let it happen. 
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 p-4"
                    >
                        <div className="relative overflow-hidden rounded-3xl shadow-2xl group">
                            {/* Background Image with Parallax-like fixity (or just cover) */}
                            <div className="absolute inset-0 z-0">
                                <img src="/community_card.jpeg" alt="bg" className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" /> {/* Heavy darken for contrast */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row h-[600px]">
                                {/* Left: Preview / Upload Area - Glassy & Featured */}
                                <div
                                    className={cn(
                                        "relative w-full md:w-[55%] flex flex-col items-center justify-center p-8 transition-all border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.02]",
                                        !preview && "hover:bg-white/[0.05] cursor-pointer group/upload"
                                    )}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => !preview && fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,video/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />

                                    {preview ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="relative h-full w-full overflow-hidden rounded-xl shadow-2xl border border-white/10"
                                        >
                                            {file?.type.startsWith('video') ? (
                                                <video src={preview} className="h-full w-full object-cover" controls />
                                            ) : (
                                                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                                            )}
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="absolute right-3 top-3 h-8 w-8 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 hover:bg-black/80 hover:scale-105 transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setFile(null)
                                                    setPreview(null)
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-6 text-center">
                                            <div className="relative group-hover/upload:scale-110 transition-transform duration-500">
                                                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                                                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-xl">
                                                    <Upload className="h-8 w-8 text-white/80" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-light text-white tracking-tight">Upload Creation</h3>
                                                <p className="text-xs text-zinc-400 max-w-[200px] leading-relaxed mx-auto">
                                                    Drag & drop or click to browse. Supports high-res IMG & Video.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Metadata Form - Clean & Minimal */}
                                <div className="flex-1 flex flex-col p-8 md:p-10 relative">
                                    {/* Close Button Absolute */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                        className="absolute right-6 top-6 h-8 w-8 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors z-20"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>

                                    <div className="mb-8">
                                        <h2 className="text-2xl font-light text-white mb-1">Details</h2>
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest">Metadata & Settings</p>
                                    </div>

                                    <div className="flex-1 space-y-8">
                                        {/* Seamless Title Input */}
                                        <div className="group/input">
                                            <input
                                                placeholder="Give it a title..."
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full bg-transparent border-none text-2xl font-light text-white placeholder:text-white/20 focus:outline-none focus:ring-0 px-0 py-2 border-b border-white/10 focus:border-white/50 transition-all"
                                            />
                                        </div>

                                        {/* Seamless Description Input */}
                                        <div className="group/input">
                                            <textarea
                                                placeholder="What's the story behind this?"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="w-full bg-transparent border-none text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-0 px-0 py-2 resize-none h-24 border-b border-white/10 focus:border-white/50 transition-all leading-relaxed"
                                            />
                                        </div>

                                        {/* Toggles - Elegant Row */}
                                        <div className="space-y-5">
                                            <div className="flex items-center justify-between group/toggle cursor-pointer" onClick={() => setIsPublic(!isPublic)}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg transition-colors ${isPublic ? 'bg-blue-500/10' : 'bg-white/5'}`}>
                                                        {isPublic ? <Globe className="h-4 w-4 text-blue-400" /> : <Lock className="h-4 w-4 text-zinc-400" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-200 group-hover/toggle:text-white transition-colors">Public Visibility</p>
                                                        <p className="text-[10px] text-zinc-500">Visible to the community feed</p>
                                                    </div>
                                                </div>
                                                <Switch checked={isPublic} onCheckedChange={setIsPublic} className="data-[state=checked]:bg-blue-600" />
                                            </div>

                                            <div className="flex items-center justify-between group/toggle cursor-pointer" onClick={() => setAllowRemix(!allowRemix)}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg transition-colors ${allowRemix ? 'bg-purple-500/10' : 'bg-white/5'}`}>
                                                        <Film className="h-4 w-4 text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-200 group-hover/toggle:text-white transition-colors">Allow Remixing</p>
                                                        <p className="text-[10px] text-zinc-500">Others can fork this style</p>
                                                    </div>
                                                </div>
                                                <Switch checked={allowRemix} onCheckedChange={setAllowRemix} className="data-[state=checked]:bg-purple-600" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="mt-8 flex items-center justify-end gap-4 pt-6 border-t border-white/5">
                                        <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-white/5">
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handlePublish}
                                            disabled={!file || isUploading}
                                            className={cn(
                                                "min-w-[140px] h-11 rounded-xl font-medium transition-all shadow-lg",
                                                !file ? "bg-white/10 text-zinc-500" : "bg-white text-black hover:bg-zinc-200 hover:scale-105 shadow-white/10"
                                            )}
                                        >
                                            {isUploading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>Publishing...</span>
                                                </div>
                                            ) : (
                                                "Publish Work"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
