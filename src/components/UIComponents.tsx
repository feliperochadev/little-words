import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { COLORS } from '../utils/theme';

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function Button({
  title, onPress, variant = 'primary', loading, disabled, style, textStyle, testID
}: Readonly<ButtonProps>) {
  const styles = getButtonStyles(variant);
  return (
    <TouchableOpacity
      style={[styles.button, disabled && { opacity: 0.5 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.white} />
      ) : (
        <Text style={[styles.text, textStyle]} numberOfLines={1}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const getButtonStyles = (variant: string) => {
  const getBackgroundColor = () => {
    if (variant === 'primary') return COLORS.primary;
    if (variant === 'secondary') return COLORS.secondary;
    if (variant === 'danger') return COLORS.error;
    return 'transparent';
  };

  return StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: getBackgroundColor(),
    borderWidth: variant === 'outline' ? 2 : 0,
    borderColor: COLORS.primary,
    shadowColor: variant === 'primary' ? COLORS.primary : 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: variant === 'primary' ? 4 : 0,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: variant === 'outline' ? COLORS.primary : COLORS.white,
    letterSpacing: 0.5,
  },
  });
};

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}

export function Card({ children, style, onPress, testID }: Readonly<CardProps>) {
  if (onPress) {
    return (
      <TouchableOpacity style={[cardStyles.card, style]} onPress={onPress} activeOpacity={0.9} testID={testID}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyles.card, style]} testID={testID}>{children}</View>;
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 12,
  },
});

// ─── SearchBar ────────────────────────────────────────────────────────────────
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
}

export function SearchBar({ value, onChangeText, placeholder, testID }: Readonly<SearchBarProps>) {
  return (
  <View style={searchStyles.container}>
    <Text style={searchStyles.icon}>🔍</Text>
    <TextInput
      style={searchStyles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || 'Buscar palavras...'}
      placeholderTextColor={COLORS.textLight}
      testID={testID}
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={() => onChangeText('')}>
        <Text style={searchStyles.clear}>✕</Text>
      </TouchableOpacity>
    )}
  </View>
  );
}

const searchStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  icon: { fontSize: 18, marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  clear: { fontSize: 16, color: COLORS.textLight, padding: 4 },
});

// ─── CategoryBadge ────────────────────────────────────────────────────────────
interface CategoryBadgeProps {
  name: string;
  color: string;
  emoji: string;
  size?: 'small' | 'normal';
}

export function CategoryBadge({ name, color, emoji, size = 'normal' }: Readonly<CategoryBadgeProps>) {
  return (
    <View style={[badgeStyles.badge, { backgroundColor: color + '20', borderColor: color + '40' }, size === 'small' && badgeStyles.small]}>
      <Text style={[badgeStyles.emoji, size === 'small' && badgeStyles.smallEmoji]}>{emoji}</Text>
      <Text style={[badgeStyles.text, { color }, size === 'small' && badgeStyles.smallText]}>{name}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  small: { paddingHorizontal: 6, paddingVertical: 2 },
  emoji: { fontSize: 12, marginRight: 4 },
  smallEmoji: { fontSize: 10 },
  text: { fontSize: 12, fontWeight: '600' },
  smallText: { fontSize: 10 },
});

// ─── EmptyState ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ emoji, title, subtitle, action }: Readonly<EmptyStateProps>) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.emoji}>{emoji}</Text>
      <Text style={emptyStyles.title}>{title}</Text>
      {subtitle && <Text style={emptyStyles.subtitle}>{subtitle}</Text>}
      {action && (
        <Button title={action.label} onPress={action.onPress} style={emptyStyles.actionButton} />
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  actionButton: { marginTop: 16 },
});

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  emoji: string;
  value: number | string;
  label: string;
  color: string;
  testID?: string;
}

export function StatCard({ emoji, value, label, color, testID }: Readonly<StatCardProps>) {
  return (
    <View style={[statStyles.card, { borderColor: color + '30' }]}>
      <View style={[statStyles.iconBg, { backgroundColor: color + '15' }]}>
        <Text style={statStyles.emoji}>{emoji}</Text>
      </View>
      <Text style={[statStyles.value, { color }]} testID={testID}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    margin: 4,
  },
  iconBg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emoji: { fontSize: 22 },
  value: { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '500' },
});
