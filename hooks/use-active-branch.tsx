"use client"

import { useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { DEFAULT_BRANCH } from "@/lib/single-branch"

export function useActiveBranch() {
  const { isLoading } = useAuth()

  return useMemo(
    () => ({
      selectedBranch: DEFAULT_BRANCH,
      availableBranches: [DEFAULT_BRANCH] as const,
      isLoading,
      hasValidBranch: true,
    }),
    [isLoading]
  )
}
