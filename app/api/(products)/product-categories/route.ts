import {
  handleProductCategoriesDelete,
  handleProductCategoriesGet,
  handleProductCategoriesPost,
  handleProductCategoriesPut,
} from "@/app/api/(products)/_controller/product-categories-controller"

export async function GET(request: Request) {
  return handleProductCategoriesGet(request)
}

export async function POST(request: Request) {
  return handleProductCategoriesPost(request)
}

export async function PUT(request: Request) {
  return handleProductCategoriesPut(request)
}

export async function DELETE(request: Request) {
  return handleProductCategoriesDelete(request)
}
