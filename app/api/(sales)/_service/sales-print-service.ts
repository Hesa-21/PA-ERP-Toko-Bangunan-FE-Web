import { renderSalesPrintHtml } from "@/lib/server/print/sales"

export function renderSalePrint(input: { branch: string; saleId: string; withPrice: boolean }) {
  return renderSalesPrintHtml({ branchId: input.branch, saleId: input.saleId, withPrice: input.withPrice })
}
