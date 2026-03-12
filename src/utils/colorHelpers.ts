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
