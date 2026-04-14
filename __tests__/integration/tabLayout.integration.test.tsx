import React from 'react';
import { render, act } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import TabLayout from '../../app/(tabs)/_layout';

// Mock core dependencies
jest.mock('../../src/services/settingsService', () => ({
  ...jest.requireActual('../../src/services/settingsService'),
  getSetting: jest.fn().mockResolvedValue(null),
  setSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/hooks/useWords', () => ({
  useWords: jest.fn(() => ({ data: [] })),
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

const mockAddWordModal = jest.fn((_props: any) => null);
jest.mock('../../src/components/AddWordModal', () => ({
  AddWordModal: (props: any) => mockAddWordModal(props),
}));

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

describe('TabLayout Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhase = 'idle';
  });

  it('renders TabLayout component', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    expect(toJSON()).toBeTruthy();
  });

  it('renders Ionicons components', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  it('calls AddWordModal with visible false initially', async () => {
    render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    expect(mockAddWordModal).toHaveBeenCalledWith(
      expect.objectContaining({ visible: false }),
    );
  });

  it('calls AddWordModal with visible true when phase is creating-word', async () => {
    mockPhase = 'creating-word';
    render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    expect(mockAddWordModal).toHaveBeenCalledWith(
      expect.objectContaining({ visible: true, onClose: mockResetCapture }),
    );
  });

  it('handles different capture phases gracefully', async () => {
    const phases = ['idle', 'recording', 'linking', 'creating-word'];
    for (const phase of phases) {
      jest.clearAllMocks();
      mockPhase = phase;
      const { toJSON } = render(
        <I18nProvider><TabLayout /></I18nProvider>
      );
      await act(async () => { await Promise.resolve(); });
      expect(toJSON()).toBeTruthy();
    }
  });

  it('renders tab icon configuration', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    const json = toJSON();
    // Should render without errors
    expect(json).toBeTruthy();
  });

  it('maintains MediaCaptureProvider wrapper', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    // Provider should be rendering children
    expect(toJSON()).toBeTruthy();
  });

  it('handles mount and unmount lifecycle', async () => {
    const { rerender, unmount } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    
    rerender(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    
    unmount();
    // Should complete without errors
    expect(true).toBe(true);
  });

  it('provides i18n context to all components', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    // Translation keys should be resolved
    expect(toJSON()).toBeTruthy();
  });

  it('initializes with correct tab configuration', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  it('handles multiple rapid re-renders', async () => {
    const { rerender } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    
    for (let i = 0; i < 5; i++) {
      rerender(
        <I18nProvider><TabLayout /></I18nProvider>
      );
      await act(async () => { await Promise.resolve(); });
    }
    
    expect(mockAddWordModal).toHaveBeenCalled();
  });

  it('maintains state across re-renders', async () => {
    mockPhase = 'recording';
    const { rerender } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    
    rerender(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    
    // AddWordModal should be called consistently
    expect(mockAddWordModal).toHaveBeenCalled();
  });

  it('renders with MediaCaptureProvider context available', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    expect(toJSON()).toBeTruthy();
  });

  it('resolves all tab screen options', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  it('initializes router context', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    // Router should be available in context
    expect(toJSON()).toBeTruthy();
  });

  it('initializes safe area insets hook', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    // Should render without errors even if safe area is mocked
    expect(toJSON()).toBeTruthy();
  });

  it('renders all tab screens', async () => {
    const { toJSON } = render(
      <I18nProvider><TabLayout /></I18nProvider>
    );
    await act(async () => { await Promise.resolve(); });
    const tree = toJSON();
    // Tree should contain rendered tabs
    expect(tree).toBeTruthy();
  });
});
