import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import {
  ensureSalesBranchAccess,
  requireSalesDeleteGuard,
  requireSalesReadGuard,
} from "@/app/api/(sales)/_lib/auth"
import { mapSalesRouteError } from "@/app/api/(sales)/_lib/errors"
import {
  parseSalesListRouteQuery,
  validateBranchRequired,
  validateSaleIdRequired,
  validateSalesListRouteQuery,
} from "@/app/api/(sales)/_lib/validators"
import { getSalesDetail, voidSaleWithPolicy } from "@/app/api/(sales)/_service/sales-detail-service"
import { listSalesMonitoring } from "@/app/api/(sales)/_service/sales-list-service"
import { getCentralBranchId } from "@/lib/single-branch"

export async function handleSalesGet(request: Request) {
  const guard = requireSalesReadGuard(request)
  if (!guard.ok) return guard.response

  const query = parseSalesListRouteQuery(new URL(request.url))
  const valid = validateBranchRequired(query.branch)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const validQuery = validateSalesListRouteQuery(query)
  if (!validQuery.ok) return jsonError({ code: "BAD_REQUEST", message: validQuery.error, status: 400 })

  const forbidden = ensureSalesBranchAccess(guard, query.branch)
  if (forbidden) return forbidden

  try {
    const data = listSalesMonitoring(query)

    return NextResponse.json(
      data,
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (err: unknown) {
    return mapSalesRouteError(err, "Failed to load sales")
  }
}

export async function handleSaleDetailGet(request: Request, ctx: { params: Promise<{ saleId: string }> }) {
  const guard = requireSalesReadGuard(request)
  if (!guard.ok) return guard.response

  const branch = getCentralBranchId()
  const valid = validateBranchRequired(branch)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureSalesBranchAccess(guard, branch)
  if (forbidden) return forbidden

  const { saleId } = await ctx.params
  const validSaleId = validateSaleIdRequired(saleId)
  if (!validSaleId.ok) return jsonError({ code: "BAD_REQUEST", message: validSaleId.error, status: 400 })

  try {
    const dto = getSalesDetail({ branch, saleId: validSaleId.value })

    return NextResponse.json(dto, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapSalesRouteError(err, "Failed to load sale")
  }
}

export async function handleSaleDetailDelete(request: Request, ctx: { params: Promise<{ saleId: string }> }) {
  const guard = requireSalesDeleteGuard(request)
  if (!guard.ok) return guard.response

  const branch = getCentralBranchId()
  const valid = validateBranchRequired(branch)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureSalesBranchAccess(guard, branch)
  if (forbidden) return forbidden

  const { saleId } = await ctx.params
  const validSaleId = validateSaleIdRequired(saleId)
  if (!validSaleId.ok) return jsonError({ code: "BAD_REQUEST", message: validSaleId.error, status: 400 })

  try {
    const doc = voidSaleWithPolicy({
      branch,
      saleId: validSaleId.value,
      userName: guard.data.user.name,
      userRole: guard.data.user.role,
      now: new Date(),
    })
    return NextResponse.json({ doc }, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapSalesRouteError(err, "Failed to delete sale")
  }
}