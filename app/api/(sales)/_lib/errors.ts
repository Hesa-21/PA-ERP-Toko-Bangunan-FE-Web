import { jsonError } from "@/lib/http/response"

export function mapSalesRouteError(err: unknown, fallbackMessage: string) {
  if (err instanceof Error) {
    if (err.message === "BRANCH_NOT_FOUND") {
      return jsonError({ code: "NOT_FOUND", message: "Branch not found", status: 404 })
    }
    if (err.message === "SALE_NOT_FOUND") {
      return jsonError({ code: "NOT_FOUND", message: "Sale not found", status: 404 })
    }
    if (err.message === "INVALID_SALE_ID") {
      return jsonError({ code: "BAD_REQUEST", message: "saleId invalid", status: 400 })
    }
    if (err.message === "SALE_VOIDED") {
      return jsonError({ code: "CONFLICT", message: "Transaksi sudah dibatalkan.", status: 409 })
    }
    if (err.message === "VOID_FORBIDDEN_FOR_ROLE") {
      return jsonError({
        code: "FORBIDDEN",
        message: "Void transaksi POSTED hanya boleh oleh Super Admin.",
        status: 403,
      })
    }
    if (err.message === "VOID_POSTED_CUTOFF") {
      return jsonError({
        code: "CONFLICT",
        message:
          "Transaksi POSTED hanya bisa dibatalkan sebelum end-of-day (hari yang sama). Setelah EOD, gunakan Retur Customer atau Koreksi Selisih di Gudang.",
        status: 409,
      })
    }
  }

  return jsonError({ code: "INTERNAL", message: fallbackMessage, status: 500 })
}
