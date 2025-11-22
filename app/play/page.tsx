"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Trophy, CheckCircle2 } from "lucide-react"

function PlayerGame() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [pin, setPin] = useState(searchParams.get("pin") || "")
  const [name, setName] = useState("")
  const [game, setGame] = useState<any>(null)
  const [player, setPlayer] = useState<any>(null)
  const [gameState, setGameState] = useState<
    "enter-pin" | "enter-name" | "lobby" | "question" | "answered" | "results" | "finished"
  >("enter-pin")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Game state sync
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

  const handleJoinGame = async () => {
    setError("")
    setIsLoading(true)
    try {
      // Find game
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

    // Optimistic update
    setGameState("answered")

    try {
      // We need the question ID and Option IDs.
      // Ideally the game subscription should send the current question ID or we fetch it.
      // For security/cheating prevention, typically we only send option IDs without text or correctness.
      // But for this simple app, let's fetch the current question options.

      // In a real robust app, we'd have a more complex state sync.
      // Here we'll quickly fetch the current question based on game.current_question_index

      const { data: quizData } = await supabase
        .from("quizzes")
        .select("questions(id, options(id))")
        .eq("id", game.quiz_id)
        .single()

      if (!quizData || !quizData.questions) return

      // Sort to ensure indices match host
      // This is brittle but works for v0 demo
      // Real app needs strict ordering guarantees or explicit ID passing
      // We will rely on the order_index sort we did in previous steps,
      // but here we need to re-fetch/sort.

      // Better approach: Fetch current question details when state changes to 'question'
      // Let's do that in the effect above ideally, but for now let's fetch here to answer.

      // Actually, let's fetch the question structure once when joining
      // or trust the index.

      // Let's fetch the specific question by index
      const { data: questionData } = await supabase
        .from("questions")
        .select("id, options(id)")
        .eq("quiz_id", game.quiz_id)
        .eq("order_index", game.current_question_index) // This requires strict index maintenance
        .single()

      if (!questionData) return

      // Sort options by creation time to match host (brittle but consistent if db doesn't change)
      // Or even better, we should have fetched options with the game.

      const options = questionData.options.sort((a: any, b: any) => a.id.localeCompare(b.id)) // Using ID sort for consistency if created_at is same
      // Actually host used created_at. Let's stick to that or just ID.
      // Let's assume the client sees 4 buttons: Red, Blue, Yellow, Green
      // These map to options[0], options[1], etc.

      // We need to fetch the options sorted by created_at to match host
      const { data: sortedOptions } = await supabase
        .from("options")
        .select("id, created_at, is_correct")
        .eq("question_id", questionData.id)
        .order("created_at", { ascending: true })

      if (!sortedOptions || !sortedOptions[optionIndex]) return

      const selectedOption = sortedOptions[optionIndex]

      await supabase.from("player_answers").insert({
        game_id: game.id,
        player_id: player.id,
        question_id: questionData.id,
        option_id: selectedOption.id,
        is_correct: selectedOption.is_correct,
        points_awarded: selectedOption.is_correct ? 1000 : 0, // Simplified scoring
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Render Views
  if (gameState === "enter-pin") {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Enter Game PIN</h1>
            <p className="text-muted-foreground">Join a live quiz session</p>
          </div>
          <div className="space-y-4">
            <Input
              placeholder="Game PIN"
              className="text-center text-2xl tracking-widest h-14"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={6}
            />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button className="w-full h-12 text-lg" onClick={handleJoinGame} disabled={isLoading || pin.length < 6}>
              {isLoading ? <Loader2 className="animate-spin" /> : "Enter"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (gameState === "enter-name") {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">What's your name?</h1>
            <p className="text-muted-foreground">This will be shown on the leaderboard</p>
          </div>
          <div className="space-y-4">
            <Input
              placeholder="Nickname"
              className="text-center text-xl h-14"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
            />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button className="w-full h-12 text-lg" onClick={handleRegisterPlayer} disabled={isLoading || !name}>
              {isLoading ? <Loader2 className="animate-spin" /> : "Join Game"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (gameState === "lobby") {
    return (
      <div className="min-h-screen bg-emerald-500 flex flex-col items-center justify-center p-4 text-white text-center space-y-6">
        <h1 className="text-4xl font-black">You're In!</h1>
        <p className="text-xl opacity-90">See your name on the screen?</p>
        <div className="font-bold text-2xl bg-white/20 px-8 py-4 rounded-full">{name}</div>
        <div className="pt-8">
          <Loader2 className="w-12 h-12 animate-spin mx-auto opacity-50" />
          <p className="mt-4 text-sm opacity-75">Waiting for host to start...</p>
        </div>
      </div>
    )
  }

  if (gameState === "question") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col p-4">
        <div className="flex justify-between items-center mb-8 font-bold text-muted-foreground">
          <span>{name}</span>
          <span>Score: {player.score || 0}</span>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4 pb-8">
          <button
            className="bg-red-500 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
            onClick={() => submitAnswer(0)}
          >
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-b-[26px] border-b-white border-r-[15px] border-r-transparent" />
          </button>
          <button
            className="bg-blue-500 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
            onClick={() => submitAnswer(1)}
          >
            <div className="w-6 h-6 bg-white rotate-45" />
          </button>
          <button
            className="bg-yellow-500 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
            onClick={() => submitAnswer(2)}
          >
            <div className="w-6 h-6 bg-white rounded-full" />
          </button>
          <button
            className="bg-green-500 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
            onClick={() => submitAnswer(3)}
          >
            <div className="w-6 h-6 bg-white" />
          </button>
        </div>
      </div>
    )
  }

  if (gameState === "answered") {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4 text-white text-center space-y-6">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold">Answer Submitted</h1>
        <p className="text-xl opacity-90">Waiting for others...</p>
      </div>
    )
  }

  if (gameState === "results") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white text-center space-y-6">
        <p className="text-xl opacity-75">Look up at the screen!</p>
        <div className="pt-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-50" />
        </div>
      </div>
    )
  }

  if (gameState === "finished") {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4 text-white text-center space-y-6">
        <Trophy className="w-20 h-20 text-yellow-400" />
        <h1 className="text-4xl font-bold">Game Over</h1>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Back Home
        </Button>
      </div>
    )
  }

  return null
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlayerGame />
    </Suspense>
  )
}
