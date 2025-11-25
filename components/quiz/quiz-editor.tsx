"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Save, Settings, Play, LayoutGrid, MoreVertical } from "lucide-react"
import { QuestionCard } from "@/components/quiz/question-card"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// ... existing types ...
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

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (quiz.questions && quiz.questions.length > 0) {
      setQuestions(quiz.questions)
      if (!activeQuestionId || !quiz.questions.find((q) => q.id === activeQuestionId)) {
        setActiveQuestionId(quiz.questions[0].id)
      }
    }
  }, [quiz.questions])

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
      const { error } = await supabase.from("quizzes").update({ title }).eq("id", quiz.id) // simplified update
      if (error) throw error
    } catch (error) {
      console.error("Error updating quiz:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateQuestionLocal = (updatedQuestion: Question) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((q) => (q.id === updatedQuestion.id ? { ...q, ...updatedQuestion } : q)),
    )
  }

  const activeQuestion = questions.find((q) => q.id === activeQuestionId)

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b bg-card px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4 flex-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Back to Dashboard</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleUpdateQuizDetails}
                className="text-lg font-bold h-8 border-transparent hover:border-input px-2 -ml-2 w-[300px] bg-transparent focus-visible:bg-background transition-colors"
              />
              <Badge
                variant={quiz.status === "published" ? "default" : "secondary"}
                className="h-5 text-[10px] uppercase tracking-wider"
              >
                {quiz.status}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground px-2">
              {isSaving ? "Saving changes..." : "All changes saved"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleUpdateQuizDetails} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-2" /> Settings
          </Button>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button size="sm" className="bg-primary text-primary-foreground shadow-sm hover:shadow-md transition-all">
            <Play className="h-4 w-4 mr-2" /> Preview
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Question List */}
        <div className="w-72 border-r bg-muted/10 flex flex-col shrink-0 transition-all">
          <div className="p-4 border-b bg-card/50 flex items-center justify-between sticky top-0 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Questions ({questions.length})</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddQuestion}
              disabled={isSaving}
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {questions.map((q, index) => (
              <div
                key={q.id}
                onClick={() => setActiveQuestionId(q.id)}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 group relative
                  ${
                    activeQuestionId === q.id
                      ? "bg-background border-primary shadow-sm ring-1 ring-primary/10"
                      : "bg-card border-border/50 hover:border-primary/30 hover:bg-accent/50"
                  }
                `}
              >
                <div className="text-muted-foreground w-6 flex flex-col items-center justify-start gap-1 shrink-0 pt-1">
                  <span className="text-xs font-bold opacity-50 group-hover:opacity-100 transition-opacity">
                    {index + 1}
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate leading-tight">
                    {q.question_text && q.question_text !== "New Question" ? q.question_text : "New Question"}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <span>{q.question_type.replace("_", " ")}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{q.time_limit}s</span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute right-2 top-2 hover:bg-muted transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        // Duplicate logic could go here
                      }}
                    >
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteQuestion(q.id)
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {activeQuestionId === q.id && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                )}
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full border-dashed mt-4 bg-transparent hover:bg-accent/50 h-12 text-muted-foreground"
              onClick={handleAddQuestion}
              disabled={isSaving}
            >
              <Plus className="h-4 w-4 mr-2" /> Add New Question
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-muted/5 p-8 overflow-y-auto scroll-smooth">
          {activeQuestion ? (
            <div className="max-w-4xl mx-auto">
              <QuestionCard
                key={`${activeQuestion.id}-${activeQuestion.question_text}`}
                question={activeQuestion}
                onUpdate={updateQuestionLocal}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
              <div className="bg-muted rounded-full p-8 mb-6 shadow-inner">
                <LayoutGrid className="h-16 w-16 opacity-20" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">No Question Selected</h3>
              <p className="mb-8 text-center max-w-sm">
                Select a question from the sidebar to edit it, or create a new one to get started.
              </p>
              <Button onClick={handleAddQuestion} size="lg" className="shadow-md hover:shadow-lg transition-all">
                <Plus className="h-5 w-5 mr-2" /> Create First Question
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
