"use client"

import Image from "next/image"

import { useState } from "react"
import { PricingHero } from "@/components/pricing-hero"
import { PricingCard } from "@/components/pricing-card"
import { PricingFaq } from "@/components/pricing-faq"
import type { PricingPlan } from "@/lib/types"

// Data (keeping it here for simplicity, could be moved to a lib later)
const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    credits: 10,
    features: ["10 credits/month", "Basic tools access", "Community sharing", "Standard support", "Personal license"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    credits: 500,
    features: [
      "500 credits/month",
      "All tools included",
      "Priority rendering",
      "Commercial license",
      "Priority email support",
      "API access (limited)",
      "Private projects",
    ],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    credits: 2000,
    features: [
      "2000 credits/month",
      "Team collaboration (5 seats)",
      "Advanced analytics",
      "Custom workflows",
      "Dedicated 24/7 support",
      "Full API access",
      "SLA guarantee",
      "SSO Integration",
    ],
  },
]


export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  return (
    <main className="relative min-h-screen text-foreground overflow-x-hidden selection:bg-primary/30 text-white">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/token.jpeg"
          alt="Pricing Background"
          fill
          className="object-cover opacity-60 mix-blend-overlay hue-rotate-15 "
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-background/95 to-background" />

      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <PricingHero billingCycle={billingCycle} setBillingCycle={setBillingCycle} />

        {/* Pricing Cards Section */}
        <section className="relative z-10 -mt-10 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start lg:gap-10">
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

        {/* FAQ Section */}
        <PricingFaq />
      </div>
    </main>
  )
}
