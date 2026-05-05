import { Download, RotateCcw } from "lucide-react"
import {
  canEnableExport,
} from "@/app/reports/sales/_lib/sales-report-ui-contract"
import type { SalesReportExportActionProps } from "@/app/reports/sales/_lib/sales-report-ui-types"
import { Button } from "@/components/ui/button"

export function SalesReportExportAction(props: SalesReportExportActionProps) {
  const exportEnabled = canEnableExport(props.state, props.filters) && !props.isExporting && !props.disabled
  const hintId = "sales-report-export-hint"

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={!exportEnabled}
          title={exportEnabled ? undefined : "Export aktif jika state ready dan rentang periode valid"}
          aria-describedby={!exportEnabled ? hintId : undefined}
          onClick={props.onExport}
        >
          <Download className="mr-2 h-4 w-4" />
          {props.isExporting ? "Mengekspor..." : "Export Laporan"}
        </Button>
        <Button variant="ghost" aria-label="Reset semua filter laporan" onClick={props.onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Filter
        </Button>
      </div>
      {props.error ? <p className="text-xs text-destructive">{props.error}</p> : null}
      <p id={hintId} className="sr-only">
        Tombol export akan aktif jika state halaman ready dan rentang periode valid.
      </p>
    </div>
  )
}
