"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calculator } from "lucide-react"
import type { PriceTier } from "@/lib/domain/types"
import type {
  CategoryDto,
  PosProductDto,
} from "@/app/pos/_api-clients/pos"

export type PosSortField = "name" | "sku" | "category" | "price" | "stock"

type PosProductListProps = {
  products: PosProductDto[]
  productsTotal: number
  isLoadingProducts: boolean
  productsError: string
  categories: CategoryDto[]
  isLoadingCategories: boolean
  categoriesError: string
  searchTerm: string
  onSearchTermChange: (value: string) => void
  selectedCategory: string
  onSelectedCategoryChange: (value: string) => void
  priceTier: PriceTier
  onPriceTierChange: (value: PriceTier) => void
  priceTierLabel: Record<PriceTier, string>
  sortBy: PosSortField
  sortDir: "asc" | "desc"
  onSortChange: (field: PosSortField) => void
  getSortIndicator: (field: PosSortField) => "▲" | "▼" | null
  selectedIndex: number
  onSelectedIndexChange: (value: number) => void
  onAddToCart: (product: PosProductDto) => void
  isCRUD: boolean
  page: number
  totalPages: number
  onPageChange: (updater: number | ((prev: number) => number)) => void
  listContainerRef: React.RefObject<HTMLDivElement | null>
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
}

export function PosProductList(props: PosProductListProps) {
  const {
    products,
    productsTotal,
    isLoadingProducts,
    productsError,
    categories,
    isLoadingCategories,
    categoriesError,
    searchTerm,
    onSearchTermChange,
    selectedCategory,
    onSelectedCategoryChange,
    priceTier,
    onPriceTierChange,
    priceTierLabel,
    sortBy,
    sortDir,
    onSortChange,
    getSortIndicator,
    selectedIndex,
    onSelectedIndexChange,
    onAddToCart,
    isCRUD,
    page,
    totalPages,
    onPageChange,
    listContainerRef,
    onKeyDown,
  } = props

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Kasir
            </CardTitle>

            <div className="flex items-center gap-2" />
          </div>

          {productsError && <p className="text-sm text-red-600">{productsError}</p>}
          {categoriesError && <p className="text-sm text-red-600">{categoriesError}</p>}

          <div className="flex justify-end">
            <Badge variant="outline">{isLoadingProducts ? "Memuat..." : `${productsTotal} produk`}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Cari produk (Nama atau SKU)..."
              value={searchTerm}
              onChange={(e) => {
                onSearchTermChange(e.target.value)
                onPageChange(1)
                onSelectedIndexChange(0)
              }}
              className="max-w-md"
            />

            <Select
              value={selectedCategory}
              onValueChange={(value) => {
                onSelectedCategoryChange(value)
                onPageChange(1)
                onSelectedIndexChange(0)
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder={isLoadingCategories ? "Memuat kategori..." : "Pilih kategori"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceTier} onValueChange={(value) => onPriceTierChange(value as PriceTier)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tier harga" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Harga Retail</SelectItem>
                <SelectItem value="partai">Harga Partai</SelectItem>
                <SelectItem value="cabang">Harga Cabang</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          ref={listContainerRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="outline-none rounded-md border focus:ring-2 focus:ring-primary/30"
          aria-label="Daftar produk, navigasi dengan panah dan tombol Enter untuk menambah"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="w-[40%]"
                  aria-sort={sortBy === "name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left"
                    onClick={() => onSortChange("name")}
                  >
                    Nama Produk
                    <span className="text-xs text-muted-foreground">{getSortIndicator("name")}</span>
                  </button>
                </TableHead>
                <TableHead
                  className="w-[15%]"
                  aria-sort={sortBy === "sku" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left"
                    onClick={() => onSortChange("sku")}
                  >
                    SKU
                    <span className="text-xs text-muted-foreground">{getSortIndicator("sku")}</span>
                  </button>
                </TableHead>
                <TableHead
                  className="w-[15%]"
                  aria-sort={sortBy === "category" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left"
                    onClick={() => onSortChange("category")}
                  >
                    Kategori
                    <span className="text-xs text-muted-foreground">{getSortIndicator("category")}</span>
                  </button>
                </TableHead>
                <TableHead
                  className="w-[15%] text-right"
                  aria-sort={sortBy === "price" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    className="inline-flex items-center justify-end gap-1 text-right w-full"
                    onClick={() => onSortChange("price")}
                  >
                    Harga ({priceTierLabel[priceTier]})
                    <span className="text-xs text-muted-foreground">{getSortIndicator("price")}</span>
                  </button>
                </TableHead>
                <TableHead
                  className="w-[10%] text-right"
                  aria-sort={sortBy === "stock" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    className="inline-flex items-center justify-end gap-1 text-right w-full"
                    onClick={() => onSortChange("stock")}
                  >
                    Stok
                    <span className="text-xs text-muted-foreground">{getSortIndicator("stock")}</span>
                  </button>
                </TableHead>
                <TableHead className="w-[5%] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    {isLoadingProducts ? "Memuat produk..." : "Tidak ada produk yang cocok."}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product, idx) => {
                  const isSelected = idx === selectedIndex

                  return (
                    <TableRow
                      key={product.sku}
                      className={
                        isSelected
                          ? "bg-primary/5 hover:bg-primary/10 focus:bg-primary/10"
                          : "hover:bg-muted/50"
                      }
                      onMouseEnter={() => onSelectedIndexChange(idx)}
                      onDoubleClick={() => {
                        if (isCRUD) onAddToCart(product)
                      }}
                    >
                      <TableCell>
                        <span className="font-medium">{product.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.sku}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px]">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        Rp {product.prices[priceTier].toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{product.stock}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => onAddToCart(product)}
                          disabled={!isCRUD}
                          title={!isCRUD ? "Tidak diizinkan" : undefined}
                        >
                          Tambah
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <span className="text-sm">
              Halaman {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
            >
              Berikutnya
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Menampilkan {products.length} dari {productsTotal} hasil
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
