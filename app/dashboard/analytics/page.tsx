import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { BarChart3, Users, Clock, Trophy, Target } from "lucide-react"
import { redirect } from "next/navigation"

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Placeholder data - in a real app, this would aggregate actual game data
  const stats = [
    {
      title: "Total Players",
      value: "0",
      description: "+0% from last month",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Games Hosted",
      value: "0",
      description: "+0% from last month",
      icon: Trophy,
      color: "text-yellow-500",
    },
    {
      title: "Avg. Duration",
      value: "0m",
      description: "-0% from last month",
      icon: Clock,
      color: "text-green-500",
    },
    {
      title: "Completion Rate",
      value: "0%",
      description: "+0% from last month",
      icon: Target,
      color: "text-purple-500",
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground mt-2">Insights into your quiz performance and player engagement.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your quiz hosting activity over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
              <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
              <span>No data available yet</span>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Quizzes</CardTitle>
            <CardDescription>Your most popular content.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
              <Trophy className="h-8 w-8 mb-2 opacity-50" />
              <span>No quizzes hosted yet</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
