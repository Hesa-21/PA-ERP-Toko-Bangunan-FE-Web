"use client"

import { Building2 } from "lucide-react"
import { CurrentDate } from "@/components/current-date"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useActiveBranch } from "@/hooks/use-active-branch"

export function DashboardHeader() {
  const { selectedBranch } = useActiveBranch()

  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-white px-4">
      <SidebarTrigger className="-ml-1" />

      <div className="ml-4 flex flex-1 items-center gap-2">
        <Building2 className="h-4 w-4 text-gray-600" />
        <div className="min-w-56 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
          {selectedBranch.name}
        </div>
      </div>

      <CurrentDate />
    </header>
  )
}
