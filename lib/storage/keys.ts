export const SELECTED_BRANCH_ID_KEY = "erp_selected_branch_id"

export const POS_DRAFT_KEY_PREFIX = "pos:draft:"
export const POS_PRICE_TIER_KEY_PREFIX = "pos:price-tier:"

export function buildPosDraftKey(_branchId?: string): string {
  return `${POS_DRAFT_KEY_PREFIX}main`
}

export function buildPosPriceTierKey(_branchId?: string): string {
  return `${POS_PRICE_TIER_KEY_PREFIX}main`
}

export const AUTH_LOGOUT_STORAGE_EXACT_KEYS = [SELECTED_BRANCH_ID_KEY] as const
export const AUTH_LOGOUT_STORAGE_PREFIX_KEYS = [
  POS_DRAFT_KEY_PREFIX,
  POS_PRICE_TIER_KEY_PREFIX,
] as const