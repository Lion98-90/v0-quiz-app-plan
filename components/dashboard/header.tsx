import { UserCircle, Bell, Search, Menu } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DashboardSidebar } from "./sidebar"

export async function DashboardHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 px-4 lg:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <DashboardSidebar />
          </SheetContent>
        </Sheet>
        <span className="font-bold text-lg">Lovable Bolt</span>
      </div>

      <div className="hidden lg:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search quizzes..."
            className="w-full bg-muted/50 pl-9 focus-visible:bg-background transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-background" />
        </Button>

        <div className="h-8 w-[1px] bg-border hidden lg:block" />

        <div className="flex items-center gap-3 pl-2">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || "User"}</span>
            <span className="text-xs text-muted-foreground mt-1">{user?.email}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-border">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  )
}
