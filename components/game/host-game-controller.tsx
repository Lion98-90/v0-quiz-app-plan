"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Users, Trophy, ArrowRight, Play } from "lucide-react"
import { motion } from "framer-motion"
import useWindowSize from "react-use/lib/useWindowSize"

export function HostGameController({ game }: { game: any }) {
  const [players, setPlayers] = useState<any[]>([])
  const [gameState, setGameState] = useState(game.state) // lobby, question, results, leaderboard, finished
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(game.current_question_index)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const { width, height } = useWindowSize()
  const supabase = createClient()

  const currentQuestion = game.quiz.questions[currentQuestionIndex]

  useEffect(() => {
    // Subscribe to game updates
    const channel = supabase
      .channel(`game:${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${game.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPlayers((prev) => [...prev, payload.new])
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_answers", filter: `game_id=eq.${game.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAnswers((prev) => [...prev, payload.new])
          }
        },
      )
      .subscribe()

    // Fetch initial players
    const fetchPlayers = async () => {
      const { data } = await supabase.from("players").select("*").eq("game_id", game.id)
      if (data) setPlayers(data)
    }
    fetchPlayers()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [game.id])

  // Timer effect
  useEffect(() => {
    if (gameState === "question" && countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameState === "question" && countdown === 0) {
      handleShowResults()
    }
  }, [gameState, countdown])

  const updateGameState = async (newState: string, newIndex?: number) => {
    setGameState(newState)
    if (newIndex !== undefined) setCurrentQuestionIndex(newIndex)

    await supabase
      .from("games")
      .update({
        state: newState,
        current_question_index: newIndex !== undefined ? newIndex : currentQuestionIndex,
      })
      .eq("id", game.id)
  }

  const handleStartGame = async () => {
    await updateGameState("question", 0)
    setCountdown(currentQuestion.time_limit)
  }

  const handleShowResults = async () => {
    await updateGameState("results")
  }

  const handleNextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1
    if (nextIndex < game.quiz.questions.length) {
      await updateGameState("question", nextIndex)
      setCountdown(game.quiz.questions[nextIndex].time_limit)
      setAnswers([]) // Reset answers for visual counting
    } else {
      await updateGameState("finished")
    }
  }

  const handleShowLeaderboard = async () => {
    await updateGameState("leaderboard")
  }

  // Views
  if (gameState === "lobby") {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-primary-foreground p-8">
        <div className="max-w-4xl w-full space-y-8 text-center">
          <h1 className="text-6xl font-black tracking-tighter mb-8">Join the Game!</h1>

          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12 text-foreground">
            <div className="flex-1 space-y-4">
              <p className="text-2xl font-medium text-muted-foreground">Go to</p>
              <p className="text-5xl font-bold text-primary">lovable-bolt.vercel.app/play</p>
              <p className="text-2xl font-medium text-muted-foreground">Enter PIN</p>
              <p className="text-8xl font-black tracking-widest text-primary">{game.pin_code}</p>
            </div>
            <div className="p-4 bg-white rounded-xl border-4 border-primary/20">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://lovable-bolt.vercel.app/play?pin=${game.pin_code}`}
                alt="Join Game QR Code"
                width={250}
                height={250}
              />
            </div>
          </div>

          <div className="mt-12">
            <div className="flex items-center justify-between mb-6 px-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8" />
                <span className="text-3xl font-bold">{players.length} Players</span>
              </div>
              <Button
                size="lg"
                className="text-2xl h-16 px-12 rounded-full font-bold bg-white text-primary hover:bg-white/90"
                onClick={handleStartGame}
                disabled={players.length === 0}
              >
                Start Game <Play className="ml-2 w-6 h-6 fill-current" />
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {players.map((player) => (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={player.id}
                  className="bg-white/10 backdrop-blur-sm p-4 rounded-xl font-bold text-xl"
                >
                  {player.name}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "question") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="text-2xl font-bold text-muted-foreground">
            {currentQuestionIndex + 1} / {game.quiz.questions.length}
          </div>
          <div className="text-xl font-bold bg-white px-6 py-2 rounded-full shadow-sm">{answers.length} Answers</div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full gap-12">
          <h2 className="text-4xl md:text-5xl font-bold text-center leading-tight">{currentQuestion.question_text}</h2>

          <div className="flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-5xl font-black shadow-xl">
              {countdown}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {currentQuestion.options.map((option: any, idx: number) => (
              <div
                key={option.id}
                className={`
                  p-8 rounded-2xl text-2xl font-bold text-white shadow-lg transition-transform
                  ${idx === 0 ? "bg-red-500" : ""}
                  ${idx === 1 ? "bg-blue-500" : ""}
                  ${idx === 2 ? "bg-yellow-500" : ""}
                  ${idx === 3 ? "bg-green-500" : ""}
                `}
              >
                {option.option_text}
              </div>
            ))}
          </div>

          <Button variant="secondary" onClick={handleShowResults} className="mt-4">
            Skip Timer
          </Button>
        </div>
      </div>
    )
  }

  if (gameState === "results") {
    // Calculate stats
    const correctOptionId = currentQuestion.options.find((o: any) => o.is_correct)?.id
    const correctCount = answers.filter((a) => a.option_id === correctOptionId).length

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col p-6">
        <h2 className="text-4xl font-bold text-center mb-12">{currentQuestion.question_text}</h2>

        <div className="flex-1 flex items-end justify-center gap-8 pb-20 max-w-4xl mx-auto w-full">
          {currentQuestion.options.map((option: any, idx: number) => {
            const count = answers.filter((a) => a.option_id === option.id).length
            const height = answers.length > 0 ? (count / answers.length) * 100 : 0

            return (
              <div key={option.id} className="flex-1 flex flex-col items-center gap-4 h-full justify-end">
                <div className="font-bold text-2xl">{count}</div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 5)}%` }}
                  className={`w-full rounded-t-lg relative ${option.is_correct ? "opacity-100" : "opacity-40"}
                    ${idx === 0 ? "bg-red-500" : ""}
                    ${idx === 1 ? "bg-blue-500" : ""}
                    ${idx === 2 ? "bg-yellow-500" : ""}
                    ${idx === 3 ? "bg-green-500" : ""}
                   `}
                >
                  {option.is_correct && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white p-2 rounded-full">
                      <Trophy className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
                <div className="text-center font-medium leading-tight">{option.option_text}</div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleNextQuestion} className="gap-2 text-xl px-8">
            Next <ArrowRight />
          </Button>
        </div>
      </div>
    )
  }

  if (gameState === "finished") {
    return (
      <div className="min-h-screen bg-primary text-primary-foreground flex flex-col items-center justify-center">
        <h1 className="text-6xl font-black mb-8">Game Over!</h1>
        <div className="bg-white text-foreground p-12 rounded-3xl shadow-2xl text-center max-w-2xl w-full">
          <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-8" />
          <h2 className="text-4xl font-bold mb-4">Congratulations!</h2>
          <p className="text-xl text-muted-foreground mb-8">The quiz has ended.</p>
          <Link href="/dashboard">
            <Button size="lg" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return <div>Loading...</div>
}
