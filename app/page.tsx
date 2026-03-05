"use client"

import { Suspense } from "react"
import { ScrollExperience } from "@/components/scroll-experience"
import { MarketplaceSection } from "@/components/marketplace-section"
import { CommunitySection } from "@/components/community-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

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
