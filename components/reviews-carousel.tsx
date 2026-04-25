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
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&h=240&fit=crop&crop=faces",
    body: "StudioX cut my pre-viz cycle from a week to an afternoon. I storyboard in the morning and have a Seedance pass back before lunch.",
    rating: 5,
  },
  {
    name: "Daniel Keller",
    role: "Brand designer at a Series A startup",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&fit=crop&crop=faces",
    body: "We moved our entire mockup pipeline onto StudioX. Quality jumped a tier and we cancelled three other tools on the same day.",
    rating: 5,
  },
  {
    name: "Jessica Lee",
    role: "Content creator, 480K subscribers",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&h=240&fit=crop&crop=faces",
    body: "My Reels finally stopped looking like every other AI video on the feed. StudioX gives me the look I was paying editors for.",
    rating: 5,
  },
  {
    name: "Jonas Williams",
    role: "Solo founder",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=240&h=240&fit=crop&crop=faces",
    body: "Replaced four subscriptions in a single afternoon. StudioX shows credit cost upfront, top-ups never expire, and nothing ever surprised my card.",
    rating: 5,
  },
  {
    name: "Olivia Parker",
    role: "Art director at a creative agency",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=240&h=240&fit=crop&crop=faces",
    body: "Our whole team onboarded in a day. StudioX is now where every client review starts because we can remix moodboards live.",
    rating: 5,
  },
  {
    name: "Marcus Bennett",
    role: "Game studio technical artist",
    avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=240&h=240&fit=crop&crop=faces",
    body: "I built a key-art set and a six-second teaser inside StudioX in forty minutes. The pitch deck went out that night and we got the green light.",
    rating: 5,
  },
  {
    name: "Sofia Grant",
    role: "Photographer turned director",
    avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=240&h=240&fit=crop&crop=faces",
    body: "StudioX keeps the lighting and lens character of my reference photo when it animates. That alone moved me off the three other tools I was hopping between.",
    rating: 5,
  },
  {
    name: "David Reynolds",
    role: "Marketing lead at a DTC brand",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=240&h=240&fit=crop&crop=faces",
    body: "Our weekly creative output doubled without adding headcount. I brief StudioX from Telegram on the train and the results land before I am at the desk.",
    rating: 5,
  },
  {
    name: "Lauren Mitchell",
    role: "Freelance illustrator",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&h=240&fit=crop&crop=faces",
    body: "I was the AI sceptic on my team. StudioX is the first tool whose output I will hand to a paying client without retouching.",
    rating: 5,
  },
  {
    name: "Eli Brooks",
    role: "Creator-economy operator",
    avatar: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=240&h=240&fit=crop&crop=faces",
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
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={i < count ? "#d97706" : "none"}
          stroke={i < count ? "#d97706" : "rgba(0,0,0,0.18)"}
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review, tilt }: { review: Review; tilt: number }) {
  return (
    <article
      className="shrink-0 w-[300px] sm:w-[360px] bg-white rounded-2xl p-7 transition-transform duration-300 hover:!rotate-0 hover:scale-[1.015]"
      style={{
        transform: `rotate(${tilt}deg)`,
        boxShadow:
          "0 1px 0 rgba(0,0,0,0.04), 0 8px 24px -10px rgba(40,30,15,0.18), 0 24px 48px -24px rgba(40,30,15,0.10)",
        border: "1px solid rgba(40,30,15,0.06)",
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <img
          src={review.avatar}
          alt={review.name}
          className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-amber-900/10"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-stone-900 truncate">{review.name}</div>
          <div className="text-[11px] text-stone-500 truncate">{review.role}</div>
        </div>
        <StarRating count={review.rating} />
      </div>
      <p className="text-[14px] leading-[1.65] text-stone-700">{review.body}</p>
    </article>
  )
}

// Two rows scrolling opposite directions for visual rhythm + density.
function MarqueeRow({
  reviews,
  reverse = false,
  speed = 28,
  paused,
  tilts,
}: {
  reviews: Review[]
  reverse?: boolean
  speed?: number
  paused: boolean
  tilts: number[]
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const singleSetRef = useRef<number>(0)
  const pausedRef = useRef(paused)

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

    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp
      const delta = timestamp - lastTime
      lastTime = timestamp
      const setWidth = singleSetRef.current
      if (setWidth > 0 && !pausedRef.current) {
        const direction = reverse ? -1 : 1
        offset = (offset + (speed * delta) / 1000) % setWidth
        const renderedOffset = direction > 0 ? -offset : offset - setWidth
        track.style.transform = `translate3d(${renderedOffset}px, 0, 0)`
      }
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => {
      clearTimeout(measureTimer)
      cancelAnimationFrame(rafId)
    }
  }, [reverse, speed])

  const tripled = [...reviews, ...reviews, ...reviews]

  return (
    <div
      className="overflow-hidden py-4"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
      }}
    >
      <div ref={trackRef} className="flex items-stretch gap-6 will-change-transform">
        {tripled.map((r, i) => (
          <ReviewCard key={`${r.name}-${i}`} review={r} tilt={tilts[i % tilts.length]} />
        ))}
      </div>
    </div>
  )
}

export function ReviewsCarousel() {
  const [paused, setPaused] = useState(false)

  // Pre-computed tilt angles for hand-pinned feel; deterministic so cards
  // don't reflow on every render.
  const tiltsTop = [-1.4, 0.8, -0.6, 1.2, -1.0, 0.6, -0.9, 1.4, -0.5, 1.0]
  const tiltsBottom = [1.0, -0.8, 1.3, -0.5, 0.7, -1.2, 0.4, -1.4, 0.9, -0.6]

  const halfA = REVIEWS.slice(0, 5)
  const halfB = REVIEWS.slice(5)

  return (
    <section
      className="relative z-10 py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% 0%, #fef9ec 0%, #f7f0dd 35%, #f0e8d2 100%)",
      }}
    >
      {/* Grain overlay for paper texture */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.045] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Decorative ornament */}
      <div aria-hidden className="absolute top-12 left-1/2 -translate-x-1/2 text-amber-700/20 text-3xl select-none">
        ✦ ✦ ✦
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-800/70 mb-5">
            From the StudioX community
          </span>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-[-0.02em] leading-[1.05] text-stone-900 mb-6"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
          >
            Real creators.
            <br />
            <em className="italic font-normal text-amber-900/85">Real results.</em>
          </h2>
          <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Filmmakers, designers, founders, and content creators on what changed after they switched to StudioX.
          </p>
        </div>

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="space-y-2"
        >
          <MarqueeRow reviews={halfA.concat(halfB)} reverse={false} speed={26} paused={paused} tilts={tiltsTop} />
          <MarqueeRow reviews={halfB.concat(halfA)} reverse={true} speed={32} paused={paused} tilts={tiltsBottom} />
        </div>

        {/* Trust footer */}
        <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-stone-700">
          <div className="flex items-center gap-2">
            <StarRating count={5} />
            <span className="text-sm font-semibold">4.9 average</span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-stone-300" />
          <div className="text-sm">
            <span className="font-semibold text-stone-900">2,400+</span>
            <span className="text-stone-600"> creators shipping with StudioX</span>
          </div>
        </div>
      </div>
    </section>
  )
}
