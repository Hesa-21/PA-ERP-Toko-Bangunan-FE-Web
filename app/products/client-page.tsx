"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { PermissionGate } from "@/components/permission-gate"
import { useProductsController } from "@/app/products/_hooks/use-products-controller"
import { useProductsDialogs } from "@/app/products/_hooks/use-products-dialogs"
import { ProductsFiltersBar } from "@/app/products/_components/products-filters-bar"
import { ProductsTable } from "@/app/products/_components/products-table"
import { ProductsPagination } from "@/app/products/_components/products-pagination"
import { CategoriesSection } from "@/app/products/_components/categories-section"
import { CategoryFormDialog } from "@/app/products/_components/category-form-dialog"
import { ProductFormDialog } from "@/app/products/_components/product-form-dialog"
import {
  DeleteCategoryDialog,
  DeleteProductDialog,
  RemoveFromCategoryDialog,
} from "@/app/products/_components/products-confirm-dialogs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ProductsInitialSnapshot } from "@/app/products/_lib/products-snapshot"

export default function ProductsClientPage(input: {
  initialSnapshot?: ProductsInitialSnapshot
}) {
  const tabsBaseId = "products-tabs"

  const c = useProductsController({
    initialSnapshot: input.initialSnapshot,
  })

  const {
    isCRUD,
    categories,
    productsLoadError,
    isLoadingCategories,
    categoriesError,
    saveCategory,
    removeCategory,
    saveProduct,
    removeProduct,
    searchTerm,
    setSearchTerm,
    tab,
    setTab,
    selectedCategoryFilterId,
    setSelectedCategoryFilterId,
    selectedStockOrderFilter,
    setSelectedStockOrderFilter,
    selectedRetailOrderFilter,
    setSelectedRetailOrderFilter,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryName,
    productCountByCategoryId,
    selectedCategoryProducts,
    isLoadingSelectedCategoryProducts,
    categoryProductsError,
    productRows,
    productsTotal,
    productsPage,
    setProductsPage,
    productsTotalPages,
    isSearchingProducts,
    productsSearchError,
    productsStartIndex,
    productsEndIndex,
    visibleProductPages,
    bumpProductsReloadVersion,
    isOrderFilterValue,
    ALL_CATEGORIES_FILTER_VALUE,
    STOCK_ORDER_FILTER_VALUE,
    STOCK_ORDER_HIGHEST_VALUE,
    STOCK_ORDER_LOWEST_VALUE,
    RETAIL_ORDER_FILTER_VALUE,
    RETAIL_ORDER_HIGHEST_VALUE,
    RETAIL_ORDER_LOWEST_VALUE,
  } = c

  const {
    showProductDialog,
    setShowProductDialog,
    productToEdit,
    productForm,
    setProductForm,
    submitError,
    isSubmitting,
    openAddProduct,
    openEditProduct,
    submitProduct,

    showCategoryDialog,
    setShowCategoryDialog,
    categoryToEdit,
    categoryName,
    setCategoryName,
    categorySubmitError,
    isSubmittingCategory,
    openAddCategory,
    openEditCategory,
    submitCategory,

    productToDelete,
    isDeletingProduct,
    deleteProductError,
    requestDeleteProduct,
    confirmDeleteProduct,
    setProductToDelete,
    setDeleteProductError,

    productToRemoveFromCategory,
    removeFromCategoryLabel,
    isRemovingFromCategory,
    removeFromCategoryError,
    requestRemoveProductFromCategory,
    confirmRemoveProductFromCategory,
    setProductToRemoveFromCategory,
    setRemoveFromCategoryLabel,
    setRemoveFromCategoryError,

    categoryToDelete,
    deleteCategoryMessage,
    isDeletingCategory,
    deleteCategoryError,
    requestDeleteCategory,
    confirmDeleteCategory,
    setCategoryToDelete,
    setDeleteCategoryMessage,
    setDeleteCategoryError,
  } = useProductsDialogs({
    isCRUD,
    categories,
    productCountByCategoryId,
    selectedCategoryName,
    saveCategory,
    removeCategory,
    saveProduct,
    removeProduct,
    bumpProductsReloadVersion,
  })

  return (
    <PermissionGate module="categories">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <div className="flex flex-1 gap-4 p-4 pt-0">
            <div className="h-4" />

            <div className="flex-1">
              <Card>
                <Tabs value={tab} onValueChange={(v) => setTab(v as "produk" | "kategori")}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Master Data Produk
                      </CardTitle>
                      <TabsList>
                        <TabsTrigger
                          value="produk"
                          id={`${tabsBaseId}-trigger-produk`}
                          aria-controls={`${tabsBaseId}-content-produk`}
                        >
                          Produk
                        </TabsTrigger>
                        <TabsTrigger
                          value="kategori"
                          id={`${tabsBaseId}-trigger-kategori`}
                          aria-controls={`${tabsBaseId}-content-kategori`}
                        >
                          Kategori
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <TabsContent
                      value="produk"
                      id={`${tabsBaseId}-content-produk`}
                      aria-labelledby={`${tabsBaseId}-trigger-produk`}
                    >
                      <ProductsFiltersBar
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        categories={categories}
                        selectedCategoryFilterId={selectedCategoryFilterId}
                        onCategoryFilterChange={setSelectedCategoryFilterId}
                        selectedStockOrderFilter={selectedStockOrderFilter}
                        onStockOrderFilterChange={setSelectedStockOrderFilter}
                        selectedRetailOrderFilter={selectedRetailOrderFilter}
                        onRetailOrderFilterChange={setSelectedRetailOrderFilter}
                        isOrderFilterValue={isOrderFilterValue}
                        productsTotal={productsTotal}
                        isSearchingProducts={isSearchingProducts}
                        isCRUD={isCRUD}
                        allCategoriesValue={ALL_CATEGORIES_FILTER_VALUE}
                        stockDefaultValue={STOCK_ORDER_FILTER_VALUE}
                        stockHighestValue={STOCK_ORDER_HIGHEST_VALUE}
                        stockLowestValue={STOCK_ORDER_LOWEST_VALUE}
                        retailDefaultValue={RETAIL_ORDER_FILTER_VALUE}
                        retailHighestValue={RETAIL_ORDER_HIGHEST_VALUE}
                        retailLowestValue={RETAIL_ORDER_LOWEST_VALUE}
                        onOpenAddProduct={openAddProduct}
                      />
                      {productsSearchError && <p className="mt-2 text-sm text-red-600">{productsSearchError}</p>}

                      <ProductsTable
                        rows={productRows}
                        isLoading={isSearchingProducts}
                        isCRUD={isCRUD}
                        onEdit={openEditProduct}
                        onDelete={requestDeleteProduct}
                      />

                      <ProductsPagination
                        productsStartIndex={productsStartIndex}
                        productsEndIndex={productsEndIndex}
                        productsTotal={productsTotal}
                        productsPage={productsPage}
                        productsTotalPages={productsTotalPages}
                        visiblePages={visibleProductPages}
                        isLoading={isSearchingProducts}
                        onPageChange={setProductsPage}
                      />
                    </TabsContent>

                    <TabsContent
                      value="kategori"
                      id={`${tabsBaseId}-content-kategori`}
                      aria-labelledby={`${tabsBaseId}-trigger-kategori`}
                    >
                      <CategoriesSection
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategoryId={setSelectedCategoryId}
                        selectedCategoryName={selectedCategoryName}
                        selectedCategoryProducts={selectedCategoryProducts}
                        productCountByCategoryId={productCountByCategoryId}
                        isCRUD={isCRUD}
                        isLoadingCategories={isLoadingCategories}
                        categoriesError={categoriesError}
                        productsLoadError={categoryProductsError || productsLoadError}
                        isLoadingSelectedCategoryProducts={isLoadingSelectedCategoryProducts}
                        onOpenAddCategory={openAddCategory}
                        onOpenEditCategory={openEditCategory}
                        onDeleteCategory={requestDeleteCategory}
                        onRemoveProductFromCategory={requestRemoveProductFromCategory}
                      />
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <ProductFormDialog
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        productToEdit={productToEdit}
        submitError={submitError}
        isSubmitting={isSubmitting}
        productForm={productForm}
        onProductFormChange={setProductForm}
        categories={categories}
        onSubmit={() => {
          void submitProduct()
        }}
      />

      <CategoryFormDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        categoryToEdit={categoryToEdit}
        categoryName={categoryName}
        onCategoryNameChange={setCategoryName}
        submitError={categorySubmitError}
        isSubmitting={isSubmittingCategory}
        onSubmit={() => {
          void submitCategory()
        }}
      />

      <DeleteProductDialog
        productToDelete={productToDelete}
        isDeleting={isDeletingProduct}
        error={deleteProductError}
        onOpenChange={(open) => {
          if (!open && !isDeletingProduct) {
            setProductToDelete(null)
            setDeleteProductError("")
          }
        }}
        onConfirm={() => {
          void confirmDeleteProduct()
        }}
      />

      <RemoveFromCategoryDialog
        productToRemove={productToRemoveFromCategory}
        categoryLabel={removeFromCategoryLabel}
        isSubmitting={isRemovingFromCategory}
        error={removeFromCategoryError}
        onOpenChange={(open) => {
          if (!open && !isRemovingFromCategory) {
            setProductToRemoveFromCategory(null)
            setRemoveFromCategoryLabel("")
            setRemoveFromCategoryError("")
          }
        }}
        onConfirm={() => {
          void confirmRemoveProductFromCategory()
        }}
      />

      <DeleteCategoryDialog
        categoryToDelete={categoryToDelete}
        message={deleteCategoryMessage}
        isDeleting={isDeletingCategory}
        error={deleteCategoryError}
        onOpenChange={(open) => {
          if (!open && !isDeletingCategory) {
            setCategoryToDelete(null)
            setDeleteCategoryMessage("")
            setDeleteCategoryError("")
          }
        }}
        onConfirm={() => {
          void confirmDeleteCategory()
        }}
      />
    </PermissionGate>
  )
}
