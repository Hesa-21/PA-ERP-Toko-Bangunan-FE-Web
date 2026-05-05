"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { PermissionGate } from "@/components/permission-gate"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SalesReportPhase2Shell } from "@/app/reports/sales/_components/sales-report-phase2-shell"

export default function SalesReportsClientPage() {
  return (
    <PermissionGate module="reports.sales">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="h-4" />
            <SalesReportPhase2Shell />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </PermissionGate>
  )
}
