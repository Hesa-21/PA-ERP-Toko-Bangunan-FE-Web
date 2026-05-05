import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import {
  ensureBranchAccess,
  requireProductsDeleteGuard,
  requireProductsReadGuard,
  requireProductsWriteGuard,
} from "@/app/api/(products)/_lib/auth"
import { mapProductCategoriesRouteError } from "@/app/api/(products)/_lib/errors"
import { parseJsonBodyOrResponse } from "@/app/api/(products)/_lib/request"
import { parseProductCategoryBody } from "@/app/api/(products)/_lib/validators"
import {
  createProductCategory,
  editProductCategory,
  listProductCategories,
  listProductCategoriesWithUsage,
  removeProductCategory,
  validateCreateCategoryInput,
  validateDeleteCategoryInput,
  validateListCategoriesInput,
  validateUpdateCategoryInput,
} from "@/app/api/(products)/_service/product-categories-service"

export async function handleProductCategoriesGet(request: Request) {
  const guard = requireProductsReadGuard(request)
  if (!guard.ok) return guard.response

  const url = new URL(request.url)
  const includeUsageRaw = (url.searchParams.get("includeUsage") ?? "").trim().toLowerCase()
  const includeUsage = includeUsageRaw === "1" || includeUsageRaw === "true" || includeUsageRaw === "yes"
  const valid = validateListCategoriesInput()
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureBranchAccess(guard)
  if (forbidden) return forbidden

  try {
    const categories = includeUsage
      ? listProductCategoriesWithUsage()
      : listProductCategories()
    return NextResponse.json(
      { categories },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (err: unknown) {
    return mapProductCategoriesRouteError(err, "Failed to load categories")
  }
}

export async function handleProductCategoriesPost(request: Request) {
  const guard = requireProductsWriteGuard(request)
  if (!guard.ok) return guard.response

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) return rawBody.response

  const parsedBody = parseProductCategoryBody(rawBody.data)
  if (!parsedBody.ok) return jsonError({ code: "BAD_REQUEST", message: parsedBody.error, status: 400 })

  const body = parsedBody.data
  const name = (body.name ?? "").trim()

  const valid = validateCreateCategoryInput({ name })
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureBranchAccess(guard)
  if (forbidden) return forbidden

  try {
    const category = createProductCategory({ name })
    return NextResponse.json({ category }, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapProductCategoriesRouteError(err, "Failed to add category")
  }
}

export async function handleProductCategoriesPut(request: Request) {
  const guard = requireProductsWriteGuard(request)
  if (!guard.ok) return guard.response

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) return rawBody.response

  const parsedBody = parseProductCategoryBody(rawBody.data)
  if (!parsedBody.ok) return jsonError({ code: "BAD_REQUEST", message: parsedBody.error, status: 400 })

  const body = parsedBody.data
  const id = (body.id ?? "").trim()
  const name = (body.name ?? "").trim()

  const valid = validateUpdateCategoryInput({ id, name })
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureBranchAccess(guard)
  if (forbidden) return forbidden

  try {
    const category = editProductCategory({ id, name })
    return NextResponse.json({ category }, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapProductCategoriesRouteError(err, "Failed to update category")
  }
}

export async function handleProductCategoriesDelete(request: Request) {
  const guard = requireProductsDeleteGuard(request)
  if (!guard.ok) return guard.response

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) return rawBody.response

  const parsedBody = parseProductCategoryBody(rawBody.data)
  if (!parsedBody.ok) return jsonError({ code: "BAD_REQUEST", message: parsedBody.error, status: 400 })

  const body = parsedBody.data
  const id = (body.id ?? "").trim()

  const valid = validateDeleteCategoryInput({ id })
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureBranchAccess(guard)
  if (forbidden) return forbidden

  try {
    removeProductCategory({ id })
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapProductCategoriesRouteError(err, "Failed to delete category")
  }
}
