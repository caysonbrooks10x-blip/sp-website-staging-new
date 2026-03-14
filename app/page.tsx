"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { ScrollExperience } from "@/components/scroll-experience"

const MarketplaceSection = dynamic(() => import("@/components/marketplace-section").then(mod => mod.MarketplaceSection), { ssr: false })
const CommunitySection = dynamic(() => import("@/components/community-section").then(mod => mod.CommunitySection), { ssr: false })
const CTASection = dynamic(() => import("@/components/cta-section").then(mod => mod.CTASection), { ssr: false })
const Footer = dynamic(() => import("@/components/footer").then(mod => mod.Footer), { ssr: false })

function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <main className="min-h-screen bg-background text-foreground">
        <ScrollExperience />
        <MarketplaceSection />
        <CommunitySection />
        <CTASection />
        <Footer />
      </main>
    </Suspense>
  )
}

export default ExplorePage
