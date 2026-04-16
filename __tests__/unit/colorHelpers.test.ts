import { withOpacity, hexToRgba } from '../../src/utils/colorHelpers';

describe('colorHelpers', () => {
  describe('withOpacity', () => {
    it('appends opacity hex to color', () => {
      expect(withOpacity('#FF5733', '15')).toBe('#FF573315');
    });

    it('works with any 2-digit hex suffix', () => {
      expect(withOpacity('#000000', 'FF')).toBe('#000000FF');
    });
  });

  describe('hexToRgba', () => {
    it('converts hex color with alpha to rgba string', () => {
      expect(hexToRgba('#FF5733', 0.5)).toBe('rgba(255,87,51,0.5)');
    });

    it('converts black with zero alpha', () => {
      expect(hexToRgba('#000000', 0)).toBe('rgba(0,0,0,0)');
    });

    it('converts white with full alpha', () => {
      expect(hexToRgba('#FFFFFF', 1)).toBe('rgba(255,255,255,1)');
    });

    it('handles lowercase hex', () => {
      expect(hexToRgba('#ff5733', 0.06)).toBe('rgba(255,87,51,0.06)');
    });

    it('handles hex without hash prefix', () => {
      expect(hexToRgba('FF5733', 0.1)).toBe('rgba(255,87,51,0.1)');
    });

    it('converts typical primary color at low alpha', () => {
      expect(hexToRgba('#FF6B9D', 0.06)).toBe('rgba(255,107,157,0.06)');
    });
  });
});
