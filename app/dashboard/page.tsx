import Link from "next/link"
import { Plus, Calendar, Users, MoreVertical, Play, PenSquare, BarChart2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createGame } from "@/app/actions/game"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Welcome back! Here's an overview of your quiz activity.</p>
        </div>
        <Link href="/dashboard/create">
          <Button className="gap-2 shadow-sm hover:shadow-md transition-all" size="lg">
            <Plus className="h-5 w-5" /> Create New Quiz
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <PenSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quizzes?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">+{(quizzes?.length || 0) > 0 ? 1 : 0} from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Across all your quizzes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground mt-1">Based on player results</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Recent Quizzes
        </h3>

        {quizzes?.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center bg-card/50 hover:bg-card transition-colors">
            <div className="rounded-full bg-primary/10 p-4 mb-4 ring-8 ring-primary/5">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No quizzes created yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm">
              Get started by creating your first interactive quiz. It only takes a few minutes and you can use AI to
              help!
            </p>
            <Link href="/dashboard/create">
              <Button size="lg" className="shadow-sm">
                Create Your First Quiz
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes?.map((quiz) => (
              <Card
                key={quiz.id}
                className="group hover:shadow-lg transition-all duration-300 border-muted-foreground/10 hover:border-primary/20 flex flex-col"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="truncate text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                      {quiz.title}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mt-1 -mr-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="line-clamp-2 min-h-[2.5em] text-sm mt-1">
                    {quiz.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4 flex-1">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="font-normal text-xs bg-secondary/50">
                      {quiz.status || "Draft"}
                    </Badge>
                    <Badge variant="outline" className="font-normal text-xs">
                      Multiple Choice
                    </Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground gap-4 border-t pt-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>0 plays</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 gap-2">
                  <Link href={`/dashboard/quiz/${quiz.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-colors bg-transparent"
                    >
                      Edit
                    </Button>
                  </Link>
                  <form action={createGame.bind(null, quiz.id)} className="flex-1">
                    <Button className="w-full shadow-sm group-hover:shadow-md transition-all">Host Live</Button>
                  </form>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
