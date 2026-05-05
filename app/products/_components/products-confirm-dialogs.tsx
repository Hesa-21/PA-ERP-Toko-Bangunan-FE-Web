"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import type { CategoryDto, ProductDto } from "@/app/products/_api-clients/products"

export function DeleteProductDialog(props: {
  productToDelete: ProductDto | null
  isDeleting: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={Boolean(props.productToDelete)} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
          <AlertDialogDescription>
            {props.productToDelete
              ? `Apakah Anda yakin ingin menghapus produk "${props.productToDelete.name}" (${props.productToDelete.sku})?`
              : "Apakah Anda yakin ingin menghapus produk ini?"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {props.error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{props.error}</div>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isDeleting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              props.onConfirm()
            }}
            disabled={props.isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {props.isDeleting ? "Menghapus..." : "Ya, Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function RemoveFromCategoryDialog(props: {
  productToRemove: ProductDto | null
  categoryLabel: string
  isSubmitting: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={Boolean(props.productToRemove)} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus dari Kategori</AlertDialogTitle>
          <AlertDialogDescription>
            {props.productToRemove
              ? `Keluarkan produk "${props.productToRemove.name}" (${props.productToRemove.sku}) dari kategori "${props.categoryLabel || "kategori ini"}"? Produk tidak akan dihapus.`
              : "Keluarkan produk dari kategori ini? Produk tidak akan dihapus."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {props.error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{props.error}</div>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isSubmitting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              props.onConfirm()
            }}
            disabled={props.isSubmitting}
          >
            {props.isSubmitting ? "Memproses..." : "Ya, Keluarkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function DeleteCategoryDialog(props: {
  categoryToDelete: CategoryDto | null
  message: string
  isDeleting: boolean
  error: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={Boolean(props.categoryToDelete)} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
          <AlertDialogDescription>{props.message || "Apakah Anda yakin ingin menghapus kategori ini?"}</AlertDialogDescription>
        </AlertDialogHeader>

        {props.error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{props.error}</div>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isDeleting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              props.onConfirm()
            }}
            disabled={props.isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {props.isDeleting ? "Menghapus..." : "Ya, Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
