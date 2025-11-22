import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function CTA() {
  return (
    <section className="py-24 container">
      <div className="relative rounded-3xl bg-primary px-6 py-16 md:px-16 md:py-20 overflow-hidden text-center md:text-left">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to electrify your presentations?</h2>
            <p className="text-primary-foreground/90 text-lg md:text-xl">
              Join thousands of educators and team leaders using Lovable Bolt today. No credit card required.
            </p>
          </div>
          <Link href="/auth/sign-up">
            <Button
              size="lg"
              variant="secondary"
              className="h-14 px-8 text-lg font-semibold shadow-xl hover:scale-105 transition-transform"
            >
              Get Started for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
