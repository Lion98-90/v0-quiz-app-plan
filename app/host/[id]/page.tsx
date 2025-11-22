import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HostGameController } from "@/components/game/host-game-controller"

export default async function HostGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Fetch existing game or create new one if just redirected from dashboard
  // In this flow, we assume the game ID passed is the QUIZ ID, and we need to create a game session
  // OR the game ID is the GAME ID.
  // Let's assume the ID passed is the QUIZ ID for now, and we create a game.
  // Actually, better pattern: Dashboard "Host" button creates game -> redirects to /host/game-id

  // Let's check if the ID looks like a game or a quiz.
  // For simplicity, let's assume the dashboard creates the game and redirects here with the GAME ID.

  const { data: game, error } = await supabase
    .from("games")
    .select(`
      *,
      quiz:quizzes (
        *,
        questions (
          *,
          options (*)
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error || !game) {
    // If not found, maybe it's a quiz ID?
    // For now, redirect back to dashboard
    redirect("/dashboard")
  }

  // Sort questions
  if (game.quiz && game.quiz.questions) {
    game.quiz.questions.sort((a: any, b: any) => a.order_index - b.order_index)
    game.quiz.questions.forEach((q: any) => {
      if (q.options) {
        q.options.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
      }
    })
  }

  return <HostGameController game={game} />
}
