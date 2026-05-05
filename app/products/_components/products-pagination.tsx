"use client"

import { Button } from "@/components/ui/button"

export function ProductsPagination(props: {
  productsStartIndex: number
  productsEndIndex: number
  productsTotal: number
  productsPage: number
  productsTotalPages: number
  visiblePages: number[]
  isLoading: boolean
  onPageChange: (value: number | ((prev: number) => number)) => void
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="text-sm text-muted-foreground">
        Menampilkan {props.productsStartIndex.toLocaleString()}-{props.productsEndIndex.toLocaleString()} dari {props.productsTotal.toLocaleString()} produk
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => props.onPageChange(1)}
          disabled={props.isLoading || props.productsPage <= 1}
        >
          Awal
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => props.onPageChange((p) => Math.max(1, p - 1))}
          disabled={props.isLoading || props.productsPage <= 1}
        >
          Sebelumnya
        </Button>
        {props.visiblePages.map((pageNum) => (
          <Button
            key={pageNum}
            variant={pageNum === props.productsPage ? "default" : "outline"}
            size="sm"
            onClick={() => props.onPageChange(pageNum)}
            disabled={props.isLoading}
          >
            {pageNum}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => props.onPageChange((p) => Math.min(props.productsTotalPages, p + 1))}
          disabled={props.isLoading || props.productsPage >= props.productsTotalPages}
        >
          Berikutnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => props.onPageChange(props.productsTotalPages)}
          disabled={props.isLoading || props.productsPage >= props.productsTotalPages}
        >
          Akhir
        </Button>
      </div>
    </div>
  )
}
