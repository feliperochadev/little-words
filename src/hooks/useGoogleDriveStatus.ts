import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSetting } from '../database/database';
import { getGoogleUserEmail, isGoogleConnected } from '../utils/googleDrive';

interface GoogleDriveStatus {
  googleConnected: boolean;
  googleEmail: string | null;
  lastSync: string | null;
  reloadGoogleState: () => Promise<void>;
}

export function useGoogleDriveStatus(): GoogleDriveStatus {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const reloadGoogleState = useCallback(async () => {
    const connected = await isGoogleConnected();
    setGoogleConnected(connected);
    if (!connected) {
      setGoogleEmail(null);
      setLastSync(null);
      return;
    }

    const [email, syncDate] = await Promise.all([
      getGoogleUserEmail(),
      getSetting('google_last_sync'),
    ]);
    setGoogleEmail(email);
    setLastSync(syncDate);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadGoogleState().catch((error) => {
        console.error('[GoogleDrive] Failed to reload state:', error);
        setGoogleConnected(false);
        setGoogleEmail(null);
        setLastSync(null);
      });
    }, [reloadGoogleState])
  );

  return {
    googleConnected,
    googleEmail,
    lastSync,
    reloadGoogleState,
  };
}
