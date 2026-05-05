"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown } from "lucide-react"
import type { ProductDto } from "@/lib/domain"

export function ProductSearchCombobox(props: {
  value: string
  onValueChange: (sku: string) => void

  open?: boolean
  onOpenChange?: (open: boolean) => void

  disabled?: boolean

  buttonPlaceholder?: string
  inputPlaceholder?: string

  popoverContentClassName?: string

  limit?: number
  searchProducts: (input: { q: string; limit?: number }) => Promise<ProductDto[]>
  fetchProductBySku?: (sku: string) => Promise<ProductDto | null>
  getCachedProduct?: (sku: string) => ProductDto | undefined
}) {
  const {
    value,
    onValueChange,
    open: openProp,
    onOpenChange,
    disabled,
    buttonPlaceholder,
    inputPlaceholder,
    popoverContentClassName,
    limit,
    searchProducts,
    fetchProductBySku,
    getCachedProduct,
  } = props

  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = onOpenChange ?? setOpenInternal

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProductDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const reqSeq = useRef(0)
  const cacheRef = useRef<Map<string, ProductDto>>(new Map())

  const cleanSku = (value ?? "").trim()
  const cachedFromParent = useMemo(() => {
    const sku = cleanSku.trim()
    if (!sku) return undefined
    return getCachedProduct?.(sku)
  }, [cleanSku, getCachedProduct])

  const cachedFromLocal = useMemo(() => {
    const key = cleanSku.trim().toLowerCase()
    if (!key) return undefined
    return cacheRef.current.get(key)
  }, [cleanSku])

  const selectedProduct = cachedFromParent ?? cachedFromLocal

  useEffect(() => {
    // Cancel in-flight requests + reset UX on open.
    if (!open) return
    reqSeq.current++
    setQuery("")
    setResults([])
    setError("")
    setLoading(false)
  }, [open])

  useEffect(() => {
    // Backfill label details when SKU already set but not cached.
    if (!fetchProductBySku) return
    const sku = cleanSku.trim()
    if (!sku) return
    if (selectedProduct) return

    const seq = ++reqSeq.current
    void (async () => {
      try {
        const p = await fetchProductBySku(sku)
        if (seq !== reqSeq.current) return
        if (p) cacheRef.current.set(p.sku.toLowerCase(), p)
      } finally {
        // noop
      }
    })()
  }, [cleanSku, fetchProductBySku, selectedProduct])

  useEffect(() => {
    if (!open) return

    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      setError("")
      return
    }

    const seq = ++reqSeq.current
    setLoading(true)
    setError("")

    const handle = setTimeout(async () => {
      try {
        if (seq !== reqSeq.current) return
        const products = await searchProducts({ q, limit: limit ?? 20 })
        if (seq !== reqSeq.current) return
        setResults(products)
        for (const p of products) {
          const sku = (p.sku ?? "").trim()
          if (!sku) continue
          cacheRef.current.set(sku.toLowerCase(), p)
        }
      } catch (err: unknown) {
        if (seq !== reqSeq.current) return
        setResults([])
        setError(err instanceof Error ? err.message : "Gagal mencari produk")
      } finally {
        if (seq !== reqSeq.current) return
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(handle)
  }, [limit, open, query, searchProducts])

  const buttonLabel = useMemo(() => {
    const sku = cleanSku.trim()
    if (!sku) return (buttonPlaceholder ?? "Cari SKU/nama...")

    const p = selectedProduct
    if (p) return `${p.sku} - ${p.name}`

    return sku
  }, [buttonPlaceholder, cleanSku, selectedProduct])

  const contentClassName = popoverContentClassName ?? "w-[360px] p-0"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
          disabled={disabled}
        >
          {buttonLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className={contentClassName}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={inputPlaceholder ?? "Cari SKU/nama..."}
            value={query}
            onValueChange={(v) => setQuery(String(v))}
          />
          <CommandList>
            {query.trim().length < 2 ? (
              <CommandEmpty>Ketik minimal 2 karakter.</CommandEmpty>
            ) : loading ? (
              <CommandEmpty>Memuat...</CommandEmpty>
            ) : error ? (
              <CommandEmpty>{error}</CommandEmpty>
            ) : results.length === 0 ? (
              <CommandEmpty>Tidak ditemukan.</CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((p) => (
                  <CommandItem
                    key={p.sku}
                    value={p.sku}
                    onSelect={() => {
                      onValueChange(p.sku)
                      setOpen(false)
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{p.sku}</span>
                      <span className="text-xs text-muted-foreground">{p.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
