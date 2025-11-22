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
import { ArrowLeft, Loader2, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CreateQuizPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("manual")
  const router = useRouter()
  const supabase = createClient()

  async function onSubmitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

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
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmitAI(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const topic = formData.get("topic") as string
    const difficulty = formData.get("difficulty") as string

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // 1. Generate questions using AI
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ topic, difficulty }),
      })

      if (!response.ok) throw new Error("Failed to generate quiz")
      const { questions } = await response.json()

      // 2. Create the quiz
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

      // 3. Insert questions and options
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const { data: questionData, error: qError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            question_text: q.question_text,
            question_type: "multiple_choice",
            order_index: i,
            time_limit: q.time_limit,
            points: q.points,
          })
          .select()
          .single()

        if (qError) throw qError

        const optionsToInsert = q.options.map((opt: any) => ({
          question_id: questionData.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
        }))

        const { error: oError } = await supabase.from("options").insert(optionsToInsert)

        if (oError) throw oError
      }

      router.push(`/dashboard/quiz/${quiz.id}`)
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Create New Quiz</h1>
        <p className="text-muted-foreground">Choose how you want to start creating.</p>
      </div>

      <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="manual">Manual Creation</TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
            Generate with AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <form onSubmit={onSubmitManual}>
              <CardHeader>
                <CardTitle>Quiz Details</CardTitle>
                <CardDescription>You can add questions after creating the quiz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" placeholder="e.g. General Knowledge Trivia" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Briefly describe what this quiz is about..."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Link href="/dashboard">
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create & Add Questions
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="border-primary/20 shadow-lg shadow-primary/5">
            <form onSubmit={onSubmitAI}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  AI Quiz Generator
                </CardTitle>
                <CardDescription>Tell us a topic and we'll generate questions for you!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Quiz Topic</Label>
                  <Input
                    id="topic"
                    name="topic"
                    placeholder="e.g. 1990s Pop Music, Photosynthesis, French History..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select name="difficulty" defaultValue="Medium">
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                      <SelectItem value="Expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Link href="/dashboard">
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Magic...
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
