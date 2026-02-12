"use client"

import { Button } from "@/components/ui/button"
import type { CommunityPost } from "@/lib/types"
import { Heart, Play, User as UserIcon, Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface CommunityPostCardProps {
  post: CommunityPost
  index: number
}

export function CommunityPostCard({ post, index }: CommunityPostCardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(false)

  // Use the aspect ratio defined in the data
  const aspectClass =
    post.aspectRatio === "portrait" ? "aspect-[3/4]" :
      post.aspectRatio === "square" ? "aspect-square" :
        "aspect-[4/3]";

  return (
    <Link
      href={`/community/${post.id}`}
      className={`group relative block w-full rounded-xl overflow-hidden bg-[#111] border border-white/5 cursor-pointer ${aspectClass} transition-transform duration-700 hover:shadow-2xl hover:-translate-y-1`}
    >
      {/* Image Layer */}
      <Image
        src={post.thumbnailUrl}
        alt={post.title}
        fill
        className="object-cover transition-transform duration-[2s] ease-in-out group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />

      {/* Classy Gradient Overlay */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />

      {/* Top Overlay - Creator Chip */}
      <div className="absolute top-4 left-4 z-20 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
        <div className="bg-white/10 backdrop-blur-md rounded-full px-2 py-1 pr-3 border border-white/5 flex items-center gap-2">
          <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/10">
            <Image
              src={post.author.avatar}
              alt={post.author.name}
              fill
              className="object-cover"
            />
          </div>
          <span className="text-[10px] font-medium text-white/90 tracking-wide">{post.author.name}</span>
        </div>
      </div>

      {/* Center Interaction - Minimalist Remix */}
      {post.allowRemix && (
        <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
          <Button
            size="sm"
            variant="secondary"
            className="bg-white text-black hover:bg-neutral-200 hover:scale-105 transition-all w-24 h-9 rounded-full font-medium text-xs tracking-wide shadow-xl shadow-black/50"
            onClick={(e) => {
              e.preventDefault() // Prevent navigation to detail page
              if (!user) {
                const target = `/studio?mode=remix&source=${post.id}`
                router.push(`/login?redirect=${encodeURIComponent(target)}`)
              } else {
                router.push(`/studio?mode=remix&source=${post.id}`)
              }
            }}
          >
            Remix
          </Button>
        </div>
      )}

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-20 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
        <div className="space-y-1.5">
          <h3 className="text-base font-medium text-white leading-snug tracking-tight truncate">
            {post.title}
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[50%]">
              {post.tags[0]}
            </span>

            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsLiked(!isLiked);
                }}
                className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-white text-white" : ""}`} />
                <span className="text-[10px] font-medium">{post.likes + (isLiked ? 1 : 0)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
