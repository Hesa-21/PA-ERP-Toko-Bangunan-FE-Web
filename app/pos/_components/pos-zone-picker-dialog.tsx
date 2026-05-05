"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ZonePickOption = {
  zoneId: string
  zoneName: string
  qty: number
}

type PosZonePickerDialogProps = {
  open: boolean
  productName?: string
  productSku?: string
  options: ZonePickOption[]
  onOpenChange: (open: boolean) => void
  onConfirm: (zoneId: string) => void
}

export function PosZonePickerDialog(props: PosZonePickerDialogProps) {
  const { open, productName, productSku, options, onOpenChange, onConfirm } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pilih Zona Sumber</DialogTitle>
          <DialogDescription>
            Produk {productName || "-"} ({productSku || "-"}) tersedia di beberapa zona. Pilih zona yang akan dipakai untuk item ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {options.length === 0 ? (
            <div className="text-sm text-muted-foreground">Tidak ada zona dengan stok tersedia.</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.zoneId}
                type="button"
                onClick={() => onConfirm(opt.zoneId)}
                className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted"
              >
                <div className="font-medium">{opt.zoneName}</div>
                <div className="text-xs text-muted-foreground">{opt.zoneId} · Stok normal: {opt.qty}</div>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
