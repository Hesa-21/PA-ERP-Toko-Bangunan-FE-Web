# API Endpoint Phase 1 Boundary Audit

## Goal
Lock the backend boundary before any destructive deletions. This phase is intentionally non-destructive and documents the exact surface that must remain available to the `api-endpoint` branch.

## Confirmed Keep

- `app/api/` and all of its route groups: `(auth)`, `(dashboard)`, `(pos)`, `(products)`, `(sales)`, and `(users)`
- `lib/server/`
- `lib/domain/`
- `lib/auth/`
- `lib/http/`
- `lib/storage/`
- `lib/single-branch.ts`
- `lib/utils/date.ts`
- `testing_scripts/`

## Confirmed Remove Later

- `app/auth/`
- `app/dashboard/`
- `app/pos/`
- `app/products/`
- `app/reports/`
- `app/sales/`
- `app/users/`
- `components/`
- `hooks/`
- `app/globals.css`
- `app/page.tsx`
- `proxy.ts`
- `lib/client/`

## Touch In A Later Phase

- `package.json`
- `next.config.mjs`
- `tsconfig.json`
- `vitest.config.ts`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `components.json`

## Boundary Findings

- `app/api/` still depends on `lib/auth/`, `lib/http/`, `lib/server/`, `lib/storage/`, `lib/domain/`, `lib/single-branch.ts`, and `lib/utils/date.ts`.
- `app/api/` does not import `@/components/*`, `@/hooks/*`, or `@/lib/client/*`.
- `lib/utils/string.ts` and `lib/utils/number.ts` are frontend-only at the moment; they are not safe to remove until the UI tree is deleted.
- `formatIDR` is still used by the frontend report UI, so `lib/utils/number.ts` must remain until the report route is removed.

## Validation Checkpoints

- Confirmed the `api-endpoint` branch is active.
- Confirmed `app/api/` is isolated from UI component imports.
- Confirmed shared backend helpers still needed by API routes are preserved.

## Exit Criteria For Phase 1

Phase 1 is complete when the keep/remove boundary is documented and validated, and the workspace is ready for the destructive frontend cleanup phase.

## Next Iteration Readiness

The next iteration can safely begin with bulk removal of the UI-only routes and component tree without disturbing the backend API surface.