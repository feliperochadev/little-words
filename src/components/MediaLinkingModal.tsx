import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Animated, Image, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useI18n, useCategoryName } from '../i18n/i18n';
import { useModalAnimation } from '../hooks/useModalAnimation';
import { useWords } from '../hooks/useWords';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useMediaCapture } from '../hooks/useMediaCapture';
import { useWaveformAnimation } from '../hooks/useWaveformAnimation';
import { DatePickerField } from './DatePickerField';
import { Button } from './UIComponents';
import { withOpacity } from '../utils/colorHelpers';
import { WAVEFORM } from '../utils/animationConstants';
import type { Word } from '../types/domain';

const EMPTY_WORDS: Word[] = [];

export function MediaLinkingModal() {
  const { t } = useI18n();
  const categoryName = useCategoryName();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const {
    phase,
    pendingMedia,
    resetCapture,
    linkMediaToWord,
    startCreateWord,
  } = useMediaCapture();

  const visible = phase === 'linking';
  const { translateY, backdropOpacity, dismissModal, panResponder } = useModalAnimation(visible, () => {
    resetCapture();
  });

  const { data: words = EMPTY_WORDS } = useWords();
  const audioPlayer = useAudioPlayer();

  const [mediaName, setMediaName] = useState('');
  const [wordSearch, setWordSearch] = useState('');
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [dateAdded, setDateAdded] = useState(today);
  const [loading, setLoading] = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);

  // Waveform animation for audio playback preview
  const linkingBarHeights = useWaveformAnimation(audioPlayer.isPlaying);

  // Reset form state when modal opens; close photo expanded when modal closes
  useEffect(() => {
    setPhotoExpanded(false);
    if (visible) {
      setMediaName('');
      setWordSearch('');
      setSelectedWord(null);
      setDateAdded(today);
      setLoading(false);
    }
  }, [visible, today]);

  // Cleanup audio player when modal closes
  useEffect(() => {
    if (!visible) {
      audioPlayer.stop().catch(() => {});
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // PanResponder for swipe-down to dismiss full-screen photo
  const photoDismissPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) setPhotoExpanded(false);
      },
    })
  ).current;

  const filtered = wordSearch.trim()
    ? words.filter(w => w.word.toLowerCase().includes(wordSearch.toLowerCase()))
    : [];

  const handleLink = async () => {
    if (!selectedWord) return;
    setLoading(true);
    try {
      await linkMediaToWord(selectedWord.id, mediaName, selectedWord.word);
      router.push('/(tabs)/words');
    } catch {
      // Error handled by provider (shows Alert)
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWord = () => {
    startCreateWord(wordSearch.trim(), mediaName);
  };

  const handlePlayPreview = () => {
    if (pendingMedia?.type !== 'audio') return;
    if (audioPlayer.isPlaying) {
      void audioPlayer.stop();
    } else {
      void audioPlayer.play(pendingMedia.uri);
    }
  };

  if (!pendingMedia) return null;

  const isAudio = pendingMedia.type === 'audio';
  const showResults = wordSearch.trim().length > 0;

  return (
    <>
      <Modal visible={visible} animationType="none" transparent onRequestClose={dismissModal}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissModal} />
        </Animated.View>
        <View style={s.overlay} pointerEvents="box-none">
          <Animated.View style={[s.container, { paddingBottom: 24 + insets.bottom, transform: [{ translateY }], backgroundColor: colors.background }]}>
            <View style={s.handleWrap} {...panResponder.panHandlers}>
              <View style={[s.handle, { backgroundColor: colors.textMuted }]} />
            </View>

            <Text style={[s.title, { color: colors.text }]} testID="media-linking-title">
              {isAudio ? t('mediaCapture.addAudioTitle') : t('mediaCapture.addPhotoTitle')}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* ── Preview ── */}
              <View style={[s.previewSection, { backgroundColor: withOpacity(colors.primary, '10'), borderColor: withOpacity(colors.primary, '30') }]} testID="media-preview">
                {isAudio ? (
                  <TouchableOpacity style={s.audioPreview} onPress={handlePlayPreview} testID="media-preview-play">
                    <Ionicons
                      name={audioPlayer.isPlaying ? 'stop-circle' : 'play-circle'}
                      size={40}
                      color={colors.primary}
                    />
                    {/* Waveform bars — animate when playing */}
                    <View style={s.audioWaveformContainer} testID="media-preview-waveform">
                      {linkingBarHeights.map((bar, i) => (
                        <Animated.View
                          key={bar.id}
                          style={[
                            s.audioWaveformBar,
                            {
                              height: bar.anim,
                              backgroundColor: colors.primary,
                              opacity: 0.4 + (i / WAVEFORM.BAR_COUNT) * 0.6,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[s.audioDuration, { color: colors.textSecondary }]}>
                      {formatDuration(pendingMedia.durationMs ?? 0)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setPhotoExpanded(true)}
                    testID="media-preview-photo-tap"
                  >
                    <Image
                      source={{ uri: pendingMedia.uri }}
                      style={s.photoPreview}
                      resizeMode="cover"
                      testID="media-preview-photo"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Name ── */}
              <Text style={[s.label, { color: colors.textSecondary }]}>
                {t('mediaCapture.nameLabel')}
              </Text>
              <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}>
                <TextInput
                  style={[s.searchInput, { color: colors.text }]}
                  value={mediaName}
                  onChangeText={setMediaName}
                  placeholder={t('mediaCapture.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  testID="media-name-input"
                />
              </View>

              {/* ── Date ── */}
              <DatePickerField label={t('common.date')} value={dateAdded} onChange={setDateAdded} accentColor={colors.primary} />

              {/* ── Word search ── */}
              <Text style={[s.label, { color: colors.textSecondary }]}>
                {t('mediaCapture.targetWord')}
              </Text>

              {selectedWord ? (
                <TouchableOpacity
                  style={[s.chosenChip, { backgroundColor: withOpacity(colors.primary, '15'), borderColor: colors.primary }]}
                  onPress={() => setSelectedWord(null)}
                  testID="media-selected-word"
                >
                  <View style={s.chosenInfo}>
                    <Text style={[s.chosenText, { color: colors.primary }]}>{selectedWord.word}</Text>
                    {selectedWord.category_name && (
                      <Text style={[s.chosenMeta, { color: colors.textSecondary }]}>
                        {selectedWord.category_emoji} {categoryName(selectedWord.category_name)}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.chosenClear, { color: colors.primary }]}>✕</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
                    <TextInput
                      style={[s.searchInput, { color: colors.text }]}
                      value={wordSearch}
                      onChangeText={setWordSearch}
                      placeholder={t('mediaCapture.searchPlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      testID="media-word-search"
                    />
                    {wordSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setWordSearch('')} testID="media-word-search-clear">
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {showResults && (
                    <View style={[s.resultsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {filtered.length === 0 ? (
                        <Text style={[s.noResults, { color: colors.textSecondary }]}>
                          {t('mediaCapture.noResults')}
                        </Text>
                      ) : (
                        filtered.slice(0, 7).map(w => (
                          <TouchableOpacity
                            key={w.id}
                            style={[s.resultItem, { borderBottomColor: colors.border }]}
                            onPress={() => { setSelectedWord(w); setWordSearch(''); }}
                            testID={`media-word-result-${w.word}`}
                          >
                            <Text style={[s.resultText, { color: colors.text }]}>{w.word}</Text>
                            {w.category_name && (
                              <Text style={[s.resultMeta, { color: colors.textSecondary }]}>
                                {w.category_emoji} {categoryName(w.category_name)}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))
                      )}
                      {wordSearch.trim().length > 0 && (
                        <TouchableOpacity
                          style={[s.createBtn, { borderTopColor: colors.border }]}
                          onPress={handleCreateWord}
                          testID="media-create-word-btn"
                        >
                          <Ionicons name="add-circle" size={18} color={colors.primary} />
                          <Text style={[s.createBtnText, { color: colors.primary }]}>
                            {t('mediaCapture.createNew')} &ldquo;{wordSearch.trim()}&rdquo;
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* ── Actions ── */}
              <View style={s.actions}>
                <Button
                  title={t('common.cancel')}
                  onPress={dismissModal}
                  variant="outline"
                  style={s.actionBtn}
                  testID="media-cancel-btn"
                />
                <Button
                  title={t('mediaCapture.saveButton')}
                  onPress={handleLink}
                  loading={loading}
                  style={[s.actionBtn, !selectedWord && s.btnDisabled]}
                  testID="media-link-btn"
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Full-screen photo preview */}
      <Modal
        visible={photoExpanded}
        animationType="fade"
        transparent
        onRequestClose={() => setPhotoExpanded(false)}
        testID="media-photo-fullscreen-modal"
      >
        <View style={s.photoFullscreenContainer} {...photoDismissPan.panHandlers}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Image
              source={{ uri: pendingMedia.uri }}
              style={s.photoFullscreenImage}
              resizeMode="contain"
              testID="media-photo-fullscreen"
            />
          </View>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPhotoExpanded(false)}
            testID="media-photo-fullscreen-dismiss"
          />
        </View>
      </Modal>
    </>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' },
  handleWrap: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewSection: { borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 16, alignItems: 'center' },
  audioPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  audioWaveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: WAVEFORM.BAR_GAP,
    height: WAVEFORM.PLAYBACK_MAX_HEIGHT,
  },
  audioWaveformBar: {
    width: WAVEFORM.BAR_WIDTH,
    borderRadius: 2,
  },
  audioDuration: { fontSize: 13, minWidth: 36, textAlign: 'right' },
  photoPreview: { width: 120, height: 120, borderRadius: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, marginBottom: 6 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  resultsList: { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', marginBottom: 16 },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  resultText: { fontSize: 16, fontWeight: '700' },
  resultMeta: { fontSize: 12 },
  noResults: { textAlign: 'center', padding: 16, fontSize: 14 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
  createBtnText: { fontSize: 14, fontWeight: '700' },
  chosenChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 2, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  chosenInfo: { flex: 1 },
  chosenText: { fontSize: 17, fontWeight: '800' },
  chosenMeta: { fontSize: 12, marginTop: 2 },
  chosenClear: { fontSize: 16, fontWeight: '600', paddingLeft: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  actionBtn: { flex: 1 },
  btnDisabled: { opacity: 0.5 },
  // Full-screen photo
  photoFullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
