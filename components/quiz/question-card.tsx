"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Trash2, Clock, Trophy, Check, Circle } from "lucide-react"

// Types (duplicated for now, could be moved to types.ts)
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

export function QuestionCard({ question, onUpdate }: { question: Question; onUpdate: (q: Question) => void }) {
  const [localQuestion, setLocalQuestion] = useState(question)
  const supabase = createClient()

  // Update local state when prop changes (switching questions)
  useEffect(() => {
    setLocalQuestion(question)
  }, [question]) // Only reset when question changes

  const updateQuestionInDb = async (updates: Partial<Question>) => {
    try {
      const { error } = await supabase.from("questions").update(updates).eq("id", question.id)

      if (error) throw error
    } catch (error) {
      console.error("Error updating question:", error)
    }
  }

  const handleTextChange = (text: string) => {
    const updated = { ...localQuestion, question_text: text }
    setLocalQuestion(updated)
    onUpdate(updated)
  }

  // Debounce save for text
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuestion.question_text !== question.question_text) {
        updateQuestionInDb({ question_text: localQuestion.question_text })
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [localQuestion.question_text])

  const handleTypeChange = async (type: Question["question_type"]) => {
    const updated = { ...localQuestion, question_type: type }
    setLocalQuestion(updated)
    onUpdate(updated)
    await updateQuestionInDb({ question_type: type })
  }

  const handleOptionChange = async (optionId: string, text: string) => {
    const updatedOptions = localQuestion.options.map((opt) =>
      opt.id === optionId ? { ...opt, option_text: text } : opt,
    )
    const updated = { ...localQuestion, options: updatedOptions }
    setLocalQuestion(updated)
    onUpdate(updated)

    // Debounce logic could go here too, but for simplicity direct update for now or short debounce
    // For this demo, direct update on blur would be better, but let's do direct update
    await supabase.from("options").update({ option_text: text }).eq("id", optionId)
  }

  const handleCorrectOptionChange = async (optionId: string) => {
    // For multiple choice (single answer), only one can be correct
    // For now assuming single correct answer for multiple choice
    const updatedOptions = localQuestion.options.map((opt) => ({
      ...opt,
      is_correct: opt.id === optionId,
    }))
    const updated = { ...localQuestion, options: updatedOptions }
    setLocalQuestion(updated)
    onUpdate(updated)

    // Transaction or multiple updates
    // Set all to false first then true for one, or just update all
    // Doing it in a loop for now (not atomic but ok for v0)
    await Promise.all(
      updatedOptions.map((opt) => supabase.from("options").update({ is_correct: opt.is_correct }).eq("id", opt.id)),
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="mb-2 block">Question</Label>
              <Input
                value={localQuestion.question_text}
                onChange={(e) => handleTextChange(e.target.value)}
                className="text-lg font-medium h-12"
                placeholder="Start typing your question..."
              />
            </div>
            <div className="w-48">
              <Label className="mb-2 block">Type</Label>
              <Select value={localQuestion.question_type} onValueChange={(v: any) => handleTypeChange(v)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                  <SelectItem value="open_ended">Open Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Question Settings */}
          <div className="flex gap-6 pt-2 border-t mt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs uppercase text-muted-foreground font-bold">Time Limit</Label>
              <Select
                value={localQuestion.time_limit.toString()}
                onValueChange={async (v) => {
                  const val = Number.parseInt(v)
                  setLocalQuestion({ ...localQuestion, time_limit: val })
                  onUpdate({ ...localQuestion, time_limit: val })
                  await updateQuestionInDb({ time_limit: val })
                }}
              >
                <SelectTrigger className="h-8 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 sec</SelectItem>
                  <SelectItem value="20">20 sec</SelectItem>
                  <SelectItem value="30">30 sec</SelectItem>
                  <SelectItem value="60">60 sec</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs uppercase text-muted-foreground font-bold">Points</Label>
              <Select
                value={localQuestion.points.toString()}
                onValueChange={async (v) => {
                  const val = Number.parseInt(v)
                  setLocalQuestion({ ...localQuestion, points: val })
                  onUpdate({ ...localQuestion, points: val })
                  await updateQuestionInDb({ points: val })
                }}
              >
                <SelectTrigger className="h-8 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="2000">2000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Answer Options Area */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Answer Options</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localQuestion.options.map((option, index) => (
            <Card
              key={option.id}
              className={`p-4 flex items-center gap-3 border-2 transition-colors ${
                option.is_correct
                  ? "border-green-500 bg-green-50/10"
                  : "border-transparent hover:border-muted-foreground/20"
              }`}
            >
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors
                ${option.is_correct ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"}
              `}
                onClick={() => handleCorrectOptionChange(option.id)}
              >
                {option.is_correct ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </div>

              <Input
                value={option.option_text}
                onChange={(e) => handleOptionChange(option.id, e.target.value)}
                className="flex-1 border-none shadow-none bg-transparent h-auto py-2 px-0 text-base focus-visible:ring-0"
                placeholder={`Option ${index + 1}`}
              />

              {localQuestion.options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
