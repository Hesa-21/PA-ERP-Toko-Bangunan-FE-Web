"use client"

import { useActiveBranch } from "@/hooks/use-active-branch"
import { useDashboardSnapshot } from "@/app/dashboard/_hooks/use-dashboard-snapshot"
import type { DashboardSnapshot } from "@/app/dashboard/_lib/dashboard-types"

export function useDashboardController(input?: {
  initialSnapshot?: DashboardSnapshot
}) {
  const { selectedBranch, hasValidBranch } = useActiveBranch()
  const snapshotState = useDashboardSnapshot({
    initialSnapshot: input?.initialSnapshot,
    branchCode: selectedBranch.code,
  })

  return {
    selectedBranch,
    hasValidBranch,
    snapshot: snapshotState.snapshot,
    isLoading: snapshotState.isLoading,
    error: snapshotState.error,
    reload: snapshotState.reload,
  }
}
