import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';
import { useI18n } from '../i18n/i18n';

export function BrandHeader() {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/icon.png')} style={styles.icon} />
      <View>
        <Text style={styles.title}>{t('brandHeader.appName')}</Text>
        <Text style={styles.tagline}>{t('brandHeader.tagline')}</Text>
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
    color: COLORS.text,
    lineHeight: 29,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    lineHeight: 15,
  },
});