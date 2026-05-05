import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { SalesListItemDto, SalesStatusUi } from "@/app/sales/_api-clients/sales"
import { SalesTable } from "@/app/sales/_components/sales-table"

function makeRow(overrides: Partial<SalesListItemDto> = {}): SalesListItemDto {
  return {
    id: "S-1",
    date: "01/04/2026",
    customer: "PT Maju",
    items: 2,
    customerPhone: "0812",
    total: 100000,
    paid: 100000,
    remaining: 0,
    status: "Paid",
    paymentMethod: "Tunai",
    dueDate: "-",
    salesperson: "Kasir A",
    ...overrides,
  }
}

describe("SalesTable", () => {
  it("shows empty-state helper text when no rows exist", () => {
    render(
      <SalesTable
        rows={[]}
        isCRUD={false}
        getStatusBadge={() => ""}
        getStatusLabel={(status: SalesStatusUi) => status}
        onView={() => undefined}
        onPrint={() => undefined}
        onPrintNoPrice={() => undefined}
        onCancel={() => undefined}
      />
    )

    expect(screen.getByText(/Tidak ada data yang sesuai dengan filter/i)).toBeTruthy()
  })

  it("triggers row actions and disables cancel for cancelled rows", () => {
    const onView = vi.fn()
    const onPrint = vi.fn()
    const onPrintNoPrice = vi.fn()
    const onCancel = vi.fn()

    render(
      <SalesTable
        rows={[makeRow({ id: "S-99", status: "Cancelled" })]}
        isCRUD={true}
        getStatusBadge={() => ""}
        getStatusLabel={(status: SalesStatusUi) => status}
        onView={onView}
        onPrint={onPrint}
        onPrintNoPrice={onPrintNoPrice}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Lihat" }))
    fireEvent.click(screen.getByRole("button", { name: "Cetak" }))
    fireEvent.click(screen.getByRole("button", { name: "Cetak (Tanpa Harga)" }))

    expect(onView).toHaveBeenCalledWith("S-99")
    expect(onPrint).toHaveBeenCalledWith("S-99")
    expect(onPrintNoPrice).toHaveBeenCalledWith("S-99")

    const cancelButton = screen.getByRole("button", { name: "Batalkan" }) as HTMLButtonElement
    expect(cancelButton.disabled).toBe(true)

    fireEvent.click(cancelButton)
    expect(onCancel).not.toHaveBeenCalled()
  })
})
