"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { PermissionGate } from "@/components/permission-gate"
import { PosProductList } from "@/app/pos/_components/pos-product-list"
import { PosCartPanel } from "@/app/pos/_components/pos-cart-panel"
import { PosSuccessDialog } from "@/app/pos/_components/pos-success-dialog"
import { PosErrorDialog } from "@/app/pos/_components/pos-error-dialog"
import { PosZonePickerDialog } from "@/app/pos/_components/pos-zone-picker-dialog"
import { usePosController } from "@/app/pos/_hooks/use-pos-controller"

export default function PosClientPage() {
  const c = usePosController()

  return (
    <PermissionGate module="pos">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <div className="flex flex-1 gap-4 p-4 pt-0">
            <div className="flex-1">
              <PosProductList
                products={c.ui.paginatedProducts}
                productsTotal={c.productsTotal}
                isLoadingProducts={c.isLoadingProducts}
                productsError={c.productsError}
                categories={c.categories}
                isLoadingCategories={c.isLoadingCategories}
                categoriesError={c.categoriesError}
                searchTerm={c.ui.searchTerm}
                onSearchTermChange={c.uiActions.setSearchTerm}
                selectedCategory={c.ui.selectedCategory}
                onSelectedCategoryChange={c.uiActions.setSelectedCategory}
                priceTier={c.priceTier}
                onPriceTierChange={c.actions.handlePriceTierChange}
                priceTierLabel={c.ui.priceTierLabel}
                sortBy={c.ui.sortBy}
                sortDir={c.ui.sortDir}
                onSortChange={c.uiActions.handleSortChange}
                getSortIndicator={c.uiActions.getSortIndicator}
                selectedIndex={c.ui.selectedIndex}
                onSelectedIndexChange={c.uiActions.setSelectedIndex}
                onAddToCart={c.actions.addToCart}
                isCRUD={c.ui.isCRUD}
                page={c.ui.page}
                totalPages={c.ui.totalPages}
                onPageChange={c.uiActions.setPage}
                listContainerRef={c.refs.listContainerRef}
                onKeyDown={c.uiActions.handleKeyDownOnList}
              />
            </div>

            <div className="w-96">
              <PosCartPanel
                cart={c.cart}
                zones={c.zones}
                discountInputs={c.discountInputs}
                totals={c.totals}
                priceTierLabel={c.ui.priceTierLabel}
                isCRUD={c.ui.isCRUD}
                customer={c.customer}
                salespersonName={c.salespersonName}
                paymentStatus={c.paymentStatus}
                dueDateInput={c.dueDateInput}
                paidAmountInput={c.paidAmountInput}
                orderDiscountInput={c.orderDiscountInput}
                isSubmittingPayment={c.isSubmittingPayment}
                isCustomerValid={c.ui.isCustomerValid}
                isSalespersonValid={c.ui.isSalespersonValid}
                onRemoveFromCart={c.actions.removeFromCart}
                onUpdateQuantity={c.actions.updateQuantity}
                onDiscountInputChange={c.actions.handleDiscountInputChange}
                onDiscountInputBlur={c.actions.handleDiscountInputBlur}
                onSetCustomer={c.actions.setCustomer}
                onSetSalespersonName={c.actions.setSalespersonName}
                onSetPaymentStatus={c.actions.setPaymentStatus}
                onSetPaidAmountInput={c.actions.setPaidAmountInput}
                onSetDueDateInput={c.actions.setDueDateInput}
                onSetOrderDiscount={c.actions.setOrderDiscount}
                onSetOrderDiscountInput={c.actions.setOrderDiscountInput}
                onProcessPayment={c.uiActions.handleProcessPayment}
              />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <PosSuccessDialog
        open={c.showSuccessDialog}
        onOpenChange={c.actions.setShowSuccessDialog}
        saleId={c.lastPostedSale?.id}
        onGoToSales={c.uiActions.handleGoToSales}
      />

      <PosErrorDialog
        open={c.showErrorDialog}
        onOpenChange={c.actions.setShowErrorDialog}
        message={c.posMessage}
      />

      <PosZonePickerDialog
        open={c.zonePick.open}
        productName={c.zonePick.product?.name}
        productSku={c.zonePick.product?.sku}
        options={c.zonePick.options}
        onOpenChange={(open) => {
          if (!open) c.actions.closeZonePickDialog()
        }}
        onConfirm={c.actions.confirmAddToCartZone}
      />
    </PermissionGate>
  )
}
