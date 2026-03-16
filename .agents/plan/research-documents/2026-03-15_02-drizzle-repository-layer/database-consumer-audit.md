# database.ts Consumer Audit

**Date:** 2026-03-15
**Purpose:** Map all 23 consumers of `src/database/database.ts` to plan the migration.

## Services (6 files) — Import path change only

| File | Functions Imported | Types Imported | Migration |
|------|-------------------|----------------|-----------|
| `categoryService.ts` | `getCategories`, `addCategory`, `updateCategory`, `deleteCategory`, `deleteCategoryWithUnlink`, `unlinkWordsFromCategory`, `getWordCountByCategory` | `Category` | Re-export from `categoryRepository` + `types/domain` |
| `wordService.ts` | `deleteWord as dbDeleteWord`, `getVariantsByWord`, `getWords`, `findWordByName`, `addWord`, `updateWord` | `Word` | Re-export from `wordRepository` + `variantRepository` + `types/domain` |
| `variantService.ts` | `deleteVariant as dbDeleteVariant`, `getVariantsByWord`, `findVariantByName`, `getAllVariants`, `addVariant`, `updateVariant` | `Variant` | Re-export from `variantRepository` + `types/domain` |
| `dashboardService.ts` | `getDashboardStats` | `DashboardStats` | Becomes real service assembling stats from `dashboardRepository` |
| `settingsService.ts` | `getSetting`, `setSetting`, `clearAllData as dbClearAllData` | — | Import from `settingsRepository` |
| `assetService.ts` | `getAssetById`, `addAsset`, `deleteAsset`, `deleteAssetsByParent`, `updateAssetFilename`, `getAssetsByParent`, `getAssetsByParentAndType` | — | Import from `assetRepository` |

## Components (4 files) — Service bypass violations to fix

| File | Functions Imported | Types Imported | Fix |
|------|-------------------|----------------|-----|
| `ImportModal.tsx` | `getCategories`, `addCategory`, `findWordByName`, `addWord`, `addVariant` | — | Route through `categoryService`, `wordService`, `variantService` |
| `ManageCategoryModal.tsx` | `getWordCountByCategory` | — | Import from `categoryService` |
| `AddWordModal.tsx` | `findWordByName` | `Word`, `Variant`, `Category` | Import function from `wordService`, types from `types/domain` |
| `AddVariantModal.tsx` | `findVariantByName` | `Variant`, `Word` | Import function from `variantService`, types from `types/domain` |

## Utilities (2 files)

| File | Functions Imported | Types Imported | Fix |
|------|-------------------|----------------|-----|
| `i18n.tsx` | `getSetting`, `setSetting` | — | Import from `settingsService` |
| `csvExport.ts` | `getAllDataForCSV` | — | Import from new `csvService` or `csvRepository` |
| `sortHelpers.ts` | — | `Word`, `Variant` | Import from `types/domain` |

## Test Files (6 files)

| File | What it tests | Migration |
|------|--------------|-----------|
| `unit/database.test.ts` | Database CRUD functions | Split into per-repository tests |
| `integration/database.test.ts` | Database integration | Split into per-repository tests |
| `integration/csvExport.test.ts` | CSV export | Update imports |
| `integration/assetService.test.ts` | Asset service | Update imports |
| `unit/assetDatabase.test.ts` | Asset DB functions | Move to repository test |
| `integration/deletionFileCleanup.test.ts` | Deletion cascade | Update imports |

## Documentation (1 file)

| File | Reference | Migration |
|------|-----------|-----------|
| `.agents/standards/styling-and-naming.md` | Import example | Update example |

## Summary

- **6 services** — import path change only (except `dashboardService` which becomes a real service)
- **4 components** — bypass violations, must be routed through services
- **3 utilities** — import path changes
- **6 test files** — import updates, some restructuring
- **1 doc file** — example update

Total: **20 code files + 1 doc** to update when `database.ts` is deleted.
