import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import { ensureSalesBranchAccess, requireSalesReadGuard } from "@/app/api/(sales)/_lib/auth"
import { mapSalesRouteError } from "@/app/api/(sales)/_lib/errors"
import { validateBranchRequired, validateSaleIdRequired } from "@/app/api/(sales)/_lib/validators"
import { renderSalePrint } from "@/app/api/(sales)/_service/sales-print-service"
import { getCentralBranchId } from "@/lib/single-branch"

export async function handleSalesPrintGet(request: Request, input: { saleId?: string; withPrice: boolean }) {
  const guard = requireSalesReadGuard(request)
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(request.url)
  const branch = getCentralBranchId()
  const validBranch = validateBranchRequired(branch)
  if (!validBranch.ok) return jsonError({ code: "BAD_REQUEST", message: validBranch.error, status: 400 })

  const forbidden = ensureSalesBranchAccess(guard, branch)
  if (forbidden) return forbidden

  const saleId = (input.saleId ?? "").trim() || (searchParams.get("saleId") ?? "").trim()
  const validSaleId = validateSaleIdRequired(saleId)
  if (!validSaleId.ok) return jsonError({ code: "BAD_REQUEST", message: validSaleId.error, status: 400 })

  try {
    const html = renderSalePrint({ branch, saleId: validSaleId.value, withPrice: input.withPrice })

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (err: unknown) {
    return mapSalesRouteError(err, "Failed to print sale")
  }
}
