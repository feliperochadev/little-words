import React from 'react';
import { render, act } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';

jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/components/MediaFAB', () => ({
  MediaFAB: () => null,
}));

jest.mock('../../src/components/MediaLinkingModal', () => ({
  MediaLinkingModal: () => null,
}));

jest.mock('../../src/providers/MediaCaptureProvider', () => ({
  MediaCaptureProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Override the Tabs mock to render tabBarIcon callbacks with both active and inactive colors
jest.mock('expo-router', () => {
  const React = require('react');
  const TabsComponent = ({ children }: any) => React.createElement(React.Fragment, null, children);
  TabsComponent.Screen = ({ options }: any) => {
    const inactiveIcon = options?.tabBarIcon?.({ color: '#999', focused: false });
    const activeIcon = options?.tabBarIcon?.({ color: require('../../src/theme').colors.primary, focused: true });
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

/**
 * Recursively finds all nodes of a given type name in a toJSON() tree.
 */
function findAllByTypeName(tree: any, typeName: string): any[] {
  if (!tree) return [];
  if (Array.isArray(tree)) {
    return tree.flatMap((item: any) => findAllByTypeName(item, typeName));
  }
  const results: any[] = [];
  if (tree.type === typeName) results.push(tree);
  if (Array.isArray(tree.children)) {
    results.push(...findAllByTypeName(tree.children, typeName));
  }
  return results;
}

describe('TabLayout', () => {
  it('renders tab icons using Ionicons', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    const icons = findAllByTypeName(toJSON(), 'Ionicons');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders inactive icon with opacity 0.6', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    const icons = findAllByTypeName(toJSON(), 'Ionicons');
    const inactiveIcon = icons.find((el: any) => {
      const style = Array.isArray(el.props.style)
        ? Object.assign({}, ...el.props.style)
        : (el.props.style ?? {});
      return style.opacity === 0.6;
    });
    expect(inactiveIcon).toBeTruthy();
  });

  it('renders active icon with opacity 1', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    const icons = findAllByTypeName(toJSON(), 'Ionicons');
    const activeIcon = icons.find((el: any) => {
      const style = Array.isArray(el.props.style)
        ? Object.assign({}, ...el.props.style)
        : (el.props.style ?? {});
      return style.opacity === 1;
    });
    expect(activeIcon).toBeTruthy();
  });
});
