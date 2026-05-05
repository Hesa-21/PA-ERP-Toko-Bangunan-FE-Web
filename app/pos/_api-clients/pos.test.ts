import { beforeEach, describe, expect, it, vi } from "vitest"
import * as httpClient from "@/lib/client/http"
import {
  fetchPosProductZoneBalancesApi,
  fetchPosProductsApi,
  postPosSaleApi,
} from "@/app/pos/_api-clients/pos"

describe("pos api client contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("builds products query with safe clamp and normalizes payload", async () => {
    const apiSpy = vi.spyOn(httpClient, "apiFetchJson").mockResolvedValue({
      products: [{ sku: "SKU-1" }],
      total: 2,
    } as never)

    const result = await fetchPosProductsApi({
      page: 0,
      limit: 999,
      sortBy: "name",
      sortDir: "asc",
      priceTier: "retail",
    })

    expect(apiSpy).toHaveBeenCalledTimes(1)
    const [url, init] = apiSpy.mock.calls[0] ?? []
    expect(String(url)).toContain("/api/products?")
    expect(String(url)).not.toContain("branchId=")
    expect(String(url)).toContain("page=1")
    expect(String(url)).toContain("limit=100")
    expect(String(url)).toContain("sortBy=name")
    expect((init as RequestInit | undefined)?.method).toBe("GET")

    expect(result.products).toHaveLength(1)
    expect(result.total).toBe(2)
  })

  it("paginates zone-balance list and deduplicates repeated SKU rows", async () => {
    const apiSpy = vi.spyOn(httpClient, "apiFetchJson")
      .mockResolvedValueOnce({
        items: [
          {
            sku: "SKU-1",
            totalNormalQty: 5,
            isMultiZone: false,
            lines: [],
          },
        ],
        hasMore: true,
      } as never)
      .mockResolvedValueOnce({
        items: [
          {
            sku: "SKU-1",
            totalNormalQty: 10,
            isMultiZone: true,
            lines: [],
          },
          {
            sku: "SKU-2",
            totalNormalQty: 2,
            isMultiZone: false,
            lines: [],
          },
        ],
        hasMore: false,
      } as never)

    const result = await fetchPosProductZoneBalancesApi({})

    expect(apiSpy).toHaveBeenCalledTimes(2)
    const [firstUrl] = apiSpy.mock.calls[0] ?? []
    const [secondUrl] = apiSpy.mock.calls[1] ?? []
    expect(String(firstUrl)).toContain("page=1")
    expect(String(firstUrl)).toContain("limit=200")
    expect(String(secondUrl)).toContain("page=2")
    expect(String(secondUrl)).toContain("limit=200")

    expect(result.items.map((item) => item.sku)).toEqual(["SKU-1", "SKU-2"])
  })

  it("sends checkout payload with generated idempotency key header", async () => {
    const postSpy = vi.spyOn(httpClient, "apiPostJson").mockResolvedValue({
      doc: { id: "SALE-1" },
    } as never)

    await postPosSaleApi({
      allowNegativeStock: false,
      warehouseId: "z-1",
      salespersonName: "Kasir A",
      paymentStatus: "tunai",
      paidAmount: 10_000,
      dueDate: undefined,
      orderDiscount: 0,
      customerName: "Customer A",
      customerAddress: "Alamat A",
      customerPhone: "08123",
      items: [
        {
          sku: "SKU-1",
          quantity: 1,
          unitPrice: 10_000,
          discount: 0,
          priceTier: "retail",
          warehouseId: "z-1",
        },
      ],
    })

    expect(postSpy).toHaveBeenCalledTimes(1)

    const [url, body, init, options] = postSpy.mock.calls[0] ?? []
    expect(String(url)).toBe("/api/pos/sales")
    expect((body as { allowNegativeStock?: boolean }).allowNegativeStock).toBe(false)
    expect(body).not.toHaveProperty("branchId")

    const key = (init as { headers?: Record<string, string> } | undefined)?.headers?.["Idempotency-Key"]
    expect(typeof key).toBe("string")
    expect(key).toContain("pos-sales-")
    expect(options).toEqual({ defaultErrorMessage: "Gagal memproses transaksi" })
  })
})