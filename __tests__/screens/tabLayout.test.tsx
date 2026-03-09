import React from 'react';
import { render } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

// Override the Tabs mock to render tabBarIcon callbacks
jest.mock('expo-router', () => {
  const React = require('react');
  const TabsComponent = ({ children }: any) => React.createElement(React.Fragment, null, children);
  TabsComponent.Screen = ({ options }: any) => {
    const icon = options?.tabBarIcon?.({ color: '#999' });
    return React.createElement(React.Fragment, null, icon);
  };
  return {
    useRouter: jest.fn(() => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() })),
    useFocusEffect: jest.fn((cb: any) => {
      const R = require('react');
      R.useEffect(() => { const cleanup = cb(); return typeof cleanup === 'function' ? cleanup : undefined; }, []);
    }),
    Stack: ({ children }: any) => React.createElement(React.Fragment, null, children),
    Tabs: TabsComponent,
  };
});

import TabLayout from '../../app/(tabs)/_layout';

describe('TabLayout', () => {
  it('renders tab icons with emojis', async () => {
    const { findByText } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    expect(await findByText('🏠')).toBeTruthy();
    expect(await findByText('📚')).toBeTruthy();
    expect(await findByText('🗣️')).toBeTruthy();
    expect(await findByText('⚙️')).toBeTruthy();
  });
});
