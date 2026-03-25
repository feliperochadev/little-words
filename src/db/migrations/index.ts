import type { Migration } from '../migrator';
import { migration as m0001 } from './0001_initial-schema';
import { migration as m0002 } from './0002_add-profile-parent-type';
import { migration as m0003 } from './0003_add-asset-name';
import { migration as m0004 } from './0004_add-unlinked-parent-type';
import { migration as m0005 } from './0005_add-notification-state';

export const migrations: Migration[] = [m0001, m0002, m0003, m0004, m0005];
