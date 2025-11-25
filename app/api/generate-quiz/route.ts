import { generateObject } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question_text: z.string().describe("A clear, well-formed question"),
        time_limit: z.number().describe("Time limit in seconds"),
        points: z.number().describe("Points for correct answer"),
        options: z
          .array(
            z.object({
              option_text: z.string().describe("An answer option"),
              is_correct: z.boolean().describe("True if this is the correct answer"),
            }),
          )
          .describe("Exactly 4 options with one correct"),
      }),
    )
    .describe("Array of quiz questions"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { topic, difficulty, numQuestions = 5 } = body

    if (!topic) {
      return Response.json({ error: "Topic is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const difficultySettings: Record<string, { time: number; points: number; complexity: string }> = {
      Easy: { time: 30, points: 500, complexity: "basic concepts and simple facts" },
      Medium: { time: 25, points: 1000, complexity: "moderate understanding and analysis" },
      Hard: { time: 20, points: 1500, complexity: "advanced reasoning and detailed knowledge" },
      Expert: { time: 15, points: 2000, complexity: "expert-level mastery" },
    }

    const settings = difficultySettings[difficulty] || difficultySettings.Medium

    const prompt = `Create a quiz about "${topic}" with exactly ${numQuestions} multiple-choice questions.

Difficulty: ${difficulty || "Medium"}
Complexity: ${settings.complexity}

For each question:
- Write a clear, educational question about ${topic}
- Provide exactly 4 answer options
- Mark exactly ONE option as correct (is_correct: true), the other 3 as incorrect (is_correct: false)
- Set time_limit to ${settings.time}
- Set points to ${settings.points}

Generate ${numQuestions} diverse and interesting questions.`

    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      "AIzaSyBKOR5Phnk6HpmbkKJEaCvOCXnTmbzCXjE"

    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    })

    const { object } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: quizSchema,
      prompt,
      temperature: 0.7,
    })

    // Validate each question has exactly 1 correct answer
    const validatedQuestions = object.questions.map((q) => {
      const correctCount = q.options.filter((o) => o.is_correct).length
      if (correctCount !== 1) {
        const fixedOptions = q.options.map((opt, optIdx) => ({
          ...opt,
          is_correct: optIdx === 0,
        }))
        return { ...q, options: fixedOptions }
      }
      return q
    })

    return Response.json({ questions: validatedQuestions })
  } catch (error: any) {
    console.error("[v0] Error generating quiz:", error)

    const errorMessage = error?.message || "Unknown error"
    const isRateLimit = errorMessage.includes("429") || errorMessage.includes("quota")
    const isAuth = errorMessage.includes("401") || errorMessage.includes("API key")

    let userMessage = "Failed to generate quiz. Please try again."
    if (isRateLimit) {
      userMessage = "AI service is busy. Please wait a moment and try again."
    } else if (isAuth) {
      userMessage = "AI service configuration error. Please contact support."
    }

    return Response.json({ error: userMessage, details: errorMessage }, { status: 500 })
  }
}
