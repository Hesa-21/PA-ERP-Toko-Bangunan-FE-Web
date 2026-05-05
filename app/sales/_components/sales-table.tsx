import { Eye, Printer, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SalesListItemDto, SalesStatusUi } from "@/app/sales/_api-clients/sales"

export function SalesTable(props: {
  rows: SalesListItemDto[]
  isCRUD: boolean
  getStatusBadge: (status: SalesStatusUi) => string
  getStatusLabel: (status: SalesStatusUi) => string
  onView: (saleId: string) => void
  onPrint: (saleId: string) => void
  onPrintNoPrice: (saleId: string) => void
  onCancel: (saleId: string) => void
}) {
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>No. Telepon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Tenaga Penjual</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.rows.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.id}</TableCell>
                <TableCell>{sale.date}</TableCell>
                <TableCell>{sale.customer}</TableCell>
                <TableCell>{sale.items} produk</TableCell>
                <TableCell>{sale.customerPhone ?? "-"}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${props.getStatusBadge(
                      sale.status
                    )}`}
                  >
                    {props.getStatusLabel(sale.status)}
                  </span>
                </TableCell>
                <TableCell>Rp {sale.total.toLocaleString()}</TableCell>
                <TableCell>{sale.dueDate !== "-" ? sale.dueDate : <span className="text-gray-400">-</span>}</TableCell>
                <TableCell>{sale.salesperson}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => props.onView(sale.id)}>
                      <Eye className="h-3 w-3 mr-1" />
                      Lihat
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => props.onPrint(sale.id)}>
                      <Printer className="h-3 w-3 mr-1" />
                      Cetak
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => props.onPrintNoPrice(sale.id)}>
                      <Printer className="h-3 w-3 mr-1" />
                      Cetak (Tanpa Harga)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!props.isCRUD || sale.status === "Cancelled"}
                      title={!props.isCRUD ? "Hanya baca" : sale.status === "Cancelled" ? "Transaksi sudah dibatalkan" : undefined}
                      onClick={() => props.onCancel(sale.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Batalkan
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {props.rows.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Tidak ada data yang sesuai dengan filter. Untuk membuat transaksi baru, gunakan Kasir (POS).
        </div>
      )}
    </>
  )
}
