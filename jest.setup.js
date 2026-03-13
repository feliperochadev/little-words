// Jest 30 wraps the global object in a Proxy. expo/src/winter/runtime.native.ts installs lazy
// property getters that call require() on first access. When the Proxy fires after leaveTestCode()
// sets isInsideTestCode=false, jest-runtime throws "outside of scope" errors.
// Pre-warm all expo lazy globals now (during setupFiles, isInsideTestCode is undefined, not false)
// so they resolve to cached plain values before any test scope transitions.
[
  globalThis.__ExpoImportMetaRegistry,
  globalThis.TextDecoder,
  globalThis.TextDecoderStream,
  globalThis.TextEncoderStream,
  globalThis.URL,
  globalThis.URLSearchParams,
  globalThis.structuredClone,
].forEach(Boolean);

// Mock expo-sqlite — singleton so database.ts and tests share the same instance
const mockDbInstance = {
  execSync: jest.fn(),
  runSync: jest.fn(() => ({ lastInsertRowId: 1, changes: 1 })),
  getAllSync: jest.fn(() => []),
  getFirstSync: jest.fn(() => null),
  withTransactionSync: jest.fn((fn) => fn()),
};
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDbInstance),
}));
globalThis.__mockDb = mockDbInstance;

// Mock expo-file-system (new API)
jest.mock('expo-file-system', () => {
  const _textMock = jest.fn(() => Promise.resolve(''));
  const _writeMock = jest.fn();
  const _fileMock = { text: _textMock, write: _writeMock, uri: 'file:///mock/cache/test.csv' };
  const _dirMock = { createFile: jest.fn(() => _fileMock) };
  return {
    _fileMock,
    _dirMock,
    File: jest.fn(() => _fileMock),
    Directory: { pickDirectoryAsync: jest.fn(() => Promise.resolve(_dirMock)) },
    Paths: { cache: _dirMock, join: (...parts) => parts.filter(Boolean).join('/') },
  };
});

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    executionEnvironment: 'storeClient',
    expoConfig: { version: '2.0.0' },
    manifest: { version: '2.0.0' },
  },
}));

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => {
  const React = require('react');
  const StackComponent = ({ children }) => React.createElement(React.Fragment, null, children); // NOSONAR
  StackComponent.Screen = () => null;
  const TabsComponent = ({ children }) => React.createElement(React.Fragment, null, children); // NOSONAR
  TabsComponent.Screen = () => null;
  return {
    useRouter: jest.fn(() => ({
      replace: jest.fn(),
      push: jest.fn(),
      back: jest.fn(),
    })),
    useFocusEffect: jest.fn((cb) => {
      const React = require('react');
      React.useEffect(() => { const cleanup = cb(); return typeof cleanup === 'function' ? cleanup : undefined; }, []);
    }),
    Stack: StackComponent,
    Tabs: TabsComponent,
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children, // NOSONAR
  SafeAreaProvider: ({ children }) => children, // NOSONAR
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  SvgXml: 'SvgXml',
}));

// Mock expo-asset
jest.mock('expo-asset', () => ({}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Suppress console warnings in tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
