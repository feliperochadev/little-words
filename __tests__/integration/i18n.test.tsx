import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import { I18nProvider, useI18n, useCategoryName, LANGUAGES } from '../../src/i18n/i18n';
import * as db from '../../src/database/database';

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
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

function CategoryNameConsumer({ name }: { name: string }) {
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
