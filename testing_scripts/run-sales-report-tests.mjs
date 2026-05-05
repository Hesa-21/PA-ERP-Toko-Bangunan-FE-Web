import { spawnSync } from "node:child_process"

const testFiles = [
  "app/reports/sales/_api-clients/sales-report.test.ts",
  "app/reports/sales/_hooks/use-sales-report-controller.test.tsx",
  "app/reports/sales/_hooks/use-sales-report-data.test.tsx",
  "app/reports/sales/_hooks/use-sales-report-export.test.tsx",
  "app/api/(sales)/_lib/auth.test.ts",
  "app/api/(sales)/_lib/validators.test.ts",
  "app/api/(sales)/_lib/errors.test.ts",
  "app/api/(sales)/_service/sales-list-service.test.ts",
  "app/api/(sales)/_service/sales-export-service.test.ts",
  "app/api/(sales)/_controller/sales-read-controllers.test.ts",
  "app/api/(purchases)/_lib/auth.test.ts",
  "app/api/(purchases)/_lib/validators.test.ts",
  "app/api/(purchases)/_lib/errors.test.ts",
  "app/api/(purchases)/_service/purchases-service.test.ts",
  "app/api/(purchases)/_controller/purchases-controller.test.ts",
  "app/api/(purchases)/purchases/routes.test.ts",
  "app/api/(returns)/_lib/auth.test.ts",
  "app/api/(returns)/_lib/validators.test.ts",
  "app/api/(returns)/_lib/errors.test.ts",
  "app/api/(returns)/_service/returns-service.test.ts",
  "app/api/(returns)/_service/returns-source-service.test.ts",
  "app/api/(returns)/_service/returns-idempotency-service.test.ts",
  "app/api/(returns)/_service/returns-rate-limit-service.test.ts",
  "app/api/(returns)/_controller/returns-controller.test.ts",
  "app/api/(returns)/returns/routes.test.ts",
  "app/api/(users)/_service/users-service.test.ts",
  "app/api/(users)/_lib/validators.test.ts",
  "app/api/(users)/_lib/errors.test.ts",
  "app/api/(dashboard)/_lib/validators.test.ts",
  "app/api/(dashboard)/_service/dashboard-service.test.ts",
  "app/api/(dashboard)/_controller/dashboard-summary-controller.test.ts",
  "app/api/(dashboard)/_controller/dashboard-snapshot-controller.test.ts",
  "app/api/(pos)/_lib/validators.test.ts",
  "app/api/(pos)/_service/pos-sales-service.test.ts",
  "app/api/(pos)/_controller/pos-sales-controller.test.ts",
  "app/api/(products)/_lib/validators.test.ts",
  "app/api/(products)/_service/product-zone-balances-service.test.ts",
  "app/api/(products)/_controller/product-zone-balances-controller.test.ts",
  "app/api/(products)/_lib/errors.test.ts",
  "app/api/(warehouse)/_lib/auth.test.ts",
  "app/api/(warehouse)/_lib/validators.test.ts",
  "app/api/(warehouse)/_lib/errors.test.ts",
  "app/api/(warehouse)/_service/warehouse-audit-log-service.test.ts",
  "app/api/(warehouse)/_service/warehouse-idempotency-service.test.ts",
  "app/api/(warehouse)/_service/warehouse-rate-limit-service.test.ts",
  "app/api/(warehouse)/_service/warehouse-service.test.ts",
  "app/api/(warehouse)/_controller/warehouse-read-controllers.test.ts",
  "app/api/(warehouse)/_controller/warehouse-mutation-controllers.test.ts",
  "app/api/(warehouse)/_controller/warehouse-controller.test.ts",
]

for (const file of testFiles) {
  const result = spawnSync(
    process.execPath,
    [
      "--max-old-space-size=4096",
      "./node_modules/vitest/vitest.mjs",
      "run",
      file,
      "--config",
      "vitest.config.ts",
    ],
    {
      stdio: "inherit",
      shell: false,
    }
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
