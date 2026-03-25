import { getTimelineItems, getTimelineItemsPaginated } from '../../src/repositories/memoriesRepository';

const mockDb = (globalThis as any).__mockDb;

describe('memoriesRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns timeline items ordered by date_added DESC, created_at DESC', async () => {
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
    // ORDER BY must be on the outer subquery wrapper to guarantee interleaved sorting
    // Sorts by date_added (when word was spoken) then created_at as tiebreaker
    expect(sql).toMatch(/\)\s*\n\s*ORDER BY date_added DESC, created_at DESC/);
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

describe('getTimelineItemsPaginated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes LIMIT and OFFSET parameters to query', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    await getTimelineItemsPaginated(10, 0);

    const [sql, params] = mockDb.getAllAsync.mock.calls[0];
    expect(sql).toContain('LIMIT ? OFFSET ?');
    expect(params).toEqual([10, 0]);
  });

  it('uses the correct offset for subsequent pages', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    await getTimelineItemsPaginated(10, 20);

    const [_sql, params] = mockDb.getAllAsync.mock.calls[0];
    expect(params).toEqual([10, 20]);
  });

  it('includes UNION ALL and asset subqueries', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([]);

    await getTimelineItemsPaginated(10, 0);

    const sql = mockDb.getAllAsync.mock.calls[0][0];
    expect(sql).toContain('UNION ALL');
    expect(sql).toContain('first_photo_filename');
  });

  it('returns paginated rows from db', async () => {
    const rows = [{ id: 5, text: 'papai', item_type: 'word', created_at: '2026-03-10T00:00:00.000Z', date_added: '2026-03-10', main_word_text: null, word_id: null, audio_count: 0, photo_count: 0, first_photo_filename: null, first_photo_mime: null }];
    mockDb.getAllAsync.mockResolvedValueOnce(rows);

    const result = await getTimelineItemsPaginated(10, 0);

    expect(result).toEqual(rows);
  });
});
