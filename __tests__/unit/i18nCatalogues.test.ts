import enUS from '../../src/i18n/en-US';
import ptBR from '../../src/i18n/pt-BR';
import { DEFAULT_CATEGORIES } from '../../src/utils/categoryKeys';

function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...getKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

describe('i18n catalogues', () => {
  describe('en-US', () => {
    it('has all default category translations', () => {
      DEFAULT_CATEGORIES.forEach(cat => {
        expect((enUS.categories as Record<string, string>)[cat.key]).toBeDefined();
        expect(typeof (enUS.categories as Record<string, string>)[cat.key]).toBe('string');
      });
    });

    it('has common translations', () => {
      expect(enUS.common.cancel).toBe('Cancel');
      expect(enUS.common.save).toBe('Save');
      expect(enUS.common.error).toBe('Error');
    });

    it('has tab translations', () => {
      expect(enUS.tabs.home).toBeDefined();
      expect(enUS.tabs.words).toBeDefined();
      expect(enUS.tabs.variants).toBeDefined();
      expect(enUS.tabs.settings).toBeDefined();
    });

    it('has datePicker months array with 12 entries', () => {
      expect(enUS.datePicker.months).toHaveLength(12);
    });

    it('has brandHeader translations', () => {
      expect(enUS.brandHeader.appName).toBeDefined();
      expect(enUS.brandHeader.tagline).toBeDefined();
    });

    it('has dashboard translations', () => {
      expect(enUS.dashboard.totalWords).toBeDefined();
      expect(enUS.dashboard.greeting.morning).toBeDefined();
      expect(enUS.dashboard.age.year).toBeDefined();
    });

    it('has words screen translations', () => {
      expect(enUS.words.title).toBeDefined();
      expect(enUS.words.count).toContain('{{count}}');
      expect(enUS.words.countPlural).toContain('{{count}}');
    });

    it('has variants screen translations', () => {
      expect(enUS.variants.title).toBeDefined();
      expect(enUS.variants.count).toContain('{{count}}');
    });
  });

  describe('pt-BR', () => {
    it('has all default category translations', () => {
      DEFAULT_CATEGORIES.forEach(cat => {
        expect((ptBR.categories as Record<string, string>)[cat.key]).toBeDefined();
      });
    });

    it('has common translations', () => {
      expect(ptBR.common.cancel).toBeDefined();
      expect(ptBR.common.save).toBeDefined();
    });

    it('has datePicker months array with 12 entries', () => {
      expect(ptBR.datePicker.months).toHaveLength(12);
    });
  });

  describe('catalogue parity', () => {
    it('en-US and pt-BR have the same keys', () => {
      const enKeys = getKeys(enUS as unknown as Record<string, unknown>).sort((a, b) => a.localeCompare(b));
      const ptKeys = getKeys(ptBR as unknown as Record<string, unknown>).sort((a, b) => a.localeCompare(b));
      expect(enKeys).toEqual(ptKeys);
    });
  });
});
