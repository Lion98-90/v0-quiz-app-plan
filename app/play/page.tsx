"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Trophy, CheckCircle2, XCircle, User } from "lucide-react"
import { motion } from "framer-motion"

// ... existing functions ...
// [Assuming submitAnswer logic and others are preserved]

function PlayerGame() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  // ... existing state ...
  const [pin, setPin] = useState(searchParams.get("pin") || "")
  const [name, setName] = useState("")
  const [game, setGame] = useState<any>(null)
  const [player, setPlayer] = useState<any>(null)
  const [gameState, setGameState] = useState<
    "enter-pin" | "enter-name" | "lobby" | "question" | "answered" | "results" | "finished"
  >("enter-pin")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null)

  // ... existing useEffects for state sync ...
  useEffect(() => {
    if (!game?.id || !player?.id) return

    const channel = supabase
      .channel(`game_player:${game.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        (payload) => {
          const newState = payload.new.state

          if (newState === "question") {
            setGameState("question")
            setLastAnswerCorrect(null) // Reset for new question
          } else if (newState === "results") {
            setGameState("results")
          } else if (newState === "finished") {
            setGameState("finished")
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [game?.id, player?.id])

  // ... existing handlers (handleJoinGame, handleRegisterPlayer) ...
  const handleJoinGame = async () => {
    setError("")
    setIsLoading(true)
    try {
      const { data: games, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("pin_code", pin)
        .in("status", ["waiting", "active"])
        .single()

      if (gameError || !games) {
        setError("Game not found. Check the PIN.")
        return
      }

      setGame(games)
      setGameState("enter-name")
    } catch (e) {
      setError("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterPlayer = async () => {
    if (!name.trim()) return
    setIsLoading(true)
    try {
      const { data: newPlayer, error } = await supabase
        .from("players")
        .insert({
          game_id: game.id,
          name: name.trim(),
        })
        .select()
        .single()

      if (error) {
        if (error.code === "23505") setError("Name already taken")
        else setError("Could not join game")
        return
      }

      setPlayer(newPlayer)
      setGameState("lobby")
    } catch (e) {
      setError("Could not join")
    } finally {
      setIsLoading(false)
    }
  }

  const submitAnswer = async (optionIndex: number) => {
    if (gameState !== "question") return
    setGameState("answered")

    try {
      // ... fetch logic same as before ...
      const { data: questionData } = await supabase
        .from("questions")
        .select("id, options(id)")
        .eq("quiz_id", game.quiz_id)
        .eq("order_index", game.current_question_index)
        .single()

      if (!questionData) return

      const { data: sortedOptions } = await supabase
        .from("options")
        .select("id, created_at, is_correct")
        .eq("question_id", questionData.id)
        .order("created_at", { ascending: true })

      if (!sortedOptions || !sortedOptions[optionIndex]) return

      const selectedOption = sortedOptions[optionIndex]
      setLastAnswerCorrect(selectedOption.is_correct) // Store locally for feedback

      await supabase.from("player_answers").insert({
        game_id: game.id,
        player_id: player.id,
        question_id: questionData.id,
        option_id: selectedOption.id,
        is_correct: selectedOption.is_correct,
        points_awarded: selectedOption.is_correct ? 1000 : 0,
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Render Views with Improved UI
  if (gameState === "enter-pin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-8 space-y-8 shadow-2xl border-0 bg-white/95 backdrop-blur">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 transform rotate-3">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">Enter Game PIN</h1>
            <p className="text-muted-foreground font-medium">Join a live quiz session</p>
          </div>
          <div className="space-y-6">
            <Input
              placeholder="000000"
              className="text-center text-3xl tracking-[0.5em] h-16 font-black border-2 focus-visible:ring-primary/50 focus-visible:border-primary"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={6}
            />
            {error && <p className="text-sm text-red-500 text-center font-medium bg-red-50 p-2 rounded">{error}</p>}
            <Button
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] transition-all"
              onClick={handleJoinGame}
              disabled={isLoading || pin.length < 6}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Enter"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (gameState === "enter-name") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-8 space-y-8 shadow-2xl border-0 bg-white/95 backdrop-blur">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 transform -rotate-3">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">What's your name?</h1>
            <p className="text-muted-foreground font-medium">This will be shown on the leaderboard</p>
          </div>
          <div className="space-y-6">
            <Input
              placeholder="Nickname"
              className="text-center text-xl h-16 font-bold border-2 focus-visible:ring-primary/50 focus-visible:border-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
            />
            {error && <p className="text-sm text-red-500 text-center font-medium bg-red-50 p-2 rounded">{error}</p>}
            <Button
              className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] transition-all"
              onClick={handleRegisterPlayer}
              disabled={isLoading || !name}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Join Game"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (gameState === "lobby") {
    return (
      <div className="min-h-screen bg-emerald-500 flex flex-col items-center justify-center p-6 text-white text-center space-y-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="z-10">
          <h1 className="text-5xl font-black tracking-tight mb-2">You're In!</h1>
          <p className="text-2xl opacity-90 font-medium">See your name on screen?</p>
        </motion.div>

        <div className="font-bold text-3xl bg-white/20 backdrop-blur-md px-10 py-6 rounded-3xl border border-white/30 shadow-xl transform rotate-2 z-10">
          {name}
        </div>

        <div className="pt-12 z-10">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto opacity-50 mb-6" />
          <p className="text-lg font-medium opacity-75 bg-black/10 px-4 py-2 rounded-full">
            Waiting for host to start...
          </p>
        </div>
      </div>
    )
  }

  if (gameState === "question") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col p-4">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="font-bold text-slate-700 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm">
            <User className="w-4 h-4" /> {name}
          </div>
          <div className="font-bold text-slate-700 bg-white px-3 py-1.5 rounded-full shadow-sm">
            Score: {player.score || 0}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4 pb-4">
          {[
            { color: "bg-red-500 shadow-red-700", icon: "▲" },
            { color: "bg-blue-500 shadow-blue-700", icon: "◆" },
            { color: "bg-yellow-500 shadow-yellow-700", icon: "●" },
            { color: "bg-green-500 shadow-green-700", icon: "■" },
          ].map((btn, idx) => (
            <button
              key={idx}
              className={`${btn.color} rounded-2xl shadow-[0_6px_0_0] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center h-full group`}
              onClick={() => submitAnswer(idx)}
            >
              <div className="w-16 h-16 bg-black/20 rounded-full flex items-center justify-center text-4xl text-white font-black group-hover:scale-110 transition-transform">
                {btn.icon}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (gameState === "answered") {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white text-center space-y-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
        >
          <CheckCircle2 className="w-12 h-12" />
        </motion.div>
        <div>
          <h1 className="text-4xl font-black mb-2">Answer Submitted</h1>
          <p className="text-xl opacity-80 font-medium">Waiting for others...</p>
        </div>
        <div className="w-full max-w-xs bg-white/10 h-2 rounded-full overflow-hidden">
          <div className="h-full bg-white/50 w-2/3 animate-pulse rounded-full" />
        </div>
      </div>
    )
  }

  if (gameState === "results") {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 text-white text-center space-y-8 transition-colors duration-500 ${lastAnswerCorrect === true ? "bg-green-500" : lastAnswerCorrect === false ? "bg-red-500" : "bg-slate-800"}`}
      >
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl w-full max-w-sm">
          {lastAnswerCorrect === true ? (
            <>
              <CheckCircle2 className="w-20 h-20 mx-auto mb-6 text-white drop-shadow-md" />
              <h1 className="text-4xl font-black mb-2">Correct!</h1>
              <p className="text-xl opacity-90">+1000 Points</p>
            </>
          ) : lastAnswerCorrect === false ? (
            <>
              <XCircle className="w-20 h-20 mx-auto mb-6 text-white drop-shadow-md" />
              <h1 className="text-4xl font-black mb-2">Incorrect</h1>
              <p className="text-xl opacity-90">Better luck next time</p>
            </>
          ) : (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin opacity-75" />
              <h1 className="text-3xl font-bold mb-2">Time's Up!</h1>
              <p className="text-lg opacity-75">Look at the screen for results</p>
            </>
          )}
        </div>
        <p className="font-medium opacity-75 text-sm">Waiting for next question...</p>
      </div>
    )
  }

  if (gameState === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-purple-900 flex flex-col items-center justify-center p-6 text-white text-center space-y-8">
        <Trophy className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce" />
        <div>
          <h1 className="text-5xl font-black mb-2">Game Over</h1>
          <p className="text-xl text-purple-200">
            You placed: <span className="font-bold text-white">...</span>
          </p>
        </div>
        <Button
          variant="secondary"
          size="lg"
          className="rounded-full px-8 font-bold shadow-lg hover:scale-105 transition-all"
          onClick={() => router.push("/")}
        >
          Back Home
        </Button>
      </div>
    )
  }

  return null
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-primary">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      }
    >
      <PlayerGame />
    </Suspense>
  )
}
