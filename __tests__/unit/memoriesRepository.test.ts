import { getTimelineItems } from '../../src/repositories/memoriesRepository';

const mockDb = (globalThis as any).__mockDb;

describe('memoriesRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns timeline items ordered by created_at DESC', async () => {
    const rows = [
      {
        id: 2,
        text: 'mamá',
        item_type: 'variant',
        created_at: '2026-03-12T10:00:00.000Z',
        date_added: '2026-03-12',
        main_word_text: 'mamãe',
        word_id: 1,
        audio_count: 1,
        photo_count: 1,
        first_photo_filename: 'variant.jpg',
        first_photo_mime: 'image/jpeg',
      },
    ];

    mockDb.getAllAsync.mockResolvedValueOnce(rows);

    const result = await getTimelineItems();

    expect(result).toEqual(rows);
    const sql = mockDb.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('UNION ALL');
    expect(sql).toContain("'word' AS item_type");
    expect(sql).toContain("'variant' AS item_type");
    expect(sql).toContain('ORDER BY created_at DESC');
  });

  it('uses correlated asset subqueries for audio/photo counts and thumbnail', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    await getTimelineItems();

    const sql = mockDb.getAllAsync.mock.calls[0][0];
    expect(sql).toContain("a.asset_type = 'audio'");
    expect(sql).toContain("a.asset_type = 'photo'");
    expect(sql).toContain('first_photo_filename');
    expect(sql).toContain('first_photo_mime');
  });

  it('joins variants to words to populate parent word text', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    await getTimelineItems();

    const sql = mockDb.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('JOIN words w2 ON v.word_id = w2.id');
    expect(sql).toContain('w2.word AS main_word_text');
  });
});
