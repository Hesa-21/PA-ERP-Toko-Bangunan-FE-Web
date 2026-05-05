"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { normalizeSalesPayment } from "@/lib/domain"
import { getSalesDocStatusLabel, toDateString } from "@/app/sales/_lib/sales-utils"
import type { SalesDetailDto } from "@/app/sales/_api-clients/sales"

type SalesDoc = SalesDetailDto["doc"]

export function ViewSaleDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  viewSaleId: string
  isViewLoading: boolean
  viewError: string
  viewDoc: SalesDoc | null
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="w-[92vw] max-w-3xl h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Detail Penjualan</DialogTitle>
          <DialogDescription>{props.viewSaleId || "-"}</DialogDescription>
        </DialogHeader>

        {props.isViewLoading && <div className="text-sm text-muted-foreground">Memuat...</div>}
        {props.viewError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{props.viewError}</div>
        )}

        {props.viewDoc && (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Status Dokumen</div>
                  <div className="font-medium">{getSalesDocStatusLabel(props.viewDoc.status)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pembayaran</div>
                  <div className="font-medium">
                    {props.viewDoc.paymentStatus === "tempo" ? "Tempo" : "Tunai"}
                    {props.viewDoc.paymentStatus === "tempo" && props.viewDoc.dueDate
                      ? ` (Jatuh tempo ${toDateString(props.viewDoc.dueDate)})`
                      : ""}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pelanggan</div>
                  <div className="font-medium">{props.viewDoc.customerName || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Telepon</div>
                  <div className="font-medium">{props.viewDoc.customerPhone || "-"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">Alamat</div>
                  <div className="font-medium break-words">{props.viewDoc.customerAddress || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tenaga Penjual</div>
                  <div className="font-medium">{props.viewDoc.salespersonName || "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Dibuat / Diposting</div>
                  <div className="font-medium">
                    {toDateString(props.viewDoc.createdAt)} / {props.viewDoc.postedAt ? toDateString(props.viewDoc.postedAt) : "-"}
                  </div>
                </div>
              </div>

              <div className="rounded-md border max-h-[38vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-right">Harga/Unit</TableHead>
                      <TableHead className="text-right">Diskon</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {props.viewDoc.items.map((it, idx) => {
                      const qty = Math.max(0, Math.trunc(Number(it.quantity) || 0))
                      const unitPrice = Math.max(0, Number(it.unitPrice) || 0)
                      const discount = Math.max(0, Math.min(Number(it.discount) || 0, unitPrice))
                      const subtotal = Math.max(0, unitPrice - discount) * qty
                      return (
                        <TableRow key={`${it.sku}-${idx}`}>
                          <TableCell className="font-medium">{it.sku}</TableCell>
                          <TableCell>{it.name}</TableCell>
                          <TableCell className="text-right">{qty}</TableCell>
                          <TableCell className="text-right">{unitPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{discount.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{subtotal.toLocaleString()}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-2 text-sm">
                {(() => {
                  const subtotal = props.viewDoc.items.reduce((sum, it) => {
                    const qty = Math.max(0, Math.trunc(Number(it.quantity) || 0))
                    const unitPrice = Math.max(0, Number(it.unitPrice) || 0)
                    const discount = Math.max(0, Math.min(Number(it.discount) || 0, unitPrice))
                    return sum + (unitPrice - discount) * qty
                  }, 0)
                  const orderDiscount = Math.max(0, Number(props.viewDoc.orderDiscount || 0) || 0)
                  const total = Math.max(0, subtotal - orderDiscount)
                  const paid = Math.max(0, Number(props.viewDoc.paidAmount || 0) || 0)
                  const { paidAmount, remaining } = normalizeSalesPayment({ total, paidAmountInput: paid })
                  return (
                    <>
                      <div className="flex items-center justify-end gap-2">
                        <div className="text-muted-foreground">Total:</div>
                        <div className="font-semibold">Rp {total.toLocaleString()}</div>
                      </div>
                      {props.viewDoc.paymentStatus === "tempo" && (
                        <div className="flex items-center justify-end gap-4">
                          <div className="text-muted-foreground">Dibayar:</div>
                          <div className="font-medium">Rp {paidAmount.toLocaleString()}</div>
                          <div className="text-muted-foreground">Sisa:</div>
                          <div className="font-medium">Rp {remaining.toLocaleString()}</div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}