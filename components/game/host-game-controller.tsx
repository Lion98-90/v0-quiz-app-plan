"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Users, Trophy, ArrowRight, Play, Check, Loader2, Copy, Crown, Medal, Award } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

export function HostGameController({ game }: { game: any }) {
  const [players, setPlayers] = useState<any[]>([])
  const [gameState, setGameState] = useState(game.state)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(game.current_question_index)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const supabase = createClient()

  const currentQuestion = game.quiz.questions[currentQuestionIndex]

  useEffect(() => {
    const channel = supabase
      .channel(`game:${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${game.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPlayers((prev) => [...prev, payload.new])
          } else if (payload.eventType === "UPDATE") {
            setPlayers((prev) => prev.map((p) => (p.id === payload.new.id ? payload.new : p)))
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

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", game.id)
        .order("score", { ascending: false })
      if (data) setPlayers(data)
    }
    fetchPlayers()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [game.id])

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
    const correctOption = currentQuestion.options.find((o: any) => o.is_correct)
    if (!correctOption) return

    const correctAnswerIds = answers
      .filter((a) => a.question_id === currentQuestion.id && a.option_id === correctOption.id)
      .map((a) => a.player_id)

    for (const playerId of correctAnswerIds) {
      const { data: player } = await supabase.from("players").select("score").eq("id", playerId).single()

      if (player) {
        await supabase
          .from("players")
          .update({ score: (player.score || 0) + currentQuestion.points })
          .eq("id", playerId)
      }
    }

    const { data: updatedPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", game.id)
      .order("score", { ascending: false })

    if (updatedPlayers) setPlayers(updatedPlayers)

    await updateGameState("results")
  }

  const handleNextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1
    if (nextIndex < game.quiz.questions.length) {
      await updateGameState("question", nextIndex)
      setCountdown(game.quiz.questions[nextIndex].time_limit)
      setAnswers([])
    } else {
      await updateGameState("leaderboard")
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", game.id)
        .order("score", { ascending: false })
        .limit(10)
      if (data) setLeaderboard(data)
    }
  }

  const handleFinishGame = async () => {
    await updateGameState("finished")
  }

  const copyJoinLink = () => {
    const link = `${window.location.origin}/play?pin=${game.pin_code}`
    navigator.clipboard.writeText(link)
    toast.success("Join link copied!")
  }

  if (gameState === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center text-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        <div className="max-w-6xl w-full space-y-12 z-10 flex flex-col items-center">
          <div className="space-y-2 text-center">
            <Badge
              variant="outline"
              className="text-white border-white/30 bg-white/10 px-4 py-1 text-sm uppercase tracking-widest"
            >
              Waiting for players
            </Badge>
            <h1 className="text-7xl font-black tracking-tighter drop-shadow-lg">Join the Game!</h1>
          </div>

          <Card className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-5xl border-0 ring-1 ring-white/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 space-y-8 text-center md:text-left">
                <div className="space-y-2">
                  <p className="text-2xl font-medium text-muted-foreground uppercase tracking-wide">Go to</p>
                  <p className="text-3xl lg:text-4xl font-bold text-foreground break-all">
                    {window.location.origin}/play
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-2xl font-medium text-muted-foreground uppercase tracking-wide">Enter PIN</p>
                  <div className="text-7xl lg:text-9xl font-black tracking-widest text-primary tabular-nums">
                    {game.pin_code}
                  </div>
                </div>
              </div>

              <div className="relative group cursor-pointer" onClick={copyJoinLink}>
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                <div className="relative p-6 bg-white rounded-xl shadow-inner">
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${window.location.origin}/play?pin=${game.pin_code}`}
                    alt="Join Game QR Code"
                    width={280}
                    height={280}
                    className="rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <Copy className="text-white w-12 h-12" />
                  </div>
                </div>
                <p className="text-center mt-4 text-muted-foreground text-sm font-medium">Click to copy link</p>
              </div>
            </div>
          </Card>

          <div className="w-full space-y-6">
            <div className="flex items-center justify-between px-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">{players.length} Players</span>
              </div>

              <Button
                size="lg"
                className="text-xl h-14 px-10 rounded-full font-bold bg-white text-purple-600 hover:bg-white/90 hover:scale-105 transition-all shadow-lg"
                onClick={handleStartGame}
                disabled={players.length === 0}
              >
                Start Game <Play className="ml-2 w-6 h-6 fill-current" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <AnimatePresence>
                {players.map((player) => (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    key={player.id}
                    className="bg-white/20 backdrop-blur-sm p-3 rounded-xl font-bold text-lg text-center border border-white/10 shadow-sm text-white truncate"
                  >
                    {player.name}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "question") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
        <div className="w-full h-2 bg-slate-200">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: currentQuestion.time_limit, ease: "linear" }}
          />
        </div>

        <div className="flex-1 flex flex-col p-6 md:p-12 max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-center mb-12">
            <Badge variant="outline" className="text-lg px-4 py-1 rounded-full bg-white shadow-sm">
              Question {currentQuestionIndex + 1} / {game.quiz.questions.length}
            </Badge>
            <div className="text-xl font-bold bg-white px-6 py-2 rounded-full shadow-sm flex items-center gap-2">
              <span className="text-primary">{answers.length}</span>
              <span className="text-muted-foreground">/ {players.length} Answers</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-16">
            <h2 className="text-4xl md:text-6xl font-bold text-center leading-tight text-slate-900 drop-shadow-sm max-w-5xl">
              {currentQuestion.question_text}
            </h2>

            <div className="flex items-center justify-center">
              <div
                className={`
                w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black shadow-2xl border-8
                ${(countdown || 0) <= 5 ? "bg-red-100 text-red-600 border-red-500 animate-pulse" : "bg-white text-primary border-primary"}
              `}
              >
                {countdown}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl">
              {currentQuestion.options.map((option: any, idx: number) => (
                <div
                  key={option.id}
                  className={`
                    p-8 rounded-2xl text-2xl font-bold text-white shadow-lg transition-transform transform hover:scale-[1.02] flex items-center gap-4
                    ${idx === 0 ? "bg-red-500 shadow-red-500/30" : ""}
                    ${idx === 1 ? "bg-blue-500 shadow-blue-500/30" : ""}
                    ${idx === 2 ? "bg-yellow-500 shadow-yellow-500/30" : ""}
                    ${idx === 3 ? "bg-green-500 shadow-green-500/30" : ""}
                  `}
                >
                  <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center text-3xl shrink-0">
                    {idx === 0 && "▲"}
                    {idx === 1 && "◆"}
                    {idx === 2 && "●"}
                    {idx === 3 && "■"}
                  </div>
                  {option.option_text}
                </div>
              ))}
            </div>

            <Button variant="secondary" onClick={handleShowResults} className="mt-auto">
              Skip Timer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "results") {
    const correctOptionId = currentQuestion.options.find((o: any) => o.is_correct)?.id

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-6 md:p-12">
        <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-800 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            {currentQuestion.question_text}
          </h2>

          <div className="flex-1 flex items-end justify-center gap-4 md:gap-8 pb-20 w-full">
            {currentQuestion.options.map((option: any, idx: number) => {
              const count = answers.filter((a) => a.option_id === option.id).length
              const height = answers.length > 0 ? (count / answers.length) * 100 : 0

              return (
                <div key={option.id} className="flex-1 flex flex-col items-center gap-4 h-full justify-end group">
                  <div className="font-bold text-2xl bg-white px-4 py-2 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    {count}
                  </div>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 10)}%` }}
                    className={`w-full rounded-t-2xl relative flex items-end justify-center pb-4 transition-all
                      ${idx === 0 ? "bg-red-500" : ""}
                      ${idx === 1 ? "bg-blue-500" : ""}
                      ${idx === 2 ? "bg-yellow-500" : ""}
                      ${idx === 3 ? "bg-green-500" : ""}
                      ${option.is_correct ? "opacity-100 ring-4 ring-offset-4 ring-green-400" : "opacity-40"}
                     `}
                  >
                    <div className="text-white font-bold text-xl mix-blend-overlay opacity-50">
                      {idx === 0 && "▲"}
                      {idx === 1 && "◆"}
                      {idx === 2 && "●"}
                      {idx === 3 && "■"}
                    </div>

                    {option.is_correct && (
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-green-500 text-white p-3 rounded-full shadow-lg animate-bounce">
                        <Check className="w-6 h-6" />
                      </div>
                    )}
                  </motion.div>
                  <div
                    className={`text-center font-semibold leading-tight p-2 rounded-lg w-full ${option.is_correct ? "bg-green-100 text-green-800" : "text-muted-foreground"}`}
                  >
                    {option.option_text}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-200">
            <Button
              size="lg"
              onClick={handleNextQuestion}
              className="gap-2 text-xl px-10 h-16 rounded-full shadow-xl hover:scale-105 transition-all"
            >
              {currentQuestionIndex + 1 < game.quiz.questions.length ? "Next Question" : "Show Leaderboard"}{" "}
              <ArrowRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "leaderboard") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />

        <div className="max-w-4xl w-full space-y-12 z-10">
          <div className="text-center space-y-4">
            <Trophy className="w-24 h-24 text-yellow-400 mx-auto drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-bounce" />
            <h1 className="text-6xl md:text-8xl font-black tracking-tight drop-shadow-lg">Final Results!</h1>
            <p className="text-2xl text-purple-200">Here are the top performers</p>
          </div>

          <div className="space-y-4">
            {leaderboard.map((player, idx) => (
              <motion.div
                key={player.id}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`
                  flex items-center gap-6 p-6 rounded-2xl backdrop-blur-md border-2 transition-all hover:scale-[1.02]
                  ${idx === 0 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-400 shadow-xl shadow-yellow-500/20" : ""}
                  ${idx === 1 ? "bg-gradient-to-r from-slate-400/20 to-slate-500/20 border-slate-400" : ""}
                  ${idx === 2 ? "bg-gradient-to-r from-orange-600/20 to-orange-700/20 border-orange-500" : ""}
                  ${idx > 2 ? "bg-white/5 border-white/10" : ""}
                `}
              >
                <div className="flex items-center justify-center w-16 h-16 shrink-0">
                  {idx === 0 && <Crown className="w-12 h-12 text-yellow-400 drop-shadow-md" />}
                  {idx === 1 && <Medal className="w-10 h-10 text-slate-300" />}
                  {idx === 2 && <Award className="w-10 h-10 text-orange-500" />}
                  {idx > 2 && <span className="text-3xl font-black text-white/50">#{idx + 1}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold truncate">{player.name}</p>
                  <p className="text-lg text-white/60">{player.score} points</p>
                </div>

                {idx < 3 && (
                  <div
                    className={`
                    px-4 py-2 rounded-full font-bold text-lg
                    ${idx === 0 ? "bg-yellow-400 text-yellow-900" : ""}
                    ${idx === 1 ? "bg-slate-300 text-slate-900" : ""}
                    ${idx === 2 ? "bg-orange-500 text-white" : ""}
                  `}
                  >
                    {idx === 0 ? "🥇 Winner" : idx === 1 ? "🥈 2nd Place" : "🥉 3rd Place"}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center gap-4 pt-8">
            <Button
              size="lg"
              onClick={handleFinishGame}
              className="px-10 h-16 rounded-full text-xl font-bold shadow-xl hover:scale-105 transition-all"
            >
              End Game
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
        <div className="bg-white/10 backdrop-blur-md p-12 rounded-[3rem] shadow-2xl text-center max-w-3xl w-full border border-white/20 relative z-10">
          <div className="mb-8 relative inline-block">
            <div className="absolute -inset-4 bg-yellow-400/30 blur-xl rounded-full animate-pulse" />
            <Trophy className="w-40 h-40 text-yellow-300 relative z-10 drop-shadow-md" />
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tight drop-shadow-lg">Game Over!</h1>
          <p className="text-2xl md:text-3xl text-white/80 mb-12 font-medium">Thanks for playing!</p>

          <Link href="/dashboard">
            <Button
              size="lg"
              variant="secondary"
              className="w-full h-16 text-xl font-bold rounded-full shadow-lg hover:scale-[1.02] transition-transform"
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  )
}
