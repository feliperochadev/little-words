import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useI18n } from '../../i18n/i18n';
import { useSettingsStore } from '../../stores/settingsStore';
import type { KeepsakeWord } from '../../types/keepsake';

const APP_ICON = require('../../../assets/icon_192.png');

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const BG_COLOR = '#FDFAF5';
const TEXT_DARK = '#2B3A4E';
const TEXT_LIGHT = '#8B7E74';
const POLAROID_BG = '#FFFFFF';
const PLACEHOLDER_BG = '#F0EBE3';

const QR_URLS: Record<string, string> = {
  'pt-BR': 'https://palavrinhas.app',
  'en-US': 'https://littlewordsapp.com',
};

// Seeded rotation per word ID for consistency
function getRotation(wordId: number, index: number): string {
  const seed = (wordId * 7 + index * 13) % 9 - 4; // range: -4 to 4
  return `${seed}deg`;
}

function formatDateForCard(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── Decorations ──────────────────────────────────────────────────────────────

interface DecorationItem {
  content: string;
  top: number;
  left: number;
  fontSize: number;
  opacity: number;
  color?: string;
  rotate?: string;
}

const DECORATIONS: DecorationItem[] = [
  // ── Top-left corner (balloon + stars) ──
  { content: '🎈', top: 35, left: 40, fontSize: 80, opacity: 0.6, rotate: '-10deg' },
  { content: '⭐', top: 55, left: 180, fontSize: 30, opacity: 0.45 },
  { content: '✦', top: 30, left: 230, fontSize: 20, opacity: 0.35, color: '#F4D35E' },
  { content: '✧', top: 115, left: 130, fontSize: 18, opacity: 0.3, color: '#B8D8D0' },
  { content: '·', top: 80, left: 280, fontSize: 28, opacity: 0.25, color: '#E8B4B8' },

  // ── Top-right corner (balloon + stars) ──
  { content: '🎈', top: 35, left: 920, fontSize: 80, opacity: 0.6, rotate: '10deg' },
  { content: '⭐', top: 60, left: 850, fontSize: 28, opacity: 0.4 },
  { content: '✦', top: 30, left: 790, fontSize: 22, opacity: 0.35, color: '#F4D35E' },
  { content: '✧', top: 110, left: 900, fontSize: 16, opacity: 0.3, color: '#B8D8D0' },
  { content: '·', top: 85, left: 740, fontSize: 26, opacity: 0.25, color: '#E8B4B8' },

  // ── Top center stars ──
  { content: '⭐', top: 25, left: 480, fontSize: 26, opacity: 0.35, rotate: '15deg' },
  { content: '✦', top: 65, left: 550, fontSize: 18, opacity: 0.3, color: '#F4D35E' },
  { content: '✧', top: 45, left: 390, fontSize: 14, opacity: 0.25, color: '#D4AF37' },

  // ── Left side scattered ──
  { content: '🌙', top: 420, left: 20, fontSize: 44, opacity: 0.5, rotate: '-15deg' },
  { content: '✦', top: 350, left: 50, fontSize: 20, opacity: 0.3, color: '#F4D35E' },
  { content: '·', top: 500, left: 35, fontSize: 30, opacity: 0.2, color: '#B8D8D0' },
  { content: '⭐', top: 700, left: 15, fontSize: 22, opacity: 0.3 },
  { content: '✧', top: 850, left: 30, fontSize: 16, opacity: 0.25, color: '#E8B4B8' },
  { content: '·', top: 1000, left: 25, fontSize: 24, opacity: 0.2, color: '#F4D35E' },

  // ── Right side scattered ──
  { content: '⭐', top: 380, left: 1020, fontSize: 24, opacity: 0.35, rotate: '20deg' },
  { content: '✦', top: 520, left: 1035, fontSize: 18, opacity: 0.3, color: '#D4AF37' },
  { content: '·', top: 650, left: 1040, fontSize: 28, opacity: 0.2, color: '#B8D8D0' },
  { content: '✧', top: 800, left: 1030, fontSize: 16, opacity: 0.25, color: '#E8B4B8' },
  { content: '🌙', top: 950, left: 1010, fontSize: 38, opacity: 0.45, rotate: '15deg' },
  { content: '·', top: 1100, left: 1040, fontSize: 22, opacity: 0.2, color: '#F4D35E' },

  // ── Mid scattered (around frames area) ──
  { content: '✦', top: 600, left: 100, fontSize: 16, opacity: 0.2, color: '#B8D8D0' },
  { content: '✧', top: 750, left: 950, fontSize: 14, opacity: 0.2, color: '#F4D35E' },
  { content: '·', top: 900, left: 80, fontSize: 20, opacity: 0.15, color: '#E8B4B8' },
  { content: '·', top: 1050, left: 970, fontSize: 18, opacity: 0.15, color: '#B8D8D0' },

  // ── Bottom-left corner (bear + stars) ──
  { content: '🧸', top: 1520, left: 30, fontSize: 72, opacity: 0.55, rotate: '-5deg' },
  { content: '⭐', top: 1500, left: 160, fontSize: 24, opacity: 0.35 },
  { content: '✦', top: 1580, left: 140, fontSize: 16, opacity: 0.3, color: '#F4D35E' },
  { content: '·', top: 1550, left: 200, fontSize: 22, opacity: 0.2, color: '#B8D8D0' },

  // ── Bottom-right corner (bear + moon) ──
  { content: '🧸', top: 1520, left: 900, fontSize: 72, opacity: 0.55, rotate: '5deg' },
  { content: '🌙', top: 1490, left: 840, fontSize: 36, opacity: 0.45, rotate: '10deg' },
  { content: '⭐', top: 1580, left: 870, fontSize: 20, opacity: 0.3 },
  { content: '✦', top: 1550, left: 790, fontSize: 14, opacity: 0.25, color: '#D4AF37' },

  // ── Bottom center scattered ──
  { content: '✧', top: 1600, left: 450, fontSize: 16, opacity: 0.25, color: '#B8D8D0' },
  { content: '·', top: 1570, left: 600, fontSize: 20, opacity: 0.2, color: '#E8B4B8' },
  { content: '⭐', top: 1620, left: 350, fontSize: 18, opacity: 0.3 },
];

function DecorationLayer() {
  return (
    <>
      {DECORATIONS.map((d, i) => (
        <Text
          key={i}
          style={{
            position: 'absolute',
            top: d.top,
            left: d.left,
            fontSize: d.fontSize,
            opacity: d.opacity,
            color: d.color,
            transform: d.rotate ? [{ rotate: d.rotate }] : undefined,
          }}
        >
          {d.content}
        </Text>
      ))}
    </>
  );
}

// ── Polaroid Frame ───────────────────────────────────────────────────────────

interface PolaroidFrameProps {
  word: KeepsakeWord;
  index: number;
  size: number;
  onPress?: () => void;
}

function PolaroidFrame({ word, index, size }: Readonly<PolaroidFrameProps>) {
  const photoSize = size - 40; // padding for polaroid border
  const rotation = getRotation(word.id, index);

  return (
    <View
      style={[
        styles.polaroid,
        { width: size, transform: [{ rotate: rotation }] },
      ]}
      testID={`keepsake-polaroid-${index}`}
    >
      {word.photoUri ? (
        <Image
          source={{ uri: word.photoUri }}
          style={{ width: photoSize, height: photoSize, borderRadius: 4 }}
          resizeMode="cover"
          testID={`keepsake-photo-${index}`}
        />
      ) : (
        <View
          style={[styles.placeholder, { width: photoSize, height: photoSize }]}
          testID={`keepsake-placeholder-${index}`}
        >
          <Text style={styles.placeholderEmoji}>
            {word.categoryEmoji ?? '💬'}
          </Text>
        </View>
      )}
      <Text style={styles.wordLabel} numberOfLines={1} testID={`keepsake-word-${index}`}>
        {word.word}
      </Text>
      <Text style={styles.dateLabel} testID={`keepsake-date-${index}`}>
        {formatDateForCard(word.dateAdded)}
      </Text>
    </View>
  );
}

// ── Layouts ──────────────────────────────────────────────────────────────────

function ThreeWordLayout({ words }: Readonly<{ words: KeepsakeWord[] }>) {
  return (
    <>
      <View style={styles.topRow}>
        <PolaroidFrame word={words[0]} index={0} size={380} />
        <PolaroidFrame word={words[1]} index={1} size={380} />
      </View>
      <View style={styles.bottomRow}>
        <PolaroidFrame word={words[2]} index={2} size={400} />
      </View>
    </>
  );
}

function TwoWordLayout({ words }: Readonly<{ words: KeepsakeWord[] }>) {
  return (
    <View style={styles.centerRow}>
      <PolaroidFrame word={words[0]} index={0} size={400} />
      <PolaroidFrame word={words[1]} index={1} size={400} />
    </View>
  );
}

function OneWordLayout({ words }: Readonly<{ words: KeepsakeWord[] }>) {
  return (
    <View style={styles.centerRow}>
      <PolaroidFrame word={words[0]} index={0} size={480} />
    </View>
  );
}

// ── Watermark ────────────────────────────────────────────────────────────────

function Watermark({ domain, qrUrl }: Readonly<{ domain: string; qrUrl: string }>) {
  return (
    <View style={styles.watermark} testID="keepsake-watermark">
      <View style={styles.watermarkRow}>
        <Image source={APP_ICON} style={styles.watermarkIcon} resizeMode="contain" />
        <Text style={styles.watermarkText}>{domain}</Text>
      </View>
      <View style={styles.watermarkQr}>
        <QRCode value={qrUrl} size={80} backgroundColor="transparent" color={TEXT_LIGHT} />
      </View>
    </View>
  );
}

// ── Main Card ────────────────────────────────────────────────────────────────

interface KeepsakeCardProps {
  words: KeepsakeWord[];
}

const KeepsakeCard = forwardRef<View, KeepsakeCardProps>(
  function KeepsakeCard({ words }, ref) {
    const { t, locale } = useI18n();
    const name = useSettingsStore((s) => s.name);
    const qrUrl = QR_URLS[locale] ?? QR_URLS['en-US'];

    return (
      <View ref={ref} style={styles.card} testID="keepsake-card" collapsable={false}>
        {/* Decorative elements scattered around edges */}
        <DecorationLayer />

        {/* Title */}
        <Text style={styles.title} testID="keepsake-title">
          {t('keepsake.title', { name: name || 'Baby' })}
        </Text>

        {/* Polaroid frames */}
        <View style={styles.framesContainer}>
          {words.length >= 3 && <ThreeWordLayout words={words} />}
          {words.length === 2 && <TwoWordLayout words={words} />}
          {words.length === 1 && <OneWordLayout words={words} />}
        </View>

        {/* Watermark */}
        <Watermark domain={t('keepsake.watermarkAppName')} qrUrl={qrUrl} />
      </View>
    );
  },
);

export { KeepsakeCard, getRotation, formatDateForCard };

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 140,
    paddingHorizontal: 60,
  },
  title: {
    fontSize: 72,
    fontWeight: '800',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1.5,
    lineHeight: 88,
    zIndex: 1,
  },
  framesContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
  },
  bottomRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  centerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  polaroid: {
    backgroundColor: POLAROID_BG,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  placeholder: {
    backgroundColor: PLACEHOLDER_BG,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 72,
  },
  wordLabel: {
    fontSize: 32,
    fontWeight: '700',
    color: TEXT_DARK,
    marginTop: 16,
    maxWidth: '100%',
  },
  dateLabel: {
    fontSize: 22,
    color: TEXT_LIGHT,
    marginTop: 4,
  },
  watermark: {
    position: 'absolute',
    bottom: 50,
    right: 60,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  watermarkIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  watermarkText: {
    fontSize: 32,
    color: TEXT_DARK,
    fontWeight: '700',
  },
  watermarkQr: {
    alignItems: 'flex-end',
  },
});
