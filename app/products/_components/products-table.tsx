"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ProductDto } from "@/app/products/_api-clients/products"

export function ProductsTable(props: {
  rows: ProductDto[]
  isLoading: boolean
  isCRUD: boolean
  onEdit: (product: ProductDto) => void
  onDelete: (product: ProductDto) => void
}) {
  return (
    <div className="mt-4 rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Nama Produk</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-right">Stok Total</TableHead>
            <TableHead className="text-right">HPP</TableHead>
            <TableHead className="text-right">Harga Retail</TableHead>
            <TableHead className="text-right">Harga Partai</TableHead>
            <TableHead className="text-right">Harga Cabang</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                {props.isLoading ? "Memuat produk..." : "Belum ada produk."}
              </TableCell>
            </TableRow>
          ) : (
            props.rows.map((p) => (
              <TableRow key={p.sku}>
                <TableCell className="font-medium">{p.sku}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.category ?? "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{(p.stock ?? 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">{(p.hpp ?? 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">{p.prices.retail.toLocaleString()}</TableCell>
                <TableCell className="text-right">{p.prices.partai.toLocaleString()}</TableCell>
                <TableCell className="text-right">{p.prices.cabang.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!props.isCRUD}
                      title={!props.isCRUD ? "Hanya baca" : undefined}
                      onClick={() => props.onEdit(p)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Ubah
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!props.isCRUD}
                      title={!props.isCRUD ? "Hanya baca" : undefined}
                      onClick={() => props.onDelete(p)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
