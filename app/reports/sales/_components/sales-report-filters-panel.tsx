import { Filter } from "lucide-react"
import type { SalesReportFilterModel, SalesPaymentType } from "@/app/reports/sales/_lib/sales-report-ui-contract"
import type { SalesReportFiltersPanelProps } from "@/app/reports/sales/_lib/sales-report-ui-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const PAYMENT_OPTIONS: ReadonlyArray<{ value: SalesPaymentType; label: string }> = [
  { value: "all", label: "Semua Pembayaran" },
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Kredit" },
] as const

export function SalesReportFiltersPanel(props: SalesReportFiltersPanelProps) {
  const update = (patch: Partial<SalesReportFilterModel>) => props.onChange({ ...props.value, ...patch })
  const isApplying = props.isApplying === true

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    props.onApply?.()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="h-4 w-4" />
          Filter Laporan
        </CardTitle>
        <CardDescription>
          Gunakan filter inti untuk membatasi data laporan sebelum ditampilkan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} aria-label="Sales report filters form">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="periodFrom">Periode Dari</Label>
              <Input
                id="periodFrom"
                type="date"
                value={props.value.periodFrom}
                onChange={(event) => update({ periodFrom: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="periodTo">Periode Sampai</Label>
              <Input
                id="periodTo"
                type="date"
                value={props.value.periodTo}
                onChange={(event) => update({ periodTo: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentType">Pembayaran</Label>
              <Select value={props.value.paymentType} onValueChange={(value) => update({ paymentType: value as SalesPaymentType })}>
                <SelectTrigger id="paymentType">
                  <SelectValue placeholder="Pilih pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isApplying}>
              {isApplying ? "Memuat..." : "Terapkan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
