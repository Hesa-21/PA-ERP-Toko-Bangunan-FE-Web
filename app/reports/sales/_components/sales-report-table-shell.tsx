import { Table2 } from "lucide-react"
import type { SalesReportTableShellProps } from "@/app/reports/sales/_lib/sales-report-ui-types"
import { SALES_REPORT_VIEW_CONFIG } from "@/app/reports/sales/_lib/sales-report-view-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SalesReportEmptyState } from "@/app/reports/sales/_components/sales-report-empty-state"

export function SalesReportTableShell(props: SalesReportTableShellProps) {
  const viewConfig = SALES_REPORT_VIEW_CONFIG[props.view]
  const columns = viewConfig.tableColumns
  const tableRegionLabel = `Tabel laporan penjualan ${viewConfig.shortLabel}`
  const isReady = props.ready === true
  const isLoading = props.isLoading === true
  const hasRows = props.rows.length > 0
  const emptyTitle = isReady || props.hasApplied ? "Tidak ada data pada filter ini" : "Belum ada data"
  const emptyDescription = isReady || props.hasApplied
    ? "Ubah filter atau tab, lalu klik Apply lagi."
    : "Pilih periode lalu klik Apply."

  const canPrev = props.page > 1
  const canNext = props.page < props.totalPages

  const renderRowCells = (index: number) => {
    const row = props.rows[index]
    if (!row) return null

    if (props.view === "period") {
      return (
        <>
          <TableCell>{row.invoiceNo}</TableCell>
          <TableCell>{row.transactionDateText}</TableCell>
          <TableCell>{row.customerName}</TableCell>
          <TableCell>{row.supplierName}</TableCell>
          <TableCell>{row.paymentTypeText}</TableCell>
          <TableCell>{row.totalAmountText}</TableCell>
          <TableCell>{row.paidAmountText}</TableCell>
          <TableCell>{row.remainingAmountText}</TableCell>
        </>
      )
    }

    if (props.view === "customer") {
      return (
        <>
          <TableCell>{row.customerName}</TableCell>
          <TableCell>{row.invoiceNo}</TableCell>
          <TableCell>{row.transactionDateText}</TableCell>
          <TableCell>{row.supplierName}</TableCell>
          <TableCell>{row.paymentTypeText}</TableCell>
          <TableCell>{row.totalAmountText}</TableCell>
          <TableCell>{row.remainingAmountText}</TableCell>
        </>
      )
    }

    return (
      <>
        <TableCell>{row.supplierName}</TableCell>
        <TableCell>{row.invoiceNo}</TableCell>
        <TableCell>{row.transactionDateText}</TableCell>
        <TableCell>{row.customerName}</TableCell>
        <TableCell>{row.paymentTypeText}</TableCell>
        <TableCell>{row.totalAmountText}</TableCell>
        <TableCell>{row.remainingAmountText}</TableCell>
      </>
    )
  }

  return (
    <Card aria-label={tableRegionLabel}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Table2 className="h-4 w-4" />
          {viewConfig.title}
        </CardTitle>
        <CardDescription className="text-xs">Tampilan utama data transaksi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.isRefreshing ? (
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            Memperbarui data...
          </p>
        ) : null}

        <div className="rounded-md border" role="region" aria-label={tableRegionLabel}>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap text-[11px] uppercase tracking-wide">{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <SalesReportEmptyState compact title="Memuat data..." description="Menyiapkan data laporan penjualan." />
                  </TableCell>
                </TableRow>
              ) : props.error ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <div className="space-y-3">
                      <SalesReportEmptyState compact title="Gagal memuat data" description={props.error} />
                      {props.onRetry ? (
                        <div className="flex justify-center">
                          <Button variant="outline" size="sm" onClick={props.onRetry}>
                            Coba Lagi
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : hasRows ? (
                props.rows.map((row, index) => (
                  <TableRow key={`${row.invoiceNo}-${index}`}>
                    {renderRowCells(index)}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <SalesReportEmptyState
                      compact
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Halaman {props.page} dari {props.totalPages} · Total {props.total.toLocaleString()} data</p>
          <Pagination className="justify-end" aria-label={`Pagination ${tableRegionLabel}`}>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={!canPrev ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault()
                    if (!canPrev) return
                    props.onPageChange?.(props.page - 1)
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={!canNext ? "pointer-events-none opacity-50" : undefined}
                  onClick={(event) => {
                    event.preventDefault()
                    if (!canNext) return
                    props.onPageChange?.(props.page + 1)
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  )
}
