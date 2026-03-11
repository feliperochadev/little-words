/* eslint-disable @typescript-eslint/no-require-imports */
import { getSetting, setSetting, getAllDataForCSV } from '../database/database';
import Constants from 'expo-constants';

// True when running inside a real APK/IPA build (not Expo Go)
export const isNativeBuild = (): boolean => {
  return Constants.executionEnvironment !== 'storeClient';
};

// ── Locale-aware Drive helpers ─────────────────────────────────────────────────

export function buildDriveFolderName(t: (key: string) => string): string {
  return t('csv.driveFolderName');
}

function buildDriveFilename(t: (key: string) => string): string {
  return `${t('csv.filenamePrefix')}_backup.csv`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

export const configureGoogleSignIn = () => {
  if (!isNativeBuild()) return;
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  if (!isNativeBuild()) {
    return { success: false, error: 'Disponivel apenas no app instalado (nao no Expo Go).' };
  }
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const email = userInfo?.data?.user?.email ?? userInfo?.user?.email ?? '';
    await setSetting('google_user_email', email);
    await setSetting('google_signed_in', '1');
    return { success: true };
  } catch (error: any) {
    const { statusCodes } = require('@react-native-google-signin/google-signin');
    if (error.code === statusCodes.SIGN_IN_CANCELLED) return { success: false, error: 'cancelled' };
    if (error.code === statusCodes.IN_PROGRESS) return { success: false, error: 'in_progress' };
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { success: false, error: 'Google Play Services nao disponivel.' };
    return { success: false, error: error.message ?? 'Erro ao conectar.' };
  }
};

export const signOutGoogle = async (): Promise<void> => {
  if (isNativeBuild()) {
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut();
    } catch {}
  }
  await setSetting('google_signed_in', '');
  await setSetting('google_user_email', '');
  await setSetting('google_file_id', '');
  await setSetting('google_last_sync', '');
};

export const isGoogleConnected = async (): Promise<boolean> => {
  if (!isNativeBuild()) return false;
  const flag = await getSetting('google_signed_in');
  return flag === '1';
};

export const getGoogleUserEmail = async (): Promise<string | null> => {
  return getSetting('google_user_email');
};

// ── Drive upload ──────────────────────────────────────────────────────────────

const getAccessToken = async (): Promise<string> => {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
};

const findOrCreateFolder = async (accessToken: string, folderName: string): Promise<string | null> => {
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${folderName}'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&spaces=drive&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files?.[0]?.id) return data.files[0].id as string;
    }
    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
    });
    if (!createRes.ok) return null;
    const folder = await createRes.json();
    return folder.id ?? null;
  } catch {
    return null;
  }
};

const uploadToDrive = async (
  accessToken: string,
  existingFileId: string | null,
  folderId: string | null,
  filename: string,
): Promise<{ fileId: string; success: boolean; error?: string }> => {
  try {
    const csvContent = await getAllDataForCSV((name: string) => name);
    const boundary = '-------palavrinhas314159';
    // parents is only valid on initial file creation (POST), not on PATCH updates
    const meta: Record<string, unknown> = { name: filename, mimeType: 'text/csv' };
    if (!existingFileId && folderId) meta.parents = [folderId];
    const body =
      `\r\n--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(meta) +
      `\r\n--${boundary}\r\n` +
      'Content-Type: text/csv\r\n\r\n' +
      csvContent +
      `\r\n--${boundary}--`;

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const response = await fetch(url, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    });

    if (!response.ok) {
      if (response.status === 401) return { fileId: existingFileId ?? '', success: false, error: 'TOKEN_EXPIRED' };
      return { fileId: existingFileId ?? '', success: false, error: `Erro HTTP ${response.status}` };
    }
    const data = await response.json();
    return { fileId: data.id, success: true };
  } catch (e: any) {
    return { fileId: existingFileId ?? '', success: false, error: e.message };
  }
};

const findExistingFile = async (accessToken: string, folderId: string | null, filename: string): Promise<string | null> => {
  try {
    const folderClause = folderId ? `+and+'${folderId}'+in+parents` : '';
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${filename}'${folderClause}&spaces=drive&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.files?.[0]?.id ?? null;
  } catch {
    return null;
  }
};

// ── Public sync ───────────────────────────────────────────────────────────────

export const performSync = async (
  t: (key: string) => string,
): Promise<{ success: boolean; error?: string; lastSync?: string }> => {
  if (!isNativeBuild()) return { success: false, error: 'not_native' };

  const connected = await isGoogleConnected();
  if (!connected) return { success: false, error: 'Nao conectado' };

  const folderName = buildDriveFolderName(t);
  const filename = buildDriveFilename(t);

  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    const accessToken = await getAccessToken();
    const folderId = await findOrCreateFolder(accessToken, folderName);
    let fileId = await getSetting('google_file_id');
    if (!fileId) fileId = await findExistingFile(accessToken, folderId, filename);

    const result = await uploadToDrive(accessToken, fileId, folderId, filename);

    if (result.error === 'TOKEN_EXPIRED') {
      try {
        await GoogleSignin.signInSilently();
        const freshToken = await getAccessToken();
        const freshFolderId = await findOrCreateFolder(freshToken, folderName);
        const retry = await uploadToDrive(freshToken, fileId, freshFolderId, filename);
        if (!retry.success) {
          await signOutGoogle();
          return { success: false, error: 'Sessao expirada. Conecte-se novamente.' };
        }
        const lastSync = new Date().toISOString();
        await setSetting('google_file_id', retry.fileId);
        await setSetting('google_last_sync', lastSync);
        return { success: true, lastSync };
      } catch {
        await signOutGoogle();
        return { success: false, error: 'Sessao expirada. Conecte-se novamente.' };
      }
    }

    if (result.success) {
      const lastSync = new Date().toISOString();
      await setSetting('google_file_id', result.fileId);
      await setSetting('google_last_sync', lastSync);
      return { success: true, lastSync };
    }

    return { success: false, error: result.error };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
