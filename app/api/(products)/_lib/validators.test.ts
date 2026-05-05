import { describe, expect, it } from "vitest"
import { parseProductZoneBalancesGetQuery } from "@/app/api/(products)/_lib/validators"

describe("products validators", () => {
  it("applies safe defaults for zone balances pagination", () => {
    const query = parseProductZoneBalancesGetQuery(
      new URL("https://example.com/api/products/zone-balances")
    )

    expect(query.sku).toBe("")
    expect(query.hasLimit).toBe(false)
    expect(query.limit).toBe(200)
    expect(query.page).toBe(1)
    expect(query.invalidLimitParam).toBe(false)
    expect(query.invalidPageParam).toBe(false)
  })

  it("marks invalid page and limit params", () => {
    const query = parseProductZoneBalancesGetQuery(
      new URL("https://example.com/api/products/zone-balances?limit=-10&page=abc")
    )

    expect(query.invalidLimitParam).toBe(true)
    expect(query.invalidPageParam).toBe(true)
    expect(query.limit).toBe(200)
    expect(query.page).toBe(1)
  })

  it("clamps explicit limit to max page size", () => {
    const query = parseProductZoneBalancesGetQuery(
      new URL("https://example.com/api/products/zone-balances?limit=999&page=3")
    )

    expect(query.hasLimit).toBe(true)
    expect(query.invalidLimitParam).toBe(false)
    expect(query.limit).toBe(200)
    expect(query.page).toBe(3)
  })
})
