import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question_text: z.string().describe("The question text"),
        time_limit: z.number().describe("Time limit in seconds (10, 20, 30, or 60)"),
        points: z.number().describe("Points for correct answer (500, 1000, 2000)"),
        options: z
          .array(
            z.object({
              option_text: z.string().describe("The answer option text"),
              is_correct: z.boolean().describe("Whether this option is correct"),
            }),
          )
          .min(2)
          .max(4),
      }),
    )
    .min(3)
    .max(10),
})

export async function POST(req: Request) {
  const { topic, difficulty, numQuestions = 5 } = await req.json()
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const prompt = `Generate a quiz about "${topic}" with ${difficulty} difficulty level. 
  Create ${numQuestions} engaging multiple-choice questions. 
  Requirements:
  - Each question must have exactly 4 options
  - Exactly ONE option per question must be correct (is_correct: true)
  - Make the questions educational and progressively challenging
  - Use clear, concise language appropriate for the difficulty level
  - Time limits: Easy = 30s, Medium = 20s, Hard = 15s
  - Points: Easy = 500, Medium = 1000, Hard = 1500`

  try {
    const { object } = await generateObject({
      model: google("gemini-1.5-flash", {
        apiKey: process.env.GEMINI_API_KEY || "AIzaSyBKOR5Phnk6HpmbkKJEaCvOCXnTmbzCXjE",
      }),
      schema: quizSchema,
      prompt,
    })

    return Response.json({ questions: object.questions })
  } catch (error) {
    console.error("Error generating quiz:", error)
    return new Response("Error generating quiz", { status: 500 })
  }
}
