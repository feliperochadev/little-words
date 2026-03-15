import {
  ACCEPTED_MIME_TYPES,
  ASSET_EXTENSIONS,
  MAX_FILE_SIZE,
  MEDIA_ROOT_DIR,
  validateMimeType,
  validateFileSize,
  getExtensionForMime,
} from '../../src/types/asset';
import type { AssetType } from '../../src/types/asset';

describe('asset types', () => {
  // ─── Constants ──────────────────────────────────────────────────────────────

  describe('MEDIA_ROOT_DIR', () => {
    it('equals "media"', () => {
      expect(MEDIA_ROOT_DIR).toBe('media');
    });
  });

  describe('ACCEPTED_MIME_TYPES', () => {
    it('defines audio MIME types', () => {
      expect(ACCEPTED_MIME_TYPES.audio).toEqual([
        'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/aac',
      ]);
    });

    it('defines photo MIME types', () => {
      expect(ACCEPTED_MIME_TYPES.photo).toEqual([
        'image/jpeg', 'image/png', 'image/webp',
      ]);
    });

    it('defines video MIME types', () => {
      expect(ACCEPTED_MIME_TYPES.video).toEqual([
        'video/mp4', 'video/quicktime',
      ]);
    });
  });

  describe('ASSET_EXTENSIONS', () => {
    it.each([
      ['audio/mp4', '.m4a'],
      ['audio/mpeg', '.mp3'],
      ['audio/wav', '.wav'],
      ['audio/x-m4a', '.m4a'],
      ['audio/aac', '.aac'],
      ['image/jpeg', '.jpg'],
      ['image/png', '.png'],
      ['image/webp', '.webp'],
      ['video/mp4', '.mp4'],
      ['video/quicktime', '.mov'],
    ])('maps %s to %s', (mime, ext) => {
      expect(ASSET_EXTENSIONS[mime]).toBe(ext);
    });

    it('has exactly 10 entries', () => {
      expect(Object.keys(ASSET_EXTENSIONS)).toHaveLength(10);
    });
  });

  describe('MAX_FILE_SIZE', () => {
    it('sets audio limit to 50 MB', () => {
      expect(MAX_FILE_SIZE.audio).toBe(50 * 1024 * 1024);
    });

    it('sets photo limit to 20 MB', () => {
      expect(MAX_FILE_SIZE.photo).toBe(20 * 1024 * 1024);
    });

    it('sets video limit to 200 MB', () => {
      expect(MAX_FILE_SIZE.video).toBe(200 * 1024 * 1024);
    });
  });

  // ─── validateMimeType ───────────────────────────────────────────────────────

  describe('validateMimeType', () => {
    describe('audio', () => {
      it.each([
        'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/aac',
      ])('accepts %s', (mime) => {
        expect(validateMimeType('audio', mime)).toBe(true);
      });

      it.each([
        'image/jpeg', 'video/mp4', 'audio/ogg', 'text/plain', '',
      ])('rejects %s', (mime) => {
        expect(validateMimeType('audio', mime)).toBe(false);
      });
    });

    describe('photo', () => {
      it.each([
        'image/jpeg', 'image/png', 'image/webp',
      ])('accepts %s', (mime) => {
        expect(validateMimeType('photo', mime)).toBe(true);
      });

      it.each([
        'audio/mp4', 'video/mp4', 'image/gif', 'image/bmp', '',
      ])('rejects %s', (mime) => {
        expect(validateMimeType('photo', mime)).toBe(false);
      });
    });

    describe('video', () => {
      it.each([
        'video/mp4', 'video/quicktime',
      ])('accepts %s', (mime) => {
        expect(validateMimeType('video', mime)).toBe(true);
      });

      it.each([
        'audio/mp4', 'image/jpeg', 'video/webm', 'video/avi', '',
      ])('rejects %s', (mime) => {
        expect(validateMimeType('video', mime)).toBe(false);
      });
    });
  });

  // ─── validateFileSize ───────────────────────────────────────────────────────

  describe('validateFileSize', () => {
    const cases: { type: AssetType; limit: number; label: string }[] = [
      { type: 'audio', limit: 50 * 1024 * 1024, label: '50 MB' },
      { type: 'photo', limit: 20 * 1024 * 1024, label: '20 MB' },
      { type: 'video', limit: 200 * 1024 * 1024, label: '200 MB' },
    ];

    describe.each(cases)('$type ($label)', ({ type, limit }) => {
      it('accepts 1 byte', () => {
        expect(validateFileSize(type, 1)).toBe(true);
      });

      it('accepts exactly at the limit', () => {
        expect(validateFileSize(type, limit)).toBe(true);
      });

      it('accepts 1 byte below the limit', () => {
        expect(validateFileSize(type, limit - 1)).toBe(true);
      });

      it('rejects 1 byte over the limit', () => {
        expect(validateFileSize(type, limit + 1)).toBe(false);
      });

      it('rejects 0 bytes', () => {
        expect(validateFileSize(type, 0)).toBe(false);
      });

      it('rejects negative size', () => {
        expect(validateFileSize(type, -1)).toBe(false);
      });

      it('rejects a very large size', () => {
        expect(validateFileSize(type, Number.MAX_SAFE_INTEGER)).toBe(false);
      });
    });
  });

  // ─── getExtensionForMime ────────────────────────────────────────────────────

  describe('getExtensionForMime', () => {
    it.each([
      ['audio/mp4', '.m4a'],
      ['audio/mpeg', '.mp3'],
      ['audio/wav', '.wav'],
      ['audio/x-m4a', '.m4a'],
      ['audio/aac', '.aac'],
      ['image/jpeg', '.jpg'],
      ['image/png', '.png'],
      ['image/webp', '.webp'],
      ['video/mp4', '.mp4'],
      ['video/quicktime', '.mov'],
    ])('returns %s for %s', (mime, ext) => {
      expect(getExtensionForMime(mime)).toBe(ext);
    });

    it('throws for unsupported MIME type', () => {
      expect(() => getExtensionForMime('application/pdf')).toThrow(
        'Unsupported MIME type: application/pdf',
      );
    });

    it('throws for empty string', () => {
      expect(() => getExtensionForMime('')).toThrow('Unsupported MIME type: ');
    });

    it('throws for unknown audio subtype', () => {
      expect(() => getExtensionForMime('audio/ogg')).toThrow(
        'Unsupported MIME type: audio/ogg',
      );
    });

    it('throws for unknown image subtype', () => {
      expect(() => getExtensionForMime('image/gif')).toThrow(
        'Unsupported MIME type: image/gif',
      );
    });

    it('throws for unknown video subtype', () => {
      expect(() => getExtensionForMime('video/webm')).toThrow(
        'Unsupported MIME type: video/webm',
      );
    });
  });
});
