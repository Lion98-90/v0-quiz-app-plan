"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function createGame(quizId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Generate a random 6-digit PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString()

  const { data: game, error } = await supabase
    .from("games")
    .insert({
      quiz_id: quizId,
      host_id: user.id,
      pin_code: pin,
      status: "waiting",
      state: "lobby",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating game:", error)
    throw new Error("Failed to create game")
  }

  redirect(`/host/${game.id}`)
}
