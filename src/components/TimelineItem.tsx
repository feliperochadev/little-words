import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/i18n';
import { getAssetFileUri } from '../utils/assetStorage';
import { formatTimelineDate } from '../utils/dateHelpers';
import type { TimelineItem as TimelineItemModel } from '../types/domain';

type Props = {
  item: TimelineItemModel;
  index: number;
  isFirst?: boolean;
  isLast?: boolean;
  compact?: boolean;
  onPlayAudio: (item: TimelineItemModel) => void;
  onViewPhoto: (item: TimelineItemModel) => void;
};

export function TimelineItem({
  item,
  index,
  isFirst = false,
  isLast = false,
  compact = false,
  onPlayAudio,
  onViewPhoto,
}: Readonly<Props>) {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const [imageLoadError, setImageLoadError] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = Math.min(index, 5) * 80;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  useEffect(() => {
    setImageLoadError(false);
  }, [item.first_photo_filename, item.id, item.item_type]);

  const isLeft = index % 2 === 0;
  const badgeText = item.item_type === 'word' ? t('memories.typeWord') : t('memories.typeVariant');
  const badgeColor = item.item_type === 'word' ? colors.primary : colors.secondary;
  const badgeTextColor = item.item_type === 'word' ? colors.textOnPrimary : colors.text;
  const formattedDate = formatTimelineDate(item.date_added, locale);
  const thumbnailUri =
    item.first_photo_filename
      ? getAssetFileUri(item.item_type, item.id, 'photo', item.first_photo_filename)
      : null;

  const wordFontSize = compact ? 14 : 17;
  const badgeFontSize = compact ? 10 : 11;
  const badgePaddingH = compact ? 6 : 8;

  const audioControl = item.audio_count > 0 ? (
    <TouchableOpacity
      testID={`timeline-audio-${item.item_type}-${item.id}`}
      style={styles.audioButton}
      onPress={() => onPlayAudio(item)}
      accessibilityRole="button"
      accessibilityLabel={`${t('memories.typeWord')} audio`}
    >
      <Ionicons name="play-circle" size={compact ? 16 : 20} color={colors.primary} />
    </TouchableOpacity>
  ) : null;

  const photoControl = item.photo_count > 0 ? (
    <TouchableOpacity
      testID={`timeline-photo-${item.item_type}-${item.id}`}
      style={styles.photoButton}
      onPress={() => onViewPhoto(item)}
      accessibilityRole="button"
      accessibilityLabel={`${t('memories.typeWord')} photo`}
    >
      {thumbnailUri && !imageLoadError ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={compact ? styles.photoCompact : styles.photo}
          resizeMode="cover"
          onError={() => setImageLoadError(true)}
        />
      ) : (
        <View style={[compact ? styles.photoFallbackCompact : styles.photoFallback, { backgroundColor: colors.border }]}>
          <Ionicons name="image-outline" size={compact ? 10 : 14} color={colors.textSecondary} />
        </View>
      )}
    </TouchableOpacity>
  ) : null;

  const assetRow = (item.audio_count > 0 || item.photo_count > 0) ? (
    <View style={[styles.assetRow, isLeft ? styles.assetRowLeft : styles.assetRowRight]}>
      {audioControl}
      {photoControl}
    </View>
  ) : null;

  const cardContent = (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        {isLeft ? (
          <>
            <View style={[styles.badge, { backgroundColor: badgeColor, paddingHorizontal: badgePaddingH }]}>
              <Text style={[styles.badgeText, { color: badgeTextColor, fontSize: badgeFontSize }]}>{badgeText}</Text>
            </View>
            <Text
              style={[styles.wordText, { color: colors.text, fontSize: wordFontSize }, styles.wordTextRight]}
              numberOfLines={2}
            >
              {item.text}
            </Text>
          </>
        ) : (
          <>
            <Text
              style={[styles.wordText, { color: colors.text, fontSize: wordFontSize }, styles.wordTextLeft]}
              numberOfLines={2}
            >
              {item.text}
            </Text>
            <View style={[styles.badge, { backgroundColor: badgeColor, paddingHorizontal: badgePaddingH }]}>
              <Text style={[styles.badgeText, { color: badgeTextColor, fontSize: badgeFontSize }]}>{badgeText}</Text>
            </View>
          </>
        )}
      </View>
      {item.item_type === 'variant' && item.main_word_text ? (
        <Text style={[styles.context, { color: colors.textSecondary }, isLeft ? styles.textRight : styles.textLeft]}>
          {t('memories.variantOf', { word: item.main_word_text })}
        </Text>
      ) : null}
      {assetRow}
    </View>
  );

  const dateNode = (
    <Text style={[styles.dateOutside, { color: colors.text }, isLeft ? styles.dateLeft : styles.dateRight]}>
      {formattedDate}
    </Text>
  );

  // Horizontal connector bar between card edge and dot
  const connector = <View style={[styles.connector, { backgroundColor: colors.border }]} />;
  // Invisible spacer matching connector width for the opposite pane
  const connectorSpacer = <View style={styles.connectorSpacer} />;

  // Dot column — spans full item height so line segments join flush with adjacent items.
  // No marginBottom on the row means no gap to bridge — segments touch each other directly.
  const dotColumn = (
    <View style={styles.dotColumn}>
      <View style={[
        styles.lineSegmentV,
        { backgroundColor: isFirst ? 'transparent' : colors.border },
      ]} />
      <View style={[styles.dot, { backgroundColor: colors.primary, borderColor: colors.background }]} />
      <View style={[
        styles.lineSegmentV,
        { backgroundColor: isLast ? 'transparent' : colors.border },
      ]} />
    </View>
  );

  return (
    <Animated.View
      style={[styles.row, { transform: [{ translateY }], opacity }]}
      testID={`timeline-item-${item.item_type}-${item.id}`}
    >
      {/* Left pane — flex:1 */}
      <View style={styles.pane}>
        {isLeft ? (
          <>
            <View style={styles.paneContent}>{cardContent}</View>
            {connector}
          </>
        ) : (
          <>
            <View style={[styles.paneContent, styles.datePane]}>{dateNode}</View>
            {connectorSpacer}
          </>
        )}
      </View>

      {dotColumn}

      {/* Right pane — flex:1, mirror of left pane */}
      <View style={styles.pane}>
        {isLeft ? (
          <>
            {connectorSpacer}
            <View style={[styles.paneContent, styles.datePane]}>{dateNode}</View>
          </>
        ) : (
          <>
            {connector}
            <View style={styles.paneContent}>{cardContent}</View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // No marginBottom — items sit flush so dotColumn lines join without gaps.
  // Visual card spacing comes from card's marginVertical instead.
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 94,
  },
  // Each pane is flex:1 so the dotColumn (fixed 12px) stays at exactly 50%
  pane: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paneContent: {
    flex: 1,
    justifyContent: 'center',
  },
  datePane: {
    paddingHorizontal: 6,
  },
  connector: {
    width: 16,
    height: 2,
    flexShrink: 0,
  },
  connectorSpacer: {
    width: 16,
    flexShrink: 0,
  },
  dotColumn: {
    width: 12,
    alignItems: 'center',
    flexDirection: 'column',
    alignSelf: 'stretch',
  },
  lineSegmentV: {
    flex: 1,
    width: 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    flexShrink: 0,
  },
  // marginVertical on card creates visual spacing without breaking line continuity
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginVertical: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  wordText: {
    fontWeight: '800',
    flex: 1,
  },
  wordTextLeft: {
    textAlign: 'left',
  },
  wordTextRight: {
    textAlign: 'right',
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 2,
    flexShrink: 1,
  },
  badgeText: {
    fontWeight: '700',
  },
  context: {
    fontSize: 12,
    marginBottom: 4,
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  assetRowLeft: {
    justifyContent: 'flex-end',
  },
  assetRowRight: {
    justifyContent: 'flex-start',
  },
  audioButton: {
    padding: 2,
  },
  photoButton: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  photo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  photoCompact: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  photoFallback: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackCompact: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateOutside: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateLeft: {
    textAlign: 'left',
  },
  dateRight: {
    textAlign: 'right',
  },
});
