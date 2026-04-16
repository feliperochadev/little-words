/**
 * Applies an opacity value to a hex color code.
 *
 * @param hexColor - The hex color code (e.g., '#FF5733')
 * @param opacityHex - The opacity as a 2-digit hex string (e.g., '15' for ~8% opacity, 'FF' for 100%)
 * @returns The color with opacity appended (e.g., '#FF573315')
 *
 * @example
 * ```typescript
 * withOpacity('#FF5733', '15') // => '#FF573315'
 * withOpacity(COLORS.primary, '60') // => '{primary}60'
 * ```
 */
export function withOpacity(hexColor: string, opacityHex: string): string {
  return `${hexColor}${opacityHex}`;
}

/**
 * Converts a hex color + alpha fraction to an rgba() string.
 * Use this instead of withOpacity when iOS renders 8-digit hex colors
 * incorrectly on first paint (e.g., faded text inside colored backgrounds).
 *
 * @param hexColor - 6-digit hex color (e.g., '#FF5733')
 * @param alpha - Opacity fraction 0–1 (e.g., 0.06 for ~6%)
 * @returns rgba() string (e.g., 'rgba(255,87,51,0.06)')
 */
export function hexToRgba(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
