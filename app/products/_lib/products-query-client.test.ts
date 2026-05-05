import { afterEach, describe, expect, it, vi } from "vitest"
import { productsApiList } from "@/app/products/_api-clients/products"

const ORIGINAL_FETCH = global.fetch

afterEach(() => {
  global.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

describe("productsApiList", () => {
  it("does not force page and limit when omitted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ products: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await productsApiList({ categoryId: "CAT-1" })

    const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? "")
    expect(calledUrl).toContain("/api/products?")
    expect(calledUrl).toContain("categoryId=CAT-1")
    expect(calledUrl).not.toContain("page=")
    expect(calledUrl).not.toContain("limit=")
  })

  it("includes page and limit only when explicitly provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ products: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await productsApiList({ page: 2, limit: 15 })

    const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? "")
    expect(calledUrl).toContain("page=2")
    expect(calledUrl).toContain("limit=15")
  })
})
