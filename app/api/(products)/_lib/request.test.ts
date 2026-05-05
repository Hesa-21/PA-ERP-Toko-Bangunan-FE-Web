import { describe, expect, it } from "vitest"
import { parseJsonBodyOrResponse } from "@/app/api/(products)/_lib/request"

describe("products request parser", () => {
  it("rejects malformed JSON payload explicitly", async () => {
    const result = await parseJsonBodyOrResponse(
      new Request("https://example.com/api/products", {
        method: "POST",
        body: "{",
      })
    )

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.response.status).toBe(400)
    const payload = (await result.response.json()) as { error?: { message?: string } }
    expect(payload.error?.message).toBe("Payload JSON tidak valid.")
  })

  it("returns empty object for empty payload", async () => {
    const result = await parseJsonBodyOrResponse(
      new Request("https://example.com/api/products", {
        method: "POST",
      })
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data).toEqual({})
  })

  it("parses valid JSON payload", async () => {
    const result = await parseJsonBodyOrResponse(
      new Request("https://example.com/api/products", {
        method: "POST",
        body: JSON.stringify({ branch: "b_1", sku: "SKU-1" }),
      })
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data).toEqual({ branch: "b_1", sku: "SKU-1" })
  })
})
