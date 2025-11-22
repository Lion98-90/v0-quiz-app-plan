import type React from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <div className="flex h-screen w-full bg-muted/30">
      <aside className="hidden w-72 lg:block fixed inset-y-0 z-40 shadow-sm">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 lg:pl-72 flex flex-col h-full min-w-0 transition-all duration-300 ease-in-out">
        <DashboardHeader />
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <div className="mx-auto max-w-7xl w-full space-y-8 animate-in fade-in duration-500">{children}</div>
        </div>
      </main>
    </div>
  )
}
