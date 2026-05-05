import { jsonError } from "@/lib/http/response"

export function mapDomainError(message: string) {
  const match = message.match(/^DOMAIN:([^:]+):(.*)$/)
  if (!match) return null

  const code = match[1]
  const msg = match[2]

  if (code === "INVALID_INPUT") return jsonError({ code: "INVALID_INPUT", message: msg, status: 400 })
  return jsonError({ code: "DOMAIN_ERROR", message: msg, status: 400 })
}

function mapCommonKnownError(message: string) {
  if (message === "BRANCH_NOT_FOUND") {
    return jsonError({ code: "NOT_FOUND", message: "Branch not found", status: 404 })
  }
  return null
}

export function mapProductsRouteError(err: unknown, fallbackMessage: string) {
  if (err instanceof Error) {
    const maybe = mapDomainError(err.message)
    if (maybe) return maybe

    const common = mapCommonKnownError(err.message)
    if (common) return common

    if (err.message === "SKU_ALREADY_EXISTS") {
      return jsonError({ code: "CONFLICT", message: "SKU sudah ada.", status: 409 })
    }

    if (err.message === "PRODUCT_NOT_FOUND") {
      return jsonError({ code: "NOT_FOUND", message: "Product not found", status: 404 })
    }

    if (err.message === "INVALID_SKU") {
      return jsonError({ code: "BAD_REQUEST", message: "SKU wajib.", status: 400 })
    }

    if (err.message === "INVALID_NAME") {
      return jsonError({ code: "BAD_REQUEST", message: "Nama produk wajib.", status: 400 })
    }

    if (err.message === "INVALID_WAREHOUSE_ID") {
      return jsonError({ code: "BAD_REQUEST", message: "warehouseId tidak valid.", status: 400 })
    }
  }

  return jsonError({ code: "INTERNAL", message: fallbackMessage, status: 500 })
}

export function mapProductCategoriesRouteError(err: unknown, fallbackMessage: string) {
  if (err instanceof Error) {
    const maybe = mapDomainError(err.message)
    if (maybe) return maybe

    const common = mapCommonKnownError(err.message)
    if (common) return common

    if (err.message === "CATEGORY_NOT_FOUND") {
      return jsonError({ code: "NOT_FOUND", message: "Category not found", status: 404 })
    }

    if (err.message === "CATEGORY_ALREADY_EXISTS") {
      return jsonError({ code: "CONFLICT", message: "Kategori sudah ada.", status: 409 })
    }

    if (err.message === "INVALID_CATEGORY_ID") {
      return jsonError({ code: "BAD_REQUEST", message: "id wajib.", status: 400 })
    }

    if (err.message === "INVALID_CATEGORY_NAME") {
      return jsonError({ code: "BAD_REQUEST", message: "Nama kategori wajib.", status: 400 })
    }
  }

  return jsonError({ code: "INTERNAL", message: fallbackMessage, status: 500 })
}

export function mapProductZoneBalancesRouteError(err: unknown, fallbackMessage: string) {
  if (err instanceof Error) {
    const maybe = mapDomainError(err.message)
    if (maybe) return maybe

    const common = mapCommonKnownError(err.message)
    if (common) return common

    if (err.message === "INVALID_WAREHOUSE_ID") {
      return jsonError({ code: "BAD_REQUEST", message: "warehouseId tidak valid.", status: 400 })
    }
  }

  return jsonError({ code: "INTERNAL", message: fallbackMessage, status: 500 })
}
