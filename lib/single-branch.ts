export type Branch = {
  readonly id: string
  readonly code: string
  readonly name: string
}

export const DEFAULT_BRANCH: Branch = {
  id: "b_1",
  code: "cabang-a",
  name: "Cabang Utama",
}

export const ALL_BRANCHES: ReadonlyArray<Branch> = [DEFAULT_BRANCH]

export function getBranchById(branchId: string): Branch | undefined {
  const key = (branchId ?? "").trim()
  if (!key) return undefined
  if (key !== DEFAULT_BRANCH.id) return undefined
  return DEFAULT_BRANCH
}

export function getBranchByCode(branchCode: string): Branch | undefined {
  const key = (branchCode ?? "").trim()
  if (!key) return undefined
  if (key !== DEFAULT_BRANCH.code) return undefined
  return DEFAULT_BRANCH
}

export function getCentralBranch(): Branch {
  return DEFAULT_BRANCH
}

export function getCentralBranchId(): string {
  return DEFAULT_BRANCH.id
}
