import { quiz } from "@/lib/quiz" // Assuming quiz is imported from this file
import { CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const DashboardPage = () => {
  return (
    <div>
      {/* ... existing code ... */}
      <CardFooter className="pt-2">
        <div className="flex gap-2 w-full">
          <Link href={`/dashboard/quiz/${quiz.id}`} className="flex-1">
            <Button variant="outline" className="w-full bg-transparent">
              Edit
            </Button>
          </Link>
          <form
            action={async () => {
              "use server"
              const { createClient } = await import("@/lib/supabase/server")
              const { redirect } = await import("next/navigation")
              const supabase = await createClient()
              const {
                data: { user },
              } = await supabase.auth.getUser()
              if (!user) return

              // Create game
              const pin = Math.floor(100000 + Math.random() * 900000).toString()
              const { data: game, error } = await supabase
                .from("games")
                .insert({
                  quiz_id: quiz.id,
                  host_id: user.id,
                  pin_code: pin,
                  status: "waiting",
                  state: "lobby",
                })
                .select()
                .single()

              if (game) {
                redirect(`/host/${game.id}`)
              }
            }}
            className="flex-1"
          >
            <Button className="w-full">Host</Button>
          </form>
        </div>
      </CardFooter>
      {/* ... existing code ... */}
    </div>
  )
}

export default DashboardPage
