import {
  deleteWord as dbDeleteWord,
  getVariantsByWord,
} from '../repositories/wordRepository';
import {
  deleteAllAssetsForParent,
} from '../utils/assetStorage';

export {
  getWords,
  findWordByName,
  addWord,
  updateWord,
  getVariantsByWord,
} from '../repositories/wordRepository';

export async function deleteWord(id: number): Promise<void> {
  const variants = await getVariantsByWord(id);
  await dbDeleteWord(id);

  // Best-effort file cleanup after DB cascade
  deleteAllAssetsForParent('word', id);
  for (const v of variants) {
    deleteAllAssetsForParent('variant', v.id);
  }
}

export type { Word } from '../types/domain';
