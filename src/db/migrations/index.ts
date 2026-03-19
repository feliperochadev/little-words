import type { Migration } from '../migrator';
import { migration as m0001 } from './0001_initial-schema';
import { migration as m0002 } from './0002_add-profile-parent-type';

export const migrations: Migration[] = [m0001, m0002];
