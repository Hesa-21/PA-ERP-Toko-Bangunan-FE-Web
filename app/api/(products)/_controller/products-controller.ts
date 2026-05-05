import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import {
  ensureBranchAccess,
  requireProductsDeleteGuard,
  requireProductsReadGuard,
  requireProductsWriteGuard,
} from "@/app/api/(products)/_lib/auth"
import { mapProductsRouteError } from "@/app/api/(products)/_lib/errors"
import { parseJsonBodyOrResponse } from "@/app/api/(products)/_lib/request"
import { parseProductsBody, parseProductsGetQuery } from "@/app/api/(products)/_lib/validators"
import {
  createProduct,
  editProduct,
  listProducts,
  removeProduct,
  validateCreateProductInput,
  validateDeleteProductInput,
  validateProductsQuery,
  validateUpdateProductInput,
} from "@/app/api/(products)/_service/products-service"

export async function handleProductsGet(request: Request) {
  const guard = requireProductsReadGuard(request)
  if (!guard.ok) return guard.response

  const query = parseProductsGetQuery(new URL(request.url))
  const valid = validateProductsQuery(query)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureBranchAccess(guard)
  if (forbidden) return forbidden

  try {
    const { products, total } = listProducts(query)

    return NextResponse.json({ products, total }, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapProductsRouteError(err, "Failed to load products")
  }
}

export async function handleProductsPost(request: Request) {
  const guard = requireProductsWriteGuard(request)
  if (!guard.ok) return guard.response

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) return rawBody.response

  const parsedBody = parseProductsBody(rawBody.data)
  if (!parsedBody.ok) return jsonError({ code: "BAD_REQUEST", message: parsedBody.error, status: 400 })

  const body = parsedBody.data
  const sku = (body.sku ?? "").trim()
  const name = (body.name ?? "").trim()
  const categoryId = (body.categoryId ?? "").trim() || undefined
  const prices = body.prices ?? {}
  const hpp = Number(body.hpp ?? Number.NaN)

  const valid = validateCreateProductInput({ sku, name, prices, hpp })
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureBranchAccess(guard)
  if (forbidden) return forbidden

  try {
    const product = createProduct({
      sku,
      name,
      categoryId,
      prices: valid.prices,
      hpp,
    })

    return NextResponse.json({ product }, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapProductsRouteError(err, "Failed to add product")
  }
}

export async function handleProductsPut(request: Request) {
  const guard = requireProductsWriteGuard(request)
  if (!guard.ok) return guard.response

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) return rawBody.response

  const parsedBody = parseProductsBody(rawBody.data)
  if (!parsedBody.ok) return jsonError({ code: "BAD_REQUEST", message: parsedBody.error, status: 400 })

  const body = parsedBody.data
  const sku = (body.sku ?? "").trim()
  const name = (body.name ?? "").trim()

  const hasCategoryId = Object.prototype.hasOwnProperty.call(body, "categoryId")
  const categoryId = hasCategoryId ? (typeof body.categoryId === "string" ? body.categoryId.trim() : "") : undefined

  const prices = body.prices ?? {}
  const hpp = body.hpp !== undefined ? Number(body.hpp) : undefined

  const valid = validateUpdateProductInput({
    sku,
    prices,
    hpp,
  })
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureBranchAccess(guard)
  if (forbidden) return forbidden

  try {
    const product = editProduct({
      sku,
      name: name || undefined,
      categoryId,
      prices: valid.prices,
      hpp,
    })

    return NextResponse.json({ product }, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapProductsRouteError(err, "Failed to update product")
  }
}

export async function handleProductsDelete(request: Request) {
  const guard = requireProductsDeleteGuard(request)
  if (!guard.ok) return guard.response

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) return rawBody.response

  const parsedBody = parseProductsBody(rawBody.data)
  if (!parsedBody.ok) return jsonError({ code: "BAD_REQUEST", message: parsedBody.error, status: 400 })

  const body = parsedBody.data
  const sku = (body.sku ?? "").trim()
  const valid = validateDeleteProductInput({ sku })
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureBranchAccess(guard)
  if (forbidden) return forbidden

  try {
    removeProduct({ sku })
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapProductsRouteError(err, "Failed to delete product")
  }
}
