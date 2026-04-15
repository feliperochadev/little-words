import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { hexToRgba } from '../utils/colorHelpers';

interface Language {
  code: string;
  label: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en-US', label: 'English (US)',   flag: '🇺🇸' },
];

interface LanguagePickerProps {
  locale: string;
  onSelect: (code: string) => void;
  accentColor?: string;
  testID?: string;
}

export function LanguagePicker({
  locale, onSelect, accentColor, testID,
}: Readonly<LanguagePickerProps>) {
  const accent = accentColor ?? theme.colors.primary;

  return (
    <View style={styles.row} testID={testID}>
      {LANGUAGES.map(lang => {
        const active = locale === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.option,
              active && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) },
            ]}
            onPress={() => onSelect(lang.code)}
            testID={testID ? `${testID}-${lang.code}` : undefined}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={[styles.label, active && { color: accent, fontWeight: theme.typography.fontWeight.bold }]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing['3'] },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing['3'],
    borderRadius: theme.shape.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    gap: theme.spacing['2'],
    minHeight: 48,
  },
  flag: { fontSize: 20 },
  label: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
