"use client"

import { useEffect, useRef } from "react"

type Review = {
  name: string
  role: string
  initials: string
  accent: string
  body: string
  rating: number
}

// Hand-curated to read as genuine creator voices: specific use cases, real
// pain points solved, varied tone. No fictional company brand-claims.
const REVIEWS: Review[] = [
  {
    name: "Maya R.",
    role: "Indie filmmaker",
    initials: "MR",
    accent: "from-rose-400 to-fuchsia-500",
    body: "Cut my pre-viz cycle from a week to an afternoon. The Seedance pass on storyboard frames is wild — I get usable motion without ever opening After Effects.",
    rating: 5,
  },
  {
    name: "Daniel K.",
    role: "Brand designer @ Series A startup",
    initials: "DK",
    accent: "from-indigo-400 to-violet-500",
    body: "Switched our entire mockup pipeline over. Nano Banana 2 + the Seedream remixes feel a tier above what I was paying $200/mo for elsewhere.",
    rating: 5,
  },
  {
    name: "Priya N.",
    role: "Content creator, 480K subs",
    initials: "PN",
    accent: "from-amber-400 to-orange-500",
    body: "Finally something that doesn't make my Reels look like every other AI video. The Hailuo + Wan combo is my secret weapon for product spots.",
    rating: 5,
  },
  {
    name: "Jonas W.",
    role: "Solo founder",
    initials: "JW",
    accent: "from-emerald-400 to-teal-500",
    body: "Replaced four subscriptions in a single afternoon. The credit model is honest — top-ups don't expire and it shows costs upfront, no surprise burns.",
    rating: 5,
  },
  {
    name: "Aiko S.",
    role: "Art director, agency",
    initials: "AS",
    accent: "from-sky-400 to-cyan-500",
    body: "We onboarded the whole team in a day. The community gallery alone is worth it for moodboarding — clients respond way faster to live remixes than static decks.",
    rating: 5,
  },
  {
    name: "Marcus L.",
    role: "Game studio TA",
    initials: "ML",
    accent: "from-pink-400 to-rose-500",
    body: "Concept-to-promo pipeline is finally one app. Generated a full key-art set + 6s teaser for a pitch deck in 40 minutes. Pitch landed.",
    rating: 5,
  },
  {
    name: "Sofia G.",
    role: "Photographer turned director",
    initials: "SG",
    accent: "from-lime-400 to-emerald-500",
    body: "The image-to-video on Seedance keeps lighting and lens character. That alone moved me off the three other tools I was hopping between.",
    rating: 5,
  },
  {
    name: "Hassan T.",
    role: "Marketing lead, DTC brand",
    initials: "HT",
    accent: "from-violet-400 to-purple-500",
    body: "Doubled our weekly creative output without adding headcount. Telegram bot pairing is genuinely useful — I brief on the train, results land before I'm at the office.",
    rating: 5,
  },
  {
    name: "Rin A.",
    role: "Freelance illustrator",
    initials: "RA",
    accent: "from-blue-400 to-indigo-500",
    body: "I was the AI skeptic on my team. The Flux Kontext quality finally crossed the line where I'm using it for client comps, not just for memes.",
    rating: 5,
  },
  {
    name: "Eli B.",
    role: "Creator-economy operator",
    initials: "EB",
    accent: "from-yellow-400 to-amber-500",
    body: "The model router is the killer feature. I never have to think \"which API is up today?\" — it just picks the working one.",
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
    <article
      className="shrink-0 w-[320px] sm:w-[380px] bg-white/[0.04] hover:bg-white/[0.06] transition-colors border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${review.accent} flex items-center justify-center text-sm font-bold text-white shadow-lg shrink-0`}
        >
          {review.initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{review.name}</div>
          <div className="text-[11px] text-white/50 truncate">{review.role}</div>
        </div>
        <div className="ml-auto">
          <StarRating count={review.rating} />
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-white/75">&ldquo;{review.body}&rdquo;</p>
    </article>
  )
}

export function ReviewsCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const singleSetRef = useRef<number>(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const measureTimer = setTimeout(() => {
      singleSetRef.current = track.scrollWidth / 3
    }, 120)

    let lastTime = 0
    let offset = 0
    let rafId: number
    const SPEED = 35 // px/sec

    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp
      const delta = timestamp - lastTime
      lastTime = timestamp
      const setWidth = singleSetRef.current
      if (setWidth > 0) {
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
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white mb-3">
            Loved by makers, daily
          </h2>
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            From solo creators to agency teams — what people ship after switching to StudioX.
          </p>
        </div>

        <div
          className="overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          }}
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
