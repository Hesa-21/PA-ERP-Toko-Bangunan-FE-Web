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

type PosErrorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string
}

export function PosErrorDialog({ open, onOpenChange, message }: PosErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600">Transaksi Gagal</DialogTitle>
          <DialogDescription>Terjadi kesalahan saat memproses transaksi.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-center font-medium">{message}</p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
