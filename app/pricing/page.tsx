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
    yearlyPrice: 278,
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
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    yearlyPrice: 758,
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
    tiers: [
      { credits: 18000, price: 79, yearlyPrice: 758 },
      { credits: 24000, price: 105, yearlyPrice: 1008 },
      { credits: 30000, price: 129, yearlyPrice: 1238 },
      { credits: 38000, price: 159, yearlyPrice: 1526 },
      { credits: 45000, price: 189, yearlyPrice: 1814 },
      { credits: 60000, price: 249, yearlyPrice: 2390 },
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    price: 199,
    yearlyPrice: 1910,
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
  },
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  return (
    <main className="relative min-h-screen bg-black text-white overflow-x-hidden selection:bg-cyan-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Top center radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08)_0%,transparent_70%)]" />
        {/* Secondary subtle glow */}
        <div className="absolute top-[40%] right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(6,182,212,0.04)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <PricingHero billingCycle={billingCycle} setBillingCycle={setBillingCycle} />

        {/* Pricing Cards Section */}
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

        {/* Payment Methods Section */}
        <PaymentMethods />

        {/* FAQ Section */}
        <PricingFaq />
      </div>
    </main>
  )
}
