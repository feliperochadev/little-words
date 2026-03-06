import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllDataForCSV } from '../database/database';

const getFilename = () => `palavrinhas_${new Date().toISOString().split('T')[0]}.csv`;

// Write CSV to a temp file and return its URI
const writeTempFile = async (): Promise<string> => {
  const csvContent = await getAllDataForCSV();
  const fileUri = FileSystem.cacheDirectory + getFilename();
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
};

// Save directly to a user-chosen folder via Android SAF
export const saveCSVToDevice = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const csvContent = await getAllDataForCSV();
    const filename = getFilename();

    // Ask user to pick a destination folder
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      return { success: false, error: 'cancelled' };
    }

    // Create the file in the chosen folder
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      filename,
      'text/csv'
    );

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Share via system share sheet (WhatsApp, email, etc.)
export const shareCSV = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const fileUri = await writeTempFile();
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { success: false, error: 'Compartilhamento não disponível neste dispositivo.' };
    }
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Compartilhar Palavrinhas CSV',
      UTI: 'public.comma-separated-values-text',
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Legacy export kept for backward compat
export const exportCSV = shareCSV;