import { File as FSFile, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllDataForCSV } from '../database/database';
import { DEFAULT_CATEGORY_KEY_SET } from './categoryKeys';

const pad = (n: number) => String(n).padStart(2, '0');
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

export function buildFilename(t: (key: string) => string): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hhmm = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `${t('csv.filenamePrefix')}_${date}_${hhmm}.csv`;
}

export function buildCSVHeader(t: (key: string) => string): string {
  return [
    t('csv.columnWord'),
    t('csv.columnCategory'),
    t('csv.columnDate'),
    t('csv.columnVariant'),
  ].join(',');
}

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

const writeTempFile = async (
  resolveCategoryName: (name: string) => string,
  headerRow: string,
  t: (key: string) => string,
): Promise<string> => {
  const csvContent = await getAllDataForCSV(resolveCategoryName, headerRow);
  const file = new FSFile(Paths.cache, buildFilename(t));
  file.write(csvContent);
  return file.uri;
};

export const saveCSVToDevice = async (
  resolveCategoryName: (name: string) => string,
  headerRow: string,
  t: (key: string) => string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const csvContent = await getAllDataForCSV(resolveCategoryName, headerRow);
    const filename = buildFilename(t);

    let dir: Directory;
    try {
      dir = await Directory.pickDirectoryAsync();
    } catch {
      return { success: false, error: 'cancelled' };
    }

    const file = dir.createFile(filename, 'text/csv');
    file.write(csvContent);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
};

export const shareCSV = async (
  resolveCategoryName: (name: string) => string,
  headerRow: string,
  t: (key: string) => string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const fileUri = await writeTempFile(resolveCategoryName, headerRow, t);
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return { success: false, error: 'Sharing not available on this device.' };
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: t('csv.shareDialogTitle'),
      UTI: 'public.comma-separated-values-text',
    });
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
};

export const exportCSV = shareCSV;
