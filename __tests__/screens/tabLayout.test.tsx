import React from 'react';
import { render } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';

jest.mock('../../src/database/database', () => ({
  ...jest.requireActual('../../src/database/database'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

// Override the Tabs mock to render tabBarIcon callbacks with both active and inactive colors
jest.mock('expo-router', () => {
  const React = require('react');
  const TabsComponent = ({ children }: any) => React.createElement(React.Fragment, null, children);
  TabsComponent.Screen = ({ options }: any) => {
    const inactiveIcon = options?.tabBarIcon?.({ color: '#999' });
    const activeIcon = options?.tabBarIcon?.({ color: require('../../src/utils/theme').COLORS.primary });
    return React.createElement(React.Fragment, null, inactiveIcon, activeIcon);
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
    const { findAllByText } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    expect((await findAllByText('🏠')).length).toBeGreaterThan(0);
    expect((await findAllByText('📚')).length).toBeGreaterThan(0);
    expect((await findAllByText('🗣️')).length).toBeGreaterThan(0);
    expect((await findAllByText('⚙️')).length).toBeGreaterThan(0);
  });

  it('renders inactive icon with opacity 0.5', async () => {
    const { findAllByText } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    const icons = await findAllByText('🏠');
    const inactiveIcon = icons.find(el => el.props.style?.opacity === 0.5);
    expect(inactiveIcon).toBeTruthy();
  });

  it('renders active icon with opacity 1', async () => {
    const { findAllByText } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    const icons = await findAllByText('🏠');
    const activeIcon = icons.find(el => el.props.style?.opacity === 1);
    expect(activeIcon).toBeTruthy();
  });
});
