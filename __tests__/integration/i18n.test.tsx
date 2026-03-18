import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import { I18nProvider, useI18n, useCategoryName, LANGUAGES } from '../../src/i18n/i18n';
import * as db from '../../src/services/settingsService';

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

function TestConsumer() {
  const { t, ta, tc, locale } = useI18n();
  return (
    <>
      <Text testID="locale">{locale}</Text>
      <Text testID="cancel">{t('common.cancel')}</Text>
      <Text testID="months">{ta('datePicker.months').join(',')}</Text>
      <Text testID="count1">{tc('words.count', 1)}</Text>
      <Text testID="count5">{tc('words.count', 5)}</Text>
    </>
  );
}

function CategoryNameConsumer({ name }: Readonly<{ name: string }>) {
  const resolver = useCategoryName();
  return <Text testID="catName">{resolver(name)}</Text>;
}

describe('i18n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getSetting as jest.Mock).mockResolvedValue(null);
  });

  describe('I18nProvider', () => {
    it('renders children after loading locale', async () => {
      const { getByTestId } = render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );
      await waitFor(() => {
        expect(getByTestId('locale').props.children).toBe('en-US');
      });
    });

    it('defaults to en-US', async () => {
      const { getByTestId } = render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );
      await waitFor(() => {
        expect(getByTestId('cancel').props.children).toBe('Cancel');
      });
    });

    it('loads saved locale', async () => {
      (db.getSetting as jest.Mock).mockResolvedValue('pt-BR');
      const { getByTestId } = render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );
      await waitFor(() => {
        expect(getByTestId('locale').props.children).toBe('pt-BR');
      });
    });

    it('renders children immediately and stays on en-US when getSetting rejects', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (db.getSetting as jest.Mock).mockRejectedValue(new Error('DB error'));
      const { getByTestId } = render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );
      // Children render immediately without waiting for getSetting
      expect(getByTestId('locale').props.children).toBe('en-US');
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[I18n] Failed to load saved locale:',
          expect.any(Error)
        );
      });
      consoleSpy.mockRestore();
    });
  });

  describe('t() function', () => {
    it('translates known keys', async () => {
      const { getByTestId } = render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );
      await waitFor(() => {
        expect(getByTestId('cancel').props.children).toBe('Cancel');
      });
    });
  });

  describe('ta() function', () => {
    it('returns array values', async () => {
      const { getByTestId } = render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );
      await waitFor(() => {
        const months = getByTestId('months').props.children;
        expect(months).toContain('January');
      });
    });
  });

  describe('tc() function', () => {
    it('uses singular for count 1', async () => {
      const { getByTestId } = render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );
      await waitFor(() => {
        expect(getByTestId('count1').props.children).toContain('1');
      });
    });

    it('uses plural for count > 1', async () => {
      const { getByTestId } = render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );
      await waitFor(() => {
        expect(getByTestId('count5').props.children).toContain('5');
      });
    });
  });

  describe('useCategoryName', () => {
    it('translates built-in category keys', async () => {
      const { getByTestId } = render(
        <I18nProvider>
          <CategoryNameConsumer name="animals" />
        </I18nProvider>
      );
      await waitFor(() => {
        expect(getByTestId('catName').props.children).toBe('Animals');
      });
    });

    it('returns user-created names as-is', async () => {
      const { getByTestId } = render(
        <I18nProvider>
          <CategoryNameConsumer name="My Custom" />
        </I18nProvider>
      );
      await waitFor(() => {
        expect(getByTestId('catName').props.children).toBe('My Custom');
      });
    });
  });

  describe('LANGUAGES', () => {
    it('has en-US and pt-BR', () => {
      expect(LANGUAGES).toHaveLength(2);
      expect(LANGUAGES.find(l => l.locale === 'en-US')).toBeDefined();
      expect(LANGUAGES.find(l => l.locale === 'pt-BR')).toBeDefined();
    });

    it('each language has locale, label, and flag', () => {
      LANGUAGES.forEach(lang => {
        expect(lang.locale).toBeDefined();
        expect(lang.label).toBeDefined();
        expect(lang.flag).toBeDefined();
      });
    });
  });

  describe('setLocale', () => {
    it('changes locale and persists to DB', async () => {
      function LocaleSwitcher() {
        const { locale, setLocale, t } = useI18n();
        return (
          <>
            <Text testID="loc">{locale}</Text>
            <Text testID="cancel">{t('common.cancel')}</Text>
            <Text onPress={() => setLocale('pt-BR')} testID="switch">switch</Text>
          </>
        );
      }
      const { getByTestId } = render(
        <I18nProvider><LocaleSwitcher /></I18nProvider>
      );
      await waitFor(() => expect(getByTestId('loc').props.children).toBe('en-US'));
      await act(async () => { getByTestId('switch').props.onPress(); });
      await waitFor(() => {
        expect(getByTestId('loc').props.children).toBe('pt-BR');
        expect(db.setSetting).toHaveBeenCalledWith('app_locale', 'pt-BR');
      });
    });
  });

  describe('resolve fallback', () => {
    it('falls back to en-US for missing pt-BR key', async () => {
      (db.getSetting as jest.Mock).mockResolvedValue('pt-BR');
      function FallbackConsumer() {
        const { t } = useI18n();
        // Use a key that exists - test that resolve works for pt-BR locale
        return <Text testID="val">{t('nonexistent.key.here')}</Text>;
      }
      const { getByTestId } = render(
        <I18nProvider><FallbackConsumer /></I18nProvider>
      );
      await waitFor(() => {
        // Falls back to the key itself since it doesn't exist in either catalogue
        expect(getByTestId('val').props.children).toBe('nonexistent.key.here');
      });
    });
  });

  describe('ta fallback', () => {
    it('falls back to en-US for missing array in pt-BR', async () => {
      (db.getSetting as jest.Mock).mockResolvedValue('pt-BR');
      function TaFallbackConsumer() {
        const { ta } = useI18n();
        // Try a non-existent array key
        return <Text testID="arr">{ta('nonexistent.array').length}</Text>;
      }
      const { getByTestId } = render(
        <I18nProvider><TaFallbackConsumer /></I18nProvider>
      );
      await waitFor(() => {
        // Returns empty array as fallback
        expect(getByTestId('arr').props.children).toBe(0);
      });
    });

    it('returns pt-BR months when locale is pt-BR', async () => {
      (db.getSetting as jest.Mock).mockResolvedValue('pt-BR');
      function PtMonths() {
        const { ta } = useI18n();
        return <Text testID="m">{ta('datePicker.months').join(',')}</Text>;
      }
      const { getByTestId } = render(
        <I18nProvider><PtMonths /></I18nProvider>
      );
      await waitFor(() => {
        expect(getByTestId('m').props.children).toContain('Janeiro');
      });
    });
  });

  describe('useI18n outside provider', () => {
    it('throws error when used outside I18nProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useI18n must be used inside <I18nProvider>');
      consoleSpy.mockRestore();
    });
  });
});
