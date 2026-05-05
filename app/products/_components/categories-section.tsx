"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CategoryDto, ProductDto } from "@/app/products/_api-clients/products"

export function CategoriesSection(props: {
  categories: CategoryDto[]
  selectedCategoryId: string
  onSelectCategoryId: (id: string) => void
  selectedCategoryName: string
  selectedCategoryProducts: ProductDto[]
  isLoadingSelectedCategoryProducts: boolean
  productCountByCategoryId: Map<string, number>
  isCRUD: boolean
  isLoadingCategories: boolean
  categoriesError: string
  productsLoadError: string
  onOpenAddCategory: () => void
  onOpenEditCategory: (category: CategoryDto) => void
  onDeleteCategory: (category: CategoryDto) => void
  onRemoveProductFromCategory: (product: ProductDto) => void
}) {
  const sortedCategories = [...props.categories].sort((a, b) => a.name.localeCompare(b.name, "id"))

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">Kelola kategori beserta daftar produk di dalamnya.</div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={!props.isCRUD}
            title={!props.isCRUD ? "Hanya baca" : undefined}
            onClick={props.onOpenAddCategory}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Kategori
          </Button>
        </div>
      </div>
      {props.categoriesError && <p className="mt-2 text-sm text-red-600">{props.categoriesError}</p>}
      {props.productsLoadError && <p className="mt-2 text-sm text-red-600">{props.productsLoadError}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Produk</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    {props.isLoadingCategories ? "Memuat kategori..." : "Belum ada kategori."}
                  </TableCell>
                </TableRow>
              ) : (
                sortedCategories.map((c) => {
                  const count = props.productCountByCategoryId.get(c.id) ?? 0
                  const isSelected = c.id === props.selectedCategoryId
                  return (
                    <TableRow key={c.id} className={isSelected ? "bg-muted/50" : undefined}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="text-left underline-offset-2 hover:underline"
                          onClick={() => props.onSelectCategoryId(c.id)}
                        >
                          {c.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-right font-mono">{count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!props.isCRUD}
                            title={!props.isCRUD ? "Hanya baca" : undefined}
                            onClick={() => props.onOpenEditCategory(c)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Ubah
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!props.isCRUD}
                            title={!props.isCRUD ? "Hanya baca" : undefined}
                            onClick={() => props.onDeleteCategory(c)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-md border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
            <div className="text-sm font-medium">
              {props.selectedCategoryName ? `Produk di: ${props.selectedCategoryName}` : "Pilih kategori"}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.selectedCategoryName && props.isLoadingSelectedCategoryProducts ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Memuat produk kategori...
                  </TableCell>
                </TableRow>
              ) : props.selectedCategoryName && props.selectedCategoryProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Belum ada produk di kategori ini.
                  </TableCell>
                </TableRow>
              ) : !props.selectedCategoryName ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Pilih kategori di sebelah kiri.
                  </TableCell>
                </TableRow>
              ) : (
                props.selectedCategoryProducts.map((p) => (
                  <TableRow key={p.sku}>
                    <TableCell className="font-medium">{p.sku}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!props.isCRUD}
                        title={!props.isCRUD ? "Hanya baca" : undefined}
                        onClick={() => props.onRemoveProductFromCategory(p)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Hapus dari Kategori
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
