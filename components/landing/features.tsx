import { BrainCircuit, Trophy, BarChart3, Smartphone, Globe, Users } from "lucide-react"

const features = [
  {
    icon: BrainCircuit,
    title: "AI-Powered Creation",
    description: "Generate entire quizzes from PDFs, slide decks, or simple text prompts in seconds.",
  },
  {
    icon: Users,
    title: "Massive Scale",
    description: "Host events with up to 100,000 concurrent participants with <200ms latency.",
  },
  {
    icon: Trophy,
    title: "Gamification Engine",
    description: "Leaderboards, badges, streaks, and team modes to keep competition fierce and fun.",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description: "Understand knowledge gaps with per-user and cohort-based performance reports.",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "No app download needed. Players join via QR code or simple URL on any device.",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Automatic translation into 30+ languages for international audiences.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to engage your audience</h2>
          <p className="text-lg text-muted-foreground">
            Lovable Bolt combines enterprise-grade reliability with consumer-grade delight.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
