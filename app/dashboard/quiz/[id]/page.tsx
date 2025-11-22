import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { QuizEditor } from "@/components/quiz/quiz-editor"

export default async function QuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Fetch quiz with questions and options
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select(`
      *,
      questions (
        *,
        options (*)
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !quiz) {
    redirect("/dashboard")
  }

  // Sort questions by order_index
  if (quiz.questions) {
    quiz.questions.sort((a: any, b: any) => a.order_index - b.order_index)
    // Sort options for each question
    quiz.questions.forEach((q: any) => {
      if (q.options) {
        q.options.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
      }
    })
  }

  return <QuizEditor quiz={quiz} />
}
