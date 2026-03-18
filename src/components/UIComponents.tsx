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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { withOpacity } from '../utils/colorHelpers';
import { useTheme } from '../hooks/useTheme';

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md', loading, disabled,
  icon, iconPosition = 'left', style, textStyle, testID,
}: Readonly<ButtonProps>) {
  const { colors } = useTheme();
  const btnStyle = getButtonStyle(variant, size, colors);
  return (
    <TouchableOpacity
      style={[btnStyle.button, disabled && { opacity: 0.5 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.textOnPrimary} />
      ) : (
        <View style={styles.btnContent}>
          {icon && iconPosition === 'left' ? <View style={styles.btnIconLeft}>{icon}</View> : null}
          <Text style={[btnStyle.text, textStyle]} numberOfLines={1}>{title}</Text>
          {icon && iconPosition === 'right' ? <View style={styles.btnIconRight}>{icon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const BUTTON_PADDING = {
  sm: { paddingVertical: 8,  paddingHorizontal: 16 },
  md: { paddingVertical: 14, paddingHorizontal: 24 },
  lg: { paddingVertical: 18, paddingHorizontal: 32 },
} as const;

const BUTTON_MIN_HEIGHT = { sm: 36, md: 48, lg: 56 } as const;

function getButtonStyle(
  variant: string,
  size: 'sm' | 'md' | 'lg',
  colors: { primary: string; secondary: string; error: string; textOnPrimary: string },
) {
  const getBackgroundColor = () => {
    if (variant === 'primary') return colors.primary;
    if (variant === 'secondary') return colors.secondary;
    if (variant === 'danger') return colors.error;
    return 'transparent';
  };

  return StyleSheet.create({
    button: {
      ...BUTTON_PADDING[size],
      minHeight: BUTTON_MIN_HEIGHT[size],
      borderRadius: theme.shape.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: getBackgroundColor(),
      borderWidth: variant === 'outline' ? 2 : 0,
      borderColor: colors.primary,
      shadowColor: variant === 'primary' ? colors.primary : 'transparent',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: variant === 'primary' ? 4 : 0,
    },
    text: {
      fontSize: size === 'sm' ? theme.typography.fontSize.sm : theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: variant === 'outline' ? colors.primary : colors.textOnPrimary,
      letterSpacing: theme.typography.letterSpacing.wide,
    },
  });
}

const styles = StyleSheet.create({
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnIconLeft: { marginRight: 8 },
  btnIconRight: { marginLeft: 8 },
});

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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.lg,
    padding: theme.spacing['4'],
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: theme.spacing['3'],
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
      <Ionicons name="search" size={18} color={theme.colors.textMuted} style={searchStyles.icon} />
      <TextInput
        style={searchStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Buscar palavras...'}
        placeholderTextColor={theme.colors.textMuted}
        testID={testID}
        accessibilityRole="search"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={searchStyles.clearBtn}
          testID={testID ? `${testID}-clear` : 'search-clear'}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const searchStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.lg,
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing['3'],
  },
  icon: { marginRight: theme.spacing['2'] },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },
  clearBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
  },
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
    <View style={[badgeStyles.badge, { backgroundColor: withOpacity(color, '20'), borderColor: withOpacity(color, '40') }, size === 'small' && badgeStyles.small]}>
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
    borderRadius: theme.shape.xl,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  small: { paddingHorizontal: 6, paddingVertical: 2 },
  emoji: { fontSize: 12, marginRight: 4 },
  smallEmoji: { fontSize: 10 },
  text: { fontSize: 12, fontWeight: theme.typography.fontWeight.semibold },
  smallText: { fontSize: 10 },
});

// ─── EmptyState ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  emoji?: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void; icon?: React.ReactNode };
}

export function EmptyState({ emoji, icon, title, subtitle, action }: Readonly<EmptyStateProps>) {
  return (
    <View style={emptyStyles.container}>
      {icon ? (
        <View style={emptyStyles.iconWrapper}>{icon}</View>
      ) : (
        <Text style={emptyStyles.emoji}>{emoji}</Text>
      )}
      <Text style={emptyStyles.title}>{title}</Text>
      {subtitle ? <Text style={emptyStyles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <Button title={action.label} onPress={action.onPress} icon={action.icon} style={emptyStyles.actionButton} />
      ) : null}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: theme.spacing['10'], paddingHorizontal: theme.spacing['8'] },
  emoji: { fontSize: 64, marginBottom: theme.spacing['4'] },
  iconWrapper: { marginBottom: theme.spacing['4'] },
  title: { fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.text, textAlign: 'center', marginBottom: theme.spacing['2'] },
  subtitle: { fontSize: theme.typography.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  actionButton: { marginTop: theme.spacing['4'] },
});

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  emoji?: string;
  icon?: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  testID?: string;
}

export function StatCard({ emoji, icon, value, label, color, testID }: Readonly<StatCardProps>) {
  return (
    <View style={[statStyles.card, { borderColor: withOpacity(color, '30') }]}>
      <View style={[statStyles.iconBg, { backgroundColor: withOpacity(color, '15') }]}>
        {icon ?? <Text style={statStyles.emoji}>{emoji}</Text>}
      </View>
      <Text style={[statStyles.value, { color }]} testID={testID}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.xl,
    padding: theme.spacing['4'],
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    margin: 4,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: theme.shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing['2'],
  },
  emoji: { fontSize: 22 },
  value: { fontSize: 28, fontWeight: theme.typography.fontWeight.heavy, marginBottom: 2 },
  label: { fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, textAlign: 'center', fontWeight: theme.typography.fontWeight.medium },
});
