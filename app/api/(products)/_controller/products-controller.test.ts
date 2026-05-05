import { afterEach, describe, expect, it, vi } from "vitest"
import * as productsAuth from "@/app/api/(products)/_lib/auth"
import * as productsService from "@/app/api/(products)/_service/products-service"
import {
  handleProductsDelete,
  handleProductsPost,
  handleProductsPut,
} from "@/app/api/(products)/_controller/products-controller"

function createAllowedGuard(role: "super-admin" | "admin-kasir" = "super-admin") {
  return {
    ok: true as const,
    data: {
      user: {
        id: "user-1",
        name: "Admin",
        role,
        branch: "cabang-a",
      },
      session: {
        provider: "jwt",
        user: {
          id: "user-1",
          name: "Admin",
          role,
          branch: "cabang-a",
        },
      },
    },
  }
}

function createForbiddenResponse() {
  return new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Forbidden" } }), {
    status: 403,
    headers: { "content-type": "application/json" },
  })
}

function createJsonRequest(url: string, method: "POST" | "PUT" | "DELETE", body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("products controller mutation paths", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects malformed JSON on POST", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard() as never)
    const createSpy = vi.spyOn(productsService, "createProduct")

    const response = await handleProductsPost(
      new Request("https://example.com/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      })
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error?: { message?: string } }
    expect(payload.error?.message).toBe("Payload JSON tidak valid.")
    expect(createSpy).not.toHaveBeenCalled()
  })

  it("rejects malformed JSON on PUT", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard() as never)
    const editSpy = vi.spyOn(productsService, "editProduct")

    const response = await handleProductsPut(
      new Request("https://example.com/api/products", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{",
      })
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error?: { message?: string } }
    expect(payload.error?.message).toBe("Payload JSON tidak valid.")
    expect(editSpy).not.toHaveBeenCalled()
  })

  it("rejects malformed JSON on DELETE", async () => {
    vi.spyOn(productsAuth, "requireProductsDeleteGuard").mockReturnValue(createAllowedGuard() as never)
    const removeSpy = vi.spyOn(productsService, "removeProduct")

    const response = await handleProductsDelete(
      new Request("https://example.com/api/products", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: "{",
      })
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error?: { message?: string } }
    expect(payload.error?.message).toBe("Payload JSON tidak valid.")
    expect(removeSpy).not.toHaveBeenCalled()
  })

  it("returns forbidden on POST when branch access fails", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard("admin-kasir") as never)
    const forbidden = createForbiddenResponse()
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(forbidden as never)
    const createSpy = vi.spyOn(productsService, "createProduct")

    const response = await handleProductsPost(
      createJsonRequest("https://example.com/api/products", "POST", {
        sku: "SKU-1",
        name: "Semen",
        categoryId: "cat-1",
        prices: { retail: 100, partai: 90, cabang: 95 },
        hpp: 80,
      })
    )

    expect(response.status).toBe(403)
    const payload = (await response.json()) as { error?: { code?: string } }
    expect(payload.error?.code).toBe("FORBIDDEN")
    expect(createSpy).not.toHaveBeenCalled()
  })

  it("creates product on POST happy path", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(null)
    const createSpy = vi.spyOn(productsService, "createProduct").mockReturnValue(
      {
        sku: "SKU-1",
        name: "Semen",
        prices: { retail: 100, partai: 90, cabang: 95 },
        hpp: 80,
        stock: 0,
      } as never
    )

    const response = await handleProductsPost(
      createJsonRequest("https://example.com/api/products", "POST", {
        sku: "SKU-1",
        name: "Semen",
        categoryId: "cat-1",
        prices: { retail: 100, partai: 90, cabang: 95 },
        hpp: 80,
      })
    )

    expect(response.status).toBe(201)
    expect(createSpy).toHaveBeenCalledWith({
      sku: "SKU-1",
      name: "Semen",
      categoryId: "cat-1",
      prices: { retail: 100, partai: 90, cabang: 95 },
      hpp: 80,
    })
  })

  it("returns forbidden on PUT when branch access fails", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard("admin-kasir") as never)
    const forbidden = createForbiddenResponse()
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(forbidden as never)
    const editSpy = vi.spyOn(productsService, "editProduct")

    const response = await handleProductsPut(
      createJsonRequest("https://example.com/api/products", "PUT", {
        sku: "SKU-1",
        name: "Semen Premium",
        categoryId: "cat-1",
        prices: { retail: 120, partai: 110, cabang: 115 },
        hpp: 90,
      })
    )

    expect(response.status).toBe(403)
    const payload = (await response.json()) as { error?: { code?: string } }
    expect(payload.error?.code).toBe("FORBIDDEN")
    expect(editSpy).not.toHaveBeenCalled()
  })

  it("updates product on PUT happy path", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(null)
    const editSpy = vi.spyOn(productsService, "editProduct").mockReturnValue(
      {
        sku: "SKU-1",
        name: "Semen Premium",
        prices: { retail: 120, partai: 110, cabang: 115 },
        hpp: 90,
        stock: 0,
      } as never
    )

    const response = await handleProductsPut(
      createJsonRequest("https://example.com/api/products", "PUT", {
        sku: "SKU-1",
        name: "Semen Premium",
        categoryId: "cat-1",
        prices: { retail: 120, partai: 110, cabang: 115 },
        hpp: 90,
      })
    )

    expect(response.status).toBe(200)
    expect(editSpy).toHaveBeenCalledWith({
      sku: "SKU-1",
      name: "Semen Premium",
      categoryId: "cat-1",
      prices: { retail: 120, partai: 110, cabang: 115 },
      hpp: 90,
    })
  })

  it("returns forbidden on DELETE when branch access fails", async () => {
    vi.spyOn(productsAuth, "requireProductsDeleteGuard").mockReturnValue(createAllowedGuard("admin-kasir") as never)
    const forbidden = createForbiddenResponse()
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(forbidden as never)
    const removeSpy = vi.spyOn(productsService, "removeProduct")

    const response = await handleProductsDelete(
      createJsonRequest("https://example.com/api/products", "DELETE", {
        sku: "SKU-1",
      })
    )

    expect(response.status).toBe(403)
    const payload = (await response.json()) as { error?: { code?: string } }
    expect(payload.error?.code).toBe("FORBIDDEN")
    expect(removeSpy).not.toHaveBeenCalled()
  })

  it("deletes product on DELETE happy path", async () => {
    vi.spyOn(productsAuth, "requireProductsDeleteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(null)
    const removeSpy = vi.spyOn(productsService, "removeProduct").mockImplementation(() => undefined)

    const response = await handleProductsDelete(
      createJsonRequest("https://example.com/api/products", "DELETE", {
        sku: "SKU-1",
      })
    )

    expect(response.status).toBe(200)
    expect(removeSpy).toHaveBeenCalledWith({ sku: "SKU-1" })
    const payload = (await response.json()) as { ok?: boolean }
    expect(payload.ok).toBe(true)
  })
})
