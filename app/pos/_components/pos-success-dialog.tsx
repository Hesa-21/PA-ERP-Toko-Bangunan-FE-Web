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
import { CreditCard, ShoppingCart } from "lucide-react"

type PosSuccessDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId?: string
  onGoToSales: () => void
}

export function PosSuccessDialog({ open, onOpenChange, saleId, onGoToSales }: PosSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaksi Berhasil</DialogTitle>
          <DialogDescription>Transaksi {saleId} telah berhasil disimpan di penjualan.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-center p-4 bg-green-50 rounded-full w-16 h-16 mx-auto">
            <CreditCard className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Klik &quot;Tutup&quot; untuk melanjutkan transaksi atau &quot;Penjualan&quot; untuk cetak struk transaksi.
          </p>
        </div>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button onClick={onGoToSales}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Penjualan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
