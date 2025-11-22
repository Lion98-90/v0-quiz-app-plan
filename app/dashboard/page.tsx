import Link from "next/link"
import { Plus, Calendar, Users, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Quizzes</h2>
          <p className="text-muted-foreground">Manage your quizzes and view results.</p>
        </div>
        <Link href="/dashboard/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Quiz
          </Button>
        </Link>
      </div>

      {quizzes?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center bg-card">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No quizzes created yet</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Get started by creating your first interactive quiz. It only takes a few minutes!
          </p>
          <Link href="/dashboard/create">
            <Button>Create Quiz</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes?.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="truncate">{quiz.title}</CardTitle>
                  <Button variant="ghost" size="icon" className="-mt-2 -mr-2 h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5em]">
                  {quiz.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>0 plays</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="flex gap-2 w-full">
                  <Link href={`/dashboard/quiz/${quiz.id}`} className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      Edit
                    </Button>
                  </Link>
                  <Button className="flex-1">Host</Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
