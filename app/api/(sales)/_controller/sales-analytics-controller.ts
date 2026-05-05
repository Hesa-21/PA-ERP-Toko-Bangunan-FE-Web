import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import { ensureSalesBranchAccess, requireSalesReadGuard } from "@/app/api/(sales)/_lib/auth"
import { mapSalesRouteError } from "@/app/api/(sales)/_lib/errors"
import {
  parseSalesSummaryRouteQuery,
  validateBranchRequired,
  validateSalesSummaryRouteQuery,
} from "@/app/api/(sales)/_lib/validators"
import { buildSalesSummary, buildSalesWeekly } from "@/app/api/(sales)/_service/sales-analytics-service"
import { getCentralBranchId } from "@/lib/single-branch"

export async function handleSalesSummaryGet(request: Request) {
  const guard = requireSalesReadGuard(request)
  if (!guard.ok) return guard.response

  const query = parseSalesSummaryRouteQuery(new URL(request.url))
  const valid = validateBranchRequired(query.branch)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const validScope = validateSalesSummaryRouteQuery(query)
  if (!validScope.ok) return jsonError({ code: "BAD_REQUEST", message: validScope.error, status: 400 })

  const forbidden = ensureSalesBranchAccess(guard, query.branch)
  if (forbidden) return forbidden

  try {
    const dto = buildSalesSummary({ branch: query.branch, scope: query.scope })

    return NextResponse.json(dto, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapSalesRouteError(err, "Failed to load sales summary")
  }
}

export async function handleSalesWeeklyGet(request: Request) {
  const guard = requireSalesReadGuard(request)
  if (!guard.ok) return guard.response

  const branch = getCentralBranchId()
  const valid = validateBranchRequired(branch)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureSalesBranchAccess(guard, branch)
  if (forbidden) return forbidden

  try {
    const points = buildSalesWeekly({ branch })

    return NextResponse.json(points, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapSalesRouteError(err, "Failed to load weekly sales")
  }
}