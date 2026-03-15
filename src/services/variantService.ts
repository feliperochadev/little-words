import {
  deleteVariant as dbDeleteVariant,
} from '../database/database';
import {
  deleteAllAssetsForParent,
} from '../utils/assetStorage';

export {
  getVariantsByWord,
  findVariantByName,
  getAllVariants,
  addVariant,
  updateVariant,
} from '../database/database';

export async function deleteVariant(id: number): Promise<void> {
  await dbDeleteVariant(id);

  // Best-effort file cleanup after DB cascade
  deleteAllAssetsForParent('variant', id);
}

export type { Variant } from '../database/database';
