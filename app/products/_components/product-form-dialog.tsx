"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Dispatch, SetStateAction } from "react"
import type { CategoryDto, ProductDto } from "@/app/products/_api-clients/products"
import type { ProductFormState } from "@/app/products/_lib/products-dialog-types"

export function ProductFormDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productToEdit: ProductDto | null
  submitError: string
  isSubmitting: boolean
  productForm: ProductFormState
  onProductFormChange: Dispatch<SetStateAction<ProductFormState>>
  categories: CategoryDto[]
  onSubmit: () => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{props.productToEdit ? "Ubah Produk" : "Tambah Produk"}</DialogTitle>
          <DialogDescription>Isi SKU, nama, kategori, dan harga jual.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {props.submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{props.submitError}</div>
          )}

          <div className="grid gap-2">
            <div className="text-sm font-medium">SKU</div>
            <Input
              value={props.productForm.sku}
              onChange={(e) => props.onProductFormChange((p) => ({ ...p, sku: e.target.value }))}
              placeholder="Contoh: SEM-PORT-50KG"
              disabled={!!props.productToEdit}
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Nama Produk</div>
            <Input
              value={props.productForm.name}
              onChange={(e) => props.onProductFormChange((p) => ({ ...p, name: e.target.value }))}
              placeholder="Contoh: Semen Portland 50kg"
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Kategori</div>
            <Select
              value={(props.productForm.categoryId || "__none__") as string}
              onValueChange={(value) =>
                props.onProductFormChange((p) => ({ ...p, categoryId: value === "__none__" ? "" : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">-</SelectItem>
                {[...props.categories]
                  .sort((a, b) => a.name.localeCompare(b.name, "id"))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                {props.productForm.categoryId &&
                  !props.categories.some((c) => c.id === props.productForm.categoryId) && (
                    <SelectItem value={props.productForm.categoryId}>{props.productToEdit?.category ?? "Kategori"}</SelectItem>
                  )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">HPP</div>
            <Input
              type="number"
              min={0}
              value={props.productForm.hpp}
              onChange={(e) => props.onProductFormChange((p) => ({ ...p, hpp: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Harga Retail</div>
            <Input
              type="number"
              min={0}
              value={props.productForm.retail}
              onChange={(e) => props.onProductFormChange((p) => ({ ...p, retail: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Harga Partai</div>
            <Input
              type="number"
              min={0}
              value={props.productForm.partai}
              onChange={(e) => props.onProductFormChange((p) => ({ ...p, partai: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Harga Cabang</div>
            <Input
              type="number"
              min={0}
              value={props.productForm.cabang}
              onChange={(e) => props.onProductFormChange((p) => ({ ...p, cabang: e.target.value }))}
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
