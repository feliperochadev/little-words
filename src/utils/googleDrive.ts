import { getSetting, setSetting, getAllDataForCSV } from '../database/database';
import Constants from 'expo-constants';

const CSV_FILENAME = 'palavrinhas_backup.csv';

// True when running inside a real APK/IPA build (not Expo Go)
export const isNativeBuild = (): boolean => {
  return Constants.executionEnvironment !== 'storeClient' &&
    Constants.executionEnvironment !== 'expo';
};

// ── Init ──────────────────────────────────────────────────────────────────────

export const configureGoogleSignIn = () => {
  if (!isNativeBuild()) return;
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    androidClientId: '341926382456-ju9cu3b2i6tjhm5g242d7967vmh5qsph.apps.googleusercontent.com',
  });
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  if (!isNativeBuild()) {
    return { success: false, error: 'Disponivel apenas no app instalado (nao no Expo Go).' };
  }
  try {
    const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');
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

const uploadToDrive = async (
  accessToken: string,
  existingFileId: string | null,
): Promise<{ fileId: string; success: boolean; error?: string }> => {
  try {
    const csvContent = await getAllDataForCSV();
    const boundary = '-------palavrinhas314159';
    const body =
      `\r\n--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify({ name: CSV_FILENAME, mimeType: 'text/csv' }) +
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

const findExistingFile = async (accessToken: string): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${CSV_FILENAME}'&spaces=drive&fields=files(id)`,
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

export const performSync = async (): Promise<{ success: boolean; error?: string; lastSync?: string }> => {
  if (!isNativeBuild()) return { success: false, error: 'not_native' };

  const connected = await isGoogleConnected();
  if (!connected) return { success: false, error: 'Nao conectado' };

  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    const accessToken = await getAccessToken();
    let fileId = await getSetting('google_file_id');
    if (!fileId) fileId = await findExistingFile(accessToken);

    const result = await uploadToDrive(accessToken, fileId);

    if (result.error === 'TOKEN_EXPIRED') {
      try {
        await GoogleSignin.signInSilently();
        const freshToken = await getAccessToken();
        const retry = await uploadToDrive(freshToken, fileId);
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