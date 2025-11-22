import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { CTA } from "@/components/landing/cta"
import { SiteFooter } from "@/components/site-footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  )
}
