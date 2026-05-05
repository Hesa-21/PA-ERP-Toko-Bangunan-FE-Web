import { afterEach, describe, expect, it, vi } from "vitest"
import * as productsAuth from "@/app/api/(products)/_lib/auth"
import * as categoriesService from "@/app/api/(products)/_service/product-categories-service"
import {
  handleProductCategoriesDelete,
  handleProductCategoriesPost,
  handleProductCategoriesPut,
} from "@/app/api/(products)/_controller/product-categories-controller"

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

describe("product-categories controller mutation paths", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects malformed JSON on POST", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard() as never)
    const createSpy = vi.spyOn(categoriesService, "createProductCategory")

    const response = await handleProductCategoriesPost(
      new Request("https://example.com/api/product-categories", {
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
    const editSpy = vi.spyOn(categoriesService, "editProductCategory")

    const response = await handleProductCategoriesPut(
      new Request("https://example.com/api/product-categories", {
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
    const removeSpy = vi.spyOn(categoriesService, "removeProductCategory")

    const response = await handleProductCategoriesDelete(
      new Request("https://example.com/api/product-categories", {
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
    const createSpy = vi.spyOn(categoriesService, "createProductCategory")

    const response = await handleProductCategoriesPost(
      createJsonRequest("https://example.com/api/product-categories", "POST", {
        name: "Semen",
      })
    )

    expect(response.status).toBe(403)
    const payload = (await response.json()) as { error?: { code?: string } }
    expect(payload.error?.code).toBe("FORBIDDEN")
    expect(createSpy).not.toHaveBeenCalled()
  })

  it("creates category on POST happy path", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(null)
    const createSpy = vi.spyOn(categoriesService, "createProductCategory").mockReturnValue(
      { id: "cat-1", name: "Semen" } as never
    )

    const response = await handleProductCategoriesPost(
      createJsonRequest("https://example.com/api/product-categories", "POST", {
        name: "Semen",
      })
    )

    expect(response.status).toBe(201)
    expect(createSpy).toHaveBeenCalledWith({ name: "Semen" })
  })

  it("returns forbidden on PUT when branch access fails", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard("admin-kasir") as never)
    const forbidden = createForbiddenResponse()
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(forbidden as never)
    const editSpy = vi.spyOn(categoriesService, "editProductCategory")

    const response = await handleProductCategoriesPut(
      createJsonRequest("https://example.com/api/product-categories", "PUT", {
        id: "cat-1",
        name: "Semen Premium",
      })
    )

    expect(response.status).toBe(403)
    const payload = (await response.json()) as { error?: { code?: string } }
    expect(payload.error?.code).toBe("FORBIDDEN")
    expect(editSpy).not.toHaveBeenCalled()
  })

  it("updates category on PUT happy path", async () => {
    vi.spyOn(productsAuth, "requireProductsWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(null)
    const editSpy = vi.spyOn(categoriesService, "editProductCategory").mockReturnValue(
      { id: "cat-1", name: "Semen Premium" } as never
    )

    const response = await handleProductCategoriesPut(
      createJsonRequest("https://example.com/api/product-categories", "PUT", {
        id: "cat-1",
        name: "Semen Premium",
      })
    )

    expect(response.status).toBe(200)
    expect(editSpy).toHaveBeenCalledWith({ id: "cat-1", name: "Semen Premium" })
  })

  it("returns forbidden on DELETE when branch access fails", async () => {
    vi.spyOn(productsAuth, "requireProductsDeleteGuard").mockReturnValue(createAllowedGuard("admin-kasir") as never)
    const forbidden = createForbiddenResponse()
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(forbidden as never)
    const removeSpy = vi.spyOn(categoriesService, "removeProductCategory")

    const response = await handleProductCategoriesDelete(
      createJsonRequest("https://example.com/api/product-categories", "DELETE", {
        id: "cat-1",
      })
    )

    expect(response.status).toBe(403)
    const payload = (await response.json()) as { error?: { code?: string } }
    expect(payload.error?.code).toBe("FORBIDDEN")
    expect(removeSpy).not.toHaveBeenCalled()
  })

  it("deletes category on DELETE happy path", async () => {
    vi.spyOn(productsAuth, "requireProductsDeleteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(productsAuth, "ensureBranchAccess").mockReturnValue(null)
    const removeSpy = vi.spyOn(categoriesService, "removeProductCategory").mockImplementation(() => undefined)

    const response = await handleProductCategoriesDelete(
      createJsonRequest("https://example.com/api/product-categories", "DELETE", {
        id: "cat-1",
      })
    )

    expect(response.status).toBe(200)
    expect(removeSpy).toHaveBeenCalledWith({ id: "cat-1" })
    const payload = (await response.json()) as { ok?: boolean }
    expect(payload.ok).toBe(true)
  })
})
