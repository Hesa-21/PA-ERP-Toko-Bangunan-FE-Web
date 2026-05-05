import { describe, expect, it } from "vitest"
import {
  mapProductCategoriesRouteError,
  mapProductsRouteError,
  mapProductZoneBalancesRouteError,
} from "@/app/api/(products)/_lib/errors"

describe("products error mapping", () => {
  it("maps INVALID_SKU into bad request", async () => {
    const response = mapProductsRouteError(new Error("INVALID_SKU"), "fallback")
    expect(response.status).toBe(400)

    const payload = (await response.json()) as {
      error: {
        code: string
        message: string
      }
    }

    expect(payload.error.code).toBe("BAD_REQUEST")
    expect(payload.error.message).toContain("SKU")
  })

  it("maps INVALID_WAREHOUSE_ID for zone balances", async () => {
    const response = mapProductZoneBalancesRouteError(new Error("INVALID_WAREHOUSE_ID"), "fallback")
    expect(response.status).toBe(400)

    const payload = (await response.json()) as {
      error: {
        code: string
        message: string
      }
    }

    expect(payload.error.code).toBe("BAD_REQUEST")
    expect(payload.error.message).toContain("warehouseId")
  })

  it("maps DOMAIN:INVALID_INPUT for categories", async () => {
    const response = mapProductCategoriesRouteError(new Error("DOMAIN:INVALID_INPUT:Kategori tidak valid."), "fallback")
    expect(response.status).toBe(400)

    const payload = (await response.json()) as {
      error: {
        code: string
        message: string
      }
    }

    expect(payload.error.code).toBe("INVALID_INPUT")
    expect(payload.error.message).toContain("Kategori")
  })
})
