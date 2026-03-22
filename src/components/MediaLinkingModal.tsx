import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ScrollView, Animated, Image, PanResponder, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useI18n, useCategoryName } from '../i18n/i18n';
import { useModalAnimation } from '../hooks/useModalAnimation';
import { useWords } from '../hooks/useWords';
import { useAllVariants, useAddVariant } from '../hooks/useVariants';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useMediaCapture } from '../hooks/useMediaCapture';
import { useWaveformAnimation } from '../hooks/useWaveformAnimation';
import { DatePickerField } from './DatePickerField';
import { Button } from './UIComponents';
import { withOpacity } from '../utils/colorHelpers';
import { WAVEFORM } from '../utils/animationConstants';
import type { Word, Variant } from '../types/domain';

const EMPTY_WORDS: Word[] = [];
const EMPTY_VARIANTS: Variant[] = [];

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
    linkMediaToVariant,
    saveWithoutLinking,
    startCreateWord,
  } = useMediaCapture();

  const visible = phase === 'linking';
  const { translateY, backdropOpacity, dismissModal, panResponder } = useModalAnimation(visible, () => {
    resetCapture();
  });

  const { data: words = EMPTY_WORDS } = useWords();
  const { data: variants = EMPTY_VARIANTS } = useAllVariants();
  const addVariantMutation = useAddVariant();
  const audioPlayer = useAudioPlayer();

  const [mediaName, setMediaName] = useState('');
  const [linkMode, setLinkMode] = useState<'none' | 'word' | 'variant'>('none');
  const [wordSearch, setWordSearch] = useState('');
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [variantSearch, setVariantSearch] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [inlineVariantName, setInlineVariantName] = useState('');
  const [inlineWordSearch, setInlineWordSearch] = useState('');
  const [inlineSelectedWord, setInlineSelectedWord] = useState<Word | null>(null);
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
      setLinkMode('none');
      setWordSearch('');
      setSelectedWord(null);
      setVariantSearch('');
      setSelectedVariant(null);
      setShowInlineCreate(false);
      setInlineVariantName('');
      setInlineWordSearch('');
      setInlineSelectedWord(null);
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

  const handleLink = async () => {
    setLoading(true);
    try {
      if (selectedVariant) {
        await linkMediaToVariant(
          selectedVariant.id,
          mediaName,
          selectedVariant.variant,
          selectedVariant.main_word ?? undefined,
        );
        router.push({ pathname: '/(tabs)/variants', params: { highlightId: String(selectedVariant.id) } });
      } else if (selectedWord) {
        await linkMediaToWord(selectedWord.id, mediaName, selectedWord.word);
        router.push({ pathname: '/(tabs)/words', params: { highlightId: String(selectedWord.id) } });
      } else {
        await saveWithoutLinking(mediaName);
        router.push({ pathname: '/(tabs)/media' });
      }
    } catch {
      // Error handled by provider (shows Alert)
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInlineVariant = async () => {
    if (!inlineSelectedWord || !inlineVariantName.trim()) return;
    setLoading(true);
    try {
      const newId = await addVariantMutation.mutateAsync({
        wordId: inlineSelectedWord.id,
        variant: inlineVariantName.trim(),
        dateAdded,
      });
      await linkMediaToVariant(
        newId,
        mediaName,
        inlineVariantName.trim(),
        inlineSelectedWord.word,
      );
      router.push({ pathname: '/(tabs)/variants', params: { highlightId: String(newId) } });
    } catch {
      Alert.alert(t('common.error'), t('mediaCapture.linkFailed'));
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
                    <Text style={[s.audioPosition, { color: colors.textSecondary }]} testID="media-preview-position">
                      {formatDuration(audioPlayer.positionMs)}
                    </Text>
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
                    <Text style={[s.audioDuration, { color: colors.textSecondary }]} testID="media-preview-duration">
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

              {/* ── Link mode buttons / active section ── */}

              {linkMode === 'none' && !selectedWord && !selectedVariant && (
                <View style={s.linkBtnRow}>
                  <TouchableOpacity
                    style={[s.linkBtn, { borderColor: colors.primary, backgroundColor: withOpacity(colors.primary, '08') }]}
                    onPress={() => setLinkMode('word')}
                    testID="media-link-word-btn"
                  >
                    <Ionicons name="book-outline" size={16} color={colors.primary} />
                    <Text style={[s.linkBtnText, { color: colors.primary }]}>{t('mediaCapture.linkToWord')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.linkBtn, { borderColor: colors.primary, backgroundColor: withOpacity(colors.primary, '08') }]}
                    onPress={() => setLinkMode('variant')}
                    testID="media-link-variant-btn"
                  >
                    <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                    <Text style={[s.linkBtnText, { color: colors.primary }]}>{t('mediaCapture.linkToVariant')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {(linkMode === 'word' || !!selectedWord) && (
                <WordLinkSection
                  words={words}
                  wordSearch={wordSearch}
                  selectedWord={selectedWord}
                  categoryName={categoryName}
                  onModeCancel={() => { setLinkMode('none'); setWordSearch(''); }}
                  onWordSelect={(w) => { setSelectedWord(w); setWordSearch(''); }}
                  onWordSearchChange={setWordSearch}
                  onWordDeselect={() => { setSelectedWord(null); setLinkMode('none'); }}
                  onCreateWord={handleCreateWord}
                />
              )}

              {(linkMode === 'variant' || !!selectedVariant) && (
                <VariantLinkSection
                  variants={variants}
                  words={words}
                  variantSearch={variantSearch}
                  selectedVariant={selectedVariant}
                  showInlineCreate={showInlineCreate}
                  inlineVariantName={inlineVariantName}
                  inlineWordSearch={inlineWordSearch}
                  inlineSelectedWord={inlineSelectedWord}
                  loading={loading}
                  onModeCancel={() => {
                    setLinkMode('none');
                    setVariantSearch('');
                    setShowInlineCreate(false);
                    setInlineVariantName('');
                    setInlineSelectedWord(null);
                    setInlineWordSearch('');
                  }}
                  onVariantSelect={(v) => { setSelectedVariant(v); setVariantSearch(''); }}
                  onVariantSearchChange={setVariantSearch}
                  onVariantDeselect={() => { setSelectedVariant(null); setLinkMode('none'); }}
                  onShowInlineCreate={() => setShowInlineCreate(true)}
                  onInlineVariantNameChange={setInlineVariantName}
                  onInlineWordSearchChange={setInlineWordSearch}
                  onInlineWordSelect={(w) => { setInlineSelectedWord(w); setInlineWordSearch(''); }}
                  onInlineWordDeselect={() => setInlineSelectedWord(null)}
                  onCreateInlineVariant={handleCreateInlineVariant}
                />
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
                  onPress={() => void handleLink()}
                  loading={loading}
                  style={s.actionBtn}
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

// ─── Sub-components ───────────────────────────────────────────────────────────

interface WordLinkSectionProps {
  words: Word[];
  wordSearch: string;
  selectedWord: Word | null;
  categoryName: (name: string) => string;
  onModeCancel: () => void;
  onWordSelect: (word: Word) => void;
  onWordSearchChange: (text: string) => void;
  onWordDeselect: () => void;
  onCreateWord: () => void;
}

function WordLinkSection({
  words, wordSearch, selectedWord, categoryName,
  onModeCancel, onWordSelect, onWordSearchChange, onWordDeselect, onCreateWord,
}: WordLinkSectionProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const filteredWords = wordSearch.trim()
    ? words.filter(w => w.word.toLowerCase().includes(wordSearch.toLowerCase()))
    : [];
  const showResults = wordSearch.trim().length > 0;

  if (selectedWord) {
    return (
      <TouchableOpacity
        style={[s.chosenChip, { backgroundColor: withOpacity(colors.primary, '15'), borderColor: colors.primary }]}
        onPress={onWordDeselect}
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
    );
  }

  return (
    <>
      <View style={s.sectionHeaderRow}>
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
          {t('mediaCapture.linkToWord')}
        </Text>
        <TouchableOpacity
          onPress={onModeCancel}
          testID="media-word-section-cancel"
          style={s.sectionCancelBtn}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          value={wordSearch}
          onChangeText={onWordSearchChange}
          placeholder={t('mediaCapture.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          testID="media-word-search"
        />
        {wordSearch.length > 0 && (
          <TouchableOpacity onPress={() => onWordSearchChange('')} testID="media-word-search-clear">
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {showResults && (
        <View style={[s.resultsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {filteredWords.length === 0 ? (
            <Text style={[s.noResults, { color: colors.textSecondary }]}>
              {t('mediaCapture.noResults')}
            </Text>
          ) : (
            filteredWords.slice(0, 7).map(w => (
              <TouchableOpacity
                key={w.id}
                style={[s.resultItem, { borderBottomColor: colors.border }]}
                onPress={() => onWordSelect(w)}
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
              onPress={onCreateWord}
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
  );
}

interface VariantLinkSectionProps {
  variants: Variant[];
  words: Word[];
  variantSearch: string;
  selectedVariant: Variant | null;
  showInlineCreate: boolean;
  inlineVariantName: string;
  inlineWordSearch: string;
  inlineSelectedWord: Word | null;
  loading: boolean;
  onModeCancel: () => void;
  onVariantSelect: (variant: Variant) => void;
  onVariantSearchChange: (text: string) => void;
  onVariantDeselect: () => void;
  onShowInlineCreate: () => void;
  onInlineVariantNameChange: (text: string) => void;
  onInlineWordSearchChange: (text: string) => void;
  onInlineWordSelect: (word: Word) => void;
  onInlineWordDeselect: () => void;
  onCreateInlineVariant: () => void;
}

function VariantLinkSection({
  variants, words, variantSearch, selectedVariant, showInlineCreate,
  inlineVariantName, inlineWordSearch, inlineSelectedWord, loading,
  onModeCancel, onVariantSelect, onVariantSearchChange, onVariantDeselect,
  onShowInlineCreate, onInlineVariantNameChange, onInlineWordSearchChange,
  onInlineWordSelect, onInlineWordDeselect, onCreateInlineVariant,
}: VariantLinkSectionProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const filteredVariants = variantSearch.trim()
    ? variants.filter(v =>
        v.variant.toLowerCase().includes(variantSearch.toLowerCase()) ||
        (v.main_word ?? '').toLowerCase().includes(variantSearch.toLowerCase())
      )
    : [];
  const showVariantResults = variantSearch.trim().length > 0;
  const variantNotFoundVisible = variantSearch.trim().length > 0 && filteredVariants.length === 0;
  const inlineFilteredWords = inlineWordSearch.trim()
    ? words.filter(w => w.word.toLowerCase().includes(inlineWordSearch.toLowerCase()))
    : [];

  if (selectedVariant) {
    return (
      <TouchableOpacity
        style={[s.chosenChip, { backgroundColor: withOpacity(colors.primary, '15'), borderColor: colors.primary }]}
        onPress={onVariantDeselect}
        testID="media-selected-variant"
      >
        <View style={s.chosenInfo}>
          <Text style={[s.chosenText, { color: colors.primary }]}>
            {selectedVariant.main_word} / {selectedVariant.variant}
          </Text>
        </View>
        <Text style={[s.chosenClear, { color: colors.primary }]}>✕</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <View style={s.sectionHeaderRow}>
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
          {t('mediaCapture.linkToVariant')}
        </Text>
        <TouchableOpacity
          onPress={onModeCancel}
          testID="media-variant-section-cancel"
          style={s.sectionCancelBtn}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          value={variantSearch}
          onChangeText={onVariantSearchChange}
          placeholder={t('mediaCapture.variantSearchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          testID="media-variant-search"
        />
        {variantSearch.length > 0 && (
          <TouchableOpacity onPress={() => onVariantSearchChange('')} testID="media-variant-search-clear">
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {showVariantResults && !variantNotFoundVisible && (
        <View style={[s.resultsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {filteredVariants.slice(0, 7).map(v => (
            <TouchableOpacity
              key={v.id}
              style={[s.resultItem, { borderBottomColor: colors.border }]}
              onPress={() => onVariantSelect(v)}
              testID={`media-variant-result-${v.variant}`}
            >
              <Text style={[s.resultText, { color: colors.text }]}>
                {v.main_word} / {v.variant}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {variantNotFoundVisible && (
        <View style={[s.variantNotFound, { backgroundColor: withOpacity(colors.primary, '08'), borderColor: withOpacity(colors.primary, '20') }]} testID="media-variant-not-found">
          <Text style={[s.variantNotFoundText, { color: colors.textSecondary }]}>
            {t('mediaCapture.variantNotFound', { name: variantSearch.trim() })}
          </Text>
          <TouchableOpacity
            style={[s.createVariantBtn, { backgroundColor: colors.primary }]}
            onPress={onShowInlineCreate}
            testID="media-create-variant-btn"
          >
            <Ionicons name="add-circle" size={16} color="#fff" />
            <Text style={s.createVariantBtnText}>{t('mediaCapture.createVariantInline')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {showInlineCreate && (
        <InlineVariantCreateForm
          inlineVariantName={inlineVariantName}
          inlineWordSearch={inlineWordSearch}
          inlineSelectedWord={inlineSelectedWord}
          inlineFilteredWords={inlineFilteredWords}
          loading={loading}
          onInlineVariantNameChange={onInlineVariantNameChange}
          onInlineWordSearchChange={onInlineWordSearchChange}
          onInlineWordSelect={onInlineWordSelect}
          onInlineWordDeselect={onInlineWordDeselect}
          onCreateInlineVariant={onCreateInlineVariant}
        />
      )}
    </>
  );
}

interface InlineVariantCreateFormProps {
  inlineVariantName: string;
  inlineWordSearch: string;
  inlineSelectedWord: Word | null;
  inlineFilteredWords: Word[];
  loading: boolean;
  onInlineVariantNameChange: (text: string) => void;
  onInlineWordSearchChange: (text: string) => void;
  onInlineWordSelect: (word: Word) => void;
  onInlineWordDeselect: () => void;
  onCreateInlineVariant: () => void;
}

function InlineVariantCreateForm({
  inlineVariantName, inlineWordSearch, inlineSelectedWord, inlineFilteredWords, loading,
  onInlineVariantNameChange, onInlineWordSearchChange, onInlineWordSelect,
  onInlineWordDeselect, onCreateInlineVariant,
}: InlineVariantCreateFormProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View style={[s.inlineCreate, { backgroundColor: colors.surface, borderColor: colors.border }]} testID="media-inline-create-form">
      <Text style={[s.label, { color: colors.textSecondary }]}>
        {t('mediaCapture.inlineVariantName')}
      </Text>
      <View style={[s.searchBox, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 12 }]}>
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          value={inlineVariantName}
          onChangeText={onInlineVariantNameChange}
          placeholder={t('mediaCapture.inlineVariantName')}
          placeholderTextColor={colors.textMuted}
          testID="media-inline-variant-name-input"
        />
      </View>
      <Text style={[s.label, { color: colors.textSecondary }]}>
        {t('mediaCapture.selectWord')}
      </Text>
      {inlineSelectedWord ? (
        <TouchableOpacity
          style={[s.chosenChip, { backgroundColor: withOpacity(colors.primary, '10'), borderColor: colors.primary, marginBottom: 12 }]}
          onPress={onInlineWordDeselect}
          testID="media-inline-word-selected"
        >
          <Text style={[s.chosenText, { color: colors.primary }]}>{inlineSelectedWord.word}</Text>
          <Text style={[s.chosenClear, { color: colors.primary }]}>✕</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={[s.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              value={inlineWordSearch}
              onChangeText={onInlineWordSearchChange}
              placeholder={t('mediaCapture.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              testID="media-inline-word-search"
            />
          </View>
          {inlineWordSearch.trim().length > 0 && (
            <View style={[s.resultsList, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {inlineFilteredWords.length === 0 ? (
                <Text style={[s.noResults, { color: colors.textSecondary }]}>
                  {t('mediaCapture.noResults')}
                </Text>
              ) : (
                inlineFilteredWords.slice(0, 5).map(w => (
                  <TouchableOpacity
                    key={w.id}
                    style={[s.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => onInlineWordSelect(w)}
                    testID={`media-inline-word-result-${w.word}`}
                  >
                    <Text style={[s.resultText, { color: colors.text }]}>{w.word}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </>
      )}
      <Button
        title={t('mediaCapture.createVariantInline')}
        onPress={onCreateInlineVariant}
        loading={loading}
        style={[!inlineSelectedWord || !inlineVariantName.trim() ? s.btnDisabled : null]}
        testID="media-inline-create-save-btn"
      />
    </View>
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
  audioPreview: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  audioWaveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: WAVEFORM.PLAYBACK_MAX_HEIGHT,
  },
  audioWaveformBar: {
    width: WAVEFORM.BAR_WIDTH,
    borderRadius: 2,
  },
  audioDuration: { fontSize: 13, minWidth: 30, textAlign: 'right', marginLeft: 4 },
  audioPosition: { fontSize: 13, minWidth: 30, textAlign: 'left', marginRight: 4, marginLeft: 10 },
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
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  sectionCancelBtn: { padding: 4 },
  linkBtnRow: { flexDirection: 'column', gap: 12, marginBottom: 16, marginTop: 8 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5 },
  linkBtnText: { fontSize: 13, fontWeight: '700' },
  variantNotFound: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  variantNotFoundText: { fontSize: 13, marginBottom: 10 },
  createVariantBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
  createVariantBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  inlineCreate: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 12 },
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
