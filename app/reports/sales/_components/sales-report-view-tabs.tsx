"use client"

import { CalendarRange, Users, Warehouse } from "lucide-react"
import type { SalesReportViewKey } from "@/app/reports/sales/_lib/sales-report-ui-contract"
import type { SalesReportViewTabsProps } from "@/app/reports/sales/_lib/sales-report-ui-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const VIEW_META: ReadonlyArray<{ key: SalesReportViewKey; label: string; icon: typeof CalendarRange }> = [
  { key: "period", label: "Periode", icon: CalendarRange },
  { key: "customer", label: "Customer", icon: Users },
  { key: "supplier", label: "Supplier", icon: Warehouse },
] as const

export function SalesReportViewTabs(props: SalesReportViewTabsProps) {
  const activeValue = props.currentView ?? props.defaultView ?? "period"

  return (
    <Tabs
      value={activeValue}
      onValueChange={(value) => props.onViewChange?.(value as SalesReportViewKey)}
      className="w-full"
      aria-label="Sales report views"
    >
      <div className="overflow-x-auto pb-1">
        <TabsList className="inline-flex h-10 w-max min-w-full items-center justify-start gap-2 rounded-md bg-muted p-1 sm:grid sm:w-full sm:grid-cols-3 sm:justify-center sm:gap-0">
          {VIEW_META.map((view) => {
            const Icon = view.icon
            return (
              <TabsTrigger
                key={view.key}
                value={view.key}
                className="gap-2 whitespace-nowrap"
                aria-label={`Tampilkan laporan ${view.label}`}
                disabled={props.disabled}
              >
                <Icon className="h-4 w-4" />
                {view.label}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>

      {VIEW_META.map((view) => (
        <TabsContent key={view.key} value={view.key} className="mt-4 space-y-4">
          {props.renderView(view.key)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
