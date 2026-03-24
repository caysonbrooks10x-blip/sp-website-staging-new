"use client"

import { Button } from "@/components/ui/button"
import type { CommunityPost } from "@/lib/types"
import { Heart, Info, ChevronUp, ChevronDown, RefreshCw, Film, Download, Maximize2, Pencil, Trash2, AlertTriangle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useState, useRef, useEffect, useCallback, memo } from "react"
import { usePostLike } from "@/hooks/use-post-like"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebaseClient"

interface CommunityPostCardProps {
  post: CommunityPost
  index: number
  onRemovePost?: (id: string) => void
  onRestorePost?: (id: string) => void
}

export const CommunityPostCard = memo(function CommunityPostCard({ post, index, onRemovePost, onRestorePost }: CommunityPostCardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { isLiked, likesCount, toggleLike, isLoading } = usePostLike(post.id, post.likes || 0)
  const [isVisible, setIsVisible] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRemixing, setIsRemixing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isOwner = user?.uid === post.author.id

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
    console.log("[Community] Starting deletion for post:", post.id);
    setIsDeleting(true);

    try {
      const removePostFn = httpsCallable(functions, "removePost");
      await removePostFn({ postId: post.id });
      
      console.log("[Community] Deletion successful in backend");
      toast.success("Post deleted permanently");
      
      
      if (onRemovePost) {
        onRemovePost(post.id);
      }
    } catch (error) {
      console.error("[Community] Delete failed:", error);
      toast.error("Failed to delete post. Please try again.");
      setIsDeleting(false);
    }
  };

  
  const aspectClass =
    post.aspectRatio === "portrait" ? "aspect-[3/4]" :
      post.aspectRatio === "square" ? "aspect-square" :
        "aspect-[4/3]";

  
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { rootMargin: "100px", threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isVisible) {
      video.play().catch(() => {  })
    } else {
      video.pause()
    }
  }, [isVisible])

  const handleRemix = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()

    if (isRemixing) return;

    if (!user) {
      toast.error("You must be logged in to remix a post.");
      const target = `/studio?mode=remix&prompt=${encodeURIComponent(post.prompt)}&previewUrl=${encodeURIComponent(post.assetUrl)}&creationId=${post.creationId || ''}&remixType=${post.type}`;
      router.push(`/login?redirect=${encodeURIComponent(target)}`)
      return;
    }

    setIsRemixing(true);
    toast.success("Blueprint loaded! Taking you to the studio...");

    
    router.push(`/studio?mode=remix&prompt=${encodeURIComponent(post.prompt)}&previewUrl=${encodeURIComponent(post.assetUrl)}&creationId=${post.creationId || ''}&remixType=${post.type}`);

    setTimeout(() => setIsRemixing(false), 2000); 
  }, [user, post.prompt, post.assetUrl, post.creationId, router, isRemixing])

  const navigateToStudio = useCallback((mode: string, prompt: string) => {
    const target = `/studio?mode=${mode}&prompt=${encodeURIComponent(prompt)}&previewUrl=${encodeURIComponent(post.assetUrl)}`
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(target)}`)
    } else {
      router.push(target)
    }
  }, [user, post.assetUrl, router])

  const handleDownload = useCallback(async () => {
    try {
      toast.loading("Preparing download...", { id: `dl-${post.id}` })
      const res = await fetch(`/api/download?url=${encodeURIComponent(post.assetUrl)}`)
      if (!res.ok) throw new Error("Proxy error")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      let ext = post.assetUrl.split('?')[0].split('.').pop() || (post.type === "video" ? "mp4" : "png")
      if (ext.length > 4) ext = post.type === "video" ? "mp4" : "png"; 

      a.href = url
      a.download = `StudioX_${post.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}_${post.id.slice(0, 6)}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Download started!", { id: `dl-${post.id}` })
    } catch {
      toast.error("Download failed.", { id: `dl-${post.id}` })
    }
  }, [post.assetUrl, post.title, post.type, post.id])

  return (
    <AnimatePresence>
      {!isDeleting && (
        <motion.div
          ref={cardRef}
          initial={{ opacity: 1, scale: 1, height: "auto" }}
          exit={{ opacity: 0, scale: 0.9, height: 0, marginTop: 0, marginBottom: 0, padding: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "rounded-xl overflow-hidden bg-[#111] border border-white/5 relative",
            isDeleting && "opacity-50 pointer-events-none grayscale blur-sm"
          )}
        >
          {}
          <AnimatePresence>
            {showConfirm && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative w-[85%] max-w-[260px] bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[24px] p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-red-500/20 rounded-full blur-[32px] pointer-events-none" />

                  <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 z-10 transition-transform duration-300 hover:scale-110">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>

                  <h4 className="text-white font-medium text-lg leading-tight mb-2 tracking-tight z-10">Delete Post?</h4>
                  <p className="text-sm font-light text-white/50 mb-6 leading-relaxed z-10">
                    This action cannot be undone.
                  </p>

                  <div className="flex gap-3 w-full z-10">
                    <button
                      className="flex-1 py-3 text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/15 border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 py-3 text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-500 hover:border-red-400 rounded-xl transition-all duration-300"
                      onClick={confirmDelete}
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {}
          <Link
            href={`/community/${post.id}`}
            className={`group relative block w-full overflow-hidden cursor-pointer ${aspectClass} hover:shadow-2xl transition-all duration-500`}
            prefetch={false}
          >
            {}
            <div className="absolute inset-0 overflow-hidden bg-black/50">
              {post.type === "video" ? (
                <video
                  ref={videoRef}
                  src={post.assetUrl}
                  loop
                  muted
                  playsInline
                  poster={post.thumbnailUrl}
                  preload="auto"
                  className="object-cover w-full h-full absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <Image
                  src={post.thumbnailUrl}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  loading="lazy"
                />
              )}
            </div>

            {}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />

            {}
            <div className="absolute top-4 left-4 right-4 z-20 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out flex justify-between items-start pointer-events-none">
              <div className="bg-zinc-950 rounded-full px-2 py-1 pr-3 border border-white/10 flex items-center gap-2 pointer-events-auto shadow-lg">
                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/10">
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                    loading="lazy"
                    sizes="20px"
                  />
                </div>
                <span className="text-[10px] font-medium text-white tracking-wide">{post.author.name}</span>
              </div>

              {isOwner && (
                <button
                  onClick={handleDeleteClick}
                  className="bg-zinc-950 hover:bg-red-500 hover:text-white text-white p-2 rounded-full border border-white/10 transition-all pointer-events-auto shadow-lg"
                  title="Delete Post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {}
            {post.allowRemix && (
              <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white text-black hover:bg-neutral-200 hover:scale-105 transition-all w-24 h-9 rounded-full font-medium text-xs tracking-wide shadow-xl shadow-black/50"
                  onClick={handleRemix}
                >
                  Remix
                </Button>
              </div>
            )}

            {}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <div className="space-y-1.5">
                <h3 className="text-base font-medium text-white leading-snug tracking-tight truncate">
                  {post.title}
                </h3>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[50%]">
                    {post.tags[0]}
                  </span>

                  <div className="flex items-center gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 delay-75 z-20">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation() 
                        toggleLike() 
                      }}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 transition-all duration-300 group/btn"
                    >
                      <Heart
                        className={cn(
                          "w-4 h-4 transition-all duration-500",
                          isLiked
                            
                            ? "fill-red-500 text-red-500 scale-110 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                            
                            : "text-white group-hover/btn:scale-110"
                        )}
                      />
                      {}
                      <span className="text-sm font-medium text-white/90 tabular-nums">
                        {Intl.NumberFormat('en-US', { notation: 'compact' }).format(likesCount)}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {}
          <div className="border-t border-white/5">
            {}
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="w-full flex items-center justify-between px-4 py-3 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Information</span>
              </div>
              {showInfo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {}
            {showInfo && (
              <>
                <div className="divide-y divide-white/5 border-t border-white/5">
                  {post.model && (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-zinc-500">Model</span>
                      <span className="text-xs font-medium text-white">{post.model}</span>
                    </div>
                  )}
                  {post.preset && (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-zinc-500">Preset</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white">{post.preset}</span>
                        <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/10">
                          <Image src={post.author.avatar} alt="" fill className="object-cover" sizes="20px" />
                        </div>
                      </div>
                    </div>
                  )}
                  {post.quality && (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-zinc-500">Quality</span>
                      <span className="text-xs font-medium text-white">{post.quality}</span>
                    </div>
                  )}
                  {post.size && (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-zinc-500">Size</span>
                      <span className="text-xs font-medium text-white">{post.size}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-zinc-500">Created</span>
                    <span className="text-xs font-medium text-white">
                      {post.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {}
                <div className="p-3 pt-2 space-y-2 border-t border-white/5">
                  <Button
                    disabled={isRemixing}
                    className={cn(
                      "w-full h-9 rounded-lg font-semibold text-xs transition-all duration-200",
                      isRemixing
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-[#c8ff00] hover:bg-[#b8ef00] text-black shadow-[0_0_15px_rgba(200,255,0,0.3)]"
                    )}
                    onClick={(e) => handleRemix(e)}
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRemixing && "animate-spin")} />
                    {isRemixing ? "Cloning..." : "Remix Creation"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-8 rounded-lg border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 text-[11px]"
                      onClick={() => navigateToStudio("video", post.prompt)}
                    >
                      <Film className="h-3 w-3 mr-1.5" />
                      Video
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 rounded-lg border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 text-[11px]"
                      onClick={handleDownload}
                    >
                      <Download className="h-3 w-3 mr-1.5" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 rounded-lg border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 text-[11px]"
                      onClick={() => {
                        const upscalePrompt = post.type === 'video'
                          ? `${post.prompt}, ultra high resolution 4k video upscale, enhanced visual details, smooth 60fps, incredible motion quality, cinematic masterpiece`
                          : `${post.prompt}, ultra high resolution 8k image upscale, incredibly detailed, sharp focus, masterpiece`;
                        navigateToStudio(post.type, upscalePrompt)
                      }}
                    >
                      <Maximize2 className="h-3 w-3 mr-1.5" />
                      Upscale
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 rounded-lg border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 text-[11px]"
                      onClick={() => navigateToStudio(post.type, "")}
                    >
                      <Pencil className="h-3 w-3 mr-1.5" />
                      Edit
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})
