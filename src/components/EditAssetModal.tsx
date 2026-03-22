import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ScrollView, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/i18n';
import { useModalAnimation } from '../hooks/useModalAnimation';
import { useWords } from '../hooks/useWords';
import { useAllVariants } from '../hooks/useVariants';
import { useRelinkAsset, useRenameAsset, useRemoveAsset, useUpdateAssetDate } from '../hooks/useAssets';
import { AudioPreviewOverlay } from './AudioPreviewOverlay';
import { PhotoPreviewOverlay } from './PhotoPreviewOverlay';
import { DatePickerField } from './DatePickerField';
import { Button } from './UIComponents';
import { getAssetFileUri } from '../utils/assetStorage';
import { withOpacity } from '../utils/colorHelpers';
import { theme } from '../theme';
import type { AssetWithLink } from '../types/asset';
import type { Word, Variant } from '../types/domain';

const EMPTY_WORDS: Word[] = [];
const EMPTY_VARIANTS: Variant[] = [];

interface Props {
  visible: boolean;
  asset: AssetWithLink | null;
  onClose: () => void;
}

type LinkTarget = { type: 'word'; id: number; label: string } | { type: 'variant'; id: number; label: string };
type EditLinkMode = 'none' | 'word' | 'variant';

export function EditAssetModal({ visible, asset, onClose }: Readonly<Props>) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [editLinkMode, setEditLinkMode] = useState<EditLinkMode>('none');
  const [wordSearch, setWordSearch] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const [selectedLink, setSelectedLink] = useState<LinkTarget | null>(null);
  const [audioOverlay, setAudioOverlay] = useState<{ uri: string; name: string; createdAt: string; durationMs?: number | null } | null>(null);
  const [photoOverlay, setPhotoOverlay] = useState<{ uri: string; name: string; createdAt: string } | null>(null);

  const { data: words = EMPTY_WORDS } = useWords();
  const { data: variants = EMPTY_VARIANTS } = useAllVariants();
  const relinkAsset = useRelinkAsset();
  const renameAsset = useRenameAsset();
  const removeAsset = useRemoveAsset();
  const updateAssetDate = useUpdateAssetDate();

  const handleClose = () => onClose();
  const { translateY, backdropOpacity, dismissModal, panResponder } = useModalAnimation(visible, handleClose);

  useEffect(() => {
    if (visible && asset) {
      setName(asset.name ?? asset.filename);
      setDate(asset.created_at.split(/[T ]/)[0]);
      setEditLinkMode('none');
      setWordSearch('');
      setVariantSearch('');
      setAudioOverlay(null);
      setPhotoOverlay(null);
      if (asset.parent_type === 'word' && asset.linked_word) {
        setSelectedLink({ type: 'word', id: asset.parent_id, label: asset.linked_word });
      } else if (asset.parent_type === 'variant' && asset.linked_variant) {
        setSelectedLink({ type: 'variant', id: asset.parent_id, label: asset.linked_variant });
      } else {
        setSelectedLink(null);
      }
    }
  }, [visible, asset]);

  if (!asset) return null;

  const filteredWords = wordSearch.trim()
    ? words.filter(w => w.word.toLowerCase().includes(wordSearch.toLowerCase()))
    : [];
  const filteredVariants = variantSearch.trim()
    ? variants.filter(v => v.variant.toLowerCase().includes(variantSearch.toLowerCase()))
    : [];

  const handleSave = async () => {
    const currentName = asset.name ?? asset.filename;
    const nameChanged = (name.trim() || asset.filename) !== currentName;
    const originalDate = asset.created_at.split(/[T ]/)[0];
    const dateChanged = date !== originalDate;
    const linkChanged = selectedLink
      ? (selectedLink.type !== asset.parent_type || selectedLink.id !== asset.parent_id)
      : false;

    try {
      if (nameChanged && name.trim()) {
        await renameAsset.mutateAsync({ id: asset.id, name: name.trim() });
      }
      if (dateChanged && date) {
        await updateAssetDate.mutateAsync({ id: asset.id, date });
      }
      if (linkChanged && selectedLink) {
        await relinkAsset.mutateAsync({
          asset,
          newParentType: selectedLink.type,
          newParentId: selectedLink.id,
        });
      }
      onClose();
    } catch {
      Alert.alert(t('media.removeConfirmTitle'), t('media.removeConfirmMessage'));
    }
  };

  const handleRemove = () => {
    Alert.alert(
      t('media.removeConfirmTitle'),
      t('media.removeConfirmMessage'),
      [
        { text: t('media.removeConfirmCancel'), style: 'cancel' },
        {
          text: t('media.removeConfirmOk'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAsset.mutateAsync(asset);
              onClose();
            } catch {
              Alert.alert(t('media.removeConfirmTitle'), t('media.removeConfirmMessage'));
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = (): React.ComponentProps<typeof Ionicons>['name'] => {
    if (asset.asset_type === 'audio') return 'musical-notes';
    if (asset.asset_type === 'photo') return 'image';
    return 'videocam';
  };
  const typeIcon = getTypeIcon();

  const getTypeLabel = (): string => {
    if (asset.asset_type === 'audio') return t('media.typeAudio');
    if (asset.asset_type === 'photo') return t('media.typePhoto');
    return t('media.typeVideo');
  };
  const typeLabel = getTypeLabel();

  const isInteractiveType = asset.asset_type === 'audio' || asset.asset_type === 'photo';

  const handleTypeIconPress = () => {
    const uri = getAssetFileUri(asset.parent_type, asset.parent_id, asset.asset_type, asset.filename);
    const displayName = asset.name ?? asset.filename;
    if (asset.asset_type === 'audio') {
      setAudioOverlay({ uri, name: displayName, createdAt: asset.created_at, durationMs: asset.duration_ms });
    } else if (asset.asset_type === 'photo') {
      setPhotoOverlay({ uri, name: displayName, createdAt: asset.created_at });
    }
  };

  const isSaving = relinkAsset.isPending || renameAsset.isPending || updateAssetDate.isPending;

  const cancelWordMode = () => { setEditLinkMode('none'); setWordSearch(''); };
  const cancelVariantMode = () => { setEditLinkMode('none'); setVariantSearch(''); };
  const clearLink = () => { setSelectedLink(null); setEditLinkMode('none'); setWordSearch(''); setVariantSearch(''); };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={dismissModal}
        testID="edit-asset-modal"
      >
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissModal} testID="edit-asset-backdrop" />
        </Animated.View>
        <View style={s.overlay} pointerEvents="box-none">
          <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: theme.colors.surface, transform: [{ translateY }] }]}>
            <View style={s.handleWrap} {...panResponder.panHandlers}>
              <View style={[s.handle, { backgroundColor: theme.colors.textMuted }]} />
            </View>

            <View style={s.header}>
              <TouchableOpacity
                onPress={isInteractiveType ? handleTypeIconPress : undefined}
                style={[s.typeIconBadge, { backgroundColor: withOpacity(colors.primary, '1A') }]}
                disabled={!isInteractiveType}
                testID="edit-asset-type-icon"
                activeOpacity={isInteractiveType ? 0.6 : 1}
              >
                <Ionicons name={typeIcon} size={18} color={colors.primary} />
                <Text style={[s.headerType, { color: colors.primary }]}>{typeLabel}</Text>
              </TouchableOpacity>
              <Text style={[s.headerTitle, { color: theme.colors.text }]}>{t('media.editTitle')}</Text>
              <TouchableOpacity onPress={handleRemove} testID="edit-asset-remove" style={s.removeBtn}>
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
              <Text style={[s.label, { color: theme.colors.textMuted }]}>{t('media.editNameLabel')}</Text>
              <TextInput
                style={[s.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.background }]}
                value={name}
                onChangeText={setName}
                placeholder={t('media.editNamePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                testID="edit-asset-name-input"
              />

              <View testID="edit-asset-date">
                <DatePickerField
                  label={t('media.editDateLabel')}
                  value={date}
                  onChange={setDate}
                  accentColor={colors.primary}
                />
              </View>

              <Text style={[s.label, { color: theme.colors.textMuted }]}>{t('media.editLinkedLabel')}</Text>

              {/* Selected link chip */}
              {selectedLink && (
                <TouchableOpacity
                  style={[s.selectedChip, { backgroundColor: withOpacity(colors.primary, '15'), borderColor: colors.primary }]}
                  onPress={clearLink}
                  testID="edit-asset-selected-link"
                >
                  <Ionicons
                    name={selectedLink.type === 'word' ? 'book-outline' : 'chatbubble-outline'}
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[s.selectedChipText, { color: colors.primary }]} numberOfLines={1}>
                    {selectedLink.label}
                  </Text>
                  <Text style={[s.selectedChipClear, { color: colors.primary }]}>✕</Text>
                </TouchableOpacity>
              )}

              {/* Two mode buttons */}
              {!selectedLink && editLinkMode === 'none' && (
                <View style={s.linkBtnRow}>
                  <TouchableOpacity
                    style={[s.linkBtn, { borderColor: colors.primary, backgroundColor: withOpacity(colors.primary, '08') }]}
                    onPress={() => setEditLinkMode('word')}
                    testID="edit-asset-link-word-btn"
                  >
                    <Ionicons name="book-outline" size={15} color={colors.primary} />
                    <Text style={[s.linkBtnText, { color: colors.primary }]}>{t('mediaCapture.linkToWord')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.linkBtn, { borderColor: colors.primary, backgroundColor: withOpacity(colors.primary, '08') }]}
                    onPress={() => setEditLinkMode('variant')}
                    testID="edit-asset-link-variant-btn"
                  >
                    <Ionicons name="chatbubble-outline" size={15} color={colors.primary} />
                    <Text style={[s.linkBtnText, { color: colors.primary }]}>{t('mediaCapture.linkToVariant')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Word search section */}
              {!selectedLink && editLinkMode === 'word' && (
                <>
                  <View style={s.sectionHeaderRow}>
                    <Text style={[s.sectionLabel, { color: theme.colors.textMuted }]}>{t('mediaCapture.linkToWord')}</Text>
                    <TouchableOpacity onPress={cancelWordMode} testID="edit-asset-word-cancel" style={s.sectionCancelBtn}>
                      <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[s.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.background }]}
                    value={wordSearch}
                    onChangeText={setWordSearch}
                    placeholder={t('mediaCapture.searchPlaceholder')}
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                    testID="edit-asset-word-search"
                  />
                  {wordSearch.trim().length > 0 && (
                    <View style={[s.searchResults, { borderColor: theme.colors.border }]}>
                      {filteredWords.length === 0 ? (
                        <Text style={[s.noResults, { color: theme.colors.textMuted }]}>{t('mediaCapture.noResults')}</Text>
                      ) : (
                        filteredWords.map(w => (
                          <TouchableOpacity
                            key={`word-${w.id}`}
                            style={[s.resultRow, { borderBottomColor: theme.colors.border }]}
                            onPress={() => { setSelectedLink({ type: 'word', id: w.id, label: w.word }); setWordSearch(''); setEditLinkMode('none'); }}
                            testID={`edit-asset-link-word-${w.id}`}
                          >
                            <Ionicons name="book-outline" size={14} color={theme.colors.textMuted} />
                            <Text style={[s.resultLabel, { color: theme.colors.text }]}>{w.word}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </>
              )}

              {/* Variant search section */}
              {!selectedLink && editLinkMode === 'variant' && (
                <>
                  <View style={s.sectionHeaderRow}>
                    <Text style={[s.sectionLabel, { color: theme.colors.textMuted }]}>{t('mediaCapture.linkToVariant')}</Text>
                    <TouchableOpacity onPress={cancelVariantMode} testID="edit-asset-variant-cancel" style={s.sectionCancelBtn}>
                      <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[s.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.background }]}
                    value={variantSearch}
                    onChangeText={setVariantSearch}
                    placeholder={t('mediaCapture.searchPlaceholder')}
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                    testID="edit-asset-variant-search"
                  />
                  {variantSearch.trim().length > 0 && (
                    <View style={[s.searchResults, { borderColor: theme.colors.border }]}>
                      {filteredVariants.length === 0 ? (
                        <Text style={[s.noResults, { color: theme.colors.textMuted }]}>{t('mediaCapture.noResults')}</Text>
                      ) : (
                        filteredVariants.map(v => (
                          <TouchableOpacity
                            key={`variant-${v.id}`}
                            style={[s.resultRow, { borderBottomColor: theme.colors.border }]}
                            onPress={() => { setSelectedLink({ type: 'variant', id: v.id, label: v.variant }); setVariantSearch(''); setEditLinkMode('none'); }}
                            testID={`edit-asset-link-variant-${v.id}`}
                          >
                            <Ionicons name="chatbubble-ellipses-outline" size={14} color={theme.colors.textMuted} />
                            <Text style={[s.resultLabel, { color: theme.colors.text }]}>{v.variant}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={s.actions}>
              <Button
                title={t('media.editCancel')}
                onPress={dismissModal}
                variant="outline"
                style={s.actionBtn}
                testID="edit-asset-cancel"
              />
              <Button
                title={t('media.editSave')}
                onPress={handleSave}
                loading={isSaving}
                style={s.actionBtn}
                testID="edit-asset-save"
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      <AudioPreviewOverlay
        visible={!!audioOverlay}
        uri={audioOverlay?.uri ?? ''}
        name={audioOverlay?.name ?? ''}
        createdAt={audioOverlay?.createdAt ?? ''}
        durationMs={audioOverlay?.durationMs}
        onClose={() => setAudioOverlay(null)}
      />
      <PhotoPreviewOverlay
        visible={!!photoOverlay}
        uri={photoOverlay?.uri ?? ''}
        name={photoOverlay?.name ?? ''}
        createdAt={photoOverlay?.createdAt ?? ''}
        onClose={() => setPhotoOverlay(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  handleWrap: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  typeIconBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  headerType: { fontSize: 13, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  removeBtn: { padding: 4 },
  body: { paddingHorizontal: 16 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  selectedChipText: { flex: 1, fontSize: 14, fontWeight: '600' },
  selectedChipClear: { fontSize: 14, fontWeight: '700' },
  linkBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  linkBtnText: { fontSize: 13, fontWeight: '600' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '600' },
  sectionCancelBtn: { padding: 2 },
  searchResults: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  resultLabel: { fontSize: 14, flex: 1 },
  noResults: { padding: 12, textAlign: 'center', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  actionBtn: { flex: 1 },
});

