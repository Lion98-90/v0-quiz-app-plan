"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Trash2, Clock, Trophy, Check, Circle, ImageIcon, HelpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

export function QuestionCard({ question, onUpdate }: { question: Question; onUpdate: (q: Question) => void }) {
  const [localQuestion, setLocalQuestion] = useState(question)
  const supabase = createClient()

  // ... existing useEffects and handlers ...
  // Update local state when prop changes (switching questions)
  useEffect(() => {
    setLocalQuestion(question)
  }, [question])

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
    await supabase.from("options").update({ option_text: text }).eq("id", optionId)
  }

  const handleCorrectOptionChange = async (optionId: string) => {
    const updatedOptions = localQuestion.options.map((opt) => ({
      ...opt,
      is_correct: opt.id === optionId,
    }))
    const updated = { ...localQuestion, options: updatedOptions }
    setLocalQuestion(updated)
    onUpdate(updated)
    await Promise.all(
      updatedOptions.map((opt) => supabase.from("options").update({ is_correct: opt.is_correct }).eq("id", opt.id)),
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-6 shadow-sm border-l-4 border-l-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <HelpCircle className="w-24 h-24" />
        </div>

        <div className="space-y-6 relative z-10">
          <div className="flex gap-6 items-start">
            <div className="flex-1 space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                Question Text
                <Badge variant="outline" className="font-normal text-xs ml-2 bg-muted/50">
                  Required
                </Badge>
              </Label>
              <div className="relative">
                <Input
                  value={localQuestion.question_text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="text-xl font-medium h-14 pl-4 pr-10 shadow-sm transition-all focus-visible:ring-primary"
                  placeholder="Start typing your question here..."
                />
                <div className="absolute right-3 top-3.5 text-muted-foreground">
                  <HelpCircle className="w-6 h-6 opacity-20" />
                </div>
              </div>
            </div>

            <div className="w-64 space-y-3">
              <Label className="text-base font-semibold">Question Type</Label>
              <Select value={localQuestion.question_type} onValueChange={(v: any) => handleTypeChange(v)}>
                <SelectTrigger className="h-14 bg-card">
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
          <div className="flex gap-8 pt-6 border-t border-border/50">
            <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg pr-4 border border-transparent hover:border-border/50 transition-colors">
              <div className="p-2 bg-background rounded-md shadow-sm">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Time Limit</Label>
                <Select
                  value={localQuestion.time_limit.toString()}
                  onValueChange={async (v) => {
                    const val = Number.parseInt(v)
                    setLocalQuestion({ ...localQuestion, time_limit: val })
                    onUpdate({ ...localQuestion, time_limit: val })
                    await updateQuestionInDb({ time_limit: val })
                  }}
                >
                  <SelectTrigger className="h-7 w-[100px] border-0 bg-transparent p-0 focus:ring-0 text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="20">20 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">60 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg pr-4 border border-transparent hover:border-border/50 transition-colors">
              <div className="p-2 bg-background rounded-md shadow-sm">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">Points</Label>
                <Select
                  value={localQuestion.points.toString()}
                  onValueChange={async (v) => {
                    const val = Number.parseInt(v)
                    setLocalQuestion({ ...localQuestion, points: val })
                    onUpdate({ ...localQuestion, points: val })
                    await updateQuestionInDb({ points: val })
                  }}
                >
                  <SelectTrigger className="h-7 w-[100px] border-0 bg-transparent p-0 focus:ring-0 text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No points</SelectItem>
                    <SelectItem value="500">500 points</SelectItem>
                    <SelectItem value="1000">1000 points</SelectItem>
                    <SelectItem value="2000">2000 points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 flex justify-end items-center">
              <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                <ImageIcon className="w-4 h-4" /> Add Image (Coming Soon)
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Answer Options Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <Label className="text-lg font-semibold flex items-center gap-2">
            Answer Options
            <Badge variant="secondary" className="text-xs font-normal">
              Select the correct answer
            </Badge>
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localQuestion.options.map((option, index) => (
            <div key={option.id} className="group relative">
              <div
                className={`
                  absolute left-0 top-0 bottom-0 w-2 rounded-l-xl transition-colors z-10
                  ${option.is_correct ? "bg-green-500" : "bg-muted group-hover:bg-primary/30"}
                `}
              />
              <Card
                className={`
                  pl-6 p-4 flex items-center gap-3 border-2 transition-all h-full
                  ${
                    option.is_correct
                      ? "border-green-500 bg-green-50/30 dark:bg-green-900/10 shadow-sm"
                      : "border-transparent hover:border-primary/20 hover:bg-muted/30"
                  }
                `}
              >
                <div className="flex-1 flex items-center gap-3">
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCorrectOptionChange(option.id)}
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all transform active:scale-95
                        ${
                          option.is_correct
                            ? "bg-green-500 text-white shadow-md hover:bg-green-600"
                            : "bg-muted text-muted-foreground hover:bg-muted-foreground/20 border border-transparent hover:border-primary/20"
                        }
                      `}
                      title={option.is_correct ? "Correct Answer" : "Mark as Correct"}
                    >
                      {option.is_correct ? <Check className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                    </button>
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 ml-1 block">Option {index + 1}</Label>
                    <Input
                      value={option.option_text}
                      onChange={(e) => handleOptionChange(option.id, e.target.value)}
                      className={`
                        border-0 border-b-2 rounded-none px-1 shadow-none bg-transparent h-auto py-1 text-base focus-visible:ring-0 transition-colors
                        ${option.is_correct ? "border-green-200 focus-visible:border-green-500" : "border-transparent focus-visible:border-primary"}
                      `}
                      placeholder={`Type answer option here...`}
                    />
                  </div>
                </div>

                {localQuestion.options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
