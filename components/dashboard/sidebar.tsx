"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Bolt, Home, Layout, LogOut, Plus, Settings } from "lucide-react"
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
      label: "My Quizzes",
      icon: Layout,
      href: "/dashboard",
      active: false, // Duplicate for now, logic can be improved
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
      <div className="p-6 flex items-center gap-2 border-b">
        <Bolt className="h-6 w-6 text-primary" />
        <span className="font-bold text-xl">NST WALE</span>
      </div>
      <div className="flex-1 flex flex-col gap-1 p-4">
        {routes.map((route) => (
          <Link
            key={route.href + route.label}
            href={route.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
              route.active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <route.icon className="h-5 w-5" />
            {route.label}
          </Link>
        ))}
      </div>
      <div className="p-4 border-t space-y-2">
        <Link href="/dashboard/create">
          <Button className="w-full gap-2">
            <Plus className="h-4 w-4" /> Create Quiz
          </Button>
        </Link>
        <Button variant="ghost" className="w-full gap-2 justify-start text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  )
}
