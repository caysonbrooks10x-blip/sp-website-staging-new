"use client"

import { useEffect, useRef } from "react"

// Stripe-supported payment methods relevant to a global SaaS audience.
// Source: https://stripe.com/docs/payments/payment-methods/integration-options
// Uses Simple Icons CDN; no Next/Image domain config needed because <img>
// loads cross-origin SVGs without going through next/image.
const PAYMENT_METHODS = [
  { name: "Visa", slug: "visa" },
  { name: "Mastercard", slug: "mastercard" },
  { name: "American Express", slug: "americanexpress" },
  { name: "Discover", slug: "discover" },
  { name: "JCB", slug: "jcb" },
  { name: "Diners Club", slug: "dinersclub" },
  { name: "UnionPay", slug: "unionpay" },
  { name: "Apple Pay", slug: "applepay" },
  { name: "Google Pay", slug: "googlepay" },
  { name: "PayPal", slug: "paypal" },
  { name: "Klarna", slug: "klarna" },
  { name: "Afterpay", slug: "afterpay" },
  { name: "Affirm", slug: "affirm" },
  { name: "Cash App", slug: "cashapp" },
  { name: "Amazon Pay", slug: "amazonpay" },
  { name: "Alipay", slug: "alipay" },
  { name: "WeChat Pay", slug: "wechat" },
  { name: "iDEAL", slug: "ideal" },
  { name: "Bancontact", slug: "bancontact" },
  { name: "SEPA", slug: "sepa" },
] as const

function MethodTile({ name, slug }: { name: string; slug: string }) {
  return (
    <div
      className="shrink-0 w-20 h-12 sm:w-24 sm:h-14 bg-[#111111] border border-white/10 rounded-xl flex items-center justify-center p-2.5 sm:p-3"
      title={name}
    >
      <img
        src={`https://cdn.simpleicons.org/${slug}/ffffff`}
        alt={name}
        className="w-full h-full object-contain opacity-80"
        loading="lazy"
      />
    </div>
  )
}

export function PaymentMethods() {
  const trackRef = useRef<HTMLDivElement>(null)
  const singleSetRef = useRef<number>(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const measure = () => {
      // Track contains 4 copies of PAYMENT_METHODS for seamless scrolling.
      singleSetRef.current = track.scrollWidth / 4
    }
    const measureTimer = setTimeout(measure, 100)

    let lastTime = 0
    let offset = 0
    let rafId: number
    const SPEED = 28 // px/sec

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

  // 4× duplication keeps the track wider than the viewport for seamless wrap.
  const allMethods = [...PAYMENT_METHODS, ...PAYMENT_METHODS, ...PAYMENT_METHODS, ...PAYMENT_METHODS]

  return (
    <section className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8 text-white/60">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="text-sm font-medium">Pay safely and securely with</span>
        </div>

        <div
          className="w-full overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          <div
            ref={trackRef}
            className="flex items-center gap-3 sm:gap-4 will-change-transform"
          >
            {allMethods.map((m, i) => (
              <MethodTile key={`${m.slug}-${i}`} name={m.name} slug={m.slug} />
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs text-white/40">
          Powered by <span className="text-white/60 font-medium">Stripe</span> · 20+ payment methods worldwide
        </p>
      </div>
    </section>
  )
}
