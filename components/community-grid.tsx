"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import { CommunityPostCard } from "@/components/community-post-card"
import { useSearchParams } from "next/navigation"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebaseClient"
import type { CommunityPost } from "@/lib/types"
import { mapCommunityPost } from "@/lib/community-post"

const LEGACY_TEMPLATE_SLUG_FRAGMENTS = [
    "fire-lava",
    "air-bending",
    "earth-zoom",
    "shadow-smoke",
    "animalization",
    "raven-transform",
    "train-rush",
    "mouth-in",
]

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function getPostTags(post: CommunityPost) {
    return (post.tags || []).map((tag) => tag.toLowerCase())
}

function isLegacyTemplatePost(post: CommunityPost) {
    const tags = getPostTags(post)
    const slug = slugify(post.title || "")
    return (
        tags.includes("legacy-template") ||
        tags.includes("legacy-community") ||
        tags.includes("legacy-migration") ||
        LEGACY_TEMPLATE_SLUG_FRAGMENTS.some((fragment) => slug.includes(fragment))
    )
}

function isTemplatePost(post: CommunityPost) {
    if (isLegacyTemplatePost(post)) return false
    const tags = getPostTags(post)
    const platform = (post.generationPlatform || "").toLowerCase()
    return (
        tags.includes("template") ||
        tags.includes("workflow") ||
        platform.includes("template") ||
        (post.type === "video" && post.allowRemix)
    )
}

export function CommunityGrid() {
    const gridRef = useRef<HTMLDivElement>(null)
    const searchParams = useSearchParams()

    const tagFilter = searchParams.get("tag")
    const textFilter = (searchParams.get("q") || "").trim().toLowerCase()
    const quickFilter = (searchParams.get("filter") || "").trim().toLowerCase()

    const [livePosts, setLivePosts] = useState<CommunityPost[]>([])
    const [removedPosts, setRemovedPosts] = useState<Set<string>>(new Set())

    const handleRemovePost = (postId: string) => {
        setRemovedPosts(current => new Set(current).add(postId));
    };

    const handleRestorePost = (postId: string) => {
        setRemovedPosts(current => {
            const next = new Set(current);
            next.delete(postId);
            return next;
        });
    };

    
    useEffect(() => {
        const q = query(
            collection(db, "posts"),
            orderBy("createdAt", "desc")
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs
                .filter(doc => {
                    const data = doc.data();
                    return data.isDeleted !== true && data.status !== "deleted";
                })
                .map(doc => mapCommunityPost(doc.id, doc.data() as Record<string, any>));
            setLivePosts(fetchedPosts);
        }, (error) => {
            console.error("Error fetching live posts:", error);
        });

        return () => unsubscribe();
    }, []);

    const filteredPosts = useMemo(() => {
        const combined = [...livePosts];

        
        const uniquePostsMap = new Map<string, CommunityPost>();
        combined.forEach(post => {
            if (!uniquePostsMap.has(post.id)) {
                uniquePostsMap.set(post.id, post);
            }
        });
        
        let finalArray = Array.from(uniquePostsMap.values()).filter(post => !removedPosts.has(post.id));

        if (tagFilter) {
            finalArray = finalArray.filter(post =>
                post.tags.some((tag: string) => tag.toLowerCase() === tagFilter.toLowerCase())
            );
        }

        if (textFilter) {
            finalArray = finalArray.filter((post) => {
                const haystack = [
                    post.title,
                    post.description,
                    post.prompt,
                    post.author?.name,
                    ...(post.tags || []),
                    post.model,
                    post.generationPlatform,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(textFilter);
            });
        }

        if (quickFilter === "works") {
            finalArray = finalArray.filter((post) => !isLegacyTemplatePost(post) && !isTemplatePost(post));
        } else if (quickFilter === "templates") {
            finalArray = finalArray.filter((post) => isTemplatePost(post));
        } else if (quickFilter === "video") {
            finalArray = finalArray.filter((post) => post.type === "video");
        } else if (quickFilter === "image") {
            finalArray = finalArray.filter((post) => post.type === "image");
        } else if (quickFilter === "directed") {
            finalArray = finalArray.filter((post) => Boolean(post.campaign?.directed));
        } else if (quickFilter === "remixable") {
            finalArray = finalArray.filter((post) => post.allowRemix);
        } else if (quickFilter === "branching") {
            finalArray = finalArray.filter((post) =>
                Boolean(post.parentCreationId || post.rootCreationId || post.sourcePostId || (post.remixDepth || 0) > 0)
            );
        } else if (quickFilter === "telegram") {
            finalArray = finalArray.filter((post) => {
                const tags = (post.tags || []).map((tag) => tag.toLowerCase());
                return tags.includes("telegram") || tags.includes("claw") || (post.generationPlatform || "").toLowerCase().includes("telegram");
            });
        }

        
        const images = finalArray.filter(p => p.type === 'image');
        const videos = finalArray.filter(p => p.type === 'video');
        
        const mixed: CommunityPost[] = [];
        let imgIdx = 0;
        let vidIdx = 0;
        
        while (imgIdx < images.length || vidIdx < videos.length) {
            
            if (imgIdx < images.length) mixed.push(images[imgIdx++]);
            if (imgIdx < images.length) mixed.push(images[imgIdx++]);
            
            
            if (vidIdx < videos.length) {
                mixed.push(videos[vidIdx++]);
            }
        }

        return mixed;
    }, [quickFilter, tagFilter, textFilter, livePosts, removedPosts]);


    if (filteredPosts.length === 0) {
        const reason = textFilter
            ? `No posts match "${textFilter}".`
            : tagFilter
                ? `There are no posts with the tag "#${tagFilter}".`
                : quickFilter
                    ? `No posts match the "${quickFilter}" filter.`
                    : "No community generations are available yet.";
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-xl font-medium text-white mb-2">No generations found</p>
                <p className="text-zinc-500">{reason}</p>
            </div>
        )
    }

    return (
        <div ref={gridRef} className="columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-6">
            {filteredPosts.map((post, index) => (
                <div
                    key={post.id}
                    className="break-inside-avoid inline-block w-full mb-6"
                >
                    <div
                        className="community-card-inner rounded-xl overflow-hidden block animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both"
                        style={{ animationDelay: `${(index % 12) * 50}ms` }}
                    >
                        <CommunityPostCard post={post} index={index} onRemovePost={handleRemovePost} onRestorePost={handleRestorePost} />
                    </div>
                </div>
            ))}
        </div>
    )
}
