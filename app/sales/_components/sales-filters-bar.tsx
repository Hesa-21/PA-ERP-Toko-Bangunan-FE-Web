import { FileText, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SalesFiltersBar(props: {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  onExport: () => void
  exportDisabled: boolean
  isExporting: boolean
  exportError: string
}) {
  return (
    <div className="flex flex-wrap gap-4 mt-4 items-end">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Cari transaksi atau pelanggan..."
            value={props.searchTerm}
            onChange={(e) => props.onSearchTermChange(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Status Penjualan</span>
        <Select value={props.statusFilter} onValueChange={props.onStatusFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="Paid">Lunas</SelectItem>
            <SelectItem value="Pending">Belum Lunas</SelectItem>
            <SelectItem value="Cancelled">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Dari</span>
        <Input type="date" value={props.dateFrom} onChange={(e) => props.onDateFromChange(e.target.value)} className="w-44" />
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Sampai</span>
        <Input type="date" value={props.dateTo} onChange={(e) => props.onDateToChange(e.target.value)} className="w-44" />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-44 h-10"
        onClick={props.onExport}
        disabled={props.exportDisabled || props.isExporting}
        title={props.exportDisabled ? "Pilih tanggal terlebih dahulu" : undefined}
      >
        <FileText className="h-4 w-4 mr-2" />
        {props.isExporting ? "Mengekspor..." : "Ekspor"}
      </Button>

      {props.exportError && <div className="w-full text-xs text-red-600">{props.exportError}</div>}
    </div>
  )
}
