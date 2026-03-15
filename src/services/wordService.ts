import {
  getWords,
  findWordByName,
  addWord,
  updateWord,
  deleteWord as dbDeleteWord,
  getVariantsByWord,
  getAssetsByParent,
} from '../database/database';
import {
  deleteAllAssetsForParent,
} from '../utils/assetStorage';

export {
  getWords,
  findWordByName,
  addWord,
  updateWord,
};

export async function deleteWord(id: number): Promise<void> {
  const variants = await getVariantsByWord(id);
  await dbDeleteWord(id);

  // Best-effort file cleanup after DB cascade
  deleteAllAssetsForParent('word', id);
  for (const v of variants) {
    deleteAllAssetsForParent('variant', v.id);
  }
}

export type { Word } from '../database/database';
