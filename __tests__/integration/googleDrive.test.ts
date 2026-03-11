import {
  isNativeBuild,
  configureGoogleSignIn,
  signInWithGoogle,
  signOutGoogle,
  isGoogleConnected,
  getGoogleUserEmail,
  performSync,
} from '../../src/utils/googleDrive';
import Constants from 'expo-constants';

const mockDb = (global as any).__mockDb;

// Get the mocked google signin module
const mockGoogleSignin = require('@react-native-google-signin/google-signin');
const { GoogleSignin, statusCodes } = mockGoogleSignin;

// Helper: make isNativeBuild() return true by changing executionEnvironment
const setNativeBuild = (native: boolean) => {
  (Constants as any).executionEnvironment = native ? 'standalone' : 'storeClient';
};

// Helper to mock getSetting responses in order
const mockGetSetting = (values: Record<string, string | null>) => {
  mockDb.getAllSync.mockImplementation((_sql: string, args: any[]) => {
    const key = args?.[0];
    if (key && key in values) {
      const val = values[key];
      return val !== null ? [{ value: val }] : [];
    }
    return [];
  });
};

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('googleDrive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setNativeBuild(false); // default: not native
    mockFetch.mockReset();
  });

  // ── isNativeBuild ──────────────────────────────────────────────────────

  describe('isNativeBuild', () => {
    it('returns false when executionEnvironment is storeClient', () => {
      setNativeBuild(false);
      expect(isNativeBuild()).toBe(false);
    });

    it('returns true when executionEnvironment is not storeClient', () => {
      setNativeBuild(true);
      expect(isNativeBuild()).toBe(true);
    });
  });

  // ── configureGoogleSignIn ──────────────────────────────────────────────

  describe('configureGoogleSignIn', () => {
    it('does nothing when not native build', () => {
      setNativeBuild(false);
      configureGoogleSignIn();
      expect(GoogleSignin.configure).not.toHaveBeenCalled();
    });

    it('configures GoogleSignin when native build', () => {
      setNativeBuild(true);
      configureGoogleSignIn();
      expect(GoogleSignin.configure).toHaveBeenCalledWith({
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
    });
  });

  // ── signInWithGoogle ───────────────────────────────────────────────────

  describe('signInWithGoogle', () => {
    it('returns error when not native build', async () => {
      setNativeBuild(false);
      const result = await signInWithGoogle();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Expo Go');
    });

    it('signs in successfully and stores email (userInfo.data.user.email)', async () => {
      setNativeBuild(true);
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockResolvedValue({
        data: { user: { email: 'test@gmail.com' } },
      });

      const result = await signInWithGoogle();
      expect(result).toEqual({ success: true });
      // setSetting called for email and signed_in flag
      expect(mockDb.runSync).toHaveBeenCalledTimes(2);
    });

    it('signs in successfully with fallback email path (userInfo.user.email)', async () => {
      setNativeBuild(true);
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockResolvedValue({
        user: { email: 'fallback@gmail.com' },
      });

      const result = await signInWithGoogle();
      expect(result).toEqual({ success: true });
    });

    it('uses empty string when no email found', async () => {
      setNativeBuild(true);
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockResolvedValue({});

      const result = await signInWithGoogle();
      expect(result).toEqual({ success: true });
    });

    it('returns cancelled error', async () => {
      setNativeBuild(true);
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockRejectedValue({ code: statusCodes.SIGN_IN_CANCELLED, message: 'cancelled' });

      const result = await signInWithGoogle();
      expect(result).toEqual({ success: false, error: 'cancelled' });
    });

    it('returns in_progress error', async () => {
      setNativeBuild(true);
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockRejectedValue({ code: statusCodes.IN_PROGRESS, message: 'in progress' });

      const result = await signInWithGoogle();
      expect(result).toEqual({ success: false, error: 'in_progress' });
    });

    it('returns play services not available error', async () => {
      setNativeBuild(true);
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockRejectedValue({ code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE, message: 'no play' });

      const result = await signInWithGoogle();
      expect(result).toEqual({ success: false, error: 'Google Play Services nao disponivel.' });
    });

    it('returns generic error message', async () => {
      setNativeBuild(true);
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockRejectedValue({ code: 'UNKNOWN', message: 'Something went wrong' });

      const result = await signInWithGoogle();
      expect(result).toEqual({ success: false, error: 'Something went wrong' });
    });

    it('returns fallback error when message is undefined', async () => {
      setNativeBuild(true);
      GoogleSignin.hasPlayServices.mockResolvedValue(true);
      GoogleSignin.signIn.mockRejectedValue({ code: 'UNKNOWN' });

      const result = await signInWithGoogle();
      expect(result).toEqual({ success: false, error: 'Erro ao conectar.' });
    });
  });

  // ── signOutGoogle ──────────────────────────────────────────────────────

  describe('signOutGoogle', () => {
    it('calls GoogleSignin.signOut and clears settings when native build', async () => {
      setNativeBuild(true);
      GoogleSignin.signOut.mockResolvedValue(undefined);

      await signOutGoogle();
      expect(GoogleSignin.signOut).toHaveBeenCalled();
      // 4 setSetting calls: google_signed_in, google_user_email, google_file_id, google_last_sync
      expect(mockDb.runSync).toHaveBeenCalledTimes(4);
    });

    it('clears settings even when not native build (skips signOut call)', async () => {
      setNativeBuild(false);
      await signOutGoogle();
      expect(GoogleSignin.signOut).not.toHaveBeenCalled();
      expect(mockDb.runSync).toHaveBeenCalledTimes(4);
    });

    it('clears settings even when GoogleSignin.signOut throws', async () => {
      setNativeBuild(true);
      GoogleSignin.signOut.mockRejectedValue(new Error('signOut failed'));

      await signOutGoogle();
      // Settings should still be cleared
      expect(mockDb.runSync).toHaveBeenCalledTimes(4);
    });
  });

  // ── isGoogleConnected ──────────────────────────────────────────────────

  describe('isGoogleConnected', () => {
    it('returns false when not native build', async () => {
      setNativeBuild(false);
      const result = await isGoogleConnected();
      expect(result).toBe(false);
    });

    it('returns true when native build and setting is "1"', async () => {
      setNativeBuild(true);
      mockDb.getAllSync.mockReturnValueOnce([{ value: '1' }]);
      const result = await isGoogleConnected();
      expect(result).toBe(true);
    });

    it('returns false when native build and setting is not "1"', async () => {
      setNativeBuild(true);
      mockDb.getAllSync.mockReturnValueOnce([{ value: '' }]);
      const result = await isGoogleConnected();
      expect(result).toBe(false);
    });

    it('returns false when native build and setting is absent', async () => {
      setNativeBuild(true);
      mockDb.getAllSync.mockReturnValueOnce([]);
      const result = await isGoogleConnected();
      expect(result).toBe(false);
    });
  });

  // ── getGoogleUserEmail ─────────────────────────────────────────────────

  describe('getGoogleUserEmail', () => {
    it('returns email from settings', async () => {
      mockDb.getAllSync.mockReturnValueOnce([{ value: 'test@gmail.com' }]);
      const result = await getGoogleUserEmail();
      expect(result).toBe('test@gmail.com');
    });

    it('returns null when not set', async () => {
      mockDb.getAllSync.mockReturnValueOnce([]);
      const result = await getGoogleUserEmail();
      expect(result).toBeNull();
    });
  });

  // ── performSync ────────────────────────────────────────────────────────

  describe('performSync', () => {
    it('returns error when not native build', async () => {
      setNativeBuild(false);
      const result = await performSync();
      expect(result).toEqual({ success: false, error: 'not_native' });
    });

    it('returns error when not connected', async () => {
      setNativeBuild(true);
      // isGoogleConnected calls getSetting('google_signed_in')
      mockDb.getAllSync.mockReturnValueOnce([{ value: '' }]);

      const result = await performSync();
      expect(result).toEqual({ success: false, error: 'Nao conectado' });
    });

    it('uploads successfully with existing file ID from settings', async () => {
      setNativeBuild(true);
      // isGoogleConnected → '1'
      // getSetting('google_file_id') → 'existing-id'
      let callCount = 0;
      mockDb.getAllSync.mockImplementation((_sql: string, args: any[]) => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return [{ value: 'existing-id' }]; // google_file_id
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValue({ accessToken: 'test-token' });

      // findOrCreateFolder - folder found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // uploadToDrive - PATCH success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-file-id' }),
      });

      const result = await performSync();
      expect(result.success).toBe(true);
      expect(result.lastSync).toBeDefined();
      // Verify fetch was called with PATCH (existing file)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('existing-id'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('uploads successfully creating new file (no existing file ID)', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return []; // google_file_id (not set)
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValue({ accessToken: 'test-token' });

      // findOrCreateFolder - folder found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // findExistingFile fetch - no file found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });
      // uploadToDrive fetch - success POST
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'brand-new-id' }),
      });

      const result = await performSync();
      expect(result.success).toBe(true);
      // Third fetch should be POST (new file)
      expect(mockFetch.mock.calls[2][1].method).toBe('POST');
    });

    it('finds existing file via Drive API when not in settings', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return []; // google_file_id (not set)
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValue({ accessToken: 'test-token' });

      // findOrCreateFolder - folder found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // findExistingFile fetch - found existing file
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'found-file-id' }] }),
      });
      // uploadToDrive fetch - success with PATCH
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'found-file-id' }),
      });

      const result = await performSync();
      expect(result.success).toBe(true);
      // Should use PATCH since file was found
      expect(mockFetch.mock.calls[2][1].method).toBe('PATCH');
    });

    it('handles TOKEN_EXPIRED by retrying with fresh token', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return [{ value: 'file-id' }]; // google_file_id
        return [];
      });

      GoogleSignin.getTokens
        .mockResolvedValueOnce({ accessToken: 'expired-token' })
        .mockResolvedValueOnce({ accessToken: 'fresh-token' });
      GoogleSignin.signInSilently.mockResolvedValue({});

      // findOrCreateFolder (initial token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // First upload - 401 TOKEN_EXPIRED
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      });
      // findOrCreateFolder (fresh token retry)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // Retry upload - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'file-id' }),
      });

      const result = await performSync();
      expect(result.success).toBe(true);
      expect(GoogleSignin.signInSilently).toHaveBeenCalled();
    });

    it('signs out when retry after TOKEN_EXPIRED also fails', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return [{ value: 'file-id' }]; // google_file_id
        return [];
      });

      GoogleSignin.getTokens
        .mockResolvedValueOnce({ accessToken: 'expired-token' })
        .mockResolvedValueOnce({ accessToken: 'fresh-token' });
      GoogleSignin.signInSilently.mockResolvedValue({});
      GoogleSignin.signOut.mockResolvedValue(undefined);

      // findOrCreateFolder (initial token)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // First upload - 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      });
      // findOrCreateFolder (fresh token retry)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // Retry upload - also fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      const result = await performSync();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Sessao expirada. Conecte-se novamente.');
    });

    it('signs out when signInSilently throws during TOKEN_EXPIRED retry', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return [{ value: 'file-id' }]; // google_file_id
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValueOnce({ accessToken: 'expired-token' });
      GoogleSignin.signInSilently.mockRejectedValue(new Error('silent sign in failed'));
      GoogleSignin.signOut.mockResolvedValue(undefined);

      // findOrCreateFolder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // First upload - 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      });

      const result = await performSync();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Sessao expirada. Conecte-se novamente.');
    });

    it('returns error for non-401 HTTP failure', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return [{ value: 'file-id' }]; // google_file_id
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValue({ accessToken: 'test-token' });

      // findOrCreateFolder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // Upload fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      const result = await performSync();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro HTTP 500');
    });

    it('handles fetch exception in uploadToDrive', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return [{ value: 'file-id' }]; // google_file_id
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValue({ accessToken: 'test-token' });

      // findOrCreateFolder - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // uploadToDrive throws
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await performSync();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('handles exception in performSync try block (e.g. getAccessToken fails)', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        return [];
      });

      GoogleSignin.getTokens.mockRejectedValue(new Error('Token retrieval failed'));

      const result = await performSync();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token retrieval failed');
    });

    it('handles findExistingFile returning null on fetch failure', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return []; // no google_file_id
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValue({ accessToken: 'test-token' });

      // findOrCreateFolder - folder found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // findExistingFile - not ok response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });
      // uploadToDrive - success with POST (no existing file)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-id' }),
      });

      const result = await performSync();
      expect(result.success).toBe(true);
      // Should use POST since findExistingFile returned null
      expect(mockFetch.mock.calls[2][1].method).toBe('POST');
    });

    it('handles findExistingFile fetch exception', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return []; // no google_file_id
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValue({ accessToken: 'test-token' });

      // findOrCreateFolder - folder found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'folder-id' }] }),
      });
      // findExistingFile - throws
      mockFetch.mockRejectedValueOnce(new Error('network down'));
      // uploadToDrive - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-id' }),
      });

      const result = await performSync();
      expect(result.success).toBe(true);
    });

    it('creates folder when none exists and uploads successfully', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return []; // no google_file_id
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValue({ accessToken: 'test-token' });

      // findOrCreateFolder search - no folder found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });
      // findOrCreateFolder create - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-folder-id' }),
      });
      // findExistingFile - no file found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      });
      // uploadToDrive - success POST with parent folder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'created-file-id' }),
      });

      const result = await performSync();
      expect(result.success).toBe(true);
      // POST body should include folder parent
      const uploadBody = mockFetch.mock.calls[3][1].body as string;
      expect(uploadBody).toContain('new-folder-id');
    });

    it('proceeds without folder when findOrCreateFolder search fails', async () => {
      setNativeBuild(true);
      let callCount = 0;
      mockDb.getAllSync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ value: '1' }]; // google_signed_in
        if (callCount === 2) return [{ value: 'file-id' }]; // google_file_id
        return [];
      });

      GoogleSignin.getTokens.mockResolvedValue({ accessToken: 'test-token' });

      // findOrCreateFolder - throws
      mockFetch.mockRejectedValueOnce(new Error('folder search failed'));
      // uploadToDrive - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'file-id' }),
      });

      const result = await performSync();
      expect(result.success).toBe(true);
    });
  });
});
