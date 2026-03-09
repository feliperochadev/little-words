import { deepGet, interpolate } from '../../src/i18n/i18n';

describe('i18n helpers', () => {
  describe('deepGet', () => {
    const obj = {
      a: {
        b: {
          c: 'deep value',
          d: 42,
        },
        e: 'shallow',
      },
      f: 'top',
      g: ['arr1', 'arr2'],
    };

    it('gets top-level value', () => {
      expect(deepGet(obj, 'f')).toBe('top');
    });

    it('gets nested value with dot path', () => {
      expect(deepGet(obj, 'a.b.c')).toBe('deep value');
    });

    it('gets intermediate nested value', () => {
      expect(deepGet(obj, 'a.e')).toBe('shallow');
    });

    it('returns undefined for non-existent path', () => {
      expect(deepGet(obj, 'a.b.x')).toBeUndefined();
    });

    it('returns undefined for completely invalid path', () => {
      expect(deepGet(obj, 'x.y.z')).toBeUndefined();
    });

    it('returns arrays', () => {
      expect(deepGet(obj, 'g')).toEqual(['arr1', 'arr2']);
    });

    it('returns numbers', () => {
      expect(deepGet(obj, 'a.b.d')).toBe(42);
    });

    it('handles empty path segments', () => {
      expect(deepGet(obj, '')).toBeUndefined();
    });
  });

  describe('interpolate', () => {
    it('replaces single placeholder', () => {
      expect(interpolate('Hello {{name}}', { name: 'World' })).toBe('Hello World');
    });

    it('replaces multiple placeholders', () => {
      expect(interpolate('{{a}} and {{b}}', { a: 'foo', b: 'bar' })).toBe('foo and bar');
    });

    it('replaces numeric values', () => {
      expect(interpolate('Count: {{count}}', { count: 5 })).toBe('Count: 5');
    });

    it('returns string as-is when no params provided', () => {
      expect(interpolate('Hello {{name}}')).toBe('Hello {{name}}');
    });

    it('keeps unmatched placeholders', () => {
      expect(interpolate('{{a}} and {{b}}', { a: 'foo' })).toBe('foo and {{b}}');
    });

    it('handles string with no placeholders', () => {
      expect(interpolate('No placeholders', { key: 'value' })).toBe('No placeholders');
    });

    it('handles empty string', () => {
      expect(interpolate('', { key: 'value' })).toBe('');
    });

    it('handles repeated placeholder', () => {
      expect(interpolate('{{x}} {{x}}', { x: 'hi' })).toBe('hi hi');
    });
  });
});
