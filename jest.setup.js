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

// Mock expo-sqlite — singleton so all modules and tests share the same instance
const mockDbInstance = {
  // Async methods — used by repositories (client.ts)
  getAllAsync: jest.fn(() => Promise.resolve([])),
  runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
  withTransactionAsync: jest.fn(async (fn) => { await fn(); }),
  // Sync methods — used by init.ts and migrator.ts
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
  const _copyMock = jest.fn();
  const _deleteMock = jest.fn();
  const _fileMock = {
    text: _textMock,
    write: _writeMock,
    copy: _copyMock,
    delete: _deleteMock,
    uri: 'file:///mock/cache/test.csv',
    exists: true,
    size: 1024,
  };
  const _dirMock = {
    createFile: jest.fn(() => _fileMock),
    create: jest.fn(),
    delete: jest.fn(),
    exists: true,
    uri: 'file:///mock/cache/',
  };
  const _docDirMock = {
    createFile: jest.fn(() => _fileMock),
    create: jest.fn(),
    delete: jest.fn(),
    exists: true,
    uri: 'file:///mock/document/',
  };
  const DirectoryMock = jest.fn(() => ({
    create: jest.fn(),
    delete: jest.fn(),
    exists: false,
    uri: '',
  }));
  DirectoryMock.pickDirectoryAsync = jest.fn(() => Promise.resolve(_dirMock));
  return {
    _fileMock,
    _dirMock,
    _docDirMock,
    File: jest.fn(() => _fileMock),
    Directory: DirectoryMock,
    Paths: {
      cache: _dirMock,
      document: _docDirMock,
      join: (...parts) => parts.filter(Boolean).join('/'),
    },
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
    useLocalSearchParams: jest.fn(() => ({})),
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

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Recording: jest.fn(),
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({ sound: { unloadAsync: jest.fn(), playAsync: jest.fn(), stopAsync: jest.fn() }, status: {} })
      ),
    },
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  },
  Video: jest.fn(),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  MediaTypeOptions: { All: 'All', Images: 'Images', Videos: 'Videos' },
}));

// Mock expo-asset
jest.mock('expo-asset', () => ({}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Suppress console warnings in tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
