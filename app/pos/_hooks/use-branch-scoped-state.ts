"use client"

import { useCallback, useState } from "react"

type BranchStateUpdater<T> = T | ((prev: T) => T)

export function useBranchScopedState<T>(_branchId: string, defaultValue: T) {
  const [value, setValueState] = useState<T>(defaultValue)

  const setValue = useCallback(
    (updater: BranchStateUpdater<T>) => {
      setValueState((prev) =>
        typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater
      )
    },
    []
  )

  return {
    value,
    setValue,
  }
}
