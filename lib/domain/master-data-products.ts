import type { PriceTier } from "@/lib/domain/types"

export type BranchProduct = {
  id: number
  sku: string
  name: string
  active?: boolean
  prices: Record<PriceTier, number>
  hpp?: number
  stock: number
  categoryId?: string
  category?: string
}

export type ProductDto = {
  sku: string
  name: string
  categoryId?: string
  category?: string
  prices: Record<PriceTier, number>
  hpp: number
  stock: number
}

export type CategoryDto = {
  id: string
  name: string
}
