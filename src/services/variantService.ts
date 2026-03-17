import {
  deleteVariant as dbDeleteVariant,
} from '../repositories/variantRepository';
import {
  deleteAllAssetsForParent,
} from '../utils/assetStorage';

export {
  getVariantsByWord,
  findVariantByName,
  getAllVariants,
  addVariant,
  updateVariant,
} from '../repositories/variantRepository';

export async function deleteVariant(id: number): Promise<void> {
  await dbDeleteVariant(id);

  // Best-effort file cleanup after DB cascade
  deleteAllAssetsForParent('variant', id);
}

export type { Variant } from '../types/domain';
