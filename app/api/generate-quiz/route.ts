import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question_text: z.string().min(10).describe("A clear, well-formed question"),
        time_limit: z.number().int().min(10).max(60).describe("Time limit in seconds (10-60)"),
        points: z.number().int().min(100).max(2000).describe("Points for correct answer (100-2000)"),
        options: z
          .array(
            z.object({
              option_text: z.string().min(1).describe("An answer option"),
              is_correct: z.boolean().describe("True if this is the correct answer"),
            }),
          )
          .length(4)
          .describe("Exactly 4 options required")
          .refine((opts) => opts.filter((o) => o.is_correct).length === 1, {
            message: "Exactly one option must be marked as correct",
          }),
      }),
    )
    .min(3)
    .max(10),
})

export async function POST(req: Request) {
  try {
    const { topic, difficulty, numQuestions = 5 } = await req.json()
    const supabase = await createClient()

    // Verify auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const difficultySettings = {
      Easy: { time: 30, points: 500, complexity: "basic concepts and facts" },
      Medium: { time: 25, points: 1000, complexity: "moderate analysis and understanding" },
      Hard: { time: 20, points: 1500, complexity: "advanced reasoning and synthesis" },
      Expert: { time: 15, points: 2000, complexity: "expert-level mastery and critical thinking" },
    }

    const settings = difficultySettings[difficulty as keyof typeof difficultySettings] || difficultySettings.Medium

    const prompt = `You are a professional quiz creator. Generate a high-quality quiz about "${topic}" at ${difficulty} difficulty level.

STRICT REQUIREMENTS:
1. Create exactly ${numQuestions} multiple-choice questions
2. Each question MUST have EXACTLY 4 answer options
3. EXACTLY ONE option per question must be correct (is_correct: true), the other 3 must be false
4. Questions should test ${settings.complexity}
5. Each question should be clear, unambiguous, and well-written
6. Options should be plausible but only one clearly correct
7. Avoid trick questions - test genuine knowledge

FORMATTING:
- Time limit: ${settings.time} seconds per question
- Points: ${settings.points} per correct answer
- Question text: Clear, complete sentences without numbering
- Options: Concise but complete answers

Example question structure:
{
  "question_text": "What is the capital of France?",
  "time_limit": ${settings.time},
  "points": ${settings.points},
  "options": [
    { "option_text": "Paris", "is_correct": true },
    { "option_text": "London", "is_correct": false },
    { "option_text": "Berlin", "is_correct": false },
    { "option_text": "Madrid", "is_correct": false }
  ]
}

Now generate ${numQuestions} questions about ${topic}.`

    console.log("[v0] Generating quiz with Gemini API...")

    const { object } = await generateObject({
      model: google("gemini-1.5-flash", {
        apiKey:
          process.env.GEMINI_API_KEY ||
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
          "AIzaSyBKOR5Phnk6HpmbkKJEaCvOCXnTmbzCXjE",
      }),
      schema: quizSchema,
      prompt,
      temperature: 0.7,
    })

    console.log("[v0] Generated questions:", object.questions.length)

    for (const q of object.questions) {
      if (q.options.length !== 4) {
        throw new Error(`Question has ${q.options.length} options instead of 4`)
      }
      const correctCount = q.options.filter((o) => o.is_correct).length
      if (correctCount !== 1) {
        throw new Error(`Question has ${correctCount} correct answers instead of 1`)
      }
    }

    return Response.json({ questions: object.questions })
  } catch (error: any) {
    console.error("[v0] Error generating quiz:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to generate quiz",
        details: error?.message || "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
