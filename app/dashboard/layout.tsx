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
    <div className="flex h-screen w-full bg-muted/20">
      <aside className="hidden w-64 lg:block fixed inset-y-0">
        <DashboardSidebar />
      </aside>
      <main className="flex-1 lg:pl-64 flex flex-col h-full">
        <DashboardHeader />
        <div className="flex-1 p-6 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
