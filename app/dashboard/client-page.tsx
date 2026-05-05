"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/components/permission-gate"
import { DashboardStats } from "@/app/dashboard/_components/dashboard-stats"
import { SalesChart } from "@/app/dashboard/_components/sales-chart"
import { RecentTransactions } from "@/app/dashboard/_components/recent-transactions"
import { useDashboardController } from "@/app/dashboard/_hooks/use-dashboard-controller"
import type { DashboardSnapshot } from "@/app/dashboard/_lib/dashboard-types"

export default function ClientDashboardPage(input: {
	initialSnapshot?: DashboardSnapshot
}) {
	const c = useDashboardController({
		initialSnapshot: input.initialSnapshot,
	})

	return (
		<PermissionGate module="dashboard">
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<DashboardHeader />
					<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
						<div className="space-y-6">
							<div className="h-4" />
							{!c.hasValidBranch ? (
								<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
									Akun Anda belum memiliki akses cabang. Hubungi admin untuk menetapkan cabang aktif.
								</div>
							) : (
								<>
									{c.error && (
										<div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
											<span>{c.error}</span>
											<Button
												variant="outline"
												size="sm"
												disabled={c.isLoading}
												onClick={() => {
													void c.reload()
												}}
											>
												{c.isLoading ? "Memuat..." : "Coba Lagi"}
											</Button>
										</div>
									)}
									{c.isLoading && (
										<div className="text-sm text-gray-600">Memuat data dashboard terbaru...</div>
									)}
									<DashboardStats selectedBranch={c.selectedBranch.code} data={c.snapshot?.statsData} />
									<div className="grid gap-6">
										<SalesChart selectedBranch={c.selectedBranch.code} data={c.snapshot?.salesChartData} />
									</div>
									<div className="grid gap-6 md:grid-cols-2 items-stretch">
										<div className="flex flex-col h-full md:col-span-1">
											<RecentTransactions
												selectedBranch={c.selectedBranch.code}
												data={c.snapshot?.recentTransactionsData}
											/>
										</div>
										<div className="hidden md:block" />
									</div>
								</>
							)}
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</PermissionGate>
	)
}
