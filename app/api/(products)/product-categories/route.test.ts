import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as categoriesController from "@/app/api/(products)/_controller/product-categories-controller"
import { DELETE, GET, POST, PUT } from "@/app/api/(products)/product-categories/route"

describe("product-categories route", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delegates GET to categories controller", async () => {
    const request = new Request("https://example.com/api/product-categories?branch=b_1")
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(categoriesController, "handleProductCategoriesGet").mockResolvedValue(response)

    const result = await GET(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })

  it("delegates POST to categories controller", async () => {
    const request = new Request("https://example.com/api/product-categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    const response = NextResponse.json({ ok: true }, { status: 201 })
    const spy = vi.spyOn(categoriesController, "handleProductCategoriesPost").mockResolvedValue(response)

    const result = await POST(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })

  it("delegates PUT to categories controller", async () => {
    const request = new Request("https://example.com/api/product-categories", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(categoriesController, "handleProductCategoriesPut").mockResolvedValue(response)

    const result = await PUT(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })

  it("delegates DELETE to categories controller", async () => {
    const request = new Request("https://example.com/api/product-categories", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(categoriesController, "handleProductCategoriesDelete").mockResolvedValue(response)

    const result = await DELETE(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })
})