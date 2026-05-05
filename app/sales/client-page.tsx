"use client"

import Link from "next/link"
import { Calculator, ShoppingCart } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { PermissionGate } from "@/components/permission-gate"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { CancelSaleDialog } from "@/app/sales/_components/cancel-sale-dialog"
import { SalesFiltersBar } from "@/app/sales/_components/sales-filters-bar"
import { SalesTable } from "@/app/sales/_components/sales-table"
import { ViewSaleDialog } from "@/app/sales/_components/view-sale-dialog"
import { useSalesController } from "@/app/sales/_hooks/use-sales-controller"

export default function SalesClientPage() {
  const { data, filters, actions } = useSalesController()

  const {
    rows,
    total,
    resolvedPage,
    totalPages,
    listLoading,
    listError,
    filterError,
    exportDisabled,
    isExporting,
    exportError,
    isCRUD,
    isDeleteOpen,
    isCancelling,
    cancelError,
    isViewOpen,
    viewSaleId,
    viewDoc,
    viewError,
    isViewLoading,
  } = data

  const { searchTerm, statusFilter, dateFrom, dateTo } = filters

  const {
    setIsDeleteOpen,
    setPage,
    handleSearchChange,
    handleStatusChange,
    handleFromChange,
    handleToChange,
    reloadList,
    handleExport,
    openView,
    handlePrint,
    handlePrintNoPrice,
    handleCancel,
    selectForCancel,
    getStatusBadge,
    getStatusLabel,
    setIsViewOpen,
  } = actions

  return (
    <PermissionGate module="sales">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="h-4" />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Penjualan (Monitoring)
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button asChild size="sm">
                      <Link href="/pos">
                        <Calculator className="h-4 w-4 mr-2" />
                        Buat Transaksi (POS)
                      </Link>
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Transaksi baru dibuat saat checkout di Kasir (POS). Halaman ini untuk monitoring/administrasi: lihat riwayat, cetak nota,
                  dan batalkan (VOID).
                </p>

                <SalesFiltersBar
                  searchTerm={searchTerm}
                  onSearchTermChange={handleSearchChange}
                  statusFilter={statusFilter}
                  onStatusFilterChange={handleStatusChange}
                  dateFrom={dateFrom}
                  onDateFromChange={handleFromChange}
                  dateTo={dateTo}
                  onDateToChange={handleToChange}
                  onExport={handleExport}
                  exportDisabled={exportDisabled}
                  isExporting={isExporting}
                  exportError={exportError}
                />
              </CardHeader>

              <CardContent>
                {filterError && (
                  <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {filterError}
                  </div>
                )}

                {listError && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <div>{listError}</div>
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={reloadList}>
                        Coba lagi
                      </Button>
                    </div>
                  </div>
                )}

                {listLoading && <div className="mb-3 text-sm text-muted-foreground">Memuat data penjualan...</div>}

                <SalesTable
                  rows={rows}
                  isCRUD={isCRUD}
                  getStatusBadge={getStatusBadge}
                  getStatusLabel={getStatusLabel}
                  onView={(saleId) => void openView(saleId)}
                  onPrint={(saleId) => void handlePrint(saleId)}
                  onPrintNoPrice={(saleId) => void handlePrintNoPrice(saleId)}
                  onCancel={selectForCancel}
                />

                {(() => {
                  const canPrev = resolvedPage > 1
                  const canNext = resolvedPage < totalPages

                  return (
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="text-sm text-gray-500">
                        Halaman {resolvedPage} dari {totalPages} · Total {total.toLocaleString()} data
                      </div>
                      <Pagination className="justify-end">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              className={!canPrev || listLoading ? "pointer-events-none opacity-50" : undefined}
                              onClick={(e) => {
                                e.preventDefault()
                                if (!canPrev || listLoading) return
                                setPage((p) => Math.max(1, p - 1))
                              }}
                            />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              className={!canNext || listLoading ? "pointer-events-none opacity-50" : undefined}
                              onClick={(e) => {
                                e.preventDefault()
                                if (!canNext || listLoading) return
                                setPage((p) => p + 1)
                              }}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <ViewSaleDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        viewSaleId={viewSaleId}
        isViewLoading={isViewLoading}
        viewError={viewError}
        viewDoc={viewDoc}
      />

      <CancelSaleDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        isCRUD={isCRUD}
        isCancelling={isCancelling}
        cancelError={cancelError}
        onConfirm={() => void handleCancel()}
      />
    </PermissionGate>
  )
}
