import { readdirSync } from "node:fs"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

function collectTestFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath))
      continue
    }

    if (entry.isFile() && /\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath.replace(/\\/g, "/"))
    }
  }

  return files
}

const testFiles = collectTestFiles("app/api")

if (testFiles.length === 0) {
  console.error("No API test files were found under app/api.")
  process.exit(1)
}

const result = spawnSync(
  process.execPath,
  [
    "--max-old-space-size=4096",
    "./node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "vitest.config.ts",
    "--environment",
    "node",
    ...testFiles,
  ],
  {
    stdio: "inherit",
    shell: false,
  }
)

process.exit(result.status ?? 1)