export {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  deleteCategoryWithUnlink,
  unlinkWordsFromCategory,
  getWordCountByCategory,
} from '../repositories/categoryRepository';

export type { Category } from '../types/domain';
