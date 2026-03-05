import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllDataForCSV } from '../database/database';

export const exportCSV = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const csvContent = await getAllDataForCSV();
    const filename = `palavrinhas_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Palavrinhas',
        UTI: 'public.comma-separated-values-text',
      });
      return { success: true };
    } else {
      return { success: false, error: 'Compartilhamento não disponível neste dispositivo' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
