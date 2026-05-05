import { describe, expect, it } from "vitest"
import {
  parseDashboardRecentQuery,
  parseDashboardSummaryQuery,
  validateDashboardRecentQuery,
  validateDashboardSummaryQuery,
} from "@/app/api/(dashboard)/_lib/validators"

describe("dashboard validators", () => {
  it("rejects invalid summary scope", () => {
    const query = parseDashboardSummaryQuery(
      new URL("https://example.com/api/dashboard/summary?branch=branch-1&scope=this-week")
    )

    const valid = validateDashboardSummaryQuery(query)
    expect(valid.ok).toBe(false)
    if (valid.ok) return

    expect(valid.error).toContain("scope")
  })

  it("accepts empty and today summary scope", () => {
    const allTime = parseDashboardSummaryQuery(
      new URL("https://example.com/api/dashboard/summary?branch=branch-1")
    )
    const today = parseDashboardSummaryQuery(
      new URL("https://example.com/api/dashboard/summary?branch=branch-1&scope=TODAY")
    )

    expect(validateDashboardSummaryQuery(allTime).ok).toBe(true)
    expect(validateDashboardSummaryQuery(today).ok).toBe(true)
    expect(today.scope).toBe("today")
  })

  it("keeps recent invalid scope and limit checks", () => {
    const query = parseDashboardRecentQuery(
      new URL("https://example.com/api/dashboard/recent?branch=branch-1&scope=week&limit=-10")
    )

    const valid = validateDashboardRecentQuery(query)
    expect(valid.ok).toBe(false)
    if (valid.ok) return

    expect(valid.error).toContain("limit")
  })
})
