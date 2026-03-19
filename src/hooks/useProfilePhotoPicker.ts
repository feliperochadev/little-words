import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useI18n } from '../i18n/i18n';
import { useRemoveProfilePhoto } from './useAssets';

export interface UseProfilePhotoPickerOptions {
  onPhotoSelected: (asset: ImagePicker.ImagePickerAsset) => void | Promise<void>;
  onPhotoRemoved?: () => void | Promise<void>;
}

/**
 * Encapsulates the full profile photo picker UX:
 * - Camera / library source picker via Alert
 * - Permission requests with denied-alert fallback
 * - Remove photo confirm dialog
 *
 * Consumers provide callbacks for what happens after a photo is selected or removed.
 */
export function useProfilePhotoPicker({
  onPhotoSelected,
  onPhotoRemoved,
}: UseProfilePhotoPickerOptions) {
  const { t } = useI18n();
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const removeProfilePhoto = useRemoveProfilePhoto();

  const launchPicker = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('settings.photoPermissionDenied'));
        setPickingPhoto(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        await onPhotoSelected(result.assets[0]);
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('settings.photoPermissionDenied'));
        setPickingPhoto(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        await onPhotoSelected(result.assets[0]);
      }
    }
    setPickingPhoto(false);
  };

  const handlePickPhoto = () => {
    if (pickingPhoto) return;
    setPickingPhoto(true);
    Alert.alert(
      t('settings.photoSourceTitle'),
      undefined,
      [
        { text: t('settings.photoSourceCamera'), onPress: () => { void launchPicker('camera'); } },
        { text: t('settings.photoSourceGallery'), onPress: () => { void launchPicker('library'); } },
        { text: t('common.cancel'), style: 'cancel', onPress: () => setPickingPhoto(false) },
      ],
    );
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      t('settings.removePhoto'),
      t('settings.removePhotoConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.removePhoto'),
          style: 'destructive',
          onPress: async () => {
            await removeProfilePhoto.mutateAsync();
            await onPhotoRemoved?.();
          },
        },
      ],
    );
  };

  return { pickingPhoto, handlePickPhoto, handleRemovePhoto };
}
