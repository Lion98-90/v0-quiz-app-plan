"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, Sparkles, Zap, BookOpen, Layers, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CreateQuizPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("manual")
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  async function onSubmitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(event.currentTarget)
    const title = formData.get("title") as string
    const description = formData.get("description") as string

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          title,
          description,
          user_id: user.id,
          status: "draft",
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/dashboard/quiz/${data.id}`)
      router.refresh()
    } catch (error: any) {
      console.error(error)
      setError(error?.message || "Failed to create quiz")
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmitAI(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(event.currentTarget)
    const topic = formData.get("topic") as string
    const difficulty = formData.get("difficulty") as string

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      console.log("[v0] Starting AI quiz generation for topic:", topic)

      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic, difficulty, numQuestions: 5 }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[v0] API error:", data)
        throw new Error(data.error || data.details || "Failed to generate quiz")
      }

      const { questions } = data

      if (!questions || questions.length === 0) {
        throw new Error("No questions were generated")
      }

      console.log("[v0] Generated questions:", questions.length)

      // Create the quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: `${topic} Quiz`,
          description: `An AI-generated quiz about ${topic} (${difficulty} difficulty)`,
          user_id: user.id,
          status: "draft",
        })
        .select()
        .single()

      if (quizError) throw quizError

      // Insert questions and options
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]

        const { data: questionData, error: qError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            question_text: q.question_text,
            question_type: "multiple_choice",
            order_index: i,
            time_limit: q.time_limit || 30,
            points: q.points || 1000,
          })
          .select()
          .single()

        if (qError) {
          console.error("[v0] Error inserting question:", qError)
          throw qError
        }

        const optionsToInsert = q.options.map((opt: any) => ({
          question_id: questionData.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
        }))

        const { error: oError } = await supabase.from("options").insert(optionsToInsert)

        if (oError) {
          console.error("[v0] Error inserting options:", oError)
          throw oError
        }
      }

      console.log("[v0] Quiz created successfully, redirecting...")
      router.push(`/dashboard/quiz/${quiz.id}`)
      router.refresh()
    } catch (error: any) {
      console.error("[v0] Error in onSubmitAI:", error)
      setError(error?.message || "Failed to generate quiz. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create New Quiz</h1>
        <p className="text-muted-foreground mt-1">Start from scratch or let AI create a quiz for you.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/50 rounded-xl">
          <TabsTrigger
            value="manual"
            className="py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Manual Creation
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
            Generate with AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-0">
          <Card className="border-2 border-border/50 shadow-sm hover:border-primary/20 transition-colors">
            <form onSubmit={onSubmitManual}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Quiz Details
                </CardTitle>
                <CardDescription>
                  Basic information about your quiz. You can add questions in the next step.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base">
                    Title
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g. General Knowledge Trivia"
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Briefly describe what this quiz is about..."
                    className="min-h-[120px] resize-none"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 bg-muted/20 py-4">
                <Link href="/dashboard">
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isLoading} className="px-6">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create & Add Questions
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-0">
          <Card className="border-2 border-primary/10 shadow-lg shadow-primary/5">
            <form onSubmit={onSubmitAI}>
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  AI Quiz Generator
                </CardTitle>
                <CardDescription>
                  Just tell us a topic, and our AI will generate engaging questions, options, and correct answers
                  instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-base">
                    Quiz Topic
                  </Label>
                  <Input
                    id="topic"
                    name="topic"
                    placeholder="e.g. World History, Science, Pop Culture..."
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty" className="text-base">
                    Difficulty Level
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {["Easy", "Medium", "Hard", "Expert"].map((level) => (
                      <div key={level} className="relative">
                        <input
                          type="radio"
                          name="difficulty"
                          value={level}
                          id={`diff-${level}`}
                          className="peer sr-only"
                          defaultChecked={level === "Medium"}
                        />
                        <label
                          htmlFor={`diff-${level}`}
                          className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-muted bg-card hover:bg-accent hover:text-accent-foreground peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary cursor-pointer transition-all text-sm font-medium"
                        >
                          {level}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 bg-muted/20 py-4">
                <Link href="/dashboard">
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 px-6 shadow-md hover:shadow-lg transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4 fill-current" />
                      Generate Quiz
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
