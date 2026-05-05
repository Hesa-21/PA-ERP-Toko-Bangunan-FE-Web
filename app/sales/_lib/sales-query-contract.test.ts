import { describe, expect, it } from "vitest"
import {
  canExportSalesWithRange,
  normalizeSalesListFilters,
  normalizeSalesStatus,
  validateSalesDateRange,
} from "@/app/sales/_lib/sales-query-contract"

describe("sales-query-contract", () => {
  it("normalizes status safely", () => {
    expect(normalizeSalesStatus("Paid")).toBe("Paid")
    expect(normalizeSalesStatus("all")).toBe("")
    expect(normalizeSalesStatus("UNKNOWN")).toBe("")
  })

  it("clamps and normalizes list filters", () => {
    const normalized = normalizeSalesListFilters({
      q: "   abc   ",
      status: "all",
      page: -10,
      limit: 999,
    })

    expect(normalized.q).toBe("abc")
    expect(normalized.status).toBe("")
    expect(normalized.page).toBe(1)
    expect(normalized.limit).toBe(200)
  })

  it("drops partial or invalid date filters", () => {
    const partial = normalizeSalesListFilters({ from: "2026-04-01", to: "" })
    const inverted = normalizeSalesListFilters({ from: "2026-04-02", to: "2026-04-01" })

    expect(partial.from).toBe("")
    expect(partial.to).toBe("")
    expect(inverted.from).toBe("")
    expect(inverted.to).toBe("")
  })

  it("keeps valid date ranges", () => {
    const normalized = normalizeSalesListFilters({ from: "2026-04-01", to: "2026-04-02" })

    expect(normalized.from).toBe("2026-04-01")
    expect(normalized.to).toBe("2026-04-02")
  })

  it("validates export date range consistently", () => {
    expect(validateSalesDateRange({ from: "", to: "" })).toBe("")
    expect(validateSalesDateRange({ from: "2026-04-01", to: "" })).toContain("Lengkapi")
    expect(validateSalesDateRange({ from: "2026-04-02", to: "2026-04-01" })).toContain("tidak boleh")
    expect(canExportSalesWithRange({ from: "2026-04-01", to: "2026-04-02" })).toBe(true)
    expect(canExportSalesWithRange({ from: "2026-04-01", to: "" })).toBe(false)
  })
})