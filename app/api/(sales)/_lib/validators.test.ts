import { describe, expect, it } from "vitest"
import {
  parseSalesListRouteQuery,
  parseSalesSummaryRouteQuery,
  validateExportDateRange,
  validateSalesListRouteQuery,
  validateSalesSummaryRouteQuery,
} from "@/app/api/(sales)/_lib/validators"

describe("sales validators", () => {
  it("applies safe defaults and max clamp for list query", () => {
    const query = parseSalesListRouteQuery(
      new URL(
        "https://example.com/api/sales?branch=b_1&scope=today&status=Paid&page=3&limit=999&from=2026-04-01&to=2026-04-05"
      )
    )

    expect(query.branch).toBe("b_1")
    expect(query.scope).toBe("today")
    expect(query.statusFilter).toBe("Paid")
    expect(query.pageRaw).toBe(3)
    expect(query.limitRaw).toBe(200)
    expect(query.invalidScopeParam).toBe(false)
    expect(query.invalidStatusParam).toBe(false)
    expect(query.invalidPageParam).toBe(false)
    expect(query.invalidLimitParam).toBe(false)
    expect(query.invalidFromParam).toBe(false)
    expect(query.invalidToParam).toBe(false)
    expect(query.dateRangeInvalid).toBe(false)
  })

  it("marks invalid list query params instead of silently accepting them", () => {
    const query = parseSalesListRouteQuery(
      new URL("https://example.com/api/sales?branch=b_1&scope=mingguan&status=Lunas&from=abc&to=2026-20-99&page=0&limit=-10")
    )

    expect(query.scope).toBe("")
    expect(query.statusFilter).toBe("")
    expect(query.pageRaw).toBe(1)
    expect(query.limitRaw).toBe(5)
    expect(query.invalidScopeParam).toBe(true)
    expect(query.invalidStatusParam).toBe(true)
    expect(query.invalidFromParam).toBe(true)
    expect(query.invalidToParam).toBe(true)
    expect(query.invalidPageParam).toBe(true)
    expect(query.invalidLimitParam).toBe(true)

    const valid = validateSalesListRouteQuery(query)
    expect(valid.ok).toBe(false)
  })

  it("rejects date range where from is greater than to", () => {
    const query = parseSalesListRouteQuery(
      new URL("https://example.com/api/sales?branch=b_1&from=2026-04-06&to=2026-04-01")
    )

    expect(query.dateRangeInvalid).toBe(true)

    const valid = validateSalesListRouteQuery(query)
    expect(valid.ok).toBe(false)
    if (valid.ok) return
    expect(valid.error).toContain("from")
  })

  it("validates summary scope contract", () => {
    const query = parseSalesSummaryRouteQuery(
      new URL("https://example.com/api/sales/summary?branch=b_1&scope=weekly")
    )

    expect(query.invalidScopeParam).toBe(true)

    const valid = validateSalesSummaryRouteQuery(query)
    expect(valid.ok).toBe(false)
  })

  it("requires both from and to for export date range", () => {
    const valid = validateExportDateRange({
      fromDate: new Date("2026-04-01T00:00:00Z"),
      toDate: null,
    })

    expect(valid.ok).toBe(false)
  })
})