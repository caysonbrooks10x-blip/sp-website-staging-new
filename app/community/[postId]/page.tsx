"use client"

import { useParams } from "next/navigation"
import { ArrowLeft, MoreHorizontal, Heart, Share2, Sparkles, Link as LinkIcon, Info, ChevronUp, ChevronDown, RefreshCw, Film, Download, Maximize2, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
<<<<<<< HEAD
import { useState, useCallback, useEffect } from "react"
=======
import { useState, useCallback, useEffect, useMemo } from "react"
>>>>>>> 6369408 (feat: initial frontend + fixes)
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
<<<<<<< HEAD
import { doc, getDoc } from "firebase/firestore"
=======
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore"
>>>>>>> 6369408 (feat: initial frontend + fixes)
import { db, functions } from "@/lib/firebaseClient"
import type { CommunityPost } from "@/lib/types"
import { usePostLike } from "@/hooks/use-post-like"
import { cn } from "@/lib/utils"
import { httpsCallable } from "firebase/functions"
import { ASSET_BASE } from "@/lib/assets"
<<<<<<< HEAD
=======
import { mapCommunityPost } from "@/lib/community-post"
import { buildExportPackHref } from "@/lib/export-pack"
import {
    buildCommunityCreatorStats,
    buildCommunityGraphStats,
    buildCommunityRemixTimeline,
    buildLineageChain,
    dedupeCommunityPosts,
} from "@/lib/community-graph"

export const runtime = "edge"
>>>>>>> 6369408 (feat: initial frontend + fixes)

export default function PostDetailPage() {
    const params = useParams()
    const postId = params.postId as string

    const [post, setPost] = useState<CommunityPost | null>(null)
<<<<<<< HEAD
=======
    const [parentPost, setParentPost] = useState<CommunityPost | null>(null)
    const [rootPost, setRootPost] = useState<CommunityPost | null>(null)
    const [childPosts, setChildPosts] = useState<CommunityPost[]>([])
    const [siblingPosts, setSiblingPosts] = useState<CommunityPost[]>([])
    const [graphPosts, setGraphPosts] = useState<CommunityPost[]>([])
>>>>>>> 6369408 (feat: initial frontend + fixes)
    const [isLoading, setIsLoading] = useState(true)
    const { isLiked, likesCount, toggleLike, isLoading: isLikeLoading } = usePostLike(postId, post?.likes || 0)
    const [showInfo, setShowInfo] = useState(true)
    const { user } = useAuth()
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024)
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const isOwner = user?.uid === post?.author?.id

    const handleDeleteClick = async () => {
        const confirmed = window.confirm("Are you sure you want to delete this post?")
        if (!confirmed || !post) return

        setIsDeleting(true)
        console.log("[Community] Detail Page: Triggering removePost for", post.id);
        try {
            const removePostFn = httpsCallable(functions, "removePost")
            await removePostFn({ postId: post.id })
            console.log("[Community] Detail Page: Deletion confirmed");
            toast.success("Post deleted")
            router.push('/community')
        } catch (error) {
            console.error("[Community] Detail Page: Delete failed:", error)
            toast.error("Failed to delete post.")
            setIsDeleting(false)
        }
    }

    useEffect(() => {
        const fetchPost = async () => {
            try {
                
                const docRef = doc(db, "posts", postId)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    const data = docSnap.data()

                    
                    if (data.isDeleted === true || data.status === "deleted") {
                        setPost(null)
                        return
                    }

<<<<<<< HEAD
                    setPost({
                        id: docSnap.id,
                        type: data.type || "image",
                        title: data.title || "Untitled",
                        description: data.description || "",
                        prompt: data.prompt || "",
                        author: {
                            id: data.author?.uid || "unknown",
                            name: data.author?.name || "Anonymous",
                            avatar: data.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${docSnap.id}`
                        },
                        assetUrl: data.assetUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop",
                        thumbnailUrl: data.thumbnailUrl || data.assetUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop",
                        aspectRatio: data.type === "video" ? "landscape" : "portrait",
                        likes: data.likes || 0,
                        views: data.views || 0,
                        allowRemix: data.allowRemix ?? true,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        creationId: data.creationId || data.parameters?.originalCreationId,
                        tags: data.tags || [],
                        model: data.model || "Unknown",
                        preset: data.preset || "General",
                        quality: data.quality || "Standard",
                        size: data.size || "1024x1024",
                    } as CommunityPost)
                } else {
                    setPost(null)
=======
                    const mappedPost = mapCommunityPost(docSnap.id, data as Record<string, any>)
                    setPost(mappedPost)

                    const relatedReads: Promise<void>[] = []

                    if (mappedPost.parentCreationId) {
                        relatedReads.push(
                            getDocs(
                                query(collection(db, "posts"), where("creationId", "==", mappedPost.parentCreationId), limit(1))
                            ).then((snapshot) => {
                                const parentDoc = snapshot.docs[0]
                                setParentPost(parentDoc ? mapCommunityPost(parentDoc.id, parentDoc.data() as Record<string, any>) : null)
                            })
                        )
                    } else {
                        setParentPost(null)
                    }

                    if (
                        mappedPost.rootCreationId &&
                        mappedPost.rootCreationId !== mappedPost.creationId &&
                        mappedPost.rootCreationId !== mappedPost.parentCreationId
                    ) {
                        relatedReads.push(
                            getDocs(
                                query(collection(db, "posts"), where("creationId", "==", mappedPost.rootCreationId), limit(1))
                            ).then((snapshot) => {
                                const rootDoc = snapshot.docs[0]
                                setRootPost(rootDoc ? mapCommunityPost(rootDoc.id, rootDoc.data() as Record<string, any>) : null)
                            })
                        )
                    } else {
                        setRootPost(null)
                    }

                    if (mappedPost.creationId) {
                        relatedReads.push(
                            getDocs(
                                query(collection(db, "posts"), where("parentCreationId", "==", mappedPost.creationId))
                            ).then((snapshot) => {
                                const children = snapshot.docs
                                    .map((childDoc) => mapCommunityPost(childDoc.id, childDoc.data() as Record<string, any>))
                                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                                setChildPosts(children)
                            })
                        )
                    } else {
                        setChildPosts([])
                    }

                    if (mappedPost.parentCreationId) {
                        relatedReads.push(
                            getDocs(
                                query(collection(db, "posts"), where("parentCreationId", "==", mappedPost.parentCreationId))
                            ).then((snapshot) => {
                                const siblings = snapshot.docs
                                    .map((siblingDoc) => mapCommunityPost(siblingDoc.id, siblingDoc.data() as Record<string, any>))
                                    .filter((sibling) => sibling.id !== mappedPost.id)
                                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                                setSiblingPosts(siblings)
                            })
                        )
                    } else {
                        setSiblingPosts([])
                    }

                    const graphKey = mappedPost.rootCreationId || mappedPost.creationId
                    if (graphKey) {
                        relatedReads.push(
                            getDocs(
                                query(collection(db, "posts"), where("rootCreationId", "==", graphKey))
                            ).then((snapshot) => {
                                const related = snapshot.docs.map((relatedDoc) =>
                                    mapCommunityPost(relatedDoc.id, relatedDoc.data() as Record<string, any>)
                                )
                                const unique = dedupeCommunityPosts([mappedPost, ...related])
                                    .filter((relatedPost) => relatedPost.id !== mappedPost.id)
                                    .sort(
                                        (a, b) =>
                                            (a.remixDepth || 0) - (b.remixDepth || 0) ||
                                            b.createdAt.getTime() - a.createdAt.getTime()
                                    )
                                setGraphPosts(unique)
                            })
                        )
                    } else {
                        setGraphPosts([])
                    }

                    await Promise.all(relatedReads)
                } else {
                    setPost(null)
                    setParentPost(null)
                    setRootPost(null)
                    setChildPosts([])
                    setSiblingPosts([])
                    setGraphPosts([])
>>>>>>> 6369408 (feat: initial frontend + fixes)
                }
            } catch (err) {
                console.error("Error fetching post details:", err)
                setPost(null)
<<<<<<< HEAD
=======
                setParentPost(null)
                setRootPost(null)
                setChildPosts([])
                setSiblingPosts([])
                setGraphPosts([])
>>>>>>> 6369408 (feat: initial frontend + fixes)
            } finally {
                setIsLoading(false)
            }
        }

        fetchPost()
    }, [postId])

    const handleShare = useCallback((platform: string) => {
        const url = encodeURIComponent(window.location.href)
        const title = encodeURIComponent(post?.title || "Check this out on StudioX")

        let shareUrl = ""

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${title}&url=${url}`
                break
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`
                break
            case 'reddit':
                shareUrl = `https://www.reddit.com/submit?url=${url}&title=${title}`
                break
            case 'copy':
                navigator.clipboard.writeText(window.location.href)
                toast.success("Link copied to clipboard!")
                return
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400')
        }
    }, [post?.title])

<<<<<<< HEAD
=======
    const lineageChain = useMemo(
        () => post ? buildLineageChain(post, parentPost, rootPost) : [],
        [parentPost, post, rootPost]
    )

    const graphStats = useMemo(
        () => post ?
            buildCommunityGraphStats({
                current: post,
                graphPosts: dedupeCommunityPosts([...graphPosts, ...lineageChain, ...childPosts]),
                siblingPosts,
                childPosts,
            }) : { totalNodes: 0, siblingCount: 0, directChildCount: 0, maxDepth: 0, depthBreakdown: [], platformBreakdown: [] },
        [childPosts, graphPosts, lineageChain, post, siblingPosts]
    )

    const allGraphNodes = useMemo(
        () => post ? dedupeCommunityPosts([post, ...graphPosts, ...lineageChain, ...childPosts, ...siblingPosts]) : [],
        [childPosts, graphPosts, lineageChain, post, siblingPosts]
    )

    const topCreators = useMemo(() => buildCommunityCreatorStats(allGraphNodes, 6), [allGraphNodes])

    const remixTimeline = useMemo(
        () => buildCommunityRemixTimeline(allGraphNodes).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        [allGraphNodes]
    )

    const branchPreview = useMemo(
        () =>
            (post ? dedupeCommunityPosts([...graphPosts, ...siblingPosts, ...childPosts])
                .filter((relatedPost) => relatedPost.id !== post.id)
                .sort(
                    (a, b) =>
                        (a.remixDepth || 0) - (b.remixDepth || 0) ||
                        b.createdAt.getTime() - a.createdAt.getTime()
                )
                .slice(0, 6) : []),
        [childPosts, graphPosts, post?.id, siblingPosts]
    )

>>>>>>> 6369408 (feat: initial frontend + fixes)
    
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#020202] text-white">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-white animate-spin" />
            </div>
        )
    }

    
    if (!post) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#020202] text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Post not found</h2>
                    <Button asChild className="mt-4 bg-white text-black hover:bg-neutral-200">
                        <Link href="/community">Return to Community</Link>
                    </Button>
                </div>
            </div>
        )
    }

<<<<<<< HEAD
=======
    const exportPackHref = buildExportPackHref({
        assetUrl: post.assetUrl,
        type: post.type,
        prompt: post.prompt,
        title: post.title,
        model: post.model,
        aspect: post.size,
        creationId: post.creationId,
        generationPlatform: post.generationPlatform,
        campaign: post.campaign,
        autoDownload: Boolean(post.campaign?.directed),
    })

    const directorRemixTarget = (() => {
        const params = new URLSearchParams({
            mode: "remix",
            prompt: post.prompt || "",
            previewUrl: post.assetUrl,
            creationId: post.creationId || "",
            rootCreationId: post.rootCreationId || post.creationId || "",
            remixDepth: String((post.remixDepth || 0) + 1),
            sourcePostId: post.id,
            taskId: post.taskId || post.creationId || "",
            generationPlatform: post.generationPlatform || "",
            remixType: post.type,
            campaignDirected: post.campaign?.directed ? "1" : "",
            campaignGoal: post.campaign?.goal || "",
            campaignPlatform: post.campaign?.platform || "",
            campaignStyle: post.campaign?.style || "",
            campaignVariationCount: post.campaign?.variationCount ? String(post.campaign.variationCount) : "",
            campaignBrief: post.campaign?.brief || post.prompt || "",
            campaignPresetIds: post.campaign?.presetIds?.join(",") || "",
            autoExportPack: post.campaign?.directed ? "1" : "",
        })
        return `/studio?${params.toString()}`
    })()


>>>>>>> 6369408 (feat: initial frontend + fixes)
    return (
        <main className="min-h-screen bg-[#020202] text-white selection:bg-purple-500/30">

            {}
            <nav className="fixed top-0 left-0 right-0 lg:right-[450px] z-[9999] flex items-center justify-between p-4 md:p-6 pointer-events-none">
                <a
                    href="/community"
                    className="pointer-events-auto inline-flex items-center justify-center h-11 w-11 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md text-white shadow-xl transition-colors duration-200 z-[9999]"
                >
                    <ArrowLeft className="h-5 w-5" />
                </a>
                <div className="pointer-events-auto z-[9999]">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md h-11 w-11 text-white">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#111] border-white/10 text-white">
                            <DropdownMenuItem onClick={() => alert('Reported')}>Report Post</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </nav>

            <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen">
                {}
                <div className="relative w-full lg:flex-1 lg:h-full bg-[#0b0b0b] flex items-center justify-center overflow-hidden">
                    {}
                    <div className="absolute inset-0 opacity-30 scale-110 pointer-events-none">
                        {post.thumbnailUrl.endsWith('.mp4') ? (
                            <video
                                src={post.thumbnailUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover blur-2xl"
                            />
                        ) : (
                            <Image
                                src={post.thumbnailUrl}
                                alt=""
                                fill
                                className="object-cover blur-2xl"
                                loading="lazy"
                                sizes="100vw"
                            />
                        )}
                    </div>

                    {}
                    <div className="relative w-full h-[60vh] lg:h-[85vh] max-w-[90%] lg:max-w-4xl shadow-2xl overflow-hidden rounded-xl">
                        {post.type === "video" ? (
                            <video
                                src={post.assetUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover drop-shadow-2xl"
                            />
                        ) : (
                            <Image
                                src={post.assetUrl}
                                alt={post.title}
                                fill
                                className="object-cover drop-shadow-2xl"
                                priority
                            />
                        )}
                    </div>
                </div>

                {}
                <div
                    className="w-full lg:w-[450px] lg:shrink-0 bg-[#09090b] border-l border-white/5 lg:overflow-y-auto lg:h-full p-6 lg:p-8 pt-20 lg:pt-8 z-10 shadow-2xl lg:shadow-none custom-scrollbar lg:overscroll-contain"
                    data-lenis-prevent={isMobile ? undefined : true}
                    onWheel={isMobile ? undefined : (e) => e.stopPropagation()}
                    onTouchMove={isMobile ? undefined : (e) => e.stopPropagation()}
                >

                    {}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10">
                            <Image src={post.author.avatar} alt={post.author.name} fill className="object-cover" sizes="40px" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-white">{post.author.name}</h3>
                            <p className="text-xs text-zinc-500">Creator</p>
                        </div>
                    </div>

                    {}
                    <div className="space-y-4 mb-8">
                        <h1 className="text-3xl font-light text-white leading-tight">{post.title}</h1>
                        <p className="text-zinc-400 font-light leading-relaxed">
                            {post.description}
                        </p>
                    </div>

                    {}
                    <div className="flex items-center gap-3 mb-8">
                        <Button
                            variant="outline"
                            className={cn(
                                "flex-1 h-12 rounded-xl border-white/10 text-base transition-all duration-300 group/btn",
                                isLiked ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-white/5 hover:bg-white/10 text-white"
                            )}
                            onClick={() => toggleLike()}
                            disabled={isLikeLoading}
                        >
                            <Heart
                                className={cn(
                                    "h-5 w-5 mr-2 transition-all duration-500",
                                    isLiked ? "fill-red-500 text-red-500 scale-110 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]" : "group-hover/btn:scale-110"
                                )}
                            />
                            {Intl.NumberFormat('en-US', { notation: 'compact' }).format(likesCount)}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="flex-1 h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-base">
                                    <Share2 className="h-5 w-5 mr-2" />
                                    Share
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="p-2 w-56 bg-[#111] border-white/10 rounded-xl" align="center">
                                <DropdownMenuItem onClick={() => handleShare('twitter')} className="cursor-pointer text-zinc-300 hover:text-white focus:bg-white/10 rounded-lg py-2.5 flex items-center gap-3">
                                    <div className="relative w-4 h-4">
                                        <Image src={`${ASSET_BASE}/assets/twitter.svg`} alt="X" fill className="object-contain invert" />
                                    </div>
                                    Twitter / X
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShare('facebook')} className="cursor-pointer text-zinc-300 hover:text-white focus:bg-white/10 rounded-lg py-2.5 flex items-center gap-3">
                                    <div className="relative w-4 h-4">
                                        <Image src={`${ASSET_BASE}/assets/facebook.svg`} alt="Facebook" fill className="object-contain" />
                                    </div>
                                    Facebook
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShare('reddit')} className="cursor-pointer text-zinc-300 hover:text-white focus:bg-white/10 rounded-lg py-2.5 flex items-center gap-3">
                                    <div className="relative w-4 h-4 scale-125">
                                        <Image src={`${ASSET_BASE}/assets/reddit.svg`} alt="Reddit" fill className="object-contain" />
                                    </div>
                                    Reddit
                                </DropdownMenuItem>
                                <div className="h-[1px] bg-white/5 my-1" />
                                <DropdownMenuItem onClick={() => handleShare('copy')} className="cursor-pointer text-zinc-300 hover:text-white focus:bg-white/10 rounded-lg py-2.5 flex items-center gap-3">
                                    <LinkIcon className="h-4 w-4" /> Copy Link
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {isOwner && (
                            <Button
                                variant="outline"
                                className="flex-none h-12 w-12 rounded-xl border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 p-0"
                                onClick={handleDeleteClick}
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {}
                    <div className="mb-8 rounded-2xl bg-[#111113] border border-white/5 overflow-hidden">
                        {}
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
                            <Info className="h-4 w-4 text-emerald-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Information</span>
                        </div>

                        {}
                        {showInfo && (
                            <div className="divide-y divide-white/5">
                                {post.model && (
                                    <div className="flex items-center justify-between px-5 py-3.5">
                                        <span className="text-sm text-zinc-500">Model</span>
                                        <span className="text-sm font-medium text-white">{post.model}</span>
                                    </div>
                                )}
<<<<<<< HEAD
=======
                                {post.generationPlatform && (
                                    <div className="flex items-center justify-between px-5 py-3.5">
                                        <span className="text-sm text-zinc-500">Generation Platform</span>
                                        <span className="text-sm font-medium uppercase text-white">{post.generationPlatform}</span>
                                    </div>
                                )}
>>>>>>> 6369408 (feat: initial frontend + fixes)
                                {post.preset && (
                                    <div className="flex items-center justify-between px-5 py-3.5">
                                        <span className="text-sm text-zinc-500">Preset</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">{post.preset}</span>
                                            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/10">
                                                <Image src={post.author.avatar} alt="" fill className="object-cover" sizes="24px" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {post.quality && (
                                    <div className="flex items-center justify-between px-5 py-3.5">
                                        <span className="text-sm text-zinc-500">Quality</span>
                                        <span className="text-sm font-medium text-white">{post.quality}</span>
                                    </div>
                                )}
                                {post.size && (
                                    <div className="flex items-center justify-between px-5 py-3.5">
                                        <span className="text-sm text-zinc-500">Size</span>
                                        <span className="text-sm font-medium text-white">{post.size}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between px-5 py-3.5">
                                    <span className="text-sm text-zinc-500">Created</span>
                                    <span className="text-sm font-medium text-white">
                                        {post.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {}
                        <button
                            onClick={() => setShowInfo(!showInfo)}
                            className="w-full flex items-center justify-between px-5 py-3 border-t border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                            <span className="text-sm">{showInfo ? 'Show less' : 'Show more'}</span>
                            {showInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                    </div>

<<<<<<< HEAD
=======
                    {(parentPost || rootPost || childPosts.length > 0 || siblingPosts.length > 0 || branchPreview.length > 0) && (
                        <div className="mb-8 rounded-2xl bg-[#111113] border border-white/5 p-5 space-y-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Remix Graph</p>
                                <h3 className="mt-2 text-lg font-medium text-white">How this creation connects</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Graph Size</p>
                                    <p className="mt-2 text-2xl font-medium text-white">{graphStats.totalNodes}</p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Max Depth</p>
                                    <p className="mt-2 text-2xl font-medium text-white">{graphStats.maxDepth}</p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Sibling Remixes</p>
                                    <p className="mt-2 text-2xl font-medium text-white">{graphStats.siblingCount}</p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Direct Children</p>
                                    <p className="mt-2 text-2xl font-medium text-white">{graphStats.directChildCount}</p>
                                </div>
                            </div>

                            {lineageChain.length > 0 && (
                                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Lineage Path</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {lineageChain.map((node, index) => (
                                            <Link
                                                key={node.id}
                                                href={`/community/${node.id}`}
                                                className={cn(
                                                    "rounded-full border px-3 py-2 text-xs transition-colors",
                                                    node.id === post.id
                                                        ? "border-lime-300/40 bg-lime-300/10 text-lime-100"
                                                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20"
                                                )}
                                            >
                                                {index === 0 ? "Root" : index === lineageChain.length - 1 ? "Current" : "Branch"}: {node.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                {rootPost && (
                                    <Link
                                        href={`/community/${rootPost.id}`}
                                        className="block rounded-2xl border border-white/8 bg-black/20 p-4 hover:border-white/20 transition-colors"
                                    >
                                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Original Root</p>
                                        <p className="mt-1 font-medium text-white">{rootPost.title}</p>
                                        <p className="mt-1 text-sm text-zinc-400">Creation {rootPost.creationId?.slice(0, 8)}</p>
                                    </Link>
                                )}
                                {parentPost && (
                                    <Link
                                        href={`/community/${parentPost.id}`}
                                        className="block rounded-2xl border border-white/8 bg-black/20 p-4 hover:border-white/20 transition-colors"
                                    >
                                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Parent Remix</p>
                                        <p className="mt-1 font-medium text-white">{parentPost.title}</p>
                                        <p className="mt-1 text-sm text-zinc-400">Direct source for this remix</p>
                                    </Link>
                                )}
                                {childPosts.length > 0 && (
                                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Remix Children</p>
                                        <div className="mt-3 space-y-2">
                                            {childPosts.slice(0, 4).map((child) => (
                                                <Link
                                                    key={child.id}
                                                    href={`/community/${child.id}`}
                                                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 hover:border-white/15 transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{child.title}</p>
                                                        <p className="text-xs text-zinc-500">Depth {child.remixDepth || 1}</p>
                                                    </div>
                                                    <span className="text-xs uppercase tracking-[0.15em] text-zinc-500">Open</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {siblingPosts.length > 0 && (
                                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Sibling Remixes</p>
                                        <div className="mt-3 space-y-2">
                                            {siblingPosts.slice(0, 4).map((sibling) => (
                                                <Link
                                                    key={sibling.id}
                                                    href={`/community/${sibling.id}`}
                                                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 hover:border-white/15 transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{sibling.title}</p>
                                                        <p className="text-xs text-zinc-500">
                                                            Depth {sibling.remixDepth || 0} • {(sibling.generationPlatform || "unknown").toUpperCase()}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs uppercase tracking-[0.15em] text-zinc-500">Open</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {branchPreview.length > 0 && (
                                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Branch Snapshot</p>
                                        <div className="mt-3 grid gap-2">
                                            {branchPreview.map((relatedPost) => (
                                                <Link
                                                    key={relatedPost.id}
                                                    href={`/community/${relatedPost.id}`}
                                                    className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 hover:border-white/15 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-medium text-white">{relatedPost.title}</p>
                                                            <p className="mt-1 text-xs text-zinc-500">
                                                                Depth {relatedPost.remixDepth || 0}
                                                                {" • "}
                                                                {(relatedPost.generationPlatform || "unknown").toUpperCase()}
                                                                {relatedPost.model ? ` • ${relatedPost.model}` : ""}
                                                            </p>
                                                        </div>
                                                        <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Open</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {graphStats.platformBreakdown.length > 0 && (
                                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Platform Mix</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {graphStats.platformBreakdown.map((entry) => (
                                                <span
                                                    key={entry.platform}
                                                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300"
                                                >
                                                    {entry.platform} · {entry.count}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {topCreators.length > 0 && (
                                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Top Remix Creators</p>
                                        <div className="mt-3 space-y-2">
                                            {topCreators.map((creator) => (
                                                <div
                                                    key={creator.authorId}
                                                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{creator.authorName}</p>
                                                        <p className="text-xs text-zinc-500">
                                                            Max depth {creator.maxDepth} • Last remix{" "}
                                                            {creator.latestAt.toLocaleDateString("en-US", {
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-300">
                                                        {creator.count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {graphStats.depthBreakdown.length > 0 && (
                                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Depth Spread</p>
                                        <div className="mt-3 space-y-2.5">
                                            {graphStats.depthBreakdown.map((entry) => {
                                                const maxBucketCount = Math.max(...graphStats.depthBreakdown.map((item) => item.count), 1)
                                                const widthPercent = Math.max(10, Math.round((entry.count / maxBucketCount) * 100))
                                                return (
                                                    <div key={`depth-${entry.depth}`} className="space-y-1">
                                                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                                            <span>Depth {entry.depth}</span>
                                                            <span>{entry.count} node{entry.count > 1 ? "s" : ""}</span>
                                                        </div>
                                                        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-indigo-400/90 via-lime-300/80 to-cyan-300/90"
                                                                style={{ width: `${widthPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                                {remixTimeline.length > 0 && (
                                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Recent Remix Timeline</p>
                                        <div className="mt-3 space-y-2">
                                            {remixTimeline.slice(0, 8).map((event) => (
                                                <Link
                                                    key={event.postId}
                                                    href={`/community/${event.postId}`}
                                                    className={cn(
                                                        "block rounded-xl border px-3 py-2 transition-colors",
                                                        event.postId === post.id
                                                            ? "border-lime-300/30 bg-lime-300/10"
                                                            : "border-white/5 bg-white/[0.02] hover:border-white/15"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-white truncate">{event.title}</p>
                                                            <p className="text-xs text-zinc-500">
                                                                {event.authorName} • Depth {event.depth} • {event.platform}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                                                Node {event.cumulative}
                                                            </p>
                                                            <p className="text-[11px] text-zinc-400">
                                                                {event.createdAt.toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

>>>>>>> 6369408 (feat: initial frontend + fixes)
                    {}
                    <div className="mb-8 space-y-3">
                        <Button
                            className="w-full h-12 rounded-xl bg-[#c8ff00] hover:bg-[#b8ef00] text-black font-semibold text-sm transition-all duration-200"
                            onClick={() => {
<<<<<<< HEAD
                                const target = `/studio?mode=remix&prompt=${encodeURIComponent(post.prompt)}&previewUrl=${encodeURIComponent(post.assetUrl)}&creationId=${post.creationId || ''}&remixType=${post.type}`
=======
                                const target = `/studio?mode=remix&prompt=${encodeURIComponent(post.prompt)}&previewUrl=${encodeURIComponent(post.assetUrl)}&creationId=${post.creationId || ''}&rootCreationId=${post.rootCreationId || post.creationId || ''}&remixDepth=${(post.remixDepth || 0) + 1}&sourcePostId=${post.id}&taskId=${encodeURIComponent(post.taskId || post.creationId || '')}&generationPlatform=${encodeURIComponent(post.generationPlatform || '')}&remixType=${post.type}`
>>>>>>> 6369408 (feat: initial frontend + fixes)
                                if (!user) {
                                    router.push(`/login?redirect=${encodeURIComponent(target)}`)
                                } else {
                                    router.push(target)
                                }
                            }}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Remix Creation
                        </Button>
<<<<<<< HEAD
=======
                        <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl border-lime-300/30 bg-lime-300/10 hover:bg-lime-300/20 text-lime-100 text-sm"
                            onClick={() => {
                                if (!user) {
                                    router.push(`/login?redirect=${encodeURIComponent(directorRemixTarget)}`)
                                } else {
                                    router.push(directorRemixTarget)
                                }
                            }}
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Open In Director Mode
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="w-full h-12 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 text-sm"
                        >
                            <Link href={exportPackHref}>
                                <Download className="h-4 w-4 mr-2" />
                                Export Campaign Pack
                            </Link>
                        </Button>
>>>>>>> 6369408 (feat: initial frontend + fixes)
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-11 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 text-sm"
                                onClick={() => {
                                    const target = `/studio?mode=video&prompt=${encodeURIComponent(post.prompt)}&previewUrl=${encodeURIComponent(post.assetUrl)}`
                                    if (!user) {
                                        router.push(`/login?redirect=${encodeURIComponent(target)}`)
                                    } else {
                                        router.push(target)
                                    }
                                }}
                            >
                                <Film className="h-4 w-4 mr-2" />
                                Video
                            </Button>
                            <Button
                                variant="outline"
                                className="h-11 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 text-sm"
                                onClick={async () => {
                                    try {
                                        toast.loading("Preparing download...", { id: "download" })
                                        const res = await fetch(`/api/download?url=${encodeURIComponent(post.assetUrl)}`)
                                        if (!res.ok) throw new Error("Failed to download via proxy")
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
                                        toast.success("Download started!", { id: "download" })
                                    } catch {
                                        toast.error("Download failed. Please try again.", { id: "download" })
                                    }
                                }}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                            <Button
                                variant="outline"
                                className="h-11 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 text-sm"
                                onClick={() => {
                                    const upscalePrompt = post.type === 'video'
                                        ? `${post.prompt}, ultra high resolution 4k video upscale, enhanced visual details, smooth 60fps, incredible motion quality, cinematic masterpiece`
                                        : `${post.prompt}, ultra high resolution 8k image upscale, incredibly detailed, sharp focus, masterpiece`;
                                    const target = `/studio?mode=${post.type}&prompt=${encodeURIComponent(upscalePrompt)}&previewUrl=${encodeURIComponent(post.assetUrl)}`
                                    if (!user) {
                                        router.push(`/login?redirect=${encodeURIComponent(target)}`)
                                    } else {
                                        router.push(target)
                                    }
                                }}
                            >
                                <Maximize2 className="h-4 w-4 mr-2" />
                                Upscale
                            </Button>
                            <Button
                                variant="outline"
                                className="h-11 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 text-sm"
                                onClick={() => {
                                    const target = `/studio?mode=${post.type}&prompt=&previewUrl=${encodeURIComponent(post.assetUrl)}`
                                    if (!user) {
                                        router.push(`/login?redirect=${encodeURIComponent(target)}`)
                                    } else {
                                        router.push(target)
                                    }
                                }}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        </div>
                    </div>

                    {}
                    {post.allowRemix && (
                        <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                            <div className="bg-[#0f0f11] rounded-[14px] p-5 text-center">
                                <div className="mb-3 flex justify-center text-purple-400">
                                    <Sparkles className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-1">Remix this style</h3>
                                <p className="text-zinc-400 text-sm mb-4">
                                    Use this generation as a starting point for your own creation.
                                </p>
                                <Button
                                    className="w-full bg-white text-black hover:bg-zinc-200 rounded-xl h-12 text-base font-medium font-sans"
                                    onClick={() => {
<<<<<<< HEAD
                                        const target = `/studio?mode=remix&prompt=${encodeURIComponent(post.prompt)}&previewUrl=${encodeURIComponent(post.assetUrl)}&creationId=${post.creationId || ''}&remixType=${post.type}`
=======
                                        const target = `/studio?mode=remix&prompt=${encodeURIComponent(post.prompt)}&previewUrl=${encodeURIComponent(post.assetUrl)}&creationId=${post.creationId || ''}&rootCreationId=${post.rootCreationId || post.creationId || ''}&remixDepth=${(post.remixDepth || 0) + 1}&sourcePostId=${post.id}&taskId=${encodeURIComponent(post.taskId || post.creationId || '')}&generationPlatform=${encodeURIComponent(post.generationPlatform || '')}&remixType=${post.type}`
>>>>>>> 6369408 (feat: initial frontend + fixes)
                                        if (!user) {
                                            router.push(`/login?redirect=${encodeURIComponent(target)}`)
                                        } else {
                                            router.push(target)
                                        }
                                    }}
                                >
                                    Start Remixing
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </main>
    )
}
