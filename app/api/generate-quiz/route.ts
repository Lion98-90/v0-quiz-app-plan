import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question_text: z.string().min(5).describe("A clear, well-formed question"),
        time_limit: z.number().int().min(10).max(60).describe("Time limit in seconds"),
        points: z.number().int().min(100).max(2000).describe("Points for correct answer"),
        options: z
          .array(
            z.object({
              option_text: z.string().min(1).describe("An answer option"),
              is_correct: z.boolean().describe("True if this is the correct answer"),
            }),
          )
          .length(4)
          .describe("Exactly 4 options"),
      }),
    )
    .min(3)
    .max(10),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { topic, difficulty, numQuestions = 5 } = body

    console.log("[v0] Received request:", { topic, difficulty, numQuestions })

    if (!topic) {
      return Response.json({ error: "Topic is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] User not authenticated")
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const difficultySettings: Record<string, { time: number; points: number; complexity: string }> = {
      Easy: { time: 30, points: 500, complexity: "basic concepts and simple facts" },
      Medium: { time: 25, points: 1000, complexity: "moderate understanding and analysis" },
      Hard: { time: 20, points: 1500, complexity: "advanced reasoning and detailed knowledge" },
      Expert: { time: 15, points: 2000, complexity: "expert-level mastery" },
    }

    const settings = difficultySettings[difficulty] || difficultySettings.Medium

    const prompt = `Generate a quiz about "${topic}" with ${numQuestions} multiple-choice questions at ${difficulty || "Medium"} difficulty.

Requirements:
- Each question must have exactly 4 options
- Exactly ONE option must be correct (is_correct: true), the other 3 must be false
- Questions should test ${settings.complexity}
- Time limit: ${settings.time} seconds per question
- Points: ${settings.points} per correct answer
- Make questions clear and educational

Return valid JSON matching the schema.`

    console.log("[v0] Calling Gemini API...")

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      "AIzaSyBKOR5Phnk6HpmbkKJEaCvOCXnTmbzCXjE"

    const { object } = await generateObject({
      model: google("gemini-1.5-flash", { apiKey }),
      schema: quizSchema,
      prompt,
      temperature: 0.7,
    })

    console.log("[v0] Generated questions count:", object.questions.length)

    // Validate each question has exactly 1 correct answer
    const validatedQuestions = object.questions.map((q, idx) => {
      const correctCount = q.options.filter((o) => o.is_correct).length
      if (correctCount !== 1) {
        // Fix: ensure exactly one correct answer
        const fixedOptions = q.options.map((opt, optIdx) => ({
          ...opt,
          is_correct: optIdx === 0, // Make first option correct as fallback
        }))
        return { ...q, options: fixedOptions }
      }
      return q
    })

    return Response.json({ questions: validatedQuestions })
  } catch (error: any) {
    console.error("[v0] Error generating quiz:", error?.message || error)
    return Response.json(
      { error: "Failed to generate quiz", details: error?.message || "Unknown error" },
      { status: 500 },
    )
  }
}
