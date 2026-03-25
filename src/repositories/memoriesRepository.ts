import { query } from '../db/client';
import type { TimelineItem } from '../types/domain';

export const getTimelineItems = (): Promise<TimelineItem[]> =>
  query<TimelineItem>(`
    WITH AssetStats AS (
      SELECT
        parent_type,
        parent_id,
        COUNT(CASE WHEN a.asset_type = 'audio' THEN 1 END) AS audio_count,
        COUNT(CASE WHEN a.asset_type = 'photo' THEN 1 END) AS photo_count,
        (
          SELECT filename
          FROM assets a2
          WHERE a2.parent_type = a.parent_type AND a2.parent_id = a.parent_id AND a2.asset_type = 'photo'
          ORDER BY a2.created_at DESC
          LIMIT 1
        ) AS first_photo_filename,
        (
          SELECT mime_type
          FROM assets a3
          WHERE a3.parent_type = a.parent_type AND a3.parent_id = a.parent_id AND a3.asset_type = 'photo'
          ORDER BY a3.created_at DESC
          LIMIT 1
        ) AS first_photo_mime
      FROM assets a
      GROUP BY parent_type, parent_id
    )
    SELECT * FROM (
      SELECT
        w.id,
        w.word AS text,
        'word' AS item_type,
        w.created_at,
        w.date_added,
        NULL AS main_word_text,
        NULL AS word_id,
        COALESCE(ast.audio_count, 0) AS audio_count,
        COALESCE(ast.photo_count, 0) AS photo_count,
        ast.first_photo_filename,
        ast.first_photo_mime
      FROM words w
      LEFT JOIN AssetStats ast ON ast.parent_type = 'word' AND ast.parent_id = w.id

      UNION ALL

      SELECT
        v.id,
        v.variant AS text,
        'variant' AS item_type,
        v.created_at,
        v.date_added,
        w2.word AS main_word_text,
        v.word_id,
        COALESCE(ast.audio_count, 0) AS audio_count,
        COALESCE(ast.photo_count, 0) AS photo_count,
        ast.first_photo_filename,
        ast.first_photo_mime
      FROM variants v
      JOIN words w2 ON v.word_id = w2.id
      LEFT JOIN AssetStats ast ON ast.parent_type = 'variant' AND ast.parent_id = v.id
    )
    ORDER BY date_added DESC, created_at DESC
  `);
