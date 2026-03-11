export {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  deleteCategoryWithUnlink,
  unlinkWordsFromCategory,
  getWordCountByCategory,
} from '../database/database';

export type { Category } from '../database/database';
