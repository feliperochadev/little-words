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
  onPlayAudio: (item: TimelineItemModel) => void;
  onViewPhoto: (item: TimelineItemModel) => void;
};

export function TimelineItem({ item, index, onPlayAudio, onViewPhoto }: Readonly<Props>) {
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
  const badgeTextColor = colors.textOnPrimary;
  const formattedDate = formatTimelineDate(item.date_added, locale);
  const thumbnailUri =
    item.first_photo_filename
      ? getAssetFileUri(item.item_type, item.id, 'photo', item.first_photo_filename)
      : null;

  const connector = <View style={[styles.connector, { backgroundColor: colors.border }]} />;
  const dot = <View style={[styles.dot, { backgroundColor: colors.primary, borderColor: colors.background }]} />;

  return (
    <Animated.View
      style={[
        styles.row,
        { transform: [{ translateY }], opacity },
      ]}
      testID={`timeline-item-${item.item_type}-${item.id}`}
    >
      {isLeft ? (
        <>
          <View style={styles.cardSide}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Text style={[styles.wordText, { color: colors.text }]}>{item.text}</Text>
              <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badgeText}</Text>
              </View>
              {item.item_type === 'variant' && item.main_word_text ? (
                <Text style={[styles.context, { color: colors.textSecondary }]}>
                  {t('memories.variantOf', { word: item.main_word_text })}
                </Text>
              ) : null}
              <Text style={[styles.date, { color: colors.textSecondary }]}>{formattedDate}</Text>
              <View style={styles.assetRow}>
                {item.audio_count > 0 ? (
                  <TouchableOpacity
                    testID={`timeline-audio-${item.item_type}-${item.id}`}
                    style={styles.audioButton}
                    onPress={() => onPlayAudio(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('memories.typeWord')} audio`}
                  >
                    <Ionicons name="play-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}
                {item.photo_count > 0 ? (
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
                        style={styles.photo}
                        resizeMode="cover"
                        onError={() => setImageLoadError(true)}
                      />
                    ) : (
                      <View style={[styles.photoFallback, { backgroundColor: colors.border }]}> 
                        <Ionicons name="image-outline" size={14} color={colors.textSecondary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
          {connector}
          {dot}
          <View style={styles.cardSide} />
        </>
      ) : (
        <>
          <View style={styles.cardSide} />
          {dot}
          {connector}
          <View style={styles.cardSide}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Text style={[styles.wordText, { color: colors.text }]}>{item.text}</Text>
              <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                <Text style={[styles.badgeText, { color: badgeTextColor }]}>{badgeText}</Text>
              </View>
              {item.item_type === 'variant' && item.main_word_text ? (
                <Text style={[styles.context, { color: colors.textSecondary }]}>
                  {t('memories.variantOf', { word: item.main_word_text })}
                </Text>
              ) : null}
              <Text style={[styles.date, { color: colors.textSecondary }]}>{formattedDate}</Text>
              <View style={styles.assetRow}>
                {item.audio_count > 0 ? (
                  <TouchableOpacity
                    testID={`timeline-audio-${item.item_type}-${item.id}`}
                    style={styles.audioButton}
                    onPress={() => onPlayAudio(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('memories.typeWord')} audio`}
                  >
                    <Ionicons name="play-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                ) : null}
                {item.photo_count > 0 ? (
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
                        style={styles.photo}
                        resizeMode="cover"
                        onError={() => setImageLoadError(true)}
                      />
                    ) : (
                      <View style={[styles.photoFallback, { backgroundColor: colors.border }]}> 
                        <Ionicons name="image-outline" size={14} color={colors.textSecondary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 94,
  },
  cardSide: {
    width: '44%',
  },
  connector: {
    width: '5%',
    height: 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  wordText: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  context: {
    fontSize: 12,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
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
  photoFallback: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
