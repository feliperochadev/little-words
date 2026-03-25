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

jest.mock('../../src/components/NotificationPrimingModal', () => ({
  NotificationPrimingModal: () => null,
}));

jest.mock('../../src/providers/MediaCaptureProvider', () => ({
  MediaCaptureProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mutable phase for GlobalAddWordModal tests
let mockPhase = 'idle';
const mockResetCapture = jest.fn();

jest.mock('../../src/hooks/useMediaCapture', () => ({
  useMediaCapture: () => ({
    phase: mockPhase,
    resetCapture: mockResetCapture,
    pendingMedia: null,
    prefilledWordName: '',
    prefilledMediaName: '',
    playingAssetId: null,
    setPhase: jest.fn(),
    setCapturedMedia: jest.fn(),
    linkMediaToWord: jest.fn(),
    linkMediaToVariant: jest.fn(),
    saveWithoutLinking: jest.fn(),
    startCreateWord: jest.fn(),
    onWordCreated: jest.fn(),
    launchPhotoPicker: jest.fn(),
    playAssetByParent: jest.fn(),
    stopPlayback: jest.fn(),
  }),
}));

// Capture AddWordModal calls to inspect visible prop
const mockAddWordModal = jest.fn((_props: any) => null);
jest.mock('../../src/components/AddWordModal', () => ({
  AddWordModal: (props: any) => mockAddWordModal(props),
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhase = 'idle';
  });

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

  // ── GlobalAddWordModal ─────────────────────────────────────────────────────

  describe('GlobalAddWordModal', () => {
    it('renders AddWordModal with visible=false when phase is idle', async () => {
      mockPhase = 'idle';
      render(<I18nProvider><TabLayout /></I18nProvider>);
      await act(async () => { await Promise.resolve(); });
      expect(mockAddWordModal).toHaveBeenLastCalledWith(
        expect.objectContaining({ visible: false }),
      );
    });

    it('renders AddWordModal with visible=true when phase is creating-word', async () => {
      mockPhase = 'creating-word';
      render(<I18nProvider><TabLayout /></I18nProvider>);
      await act(async () => { await Promise.resolve(); });
      expect(mockAddWordModal).toHaveBeenLastCalledWith(
        expect.objectContaining({ visible: true }),
      );
    });

    it('passes resetCapture as onClose to AddWordModal', async () => {
      mockPhase = 'creating-word';
      render(<I18nProvider><TabLayout /></I18nProvider>);
      await act(async () => { await Promise.resolve(); });
      expect(mockAddWordModal).toHaveBeenLastCalledWith(
        expect.objectContaining({ onClose: mockResetCapture }),
      );
    });

    it('renders AddWordModal with visible=false when phase is linking', async () => {
      mockPhase = 'linking';
      render(<I18nProvider><TabLayout /></I18nProvider>);
      await act(async () => { await Promise.resolve(); });
      expect(mockAddWordModal).toHaveBeenLastCalledWith(
        expect.objectContaining({ visible: false }),
      );
    });

    it('renders AddWordModal with visible=false when phase is recording', async () => {
      mockPhase = 'recording';
      render(<I18nProvider><TabLayout /></I18nProvider>);
      await act(async () => { await Promise.resolve(); });
      expect(mockAddWordModal).toHaveBeenLastCalledWith(
        expect.objectContaining({ visible: false }),
      );
    });
  });
});
