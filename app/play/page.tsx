"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2, Trophy, CheckCircle2, XCircle, User, ArrowLeft, ArrowRight, HelpCircle } from "lucide-react"

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
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null)

  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [currentOptions, setCurrentOptions] = useState<any[]>([])
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [quizTitle, setQuizTitle] = useState("")

  useEffect(() => {
    if (gameState === "question" && game?.quiz_id && game?.current_question_index !== undefined) {
      fetchCurrentQuestion()
    }
  }, [gameState, game?.current_question_index])

  const fetchCurrentQuestion = async () => {
    if (!game?.quiz_id) return

    try {
      // Fetch quiz title and total questions count
      if (!quizTitle) {
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("title")
          .eq("id", game.quiz_id)
          .single()

        if (quizData) {
          setQuizTitle(quizData.title)
        } else {
          console.log("[v0] Quiz fetch error:", quizError)
          setQuizTitle("Quiz") // Fallback title
        }

        const { count } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("quiz_id", game.quiz_id)
        if (count) setTotalQuestions(count)
      }

      // Fetch the current question
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select("id, question_text, time_limit, points")
        .eq("quiz_id", game.quiz_id)
        .eq("order_index", game.current_question_index)
        .single()

      if (questionError || !questionData) {
        console.log("[v0] Question fetch error:", questionError)
        return
      }

      // Fetch options for this question
      const { data: optionsData, error: optionsError } = await supabase
        .from("options")
        .select("id, option_text, is_correct, created_at")
        .eq("question_id", questionData.id)
        .order("created_at", { ascending: true })

      if (optionsError) {
        console.log("[v0] Options fetch error:", optionsError)
      }

      if (optionsData) {
        setCurrentQuestion(questionData)
        setCurrentOptions(optionsData)
        setSelectedOptionId(null) // Reset selection for new question
      }
    } catch (e) {
      console.error("[v0] Error fetching question:", e)
    }
  }

  useEffect(() => {
    if (!game?.id || !player?.id) return

    const channel = supabase
      .channel(`game_player:${game.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        (payload) => {
          const newState = payload.new.state
          setGame((prev: any) => ({ ...prev, ...payload.new }))

          if (newState === "question") {
            setGameState("question")
            setLastAnswerCorrect(null)
          } else if (newState === "results") {
            setGameState("results")
          } else if (newState === "leaderboard") {
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
      // First, find the game by PIN code
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("id, quiz_id, status, state, current_question_index, pin_code")
        .eq("pin_code", pin.trim())
        .in("status", ["waiting", "active"])
        .single()

      if (gameError) {
        console.log("[v0] Game lookup error:", gameError)
        if (gameError.code === "PGRST116") {
          setError("Game not found. Check the PIN and try again.")
        } else {
          setError("Could not find game. Please try again.")
        }
        setIsLoading(false)
        return
      }

      if (!gameData) {
        setError("Game not found or has ended.")
        setIsLoading(false)
        return
      }

      console.log("[v0] Found game:", gameData)
      setGame(gameData)
      setGameState("enter-name")
    } catch (e) {
      console.error("[v0] Join game error:", e)
      setError("Connection error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterPlayer = async () => {
    if (!name.trim()) return
    setIsLoading(true)
    setError("")
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
        console.log("[v0] Player registration error:", error)
        if (error.code === "23505") {
          setError("Name already taken. Try a different one.")
        } else {
          setError("Could not join game. Please try again.")
        }
        setIsLoading(false)
        return
      }

      setPlayer(newPlayer)
      setGameState("lobby")
    } catch (e) {
      console.error("[v0] Registration error:", e)
      setError("Connection error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const submitAnswer = async () => {
    if (gameState !== "question" || !currentQuestion || !selectedOptionId) return
    setGameState("answered")

    try {
      const selectedOption = currentOptions.find((opt) => opt.id === selectedOptionId)
      if (!selectedOption) return

      setLastAnswerCorrect(selectedOption.is_correct)

      await supabase.from("player_answers").insert({
        game_id: game.id,
        player_id: player.id,
        question_id: currentQuestion.id,
        option_id: selectedOption.id,
        is_correct: selectedOption.is_correct,
        points_awarded: selectedOption.is_correct ? currentQuestion.points || 1000 : 0,
      })

      if (selectedOption.is_correct) {
        setPlayer((prev: any) => ({ ...prev, score: (prev.score || 0) + (currentQuestion.points || 1000) }))
      }
    } catch (e) {
      console.error("[v0] Error submitting answer:", e)
    }
  }

  // Enter PIN Screen
  if (gameState === "enter-pin") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Join Quiz</h1>
            <p className="text-slate-500 mt-1">Enter the game PIN to join</p>
          </div>
          <div className="space-y-4">
            <Input
              placeholder="Game PIN"
              className="text-center text-2xl tracking-widest h-14 font-bold"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
            />
            {error && <p className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-lg">{error}</p>}
            <Button
              className="w-full h-12 text-lg font-semibold"
              onClick={handleJoinGame}
              disabled={isLoading || pin.length < 6}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Join"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Enter Name Screen
  if (gameState === "enter-name") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Enter Your Name</h1>
            <p className="text-slate-500 mt-1">This will appear on the leaderboard</p>
          </div>
          <div className="space-y-4">
            <Input
              placeholder="Your nickname"
              className="text-center text-xl h-14 font-medium"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
            />
            {error && <p className="text-sm text-red-500 text-center bg-red-50 p-3 rounded-lg">{error}</p>}
            <Button
              className="w-full h-12 text-lg font-semibold"
              onClick={handleRegisterPlayer}
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Continue"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Lobby / Waiting Screen
  if (gameState === "lobby") {
    return (
      <div className="min-h-screen bg-emerald-500 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">You're In!</h1>
          <p className="text-xl opacity-90">See your name on screen?</p>
        </div>
        <div className="bg-white/20 backdrop-blur px-8 py-4 rounded-2xl mb-8">
          <p className="text-3xl font-bold">{name}</p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-lg opacity-80">Waiting for host to start...</p>
        </div>
      </div>
    )
  }

  // Question Screen
  if (gameState === "question") {
    if (!currentQuestion || currentOptions.length === 0) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )
    }

    const currentQuestionNumber = (game?.current_question_index || 0) + 1
    const progressPercent = totalQuestions > 0 ? (currentQuestionNumber / totalQuestions) * 100 : 0

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-lg">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-slate-800">{quizTitle || "Quiz"}</span>
          </div>

          <div className="px-6 pt-6">
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="text-slate-600">
                Question {currentQuestionNumber} of {totalQuestions}
              </span>
              <span className="text-slate-500">{Math.round(progressPercent)}% Complete</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="p-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Question {currentQuestionNumber}</h2>
            <p className="text-lg text-slate-700">{currentQuestion.question_text}</p>
          </div>

          <div className="px-6 pb-4 space-y-3">
            {currentOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOptionId(option.id)}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all text-left
                  ${
                    selectedOptionId === option.id
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                  ${selectedOptionId === option.id ? "border-primary bg-primary" : "border-slate-300"}`}
                >
                  {selectedOptionId === option.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <span
                  className={`text-base ${selectedOptionId === option.id ? "text-slate-900 font-medium" : "text-slate-700"}`}
                >
                  {option.option_text}
                </span>
              </button>
            ))}
          </div>

          <div className="px-6 pb-6 flex items-center justify-between gap-4">
            <Button variant="ghost" size="sm" disabled className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Previous
            </Button>
            <Button variant="ghost" size="sm" disabled className="gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
            <Button onClick={submitAnswer} disabled={!selectedOptionId} className="px-6">
              Submit Answer
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Answered Screen
  if (gameState === "answered") {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Answer Submitted!</h1>
        <p className="text-xl opacity-80">Waiting for others...</p>
      </div>
    )
  }

  // Results Screen
  if (gameState === "results") {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 text-white text-center
        ${lastAnswerCorrect === true ? "bg-green-500" : lastAnswerCorrect === false ? "bg-red-500" : "bg-slate-700"}`}
      >
        <Card className="w-full max-w-sm p-8 bg-white/10 backdrop-blur border-white/20">
          {lastAnswerCorrect === true ? (
            <>
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-white" />
              <h1 className="text-3xl font-bold mb-2">Correct!</h1>
              <p className="text-xl opacity-90">+{currentQuestion?.points || 1000} Points</p>
            </>
          ) : lastAnswerCorrect === false ? (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-white" />
              <h1 className="text-3xl font-bold mb-2">Incorrect</h1>
              <p className="text-xl opacity-90">Better luck next time!</p>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold mb-2">Results</h1>
              <p className="opacity-80">Look at the screen</p>
            </>
          )}
        </Card>
        <p className="mt-6 opacity-70">Score: {player?.score || 0}</p>
      </div>
    )
  }

  // Finished Screen
  if (gameState === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-purple-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <Trophy className="w-20 h-20 text-yellow-400 mb-6" />
        <h1 className="text-4xl font-bold mb-2">Game Over!</h1>
        <p className="text-xl text-purple-200 mb-4">Thanks for playing</p>
        <p className="text-2xl font-bold mb-8">Final Score: {player?.score || 0}</p>
        <Button variant="secondary" size="lg" onClick={() => router.push("/")}>
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
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <PlayerGame />
    </Suspense>
  )
}
