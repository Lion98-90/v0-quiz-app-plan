import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 md:pt-24 pb-32">
      {/* Background Elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />

      <div className="container relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6 backdrop-blur-sm">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
          New: AI-Powered Quiz Generation
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 max-w-4xl">
          Make Learning <br className="hidden md:block" />
          <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500">
            Electrifyingly Fun
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          The interactive quiz platform that turns presentations into parties. Engage your audience in real-time with
          gamified polls, quizzes, and word clouds.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link href="/auth/sign-up" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full h-12 px-8 text-base font-semibold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 transition-all hover:scale-105"
            >
              Get Started for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/demo" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 px-8 text-base border-2 hover:bg-accent/50 transition-all bg-transparent"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Watch Demo
            </Button>
          </Link>
        </div>

        {/* Social Proof / Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 border-t pt-8 w-full max-w-4xl">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-foreground">10M+</span>
            <span className="text-sm text-muted-foreground">Players Joined</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-foreground">500k+</span>
            <span className="text-sm text-muted-foreground">Quizzes Created</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-foreground">99.9%</span>
            <span className="text-sm text-muted-foreground">Uptime</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-foreground">4.9/5</span>
            <span className="text-sm text-muted-foreground">User Rating</span>
          </div>
        </div>
      </div>
    </section>
  )
}
