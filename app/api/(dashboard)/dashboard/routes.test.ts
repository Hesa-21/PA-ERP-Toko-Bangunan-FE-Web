import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as dashboardSummaryController from "@/app/api/(dashboard)/_controller/dashboard-summary-controller"
import * as dashboardWeeklyController from "@/app/api/(dashboard)/_controller/dashboard-weekly-controller"
import * as dashboardRecentController from "@/app/api/(dashboard)/_controller/dashboard-recent-controller"
import * as dashboardSnapshotController from "@/app/api/(dashboard)/_controller/dashboard-snapshot-controller"
import * as summaryRoute from "@/app/api/(dashboard)/dashboard/summary/route"
import * as weeklyRoute from "@/app/api/(dashboard)/dashboard/weekly/route"
import * as recentRoute from "@/app/api/(dashboard)/dashboard/recent/route"
import * as snapshotRoute from "@/app/api/(dashboard)/dashboard/snapshot/route"

vi.mock("@/app/api/(dashboard)/_controller/dashboard-summary-controller", () => ({
  handleDashboardSummaryGet: vi.fn(),
}))

vi.mock("@/app/api/(dashboard)/_controller/dashboard-weekly-controller", () => ({
  handleDashboardWeeklyGet: vi.fn(),
}))

vi.mock("@/app/api/(dashboard)/_controller/dashboard-recent-controller", () => ({
  handleDashboardRecentGet: vi.fn(),
}))

vi.mock("@/app/api/(dashboard)/_controller/dashboard-snapshot-controller", () => ({
  handleDashboardSnapshotGet: vi.fn(),
}))

describe("dashboard route delegation", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("delegates summary and weekly GET routes to controllers", async () => {
    vi.mocked(dashboardSummaryController.handleDashboardSummaryGet).mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 200 })
    )
    vi.mocked(dashboardWeeklyController.handleDashboardWeeklyGet).mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 200 })
    )

    const summaryRequest = new Request("https://example.com/api/dashboard/summary?branch=branch-1")
    const weeklyRequest = new Request("https://example.com/api/dashboard/weekly?branch=branch-1")

    await summaryRoute.GET(summaryRequest)
    await weeklyRoute.GET(weeklyRequest)

    expect(dashboardSummaryController.handleDashboardSummaryGet).toHaveBeenCalledWith(summaryRequest)
    expect(dashboardWeeklyController.handleDashboardWeeklyGet).toHaveBeenCalledWith(weeklyRequest)
  })

  it("delegates recent and snapshot GET routes to controllers", async () => {
    vi.mocked(dashboardRecentController.handleDashboardRecentGet).mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 200 })
    )
    vi.mocked(dashboardSnapshotController.handleDashboardSnapshotGet).mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 200 })
    )

    const recentRequest = new Request("https://example.com/api/dashboard/recent?branch=branch-1")
    const snapshotRequest = new Request("https://example.com/api/dashboard/snapshot?branch=branch-1")

    await recentRoute.GET(recentRequest)
    await snapshotRoute.GET(snapshotRequest)

    expect(dashboardRecentController.handleDashboardRecentGet).toHaveBeenCalledWith(recentRequest)
    expect(dashboardSnapshotController.handleDashboardSnapshotGet).toHaveBeenCalledWith(snapshotRequest)
  })
})
