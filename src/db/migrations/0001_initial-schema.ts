import type { Migration } from '../migrator';

export const migration: Migration = {
  version: 1,
  name: '0001_initial-schema',
  up: (_db) => {
    // Initial schema is created by init.ts — this is a baseline marker only.
    // No DDL needed here because initDatabase() runs first and creates all tables.
  },
  down: (_db) => {
    // Cannot reverse initial schema
    throw new Error('Cannot rollback initial schema');
  },
};
