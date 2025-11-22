import { generateObject } from "ai"
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
  const { topic, difficulty } = await req.json()
  const supabase = await createClient()

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const prompt = `Generate a quiz about "${topic}" with ${difficulty} difficulty. 
  Create 5 engaging multiple-choice questions. 
  Ensure there is exactly one correct answer per question.
  Make the questions fun and educational.`

  try {
    const { object } = await generateObject({
      model: "openai/gpt-4o",
      schema: quizSchema,
      prompt,
    })

    return Response.json({ questions: object.questions })
  } catch (error) {
    console.error("Error generating quiz:", error)
    return new Response("Error generating quiz", { status: 500 })
  }
}
