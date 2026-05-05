import { Inbox } from "lucide-react"
import type { SalesReportEmptyStateProps } from "@/app/reports/sales/_lib/sales-report-ui-types"

export function SalesReportEmptyState(props: SalesReportEmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={props.compact ? "py-6 text-center" : "py-10 text-center"}
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border bg-muted/50">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{props.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
    </div>
  )
}
