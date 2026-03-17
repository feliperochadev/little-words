import { query } from '../db/client';
import type { CsvRow } from '../types/domain';

export const getCsvRows = (): Promise<CsvRow[]> =>
  query<CsvRow>(`
    SELECT w.word, c.name as categoria, w.date_added as data, '' as variante
    FROM words w LEFT JOIN categories c ON w.category_id = c.id
    UNION ALL
    SELECT w.word, c.name as categoria, v.date_added as data, v.variant as variante
    FROM variants v
    JOIN words w ON v.word_id = w.id
    LEFT JOIN categories c ON w.category_id = c.id
    ORDER BY data ASC
  `);
