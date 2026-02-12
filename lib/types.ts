export interface App {
  id: string
  name: string
  description: string
  icon?: string
  image?: string
  tags: string[]
  creditCost: number
  isNew?: boolean
  isPro?: boolean
}

export interface Recipe {
  id: string
  appId: string
  title: string
  creator: string
  creatorAvatar?: string
  thumbnail?: string
  creditsUsed: number
  imageUrl?: string
  videoUrl?: string
}

export interface Job {
  id: string
  status: "queued" | "warming" | "processing" | "completed" | "failed"
  progress?: number
  result?: string
  error?: string
  createdAt: Date
}

export interface User {
  id: string
  name: string
  avatar?: string
  credits: number
  totalGenerations: number
  totalRemixes: number
}

export interface PricingPlan {
  id: string
  name: string
  price: number
  credits: number
  features: string[]
  popular?: boolean
}

export interface Creation {
  id: string
  appId: string
  appName: string
  status: "draft" | "generating" | "completed"
  thumbnail?: string
  createdAt: Date
}

export interface CommunityPost {
  id: string
  title: string
  description?: string
  author: {
    id: string
    name: string
    avatar: string
  }
  assetUrl: string
  thumbnailUrl: string
  aspectRatio: "square" | "portrait" | "landscape"
  likes: number
  views: number
  allowRemix: boolean
  createdAt: Date
  remixSourceId?: string // If this post is a remix of another
  tags: string[]
}
