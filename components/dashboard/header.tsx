import { UserCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export async function DashboardHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
      <h1 className="font-semibold text-lg">Dashboard</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserCircle className="h-5 w-5" />
          <span>{user?.email}</span>
        </div>
      </div>
    </header>
  )
}
