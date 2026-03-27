import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useI18n } from '../../i18n/i18n';
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

type ChildSex = 'boy' | 'girl' | null;

function getTitleText(
  locale: string,
  sex: ChildSex,
  t: (key: string, params?: Record<string, string>) => string,
  name: string,
): string {
  if (locale === 'pt-BR') {
    if (sex === 'boy') return t('keepsake.titleMale', { name });
    if (sex === 'girl') return t('keepsake.titleFemale', { name });
    return t('keepsake.titleNeutral', { name });
  }
  return t('keepsake.title', { name });
}

// ── Decorations ──────────────────────────────────────────────────────────────

interface DecorationItem {
  content?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  top: number;
  left: number;
  fontSize: number;
  opacity: number;
  color?: string;
  rotate?: string;
}

const DECORATIONS: DecorationItem[] = [
  // ── Top-left corner (book + stars) ──
  { icon: 'book-outline', top: 34, left: 56, fontSize: 72, opacity: 0.52, color: '#4F7C7A' },
  { content: '⭐', top: 55, left: 180, fontSize: 30, opacity: 0.45 },
  { content: '✦', top: 30, left: 230, fontSize: 20, opacity: 0.35, color: '#F4D35E' },
  { content: '✧', top: 115, left: 130, fontSize: 18, opacity: 0.3, color: '#B8D8D0' },
  { content: '·', top: 80, left: 280, fontSize: 28, opacity: 0.25, color: '#E8B4B8' },

  // ── Top-right corner (dialog + stars) ──
  { icon: 'chatbubble-ellipses-outline', top: 34, left: 900, fontSize: 72, opacity: 0.52, color: '#7A6B9A' },
  { content: '⭐', top: 60, left: 850, fontSize: 28, opacity: 0.4 },
  { content: '✦', top: 30, left: 790, fontSize: 22, opacity: 0.35, color: '#F4D35E' },
  { content: '✧', top: 110, left: 900, fontSize: 16, opacity: 0.3, color: '#B8D8D0' },
  { content: '·', top: 85, left: 740, fontSize: 26, opacity: 0.25, color: '#E8B4B8' },

  // ── Balloons below top photo row ──
  { content: '🎈', top: 760, left: 120, fontSize: 74, opacity: 0.58, rotate: '-10deg' },
  { content: '🎈', top: 760, left: 860, fontSize: 74, opacity: 0.58, rotate: '10deg' },

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

  // ── Bottom photo side companions ──
  { content: '🌙', top: 1130, left: 150, fontSize: 56, opacity: 0.5, rotate: '-12deg' },
  { content: '🧸', top: 1130, left: 900, fontSize: 64, opacity: 0.5, rotate: '8deg' },

  // ── Bottom-left corner (bear aligned with watermark + stars) ──
  { content: '⭐', top: 1620, left: 44, fontSize: 46, opacity: 0.42, rotate: '-8deg' },
  { content: '⭐', top: 1650, left: 120, fontSize: 34, opacity: 0.42 },
  { content: '🧸', top: 1710, left: 56, fontSize: 78, opacity: 0.56, rotate: '-5deg' },
  { content: '✦', top: 1550, left: 145, fontSize: 18, opacity: 0.32, color: '#F4D35E' },
  { content: '·', top: 1620, left: 210, fontSize: 22, opacity: 0.2, color: '#B8D8D0' },

  // ── Bottom-right corner (bear aligned with watermark + stars) ──
  { content: '🌙', top: 1490, left: 840, fontSize: 36, opacity: 0.45, rotate: '10deg' },
  { content: '⭐', top: 1540, left: 900, fontSize: 52, opacity: 0.4, rotate: '8deg' },
  { content: '⭐', top: 1628, left: 855, fontSize: 40, opacity: 0.38 },
  { content: '✦', top: 1560, left: 790, fontSize: 14, opacity: 0.25, color: '#D4AF37' },

  // ── Bottom center scattered ──
  { content: '✧', top: 1600, left: 450, fontSize: 16, opacity: 0.25, color: '#B8D8D0' },
  { content: '·', top: 1570, left: 600, fontSize: 20, opacity: 0.2, color: '#E8B4B8' },
  { content: '⭐', top: 1620, left: 350, fontSize: 18, opacity: 0.3 },
];

function DecorationLayer() {
  return (
    <>
      {DECORATIONS.map((d, i) => (
        d.icon ? (
          <Ionicons
            key={i}
            name={d.icon}
            size={d.fontSize}
            color={d.color ?? TEXT_DARK}
            style={{
              position: 'absolute',
              top: d.top,
              left: d.left,
              opacity: d.opacity,
              transform: d.rotate ? [{ rotate: d.rotate }] : undefined,
            }}
          />
        ) : (
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
        )
      ))}
    </>
  );
}

// ── Polaroid Frame ───────────────────────────────────────────────────────────

interface PolaroidFrameProps {
  word: KeepsakeWord;
  index: number;
  size: number;
  elevated?: boolean;
  onPress?: () => void;
}

function PolaroidFrame({ word, index, size, elevated = true }: Readonly<PolaroidFrameProps>) {
  const photoSize = size - 40; // padding for polaroid border
  const rotation = getRotation(word.id, index);

  return (
    <View
      style={[
        styles.polaroid,
        { width: size, transform: [{ rotate: rotation }], elevation: elevated ? 3 : 0 },
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

function ThreeWordLayout({ words, elevated }: Readonly<{ words: KeepsakeWord[]; elevated?: boolean }>) {
  return (
    <>
      <View style={styles.topRow}>
        <PolaroidFrame word={words[0]} index={0} size={418} elevated={elevated} />
        <PolaroidFrame word={words[1]} index={1} size={418} elevated={elevated} />
      </View>
      <View style={styles.bottomRow}>
        <PolaroidFrame word={words[2]} index={2} size={440} elevated={elevated} />
      </View>
    </>
  );
}

function TwoWordLayout({ words, elevated }: Readonly<{ words: KeepsakeWord[]; elevated?: boolean }>) {
  return (
    <View style={styles.centerRow}>
      <PolaroidFrame word={words[0]} index={0} size={440} elevated={elevated} />
      <PolaroidFrame word={words[1]} index={1} size={440} elevated={elevated} />
    </View>
  );
}

function OneWordLayout({ words, elevated }: Readonly<{ words: KeepsakeWord[]; elevated?: boolean }>) {
  return (
    <View style={styles.centerRow}>
      <PolaroidFrame word={words[0]} index={0} size={528} elevated={elevated} />
    </View>
  );
}

// ── Watermark ────────────────────────────────────────────────────────────────

function Watermark({ domain, qrUrl }: Readonly<{ domain: string; qrUrl: string }>) {
  return (
    <View style={styles.watermark} testID="keepsake-watermark">
      <View style={styles.watermarkQr}>
        <QRCode value={qrUrl} size={80} backgroundColor="transparent" color={TEXT_LIGHT} />
      </View>
      <View style={styles.watermarkRow}>
        <Image source={APP_ICON} style={styles.watermarkIcon} resizeMode="contain" />
        <Text style={styles.watermarkText}>{domain}</Text>
      </View>
    </View>
  );
}

// ── Main Card ────────────────────────────────────────────────────────────────

interface KeepsakeCardProps {
  words: KeepsakeWord[];
  name: string;
  sex: 'boy' | 'girl' | null;
  elevated?: boolean;
}

const KeepsakeCard = forwardRef<View, KeepsakeCardProps>(
  function KeepsakeCard({ words, name, sex, elevated = true }, ref) {
    const { t, locale } = useI18n();
    const qrUrl = QR_URLS[locale] ?? QR_URLS['en-US'];
    const displayName = name.trim() || 'Baby';
    const title = getTitleText(locale, sex, t, displayName);

    return (
      <View ref={ref} style={styles.card} testID="keepsake-card" collapsable={false}>
        {/* Decorative elements scattered around edges */}
        <DecorationLayer />

        {/* Title */}
        <Text style={styles.title} testID="keepsake-title">
          {title}
        </Text>

        {/* Polaroid frames */}
        <View style={styles.framesContainer}>
          {words.length >= 3 && <ThreeWordLayout words={words} elevated={elevated} />}
          {words.length === 2 && <TwoWordLayout words={words} elevated={elevated} />}
          {words.length === 1 && <OneWordLayout words={words} elevated={elevated} />}
        </View>

        {/* Watermark */}
        <Watermark domain={t('keepsake.watermarkDomain')} qrUrl={qrUrl} />
      </View>
    );
  },
);

export { KeepsakeCard, getRotation, formatDateForCard, getTitleText };

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
    transform: [{ translateY: -84 }],
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
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
