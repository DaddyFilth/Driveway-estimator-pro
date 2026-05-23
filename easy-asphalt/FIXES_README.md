# Easy Asphalt - Repo Fixes

## Files Changed & Fixed

### 1. `server/routers.ts` 
**Problem:** Contained ALL routes (auth, projects, pricing, image) in one file, conflicting with modular structure.
**Fix:** Cleaned to only contain auth routes + imports `projectsRouter`, `pricingRouter`, `imageRouter` from `./routers/`.

### 2. `server/db.ts`
**Problems:**
- Missing `createUser()` function (needed by auth bootstrap)
- Missing `getUserById()` function (needed by createUser)
- Missing `getInsertId()` helper (needed for MySQL insert IDs)
- Missing `upsertMaterialPrice()` function (needed by pricing.ts)
- `getMaterialPrices()` only accepted `zipCode`, but `pricing.ts` called it with `(zipCode, material)`
- `createProject()` returned full project object instead of `{id}`
- `getUserProjects()` used `desc()` import but repo version didn't

**Fix:** Added all missing functions, fixed signatures to match callers.

### 3. `server/routers/projects.ts` (NEW FILE)
**Problem:** Didn't exist - projects routes were crammed into `routers.ts`.
**Fix:** Extracted all project routes (list, getById, create, update, delete, createShareLink, getByShareToken) into dedicated file.

### 4. `server/routers/pricing.ts` (NEW FILE)
**Problem:** Didn't exist - pricing routes were crammed into `routers.ts`.
**Fix:** Extracted pricing router with `getByZipCode` procedure.

### 5. `server/routers/image.ts` (NEW FILE)
**Problem:** Didn't exist - image routes were crammed into `routers.ts`.
**Fix:** Extracted image router with `detectEdges` and `generatePreview` procedures.

### 6. `shared/pricing.ts`
**Problem:** Import path `../db` was wrong (should be `../server/db` from shared/).
**Fix:** Fixed import to `../server/db`.

### 7. `shared/estimatorModel.ts`
**Problem:** Imported `CornerPoint` from `@shared/geometry` which may not exist.
**Fix:** Defined `CornerPoint` interface locally in the file.

### 8. `drizzle/schema.ts`
**Problem:** `mysqlEnum` import used but not all files referenced it consistently.
**Fix:** Verified correct - no changes needed.

## How to Apply These Fixes

1. Replace `server/routers.ts` with the fixed version
2. Replace `server/db.ts` with the fixed version  
3. Create `server/routers/projects.ts` with the extracted projects router
4. Create `server/routers/pricing.ts` with the extracted pricing router
5. Create `server/routers/image.ts` with the extracted image router
6. Replace `shared/pricing.ts` with the fixed version
7. Replace `shared/estimatorModel.ts` with the fixed version

## Additional Notes

- The `incrementShareViewCount` function in `db.ts` uses `sql` from drizzle-orm - make sure it's imported.
- The `imageRouter` uses `fetch()` for downloading preview images - this requires Node 18+ or a polyfill.
- The `pricingRouter` returns all materials if no specific material is passed, or a single material if specified.
