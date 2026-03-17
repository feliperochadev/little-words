import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useI18n } from '../i18n/i18n';
import { useTheme } from '../hooks/useTheme';

export function BrandHeader() {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/icon.png')} style={styles.icon} />
      <View>
        <Text style={[styles.title, { color: colors.text }]}>{t('brandHeader.appName')}</Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>{t('brandHeader.tagline')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginBottom: 20,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 29,
  },
  tagline: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 15,
  },
});
