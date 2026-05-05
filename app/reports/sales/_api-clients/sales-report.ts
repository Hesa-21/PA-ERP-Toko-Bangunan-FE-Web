import { ApiRequestError, apiFetchJson, readApiErrorMessage } from "@/lib/client/http"
import {
  buildSalesReportQueryParams,
  normalizeSalesReportListQuery,
  validateSalesReportListQuery,
  type SalesReportExportQuery,
  type SalesReportExportResult,
  type SalesReportListQuery,
} from "@/app/reports/sales/_lib/sales-report-front-contract"
import {
  parseSalesReportListResponseDto,
  type SalesReportListResponseDto,
} from "@/app/reports/sales/_api-clients/sales-report.types"

function filenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null
  const match = value.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i)
  const raw = match?.[1] || match?.[2] || match?.[3]
  if (!raw) return null
  try {
    return decodeURIComponent(raw.trim())
  } catch {
    return raw.trim()
  }
}

function toApiClientError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof ApiRequestError) return error

  if (error instanceof DOMException && error.name === "AbortError") {
    return new Error("Permintaan dibatalkan.")
  }

  if (error instanceof Error) return error

  return new Error(fallbackMessage)
}

export async function listSalesReport(
  input: SalesReportListQuery,
  options?: { signal?: AbortSignal }
): Promise<SalesReportListResponseDto> {
  const normalized = normalizeSalesReportListQuery(input)
  const contractErrors = validateSalesReportListQuery(normalized)

  if (contractErrors.length > 0) {
    throw new Error(`Query laporan tidak valid: ${contractErrors.join("; ")}`)
  }

  const params = buildSalesReportQueryParams(normalized)

  try {
    const raw = await apiFetchJson<unknown>(
      `/api/reports/sales?${params.toString()}`,
      { method: "GET", signal: options?.signal },
      { defaultErrorMessage: "Gagal memuat laporan penjualan" }
    )

    return parseSalesReportListResponseDto(raw, {
      page: normalized.page ?? 1,
      limit: normalized.limit ?? 20,
    })
  } catch (error) {
    throw toApiClientError(error, "Gagal memuat laporan penjualan")
  }
}

export async function exportSalesReport(
  input: SalesReportExportQuery,
  options?: { signal?: AbortSignal }
): Promise<SalesReportExportResult> {
  const listShape: SalesReportListQuery = {
    branchId: input.branchId,
    from: input.from,
    to: input.to,
    paymentType: input.paymentType,
    view: input.view,
  }

  const contractErrors = validateSalesReportListQuery(listShape)
  if (contractErrors.length > 0) {
    throw new Error(`Query export tidak valid: ${contractErrors.join("; ")}`)
  }

  const params = buildSalesReportQueryParams(listShape)

  try {
    const res = await fetch(`/api/reports/sales/export?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: options?.signal,
      headers: {
        Accept: "text/csv,application/octet-stream,*/*",
      },
    })

    if (!res.ok) {
      const rawData = await res
        .json()
        .catch(async () => ({ message: await res.text().catch(() => "") }))

      const message =
        readApiErrorMessage(rawData) ||
        (typeof (rawData as { message?: unknown })?.message === "string"
          ? String((rawData as { message?: unknown }).message)
          : "") ||
        `Gagal ekspor laporan penjualan (HTTP ${res.status}).`

      throw new ApiRequestError(message, {
        status: res.status,
        data: rawData,
      })
    }

    const blob = await res.blob()
    const date = new Date().toISOString().slice(0, 10)
    const filename =
      filenameFromContentDisposition(res.headers.get("content-disposition")) ||
      (input.branchCode
        ? `laporan_penjualan_${input.branchCode}_${date}.csv`
        : `laporan_penjualan_${date}.csv`)

    return { blob, filename }
  } catch (error) {
    throw toApiClientError(error, "Gagal ekspor laporan penjualan")
  }
}
