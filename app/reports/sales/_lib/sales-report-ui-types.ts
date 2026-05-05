import type { ReactNode } from "react"
import type {
  SalesReportFilterModel,
  SalesReportUiState,
  SalesReportViewKey,
} from "@/app/reports/sales/_lib/sales-report-ui-contract"
import type { SalesReportRowModel } from "@/app/reports/sales/_lib/sales-report-models"

export interface SalesReportEmptyStateProps {
  title: string
  description: string
  compact?: boolean
}

export interface SalesReportFiltersPanelProps {
  value: SalesReportFilterModel
  onChange: (next: SalesReportFilterModel) => void
  isApplying?: boolean
  onApply?: () => void
}

export interface SalesReportViewTabsProps {
  defaultView?: SalesReportViewKey
  currentView?: SalesReportViewKey
  disabled?: boolean
  onViewChange?: (view: SalesReportViewKey) => void
  renderView: (view: SalesReportViewKey) => ReactNode
}

export interface SalesReportTableShellProps {
  view: SalesReportViewKey
  rows: SalesReportRowModel[]
  total: number
  page: number
  totalPages: number
  isLoading?: boolean
  isRefreshing?: boolean
  error?: string
  hasApplied?: boolean
  onPageChange?: (nextPage: number) => void
  onRetry?: () => void
  ready?: boolean
}

export interface SalesReportExportActionProps {
  state: SalesReportUiState
  filters: SalesReportFilterModel
  disabled?: boolean
  isExporting?: boolean
  error?: string
  onExport?: () => void
  onReset?: () => void
}
