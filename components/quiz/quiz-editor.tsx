"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Save, Settings, Trash2, Play } from "lucide-react"
import { QuestionCard } from "@/components/quiz/question-card"
import Link from "next/link"

interface Option {
  id: string
  option_text: string
  is_correct: boolean
  question_id: string
}

interface Question {
  id: string
  question_text: string
  question_type: "multiple_choice" | "true_false" | "open_ended"
  time_limit: number
  points: number
  order_index: number
  quiz_id: string
  options: Option[]
}

interface Quiz {
  id: string
  title: string
  description: string
  status: string
  questions: Question[]
}

export function QuizEditor({ quiz }: { quiz: Quiz }) {
  const [questions, setQuestions] = useState<Question[]>(quiz.questions || [])
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(questions.length > 0 ? questions[0].id : null)
  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState(quiz.title)
  const [description, setDescription] = useState(quiz.description || "")

  const router = useRouter()
  const supabase = createClient()

  const handleAddQuestion = async () => {
    setIsSaving(true)
    try {
      const newOrderIndex = questions.length > 0 ? Math.max(...questions.map((q) => q.order_index)) + 1 : 0

      const { data: question, error } = await supabase
        .from("questions")
        .insert({
          quiz_id: quiz.id,
          question_text: "New Question",
          question_type: "multiple_choice",
          order_index: newOrderIndex,
          time_limit: 30,
          points: 1000,
        })
        .select()
        .single()

      if (error) throw error

      // Add default options for the new question
      const { data: options, error: optionsError } = await supabase
        .from("options")
        .insert([
          { question_id: question.id, option_text: "Option 1", is_correct: false },
          { question_id: question.id, option_text: "Option 2", is_correct: false },
          { question_id: question.id, option_text: "Option 3", is_correct: false },
          { question_id: question.id, option_text: "Option 4", is_correct: true },
        ])
        .select()

      if (optionsError) throw optionsError

      const newQuestion: Question = {
        ...question,
        options: options || [],
      }

      setQuestions([...questions, newQuestion])
      setActiveQuestionId(newQuestion.id)
    } catch (error) {
      console.error("Error adding question:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return

    try {
      const { error } = await supabase.from("questions").delete().eq("id", id)

      if (error) throw error

      const newQuestions = questions.filter((q) => q.id !== id)
      setQuestions(newQuestions)
      if (activeQuestionId === id) {
        setActiveQuestionId(newQuestions.length > 0 ? newQuestions[0].id : null)
      }
    } catch (error) {
      console.error("Error deleting question:", error)
    }
  }

  const handleUpdateQuizDetails = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase.from("quizzes").update({ title, description }).eq("id", quiz.id)

      if (error) throw error
    } catch (error) {
      console.error("Error updating quiz:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateQuestionLocal = (updatedQuestion: Question) => {
    setQuestions(questions.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q)))
  }

  const activeQuestion = questions.find((q) => q.id === activeQuestionId)

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-card p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleUpdateQuizDetails}
              className="text-lg font-bold h-8 border-transparent hover:border-input px-2 -ml-2 w-[300px]"
            />
            <Badge variant={quiz.status === "published" ? "default" : "secondary"} className="mt-1">
              {quiz.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleUpdateQuizDetails} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button variant="secondary">
            <Settings className="h-4 w-4 mr-2" /> Settings
          </Button>
          <Button>
            <Play className="h-4 w-4 mr-2" /> Preview
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Question List */}
        <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
          <div className="p-4 border-b flex items-center justify-between">
            <span className="font-semibold text-sm">Questions ({questions.length})</span>
            <Button variant="ghost" size="icon" onClick={handleAddQuestion} disabled={isSaving}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {questions.map((q, index) => (
              <div
                key={q.id}
                onClick={() => setActiveQuestionId(q.id)}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2 group
                  ${
                    activeQuestionId === q.id
                      ? "bg-background border-primary ring-1 ring-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }
                `}
              >
                <div className="bg-muted text-muted-foreground w-6 h-6 rounded flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{q.question_text}</p>
                  <p className="text-xs text-muted-foreground capitalize">{q.question_type.replace("_", " ")}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 -mr-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteQuestion(q.id)
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full border-dashed mt-2 bg-transparent"
              onClick={handleAddQuestion}
              disabled={isSaving}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Question
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-muted/10 p-8 overflow-y-auto">
          {activeQuestion ? (
            <QuestionCard key={activeQuestion.id} question={activeQuestion} onUpdate={updateQuestionLocal} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <div className="bg-muted rounded-full p-6 mb-4">
                <Plus className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Question Selected</h3>
              <p className="mb-6">Select a question from the left or create a new one.</p>
              <Button onClick={handleAddQuestion}>Create First Question</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
