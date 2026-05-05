import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import { ensureSalesBranchAccess, requireSalesReadGuard } from "@/app/api/(sales)/_lib/auth"
import { mapSalesRouteError } from "@/app/api/(sales)/_lib/errors"
import {
  parseSalesListRouteQuery,
  validateBranchRequired,
  validateExportDateRange,
  validateSalesListRouteQuery,
} from "@/app/api/(sales)/_lib/validators"
import { buildSalesExportCsv } from "@/app/api/(sales)/_service/sales-export-service"

export async function handleSalesExportGet(request: Request) {
  const guard = requireSalesReadGuard(request)
  if (!guard.ok) return guard.response

  const query = parseSalesListRouteQuery(new URL(request.url))
  const valid = validateBranchRequired(query.branch)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const validQuery = validateSalesListRouteQuery(query)
  if (!validQuery.ok) return jsonError({ code: "BAD_REQUEST", message: validQuery.error, status: 400 })

  const forbidden = ensureSalesBranchAccess(guard, query.branch)
  if (forbidden) return forbidden

  const dateValid = validateExportDateRange({ fromDate: query.fromDate, toDate: query.toDate })
  if (!dateValid.ok) return jsonError({ code: "BAD_REQUEST", message: dateValid.error, status: 400 })

  try {
    const { csv, filename } = buildSalesExportCsv({
      branch: query.branch,
      q: query.q,
      statusFilter: query.statusFilter,
      fromDate: query.fromDate!,
      toDate: query.toDate!,
    })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err: unknown) {
    return mapSalesRouteError(err, "Failed to export sales")
  }
}