"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Bolt, Home, LogOut, Plus, Settings, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const routes = [
    {
      label: "Dashboard",
      icon: Home,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Analytics",
      icon: BarChart3,
      href: "/dashboard/analytics",
      active: pathname === "/dashboard/analytics",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/dashboard/settings",
      active: pathname === "/dashboard/settings",
    },
  ]

  return (
    <div className="flex h-full flex-col bg-card border-r">
      <div className="p-6 flex items-center gap-3 border-b hover:bg-muted/50 transition-colors cursor-default">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bolt className="h-6 w-6 text-primary" />
        </div>
        <div>
          <span className="font-bold text-xl block leading-none">Lovable Bolt</span>
          <span className="text-xs text-muted-foreground font-medium">Quiz Platform</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 p-4">
        <div className="text-xs font-semibold text-muted-foreground px-4 py-2 uppercase tracking-wider">Menu</div>
        {routes.map((route) => (
          <Link
            key={route.href + route.label}
            href={route.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
              route.active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground hover:pl-5",
            )}
          >
            <route.icon className="h-5 w-5" />
            {route.label}
          </Link>
        ))}

        <Link
          href="/play"
          target="_blank"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground hover:pl-5",
          )}
        >
          <PlayCircle className="h-5 w-5" />
          Join Game
        </Link>
      </div>

      <div className="p-4 border-t space-y-3 bg-muted/10">
        <Link href="/dashboard/create">
          <Button className="w-full gap-2 shadow-sm hover:shadow-md transition-all">
            <Plus className="h-4 w-4" /> Create New Quiz
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full gap-2 justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  )
}
