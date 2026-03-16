import type { Migration } from '../migrator';
import { migration as m0001 } from './0001_initial-schema';

export const migrations: Migration[] = [m0001];
