"use client"

import { motion } from "framer-motion"
import { Share2, Clock, Sparkles, Download, Trash2, Loader2, Wand2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UploadModal } from "@/components/upload-modal"
import { useState } from "react"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebaseClient"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface CreationCardProps {
    item: {
        id: string
        appName: string
        previewUrl: string
        date: string
        model?: string
        prompt?: string
        type?: "image" | "video"
        remixCount?: number
        likes?: number
    }
    index: number
    onDelete?: (id: string) => void
}

export function CreationCard({ item, index, onDelete }: CreationCardProps) {
    const router = useRouter();
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleRemix = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const remixUrl = `/studio?mode=remix&previewUrl=${encodeURIComponent(item.previewUrl)}&prompt=${encodeURIComponent(item.prompt || "")}&remixType=${item.type || 'image'}&creationId=${item.id}`;
        router.push(remixUrl);
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDownloading(true);
        try {
            const proxyUrl = `/api/download?url=${encodeURIComponent(item.previewUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Failed to fetch via proxy");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `StudioX_Creation_${item.id}.${item.previewUrl.includes('.mp4') || item.type === 'video' ? 'mp4' : 'png'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(item.previewUrl, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this creation?")) return;

        setIsDeleting(true);
        if (onDelete) onDelete(item.id);

        try {
            const deleteCreation = httpsCallable(functions, "deleteCreation");
            await deleteCreation({ creationId: item.id });
            toast.success("Creation deleted successfully");
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Failed to delete creation.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="group relative"
        >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-white/10 transition-all duration-500 hover:ring-white/20 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
                {/* Subtle Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-40 z-10" />

                {/* Hover Gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-10" />

                {/* Media */}
                <div className="h-full w-full overflow-hidden">
                    {(item.type === 'video' || item.previewUrl.includes('.mp4')) ? (
                        <video
                            src={item.previewUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="h-full w-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-105"
                        />
                    ) : (
                        <img
                            src={item.previewUrl}
                            alt={item.appName}
                            className="h-full w-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-105"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
                            }}
                        />
                    )}
                </div>

                {/* Top Left Floating Badge */}
                <div className="absolute top-3 left-3 z-20 translate-y-[-10px] opacity-0 transition-all duration-300 delay-75 group-hover:translate-y-0 group-hover:opacity-100">
                    <Badge variant="secondary" className="bg-black/60 backdrop-blur-md border border-white/10 text-white/90 font-medium shadow-lg shadow-black/50 px-2.5 py-1 text-xs">
                        <Sparkles className="w-3 h-3 mr-1.5 text-[#c8ff00]" />
                        {item.model || "Generated"}
                    </Badge>
                </div>

                {/* Overlay Action Buttons */}
                <div className="absolute inset-x-0 bottom-0 p-5 z-20 transition-all duration-500 opacity-100 lg:opacity-0 lg:translate-y-2 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-purple-200/90 flex items-center gap-1.5 drop-shadow-md">
                            <Clock className="w-3 h-3" /> {item.date}
                        </span>
                    </div>

                    <h3 className="font-semibold text-lg text-white leading-tight mb-4 group-hover:text-purple-100 transition-colors drop-shadow-md line-clamp-2">
                        {item.appName || item.prompt || "Untitled"}
                    </h3>

                    {/* Action Grid - 2x2 for better balance */}
                    <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                        <Button
                            onClick={handleRemix}
                            className="bg-[#c8ff00] hover:bg-[#b8ef00] text-black text-[11px] font-bold h-9 shadow-[0_0_15px_rgba(200,255,0,0.2)] transition-all rounded-lg"
                        >
                            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Remix
                        </Button>
                        <Button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPublishModal(true); }}
                            className="bg-white hover:bg-zinc-200 text-black text-[11px] font-bold h-9 shadow-lg shadow-white/10 transition-all rounded-lg"
                        >
                            <Share2 className="w-3.5 h-3.5 mr-1.5" /> Publish
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="bg-black/50 hover:bg-black/70 text-white backdrop-blur-xl border text-[11px] font-semibold h-9 border-white/10 transition-all rounded-lg"
                        >
                            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                            Download
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-black/50 hover:bg-red-500/20 text-white hover:text-red-400 backdrop-blur-xl border text-[11px] font-semibold h-9 border-white/10 hover:border-red-500/30 transition-all rounded-lg"
                        >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            {showPublishModal && (
                <UploadModal
                    isOpen={showPublishModal}
                    onClose={() => setShowPublishModal(false)}
                    initialData={{
                        url: item.previewUrl,
                        type: item.type || (item.previewUrl.includes('.mp4') ? 'video' : 'image'),
                        prompt: item.prompt || item.appName,
                        creationId: item.id
                    }}
                />
            )}
        </motion.div>
    )
}
