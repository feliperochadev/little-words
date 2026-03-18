import React, { useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/i18n';

const AVATAR_SIZES = { sm: 44, md: 72, lg: 96 } as const;
const EMOJI_SIZES = { sm: 20, md: 32, lg: 44 } as const;

export interface ProfileAvatarProps {
  size: 'sm' | 'md' | 'lg';
  photoUri?: string | null;
  sex?: 'boy' | 'girl' | null;
  onPress?: () => void;
  showDecorations?: boolean;
  testID?: string;
}

export function ProfileAvatar({
  size,
  photoUri,
  sex,
  onPress,
  showDecorations,
  testID,
}: Readonly<ProfileAvatarProps>) {
  const { colors, shape } = useTheme();
  const { t } = useI18n();
  const [imageFailed, setImageFailed] = useState(false);

  const diameter = AVATAR_SIZES[size];
  const emojiSize = EMOJI_SIZES[size];
  const decorationsVisible = showDecorations ?? size === 'lg';
  const showPhoto = !!photoUri && !imageFailed;

  const fallbackEmoji = sex === 'girl' ? '👧' : sex === 'boy' ? '👦' : '👶';

  const circleStyle = {
    width: diameter,
    height: diameter,
    borderRadius: shape.full,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const inner = (
    <View style={styles.wrapper} testID={testID}>
      <View style={circleStyle}>
        {showPhoto ? (
          <Image
            source={{ uri: photoUri }}
            style={{ width: diameter, height: diameter }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text style={{ fontSize: emojiSize }}>{fallbackEmoji}</Text>
        )}
      </View>

      {decorationsVisible && (
        <>
          {/* Bottom-left: book badge */}
          <View
            style={[
              styles.badge,
              styles.badgeLg,
              styles.badgeBottomLeft,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="book-outline" size={20} color={colors.primary} />
          </View>

          {/* Top-right: speech bubble badge */}
          <View
            style={[
              styles.badge,
              styles.badgeMd,
              styles.badgeTopRight,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.secondary} />
          </View>
        </>
      )}
    </View>
  );

  if (!onPress) return inner;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={t('settings.editPhoto')}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLg: { width: 28, height: 28 },
  badgeMd: { width: 24, height: 24 },
  badgeBottomLeft: { bottom: -4, left: -4 },
  badgeTopRight: { top: -2, right: -2 },
});
