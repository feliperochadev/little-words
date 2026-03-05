import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getSetting, setSetting, getAllDataForCSV } from '../database/database';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = ''; // User must provide their own OAuth client ID
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CSV_FILENAME = 'palavrinhas_backup.csv';

export interface GoogleDriveConfig {
  accessToken: string | null;
  fileId: string | null;
  lastSync: string | null;
}

export const getGoogleDriveConfig = async (): Promise<GoogleDriveConfig> => {
  const accessToken = await getSetting('google_access_token');
  const fileId = await getSetting('google_file_id');
  const lastSync = await getSetting('google_last_sync');
  return { accessToken, fileId, lastSync };
};

export const saveGoogleDriveConfig = async (config: Partial<GoogleDriveConfig>) => {
  if (config.accessToken !== undefined) {
    await setSetting('google_access_token', config.accessToken || '');
  }
  if (config.fileId !== undefined) {
    await setSetting('google_file_id', config.fileId || '');
  }
  if (config.lastSync !== undefined) {
    await setSetting('google_last_sync', config.lastSync || '');
  }
};

export const clearGoogleAuth = async () => {
  await setSetting('google_access_token', '');
  await setSetting('google_file_id', '');
  await setSetting('google_last_sync', '');
};

export const isGoogleConnected = async (): Promise<boolean> => {
  const token = await getSetting('google_access_token');
  return !!(token && token.length > 0);
};

// Upload or update CSV on Google Drive
export const syncToGoogleDrive = async (accessToken: string, existingFileId: string | null): Promise<{ fileId: string; success: boolean; error?: string }> => {
  try {
    const csvContent = await getAllDataForCSV();
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = JSON.stringify({
      name: CSV_FILENAME,
      mimeType: 'text/csv',
    });

    const body =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      metadata +
      delimiter +
      'Content-Type: text/csv\r\n\r\n' +
      csvContent +
      closeDelimiter;

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) {
        return { fileId: existingFileId || '', success: false, error: 'TOKEN_EXPIRED' };
      }
      return { fileId: existingFileId || '', success: false, error: `Erro: ${response.status}` };
    }

    const data = await response.json();
    return { fileId: data.id, success: true };
  } catch (error: any) {
    return { fileId: existingFileId || '', success: false, error: error.message };
  }
};

// Check if file exists on Drive
export const findExistingFile = async (accessToken: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${CSV_FILENAME}'&spaces=drive&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch {
    return null;
  }
};

export const performSync = async (): Promise<{ success: boolean; error?: string; lastSync?: string }> => {
  const config = await getGoogleDriveConfig();
  if (!config.accessToken) {
    return { success: false, error: 'Não conectado ao Google Drive' };
  }

  let fileId = config.fileId;
  if (!fileId) {
    fileId = await findExistingFile(config.accessToken);
  }

  const result = await syncToGoogleDrive(config.accessToken, fileId);

  if (result.error === 'TOKEN_EXPIRED') {
    await clearGoogleAuth();
    return { success: false, error: 'Sessão expirada. Por favor, conecte-se novamente.' };
  }

  if (result.success) {
    const lastSync = new Date().toISOString();
    await saveGoogleDriveConfig({ fileId: result.fileId, lastSync });
    return { success: true, lastSync };
  }

  return { success: false, error: result.error };
};
