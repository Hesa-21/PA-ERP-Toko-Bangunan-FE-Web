"use client"

import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CategoryDto } from "@/app/products/_api-clients/products"
import type { OrderFilter } from "@/app/products/_lib/products-filters"

export function ProductsFiltersBar(props: {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  categories: CategoryDto[]
  selectedCategoryFilterId: string
  onCategoryFilterChange: (value: string) => void
  selectedStockOrderFilter: OrderFilter
  onStockOrderFilterChange: (value: OrderFilter) => void
  selectedRetailOrderFilter: OrderFilter
  onRetailOrderFilterChange: (value: OrderFilter) => void
  isOrderFilterValue: (value: string) => value is OrderFilter
  productsTotal: number
  isSearchingProducts: boolean
  isCRUD: boolean
  allCategoriesValue: string
  stockDefaultValue: string
  stockHighestValue: string
  stockLowestValue: string
  retailDefaultValue: string
  retailHighestValue: string
  retailLowestValue: string
  onOpenAddProduct: () => void
}) {
  const sortedCategories = [...props.categories].sort((a, b) => a.name.localeCompare(b.name, "id"))

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="relative w-[260px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Cari produk (SKU / nama)..."
            value={props.searchTerm}
            onChange={(e) => props.onSearchTermChange(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={props.selectedCategoryFilterId} onValueChange={props.onCategoryFilterChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={props.allCategoriesValue}>Semua Kategori</SelectItem>
            {sortedCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={props.selectedStockOrderFilter}
          onValueChange={(value) => {
            if (props.isOrderFilterValue(value)) {
              props.onStockOrderFilterChange(value)
            }
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter stok" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={props.stockDefaultValue}>Urutkan Stok: Default</SelectItem>
            <SelectItem value={props.stockHighestValue}>Stok Tertinggi</SelectItem>
            <SelectItem value={props.stockLowestValue}>Stok Terendah</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={props.selectedRetailOrderFilter}
          onValueChange={(value) => {
            if (props.isOrderFilterValue(value)) {
              props.onRetailOrderFilterChange(value)
            }
          }}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filter harga retail" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={props.retailDefaultValue}>Urutkan Retail: Default</SelectItem>
            <SelectItem value={props.retailHighestValue}>Harga Retail Tertinggi</SelectItem>
            <SelectItem value={props.retailLowestValue}>Harga Retail Terendah</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {props.isSearchingProducts ? "Memuat..." : `${props.productsTotal.toLocaleString()} produk`}
        </Badge>
        <Button
          size="sm"
          disabled={!props.isCRUD}
          title={!props.isCRUD ? "Hanya baca" : undefined}
          onClick={props.onOpenAddProduct}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      </div>
    </div>
  )
}
