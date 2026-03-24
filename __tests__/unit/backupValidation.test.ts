import { strToU8 } from 'fflate';
import {
  validateManifestBytes,
  validateDataBytes,
  validateMediaPaths,
} from '../../src/utils/backupValidation';
import type { BackupManifest, BackupData } from '../../src/types/backup';

const makeManifest = (overrides?: Partial<BackupManifest>): BackupManifest => ({
  version: '1.0',
  exported_at: '2026-03-23T12:00:00Z',
  app_version: '0.8.0',
  word_count: 5,
  variant_count: 3,
  category_count: 2,
  asset_count: 4,
  locale: 'en-US',
  ...overrides,
});

const makeData = (overrides?: Partial<BackupData>): BackupData => ({
  version: '1.0',
  settings: { name: 'Baby', sex: 'girl', birth: '2024-01-01', locale: 'en-US' },
  categories: [],
  words: [],
  variants: [],
  assets: [],
  ...overrides,
});

const toBytes = (obj: unknown) => strToU8(JSON.stringify(obj));

describe('backupValidation', () => {
  describe('validateManifestBytes', () => {
    it('returns manifest for valid v1.0 data', () => {
      const m = makeManifest();
      const result = validateManifestBytes(toBytes(m));
      expect(result.version).toBe('1.0');
      expect(result.word_count).toBe(5);
    });

    it('throws on invalid JSON', () => {
      expect(() => validateManifestBytes(strToU8('not json!!!'))).toThrow('manifest.json is not valid JSON');
    });

    it('throws when manifest is not an object', () => {
      expect(() => validateManifestBytes(toBytes('string-value'))).toThrow('manifest.json is malformed');
    });

    it('throws for unsupported version', () => {
      expect(() => validateManifestBytes(toBytes({ version: '2.0' }))).toThrow('Unsupported backup version: 2.0');
    });

    it('throws for missing version field', () => {
      expect(() => validateManifestBytes(toBytes({ word_count: 1 }))).toThrow('Unsupported backup version: unknown');
    });
  });

  describe('validateDataBytes', () => {
    it('returns data for a valid payload', () => {
      const d = makeData({ words: [{ id: 1, word: 'mama', category_id: null, date_added: '2024-01-01', notes: null, created_at: '2024-01-01' }] });
      const result = validateDataBytes(toBytes(d));
      expect(result.words).toHaveLength(1);
      expect(result.words[0].word).toBe('mama');
    });

    it('throws on invalid JSON', () => {
      expect(() => validateDataBytes(strToU8('{bad json'))).toThrow('data.json is not valid JSON');
    });

    it('throws when data is not an object', () => {
      expect(() => validateDataBytes(toBytes(42))).toThrow('data.json is malformed');
    });

    it('throws when words array is missing', () => {
      expect(() => validateDataBytes(toBytes({ variants: [], categories: [], assets: [] }))).toThrow('missing "words" array');
    });

    it('throws when variants array is missing', () => {
      expect(() => validateDataBytes(toBytes({ words: [], categories: [], assets: [] }))).toThrow('missing "variants" array');
    });

    it('throws when categories array is missing', () => {
      expect(() => validateDataBytes(toBytes({ words: [], variants: [], assets: [] }))).toThrow('missing "categories" array');
    });

    it('throws when assets array is missing', () => {
      expect(() => validateDataBytes(toBytes({ words: [], variants: [], categories: [] }))).toThrow('missing "assets" array');
    });
  });

  describe('validateMediaPaths', () => {
    const goodFileMap: Record<string, Uint8Array> = {
      'media/words/1/audio/asset_1.m4a': new Uint8Array([1]),
      'media/variants/5/photos/asset_2.jpg': new Uint8Array([2]),
      'media/profile/1/photos/asset_3.png': new Uint8Array([3]),
      'media/unlinked/9/audio/asset_4.m4a': new Uint8Array([4]),
    };

    it('passes for valid paths that exist in file map', () => {
      const assets = [{ media_path: 'words/1/audio/asset_1.m4a' }];
      expect(() => validateMediaPaths(assets, goodFileMap)).not.toThrow();
    });

    it('passes even when file is missing from map (warnings handled at import)', () => {
      const assets = [{ media_path: 'words/99/audio/asset_99.m4a' }];
      expect(() => validateMediaPaths(assets, goodFileMap)).not.toThrow();
    });

    it('throws for path traversal with ..', () => {
      const assets = [{ media_path: '../etc/passwd' }];
      expect(() => validateMediaPaths(assets, goodFileMap)).toThrow('Unsafe file path detected');
    });

    it('throws for absolute path starting with /', () => {
      const assets = [{ media_path: '/etc/passwd' }];
      expect(() => validateMediaPaths(assets, goodFileMap)).toThrow('Unsafe file path detected');
    });

    it('throws for absolute path starting with \\', () => {
      const assets = [{ media_path: '\\etc\\passwd' }];
      expect(() => validateMediaPaths(assets, goodFileMap)).toThrow('Unsafe file path detected');
    });

    it('throws for path that does not match allowed pattern', () => {
      const assets = [{ media_path: 'somefolder/1/audio/asset_1.m4a' }];
      expect(() => validateMediaPaths(assets, goodFileMap)).toThrow('Unsafe file path detected');
    });

    it('throws for empty media_path', () => {
      const assets = [{ media_path: '' }];
      expect(() => validateMediaPaths(assets, goodFileMap)).toThrow('Unsafe file path detected');
    });

    it('accepts all valid parent types', () => {
      const assets = [
        { media_path: 'words/1/audio/asset_1.m4a' },
        { media_path: 'variants/2/photos/asset_2.jpg' },
        { media_path: 'profile/1/photos/asset_3.png' },
        { media_path: 'unlinked/3/audio/asset_4.wav' },
      ];
      expect(() => validateMediaPaths(assets, goodFileMap)).not.toThrow();
    });

    it('accepts all valid asset type directories', () => {
      const assets = [
        { media_path: 'words/1/audio/asset_1.m4a' },
        { media_path: 'words/1/photos/asset_2.jpg' },
        { media_path: 'words/1/videos/asset_3.mp4' },
      ];
      expect(() => validateMediaPaths(assets, goodFileMap)).not.toThrow();
    });

    it('handles empty asset list without error', () => {
      expect(() => validateMediaPaths([], goodFileMap)).not.toThrow();
    });
  });
});
