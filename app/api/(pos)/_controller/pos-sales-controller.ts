import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import { getCentralBranchId } from "@/lib/single-branch"
import { requirePosWriteGuard, ensurePosBranchAccess } from "@/app/api/(pos)/_lib/auth"
import { mapPosSalesRouteError } from "@/app/api/(pos)/_lib/errors"
import { parseJsonBodyOrResponse } from "@/app/api/(pos)/_lib/request"
import { parsePosSalesBody, validatePosSalesBody } from "@/app/api/(pos)/_lib/validators"
import { logPosAudit } from "@/app/api/(pos)/_service/pos-audit-log-service"
import { ensurePosIdempotencyKey, runPosIdempotent } from "@/app/api/(pos)/_service/pos-idempotency-service"
import { consumePosSalesRateLimit, getPosClientIp } from "@/app/api/(pos)/_service/pos-rate-limit-service"
import {
  createPosSale,
  validateCreatePosSaleInput,
} from "@/app/api/(pos)/_service/pos-sales-service"

export async function handlePosSalesPost(request: Request) {
  const guard = requirePosWriteGuard(request)
  if (!guard.ok) return guard.response

  const clientIp = getPosClientIp(request)

  const idempotency = ensurePosIdempotencyKey(request)
  if (!idempotency.ok) {
    logPosAudit({
      event: "POS_SALES_POST",
      status: "FAILED",
      actorUserId: guard.data.user.id,
      actorRole: guard.data.user.role,
      clientIp,
      message: "missing-or-invalid-idempotency-key",
    })
    return idempotency.response
  }

  const limited = consumePosSalesRateLimit({
    scope: "POS_SALES_POST",
    clientIp,
    actorUserId: guard.data.user.id,
    actorRole: guard.data.user.role,
    branch: guard.data.user.branch,
  })
  if (!limited.ok) {
    logPosAudit({
      event: "POS_SALES_POST",
      status: "FAILED",
      actorUserId: guard.data.user.id,
      actorRole: guard.data.user.role,
      idempotencyKey: idempotency.key,
      clientIp,
      message: "rate-limit-exceeded",
    })
    return NextResponse.json(
      {
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Terlalu banyak request checkout POS. Coba lagi sebentar.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSec),
          "Cache-Control": "no-store",
        },
      }
    )
  }

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) {
    logPosAudit({
      event: "POS_SALES_POST",
      status: "FAILED",
      actorUserId: guard.data.user.id,
      actorRole: guard.data.user.role,
      idempotencyKey: idempotency.key,
      clientIp,
      message: "invalid-json-payload",
    })
    return rawBody.response
  }

  const parsed = parsePosSalesBody(rawBody.data)
  if (!parsed.ok) {
    logPosAudit({
      event: "POS_SALES_POST",
      status: "FAILED",
      actorUserId: guard.data.user.id,
      actorRole: guard.data.user.role,
      idempotencyKey: idempotency.key,
      clientIp,
      message: `invalid-payload:${parsed.error}`,
    })
    return jsonError({ code: "BAD_REQUEST", message: parsed.error, status: 400 })
  }

  const body = parsed.data
  const branch = getCentralBranchId()

  const shapeValid = validatePosSalesBody(body)
  if (!shapeValid.ok) {
    logPosAudit({
      event: "POS_SALES_POST",
      status: "FAILED",
      branch,
      actorUserId: guard.data.user.id,
      actorRole: guard.data.user.role,
      idempotencyKey: idempotency.key,
      clientIp,
      message: `validation:${shapeValid.error}`,
    })
    return jsonError({ code: "BAD_REQUEST", message: shapeValid.error, status: 400 })
  }

  const forbidden = ensurePosBranchAccess(guard, branch)
  if (forbidden) return forbidden

  const domainValid = validateCreatePosSaleInput({
    branch,
    postedBy: guard.data.user.name,
    warehouseId: body.warehouseId,
    salespersonName: body.salespersonName,
    paymentStatus: body.paymentStatus,
    paidAmount: body.paidAmount,
    dueDate: body.dueDate,
    orderDiscount: body.orderDiscount,
    customerName: body.customerName,
    customerAddress: body.customerAddress,
    customerPhone: body.customerPhone,
    items: body.items,
  })

  if (!domainValid.ok) {
    logPosAudit({
      event: "POS_SALES_POST",
      status: "FAILED",
      branch,
      actorUserId: guard.data.user.id,
      actorRole: guard.data.user.role,
      idempotencyKey: idempotency.key,
      clientIp,
      message: `validation:${domainValid.error}`,
    })
    return jsonError({ code: "BAD_REQUEST", message: domainValid.error, status: 400 })
  }

  const fingerprint = JSON.stringify({
    branch,
    actorUserId: guard.data.user.id,
    actorRole: guard.data.user.role,
    warehouseId: body.warehouseId,
    salespersonName: body.salespersonName,
    paymentStatus: body.paymentStatus,
    paidAmount: body.paidAmount,
    dueDate: body.dueDate,
    orderDiscount: body.orderDiscount,
    customerName: body.customerName,
    customerAddress: body.customerAddress,
    customerPhone: body.customerPhone,
    items: body.items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      priceTier: item.priceTier,
      warehouseId: item.warehouseId,
    })),
  })

  return runPosIdempotent({
    scope: "POS_SALES_POST",
    key: idempotency.key,
    fingerprint,
    namespace: {
      branch,
      actorUserId: guard.data.user.id,
      actorRole: guard.data.user.role,
      clientIp,
    },
    run: async () => {
      try {
        // TODO: Delegate stock deduction to Express API.
        const result = createPosSale({
          branch,
          postedBy: guard.data.user.name,
          salespersonName: body.salespersonName,
          warehouseId: body.warehouseId,
          paymentStatus: body.paymentStatus,
          paidAmount: body.paidAmount,
          dueDate: body.dueDate,
          orderDiscount: body.orderDiscount,
          customerName: body.customerName,
          customerAddress: body.customerAddress,
          customerPhone: body.customerPhone,
          items: body.items,
        })

        logPosAudit({
          event: "POS_SALES_POST",
          status: "SUCCESS",
          branch,
          saleId: result.doc.id,
          actorUserId: guard.data.user.id,
          actorRole: guard.data.user.role,
          idempotencyKey: idempotency.key,
          clientIp,
        })

        return NextResponse.json(
          { doc: result.doc, newEntries: result.newEntries, computed: result.computed },
          {
            status: 201,
            headers: { "Cache-Control": "no-store" },
          }
        )
      } catch (err: unknown) {
        logPosAudit({
          event: "POS_SALES_POST",
          status: "FAILED",
          branch,
          actorUserId: guard.data.user.id,
          actorRole: guard.data.user.role,
          idempotencyKey: idempotency.key,
          clientIp,
          message: err instanceof Error ? err.message : "unknown-error",
        })
        return mapPosSalesRouteError(err, "Failed to post sale")
      }
    },
  })
}
