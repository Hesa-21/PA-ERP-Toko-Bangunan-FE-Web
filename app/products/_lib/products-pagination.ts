export const PRODUCTS_PAGE_SIZE = 5

export function buildVisibleProductPages(input: {
  page: number
  totalPages: number
  windowSize?: number
}): number[] {
  const page = Math.max(1, Math.trunc(Number(input.page) || 1))
  const totalPages = Math.max(1, Math.trunc(Number(input.totalPages) || 1))
  const windowSize = Math.max(1, Math.trunc(Number(input.windowSize) || 5))

  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const half = Math.floor(windowSize / 2)
  let start = Math.max(1, page - half)
  let end = start + windowSize - 1

  if (end > totalPages) {
    end = totalPages
    start = end - windowSize + 1
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}
