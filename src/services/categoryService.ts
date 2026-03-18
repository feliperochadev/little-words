export {
  getCategories,
  findCategoryByName,
  addCategory,
  updateCategory,
  deleteCategory,
  deleteCategoryWithUnlink,
  unlinkWordsFromCategory,
  getWordCountByCategory,
} from '../repositories/categoryRepository';

export type { Category } from '../types/domain';
