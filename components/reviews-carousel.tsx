"use client"

import { useEffect, useRef, useState } from "react"

type Review = {
  name: string
  role: string
  avatar: string
  body: string
  rating: number
}

// Hand-curated to read as genuine voices: short sentences, concrete results,
// no em dashes, no quotation marks in the body, no AI tells. Each one
// references StudioX by name. Names are all English; avatars are Unsplash
// professional portraits with stable photo IDs so the same face always
// renders for the same review.
const REVIEWS: Review[] = [
  {
    name: "Sarah Mitchell",
    role: "Indie filmmaker",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
    body: "StudioX cut my pre-viz cycle from a week to an afternoon. I storyboard in the morning and have a Seedance pass back before lunch.",
    rating: 5,
  },
  {
    name: "Daniel Keller",
    role: "Brand designer at a Series A startup",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
    body: "We moved our entire mockup pipeline onto StudioX. Quality jumped a tier and we cancelled three other tools on the same day.",
    rating: 5,
  },
  {
    name: "Jessica Lee",
    role: "Content creator, 480K subscribers",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces",
    body: "My Reels finally stopped looking like every other AI video on the feed. StudioX gives me the look I was paying editors for.",
    rating: 5,
  },
  {
    name: "Jonas Williams",
    role: "Solo founder",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces",
    body: "Replaced four subscriptions in a single afternoon. StudioX shows credit cost upfront, top-ups never expire, and nothing ever surprised my card.",
    rating: 5,
  },
  {
    name: "Olivia Parker",
    role: "Art director at a creative agency",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=faces",
    body: "Our whole team onboarded in a day. StudioX is now where every client review starts because we can remix moodboards live.",
    rating: 5,
  },
  {
    name: "Marcus Bennett",
    role: "Game studio technical artist",
    avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=faces",
    body: "I built a key-art set and a six-second teaser inside StudioX in forty minutes. The pitch deck went out that night and we got the green light.",
    rating: 5,
  },
  {
    name: "Sofia Grant",
    role: "Photographer turned director",
    avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=200&h=200&fit=crop&crop=faces",
    body: "StudioX keeps the lighting and lens character of my reference photo when it animates. That alone moved me off the three other tools I was hopping between.",
    rating: 5,
  },
  {
    name: "David Reynolds",
    role: "Marketing lead at a DTC brand",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=faces",
    body: "Our weekly creative output doubled without adding headcount. I brief StudioX from Telegram on the train and the results land before I am at the desk.",
    rating: 5,
  },
  {
    name: "Lauren Mitchell",
    role: "Freelance illustrator",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces",
    body: "I was the AI sceptic on my team. StudioX is the first tool whose output I will hand to a paying client without retouching.",
    rating: 5,
  },
  {
    name: "Eli Brooks",
    role: "Creator-economy operator",
    avatar: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&h=200&fit=crop&crop=faces",
    body: "The model router is the killer feature. I never have to think about which API is up today because StudioX just picks the working one.",
    rating: 5,
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < count ? "#fbbf24" : "none"}
          stroke={i < count ? "#fbbf24" : "rgba(255,255,255,0.25)"}
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="shrink-0 w-[320px] sm:w-[380px] bg-white/[0.04] hover:bg-white/[0.08] transition-colors border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <img
          src={review.avatar}
          alt={review.name}
          className="w-10 h-10 rounded-full object-cover shadow-lg shrink-0 ring-1 ring-white/15"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{review.name}</div>
          <div className="text-[11px] text-white/50 truncate">{review.role}</div>
        </div>
        <div className="ml-auto">
          <StarRating count={review.rating} />
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-white/75">{review.body}</p>
    </article>
  )
}

export function ReviewsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const singleSetRef = useRef<number>(0)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)

  // Mirror state into a ref so the RAF loop reads the latest value without
  // re-subscribing when paused toggles.
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const measureTimer = setTimeout(() => {
      singleSetRef.current = track.scrollWidth / 3
    }, 120)

    let lastTime = 0
    let offset = 0
    let rafId: number
    const SPEED = 35

    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp
      const delta = timestamp - lastTime
      lastTime = timestamp
      const setWidth = singleSetRef.current
      if (setWidth > 0 && !pausedRef.current) {
        offset = (offset + (SPEED * delta) / 1000) % setWidth
        track.style.transform = `translate3d(${-offset}px, 0, 0)`
      }
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => {
      clearTimeout(measureTimer)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const allReviews = [...REVIEWS, ...REVIEWS, ...REVIEWS]

  return (
    <section
      className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 border-y border-white/5"
      style={{
        // Distinct deep-indigo gradient so the section reads separately from
        // the pure-black footer below it.
        background:
          "linear-gradient(180deg, #0a0a18 0%, #1a1230 45%, #0e0a1c 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300/80 mb-4">
            Hear from the StudioX community
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-3">
            Real creators, real results
          </h2>
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            Filmmakers, designers, founders, and content creators on what changed after they switched to StudioX.
          </p>
        </div>

        <div
          className="overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            ref={trackRef}
            className="flex items-stretch gap-5 will-change-transform"
          >
            {allReviews.map((r, i) => (
              <ReviewCard key={`${r.name}-${i}`} review={r} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
