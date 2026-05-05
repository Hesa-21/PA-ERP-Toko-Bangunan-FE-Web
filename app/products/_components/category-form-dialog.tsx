"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CategoryDto } from "@/app/products/_api-clients/products"

export function CategoryFormDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryToEdit: CategoryDto | null
  categoryName: string
  onCategoryNameChange: (value: string) => void
  submitError: string
  isSubmitting: boolean
  onSubmit: () => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.categoryToEdit ? "Ubah Kategori" : "Tambah Kategori"}</DialogTitle>
          <DialogDescription>Nama kategori akan dipakai pada produk.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {props.submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{props.submitError}</div>
          )}

          <div className="grid gap-2">
            <div className="text-sm font-medium">Nama Kategori</div>
            <Input
              value={props.categoryName}
              onChange={(e) => props.onCategoryNameChange(e.target.value)}
              placeholder="Contoh: Material Dasar"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={props.isSubmitting}>
            Batal
          </Button>
          <Button onClick={props.onSubmit} disabled={props.isSubmitting}>
            {props.isSubmitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
