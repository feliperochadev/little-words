/**
 * Available design system colour variants.
 */
export type ThemeVariant = 'blossom' | 'honey' | 'breeze';

/**
 * Fallback variant used for:
 * - Static StyleSheet.create() at module load time
 * - When sex is null (no profile set / onboarding incomplete)
 */
export const DEFAULT_VARIANT: ThemeVariant = 'blossom';

/**
 * Variant applied when the child's sex is set to 'girl'.
 */
export const GIRL_VARIANT: ThemeVariant = 'blossom';

/**
 * Variant applied when the child's sex is set to 'boy'.
 */
export const BOY_VARIANT: ThemeVariant = 'breeze';
