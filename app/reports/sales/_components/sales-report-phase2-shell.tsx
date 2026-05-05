"use client"

import { AlertCircle, Info, LayoutGrid, Loader2 } from "lucide-react"
import type { SalesReportFilterModel, SalesReportUiState, SalesReportViewKey } from "@/app/reports/sales/_lib/sales-report-ui-contract"
import { SalesReportExportAction } from "@/app/reports/sales/_components/sales-report-export-action"
import { SalesReportFiltersPanel } from "@/app/reports/sales/_components/sales-report-filters-panel"
import { SalesReportTableShell } from "@/app/reports/sales/_components/sales-report-table-shell"
import { SalesReportViewTabs } from "@/app/reports/sales/_components/sales-report-view-tabs"
import { useSalesReportController } from "@/app/reports/sales/_hooks/use-sales-report-controller"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function HeaderContextSlot() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <LayoutGrid className="h-5 w-5" />
              Laporan Penjualan
            </CardTitle>
            <CardDescription>
              Fokus utama: atur filter, lihat data, lalu ekspor.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

function SalesReportStateBanner(props: {
  state: SalesReportUiState
  isRefreshing: boolean
  error?: string
  onRetry: () => void
}) {
  if (props.state === "initial") {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Siap menampilkan laporan</AlertTitle>
        <AlertDescription>Pilih rentang periode, lalu klik Terapkan untuk memuat data.</AlertDescription>
      </Alert>
    )
  }

  if (props.state === "loading") {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Memuat data laporan</AlertTitle>
        <AlertDescription>Mohon tunggu, data sedang diambil dari server.</AlertDescription>
      </Alert>
    )
  }

  if (props.state === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Terjadi kendala saat memproses laporan</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{props.error || "Silakan coba lagi."}</p>
          <Button variant="outline" size="sm" onClick={props.onRetry}>
            Coba Lagi
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (props.isRefreshing) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Memperbarui data</AlertTitle>
        <AlertDescription>Data sedang disinkronkan sesuai tab atau halaman terbaru.</AlertDescription>
      </Alert>
    )
  }

  return null
}

function TabsSlot(props: {
  activeView: SalesReportViewKey
  onViewChange: (view: SalesReportViewKey) => void
  state: SalesReportUiState
  filters: SalesReportFilterModel
  rows: import("@/app/reports/sales/_lib/sales-report-models").SalesReportRowModel[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  isRefreshing: boolean
  error?: string
  exportError?: string
  hasApplied: boolean
  isExporting: boolean
  onPageChange: (nextPage: number) => void
  onExport: () => Promise<void>
  onRetry: () => Promise<void>
  onReset: () => void
}) {
  return (
    <Card className="space-y-0">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Hasil Laporan</CardTitle>
            <CardDescription>
              Pilih tab sesuai perspektif analisis.
            </CardDescription>
          </div>
          <SalesReportExportAction
            state={props.state}
            filters={props.filters}
            disabled={props.state === "loading"}
            isExporting={props.isExporting}
            error={props.exportError}
            onExport={() => void props.onExport()}
            onReset={props.onReset}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <SalesReportStateBanner
          state={props.state}
          isRefreshing={props.isRefreshing}
          error={props.error}
          onRetry={() => void props.onRetry()}
        />

        <SalesReportViewTabs
          currentView={props.activeView}
          disabled={props.state === "loading"}
          onViewChange={props.onViewChange}
          renderView={(view) => {
            return (
              <SalesReportTableShell
                view={view}
                rows={props.rows}
                total={props.total}
                page={props.page}
                totalPages={props.totalPages}
                isLoading={props.isLoading}
                isRefreshing={props.isRefreshing}
                error={props.error}
                hasApplied={props.hasApplied}
                onPageChange={props.onPageChange}
                onRetry={() => void props.onRetry()}
                ready={props.state === "ready"}
              />
            )
          }}
        />
      </CardContent>
    </Card>
  )
}

export function SalesReportPhase2Shell() {
  const { data, filters, actions } = useSalesReportController()

  return (
    <section className="space-y-3" aria-label="Sales report main scaffold">
      <HeaderContextSlot />

      <SalesReportFiltersPanel
        value={filters.draft}
        onChange={actions.setFilters}
        isApplying={data.isLoading}
        onApply={() => void actions.applyFilters()}
      />
      <TabsSlot
        activeView={filters.activeView}
        onViewChange={actions.setView}
        state={data.uiState}
        filters={filters.applied}
        rows={data.rows}
        total={data.total}
        page={data.page}
        totalPages={data.totalPages}
        isLoading={data.isLoading}
        isRefreshing={data.isRefreshing}
        error={data.error}
        exportError={data.exportError}
        hasApplied={data.hasApplied}
        isExporting={data.isExporting}
        onPageChange={actions.setPage}
        onExport={actions.exportReport}
        onRetry={actions.refetch}
        onReset={actions.resetFilters}
      />
    </section>
  )
}
