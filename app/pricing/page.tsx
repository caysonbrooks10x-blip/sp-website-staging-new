"use client"

import { useState } from "react"
import { PricingHero } from "@/components/pricing-hero"
import { PricingCard } from "@/components/pricing-card"
import { PricingFaq } from "@/components/pricing-faq"
import { PaymentMethods } from "@/components/payment-methods"
import type { PricingPlan } from "@/lib/types"

const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    yearlyPrice: 276,
    credits: 5800,
    creditsPerYear: 69600,
    generationValue: 29,
    features: [
      "5,800 credits/month",
      "All AI Models Access",
      "Text to Image / Image to Image",
      "Text to Video / Image to Video",
      "Music Generation & Editing",
      "Motion Control & Character Anim.",
      "Commercial License",
      "Priority Queue",
      "Priority Email Support",
      "Top-Up Available",
    ],
    queuePriority: "Standard",
    support: "Email",
    bestFor: "Casual creators",
    stripeMonthlyLink: "https://buy.stripe.com/9B6fZj2Se4AObFD8iigYU0c",
    stripeYearlyLink: "https://buy.stripe.com/3cIcN764q2sG9xv0PQgYU0r",
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    yearlyPrice: 756,
    credits: 18000,
    creditsPerYear: 216000,
    generationValue: 90,
    features: [
      "18,000 credits/month",
      "All AI Models Access",
      "Text to Image / Image to Image",
      "Text to Video / Image to Video",
      "Music Generation & Editing",
      "Motion Control & Character Anim.",
      "Commercial License",
      "Priority Queue",
      "Priority Email Support",
      "Top-Up Available",
    ],
    popular: true,
    queuePriority: "Priority",
    support: "Priority Email",
    bestFor: "Freelancers & teams",
    stripeMonthlyLink: "https://buy.stripe.com/cNicN764q6IW5hfaqqgYU0i",
    stripeYearlyLink: "https://buy.stripe.com/aFadRb0K62sGgZXbuugYU0k",
    tiers: [
      { credits: 18000, price: 79, yearlyPrice: 756, stripeMonthlyLink: "https://buy.stripe.com/cNicN764q6IW5hfaqqgYU0i", stripeYearlyLink: "https://buy.stripe.com/aFadRb0K62sGgZXbuugYU0k" },
      { credits: 24000, price: 105, yearlyPrice: 1008, stripeMonthlyLink: "https://buy.stripe.com/5kQ8wRfF09V810Z1TUgYU0f", stripeYearlyLink: "https://buy.stripe.com/14AdRb64q9V8cJHeGGgYU0o" },
      { credits: 30000, price: 129, yearlyPrice: 1236, stripeMonthlyLink: "https://buy.stripe.com/3cI4gBboKffs6lj9mmgYU0h", stripeYearlyLink: "https://buy.stripe.com/7sY28t9gCebo5hf9mmgYU0n" },
      { credits: 38000, price: 159, yearlyPrice: 1524, stripeMonthlyLink: "https://buy.stripe.com/5kQ4gBboKffs4dbcyygYU0d", stripeYearlyLink: "https://buy.stripe.com/8x2cN79gC0ky397eGGgYU0m" },
      { credits: 45000, price: 189, yearlyPrice: 1812, stripeMonthlyLink: "https://buy.stripe.com/14AcN7boKebo9xv422gYU0e", stripeYearlyLink: "https://buy.stripe.com/aFacN73Wi4AOcJH2XYgYU0q" },
      { credits: 60000, price: 249, yearlyPrice: 2388, stripeMonthlyLink: "https://buy.stripe.com/fZu9AVgJ4aZc5hfcyygYU0g", stripeYearlyLink: "https://buy.stripe.com/6oU5kF78uffsaBzaqqgYU0p" },
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    price: 199,
    yearlyPrice: 1908,
    credits: 50000,
    creditsPerYear: 600000,
    generationValue: 250,
    features: [
      "50,000 credits/month",
      "All AI Models Access",
      "Text to Image / Image to Image",
      "Text to Video / Image to Video",
      "Music Generation & Editing",
      "Motion Control & Character Anim.",
      "Commercial License",
      "Priority Queue",
      "Priority Email Support",
      "Top-Up Available",
    ],
    queuePriority: "Priority",
    support: "Priority Email",
    bestFor: "Agencies & power users",
    stripeMonthlyLink: "https://buy.stripe.com/3cI8wR64qebobFDeGGgYU0b",
    stripeYearlyLink: "https://buy.stripe.com/5kQfZj1Oa1oCdNL1TUgYU0j",
  },
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  return (
    <main className="relative min-h-screen bg-black text-white overflow-x-hidden selection:bg-cyan-500/30">
      {}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08)_0%,transparent_70%)]" />
        {}
        <div className="absolute top-[40%] right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(6,182,212,0.04)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10">
        {}
        <PricingHero billingCycle={billingCycle} setBillingCycle={setBillingCycle} />

        {}
        <section className="relative z-10 -mt-6 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start lg:gap-8">
              {pricingPlans.map((plan, index) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  index={index}
                  billingCycle={billingCycle}
                />
              ))}
            </div>
          </div>
        </section>

        {}
        <PaymentMethods />

        {}
        <PricingFaq />
      </div>
    </main>
  )
}
