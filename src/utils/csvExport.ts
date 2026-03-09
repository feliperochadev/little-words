import { File as FSFile, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllDataForCSV } from '../database/database';
import { DEFAULT_CATEGORY_KEY_SET } from './categoryKeys';

const getFilename = () => `palavrinhas_${new Date().toISOString().split('T')[0]}.csv`;

/**
 * Builds a category resolver that translates built-in keys using the
 * provided t() function, and passes user-created names through unchanged.
 * Kept here so csvExport has no direct React dependency.
 */
export function buildCategoryResolver(
  t: (key: string) => string
): (name: string) => string {
  return (name: string) => {
    if (name && DEFAULT_CATEGORY_KEY_SET.has(name)) {
      return t(`categories.${name}`);
    }
    return name;
  };
}

const writeTempFile = async (resolveCategoryName: (name: string) => string): Promise<string> => {
  const csvContent = await getAllDataForCSV(resolveCategoryName);
  const file = new FSFile(Paths.cache, getFilename());
  file.write(csvContent);
  return file.uri;
};

export const saveCSVToDevice = async (
  resolveCategoryName: (name: string) => string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const csvContent = await getAllDataForCSV(resolveCategoryName);
    const filename = getFilename();

    let dir: Directory;
    try {
      dir = await Directory.pickDirectoryAsync();
    } catch {
      return { success: false, error: 'cancelled' };
    }

    const file = dir.createFile(filename, 'text/csv');
    file.write(csvContent);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const shareCSV = async (
  resolveCategoryName: (name: string) => string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const fileUri = await writeTempFile(resolveCategoryName);
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return { success: false, error: 'Sharing not available on this device.' };
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Share Palavrinhas CSV',
      UTI: 'public.comma-separated-values-text',
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const exportCSV = shareCSV;
