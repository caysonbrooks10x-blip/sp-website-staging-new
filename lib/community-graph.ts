import type { CommunityPost } from "@/lib/types"

export interface CommunityGraphStats {
  totalNodes: number
  siblingCount: number
  directChildCount: number
  maxDepth: number
  depthBreakdown: Array<{ depth: number; count: number }>
  platformBreakdown: Array<{ platform: string; count: number }>
}

export interface CommunityCreatorStat {
  authorId: string
  authorName: string
  count: number
  maxDepth: number
  latestAt: Date
}

export interface CommunityRemixTimelinePoint {
  postId: string
  title: string
  depth: number
  platform: string
  createdAt: Date
  authorName: string
  cumulative: number
}

export function dedupeCommunityPosts(posts: Array<CommunityPost | null | undefined>): CommunityPost[] {
  const seen = new Map<string, CommunityPost>()
  for (const post of posts) {
    if (!post) continue
    seen.set(post.id, post)
  }
  return Array.from(seen.values())
}

export function buildLineageChain(current: CommunityPost, parent?: CommunityPost | null, root?: CommunityPost | null): CommunityPost[] {
  return dedupeCommunityPosts([root, parent, current])
}

export function buildCommunityGraphStats(input: {
  current: CommunityPost
  graphPosts: CommunityPost[]
  siblingPosts: CommunityPost[]
  childPosts: CommunityPost[]
}): CommunityGraphStats {
  const allPosts = dedupeCommunityPosts([input.current, ...input.graphPosts])
  const platformCounts = new Map<string, number>()
  const depthCounts = new Map<number, number>()

  for (const post of allPosts) {
    const platform = (post.generationPlatform || "unknown").toUpperCase()
    platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1)
    const depth = post.remixDepth || 0
    depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1)
  }

  return {
    totalNodes: allPosts.length,
    siblingCount: input.siblingPosts.length,
    directChildCount: input.childPosts.length,
    maxDepth: allPosts.reduce((max, post) => Math.max(max, post.remixDepth || 0), 0),
    depthBreakdown: Array.from(depthCounts.entries())
      .map(([depth, count]) => ({ depth, count }))
      .sort((a, b) => a.depth - b.depth),
    platformBreakdown: Array.from(platformCounts.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count),
  }
}

export function buildCommunityCreatorStats(posts: CommunityPost[], limitCount = 5): CommunityCreatorStat[] {
  const counters = new Map<
    string,
    {
      authorId: string
      authorName: string
      count: number
      maxDepth: number
      latestAt: Date
    }
  >()

  for (const post of dedupeCommunityPosts(posts)) {
    const authorId = post.author?.id || post.author?.name || "unknown"
    const authorName = post.author?.name || "Unknown"
    const entry = counters.get(authorId)
    if (!entry) {
      counters.set(authorId, {
        authorId,
        authorName,
        count: 1,
        maxDepth: post.remixDepth || 0,
        latestAt: post.createdAt,
      })
      continue
    }

    entry.count += 1
    entry.maxDepth = Math.max(entry.maxDepth, post.remixDepth || 0)
    if (post.createdAt.getTime() > entry.latestAt.getTime()) {
      entry.latestAt = post.createdAt
    }
  }

  return Array.from(counters.values())
    .sort((a, b) => b.count - a.count || b.latestAt.getTime() - a.latestAt.getTime())
    .slice(0, Math.max(1, limitCount))
}

export function buildCommunityRemixTimeline(posts: CommunityPost[]): CommunityRemixTimelinePoint[] {
  const sorted = dedupeCommunityPosts(posts).sort(
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() ||
      (a.remixDepth || 0) - (b.remixDepth || 0)
  )

  return sorted.map((post, index) => ({
    postId: post.id,
    title: post.title,
    depth: post.remixDepth || 0,
    platform: (post.generationPlatform || "unknown").toUpperCase(),
    createdAt: post.createdAt,
    authorName: post.author?.name || "Unknown",
    cumulative: index + 1,
  }))
}
