import { File as FSFile, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import {
  getKeepsakeState,
  setKeepsakeState,
  deleteKeepsakeState,
  getAllKeepsakePhotoOverrides,
  getEarliestWords,
  getWordPhotoFilename,
  getTotalWordCount,
} from '../repositories/keepsakeRepository';
import { getAssetFileUri } from '../utils/assetStorage';
import { MEDIA_ROOT_DIR } from '../types/asset';
import type { KeepsakeWord, KeepsakeState } from '../types/keepsake';
import type { RefObject } from 'react';
import type { View } from 'react-native';

const KEEPSAKE_DIR = `${MEDIA_ROOT_DIR}/keepsake`;
const KEEPSAKE_FILENAME = 'keepsake.jpg';

function getKeepsakeDirUri(): string {
  return `${Paths.document.uri}${KEEPSAKE_DIR}/`;
}

export function getKeepsakeFileUri(): string {
  return `${getKeepsakeDirUri()}${KEEPSAKE_FILENAME}`;
}

function ensureKeepsakeDir(): void {
  const dir = new Directory(getKeepsakeDirUri());
  if (!dir.exists) {
    dir.create();
  }
}

export function keepsakeFileExists(): boolean {
  try {
    const file = new FSFile(getKeepsakeFileUri());
    return file.exists;
  } catch {
    return false;
  }
}

export async function loadKeepsakeState(): Promise<KeepsakeState> {
  const generated = await getKeepsakeState('keepsake_generated');
  const generatedAt = await getKeepsakeState('keepsake_generated_at');
  const photoOverrides = await getAllKeepsakePhotoOverrides();

  const isGenerated = generated === 'true' && keepsakeFileExists();

  // Self-heal: if DB says generated but file is missing, fix it
  if (generated === 'true' && !keepsakeFileExists()) {
    await setKeepsakeState('keepsake_generated', 'false');
  }

  return {
    isGenerated,
    generatedAt: isGenerated ? generatedAt : null,
    photoOverrides,
  };
}

export async function getKeepsakeWords(): Promise<KeepsakeWord[]> {
  const words = await getEarliestWords(3);
  const overrides = await getAllKeepsakePhotoOverrides();

  return Promise.all(
    words.map(async (w) => {
      let photoUri: string | null = null;

      if (overrides[w.id]) {
        // User chose a custom photo — use the override URI directly
        photoUri = overrides[w.id];
      } else {
        // Default: first photo asset linked to this word
        const filename = await getWordPhotoFilename(w.id);
        if (filename) {
          photoUri = getAssetFileUri('word', w.id, 'photo', filename);
        }
      }

      return {
        id: w.id,
        word: w.word,
        dateAdded: w.date_added,
        photoUri,
        categoryEmoji: w.category_emoji,
      };
    }),
  );
}

export async function captureKeepsake(
  viewRef: RefObject<View | null>,
): Promise<string> {
  if (!viewRef.current) {
    throw new Error('Keepsake card view ref is not available');
  }

  const uri = await captureRef(viewRef.current, {
    format: 'jpg',
    quality: 0.92,
    width: 1080,
    height: 1920,
  });

  ensureKeepsakeDir();
  const destUri = getKeepsakeFileUri();

  const source = new FSFile(uri);
  const dest = new FSFile(destUri);
  if (dest.exists) {
    dest.delete();
  }
  source.copy(dest);

  await setKeepsakeState('keepsake_generated', 'true');
  await setKeepsakeState('keepsake_generated_at', new Date().toISOString());

  return destUri;
}

export async function setPhotoOverride(wordId: number, photoUri: string): Promise<void> {
  await setKeepsakeState(`photo_override_${wordId}`, photoUri);
}

export async function clearPhotoOverride(wordId: number): Promise<void> {
  await deleteKeepsakeState(`photo_override_${wordId}`);
}

export async function shareKeepsake(fileUri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'image/jpeg',
    dialogTitle: 'Share Keepsake',
  });
}

export async function saveKeepsakeToLibrary(fileUri: string): Promise<void> {
  const { granted } = await MediaLibrary.requestPermissionsAsync();
  if (!granted) {
    throw new Error('PERMISSION_DENIED');
  }
  await MediaLibrary.saveToLibraryAsync(fileUri);
}

export { getTotalWordCount };
