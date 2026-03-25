import { query } from '../db/client';
import type { TimelineItem } from '../types/domain';

export const getTimelineItems = (): Promise<TimelineItem[]> =>
  query<TimelineItem>(`
    SELECT * FROM (
      SELECT
        w.id,
        w.word AS text,
        'word' AS item_type,
        w.created_at,
        w.date_added,
        NULL AS main_word_text,
        NULL AS word_id,
        (
          SELECT COUNT(*)
          FROM assets a
          WHERE a.parent_type = 'word' AND a.parent_id = w.id AND a.asset_type = 'audio'
        ) AS audio_count,
        (
          SELECT COUNT(*)
          FROM assets a
          WHERE a.parent_type = 'word' AND a.parent_id = w.id AND a.asset_type = 'photo'
        ) AS photo_count,
        (
          SELECT a2.filename
          FROM assets a2
          WHERE a2.parent_type = 'word' AND a2.parent_id = w.id AND a2.asset_type = 'photo'
          ORDER BY a2.created_at DESC
          LIMIT 1
        ) AS first_photo_filename,
        (
          SELECT a3.mime_type
          FROM assets a3
          WHERE a3.parent_type = 'word' AND a3.parent_id = w.id AND a3.asset_type = 'photo'
          ORDER BY a3.created_at DESC
          LIMIT 1
        ) AS first_photo_mime
      FROM words w

      UNION ALL

      SELECT
        v.id,
        v.variant AS text,
        'variant' AS item_type,
        v.created_at,
        v.date_added,
        w2.word AS main_word_text,
        v.word_id,
        (
          SELECT COUNT(*)
          FROM assets a
          WHERE a.parent_type = 'variant' AND a.parent_id = v.id AND a.asset_type = 'audio'
        ) AS audio_count,
        (
          SELECT COUNT(*)
          FROM assets a
          WHERE a.parent_type = 'variant' AND a.parent_id = v.id AND a.asset_type = 'photo'
        ) AS photo_count,
        (
          SELECT a2.filename
          FROM assets a2
          WHERE a2.parent_type = 'variant' AND a2.parent_id = v.id AND a2.asset_type = 'photo'
          ORDER BY a2.created_at DESC
          LIMIT 1
        ) AS first_photo_filename,
        (
          SELECT a3.mime_type
          FROM assets a3
          WHERE a3.parent_type = 'variant' AND a3.parent_id = v.id AND a3.asset_type = 'photo'
          ORDER BY a3.created_at DESC
          LIMIT 1
        ) AS first_photo_mime
      FROM variants v
      JOIN words w2 ON v.word_id = w2.id
    )
    ORDER BY date_added DESC, created_at DESC
  `);
