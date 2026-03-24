import {
  buildSchedule,
  buildMilestoneContent,
  isTooSoonToReschedule,
  type SchedulerContext,
} from '../../src/services/notificationScheduler';

// Fixed reference date: Monday 2026-03-24 09:00:00 local
const NOW = new Date('2026-03-24T09:00:00');

const BASE_CTX: SchedulerContext = {
  locale: 'en-US',
  childName: 'Sofia',
  totalWords: 10,
  wordsThisWeek: 3,
  totalAssets: 2,
  lastBackupDate: new Date('2026-03-10').toISOString(), // 14 days ago — not stale
  featureDiscoverySent: false,
  wordsLast7Days: 2,
  emptyCategoryNames: [],
  nostalgiaWords: [],
};

describe('isTooSoonToReschedule', () => {
  it('returns false when lastScheduleRun is null', () => {
    expect(isTooSoonToReschedule(null, NOW)).toBe(false);
  });

  it('returns true when last run was < 5 minutes ago', () => {
    const twoMinutesAgo = new Date(NOW.getTime() - 2 * 60 * 1000).toISOString();
    expect(isTooSoonToReschedule(twoMinutesAgo, NOW)).toBe(true);
  });

  it('returns false when last run was > 5 minutes ago', () => {
    const tenMinutesAgo = new Date(NOW.getTime() - 10 * 60 * 1000).toISOString();
    expect(isTooSoonToReschedule(tenMinutesAgo, NOW)).toBe(false);
  });
});

describe('buildSchedule — gentle nudges', () => {
  it('always includes all 3 nudge notifications', () => {
    const items = buildSchedule(BASE_CTX, NOW);
    const ids = items.map(i => i.identifier);
    expect(ids).toContain('nudge-3d');
    expect(ids).toContain('nudge-7d');
    expect(ids).toContain('nudge-15d');
  });

  it('nudge-3d fires 3 days from now at 10:00', () => {
    const items = buildSchedule(BASE_CTX, NOW);
    const nudge = items.find(i => i.identifier === 'nudge-3d')!;
    expect(nudge.triggerDate).not.toBeNull();
    const trigger = nudge.triggerDate!;
    expect(trigger.getHours()).toBe(10);
    expect(trigger.getMinutes()).toBe(0);
    const diffDays = (trigger.getTime() - NOW.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(3, 0);
  });

  it('nudge body contains child name', () => {
    const items = buildSchedule(BASE_CTX, NOW);
    const nudge = items.find(i => i.identifier === 'nudge-3d')!;
    expect(nudge.body).toContain('Sofia');
  });

  it('nudge routes to add-word', () => {
    const items = buildSchedule(BASE_CTX, NOW);
    items.filter(i => i.identifier.startsWith('nudge-')).forEach(i => {
      expect(i.route).toBe('/(tabs)/home?action=add-word');
    });
  });
});

describe('buildSchedule — weekly win', () => {
  it('schedules weekly win when words this week > 0', () => {
    const items = buildSchedule({ ...BASE_CTX, wordsThisWeek: 5 }, NOW);
    const weeklyWin = items.find(i => i.identifier.startsWith('weekly-win-'));
    expect(weeklyWin).toBeDefined();
    expect(weeklyWin!.route).toBe('/(tabs)/progress');
    expect(weeklyWin!.triggerDate!.getHours()).toBe(12);
  });

  it('does NOT schedule weekly win when words this week is 0', () => {
    const items = buildSchedule({ ...BASE_CTX, wordsThisWeek: 0 }, NOW);
    expect(items.find(i => i.identifier.startsWith('weekly-win-'))).toBeUndefined();
  });

  it('weekly win body contains count', () => {
    const items = buildSchedule({ ...BASE_CTX, wordsThisWeek: 4 }, NOW);
    const win = items.find(i => i.identifier.startsWith('weekly-win-'))!;
    expect(win.body).toContain('4');
  });
});

describe('buildSchedule — monthly recap', () => {
  it('schedules monthly recap when total words > 0', () => {
    const items = buildSchedule({ ...BASE_CTX, totalWords: 5 }, NOW);
    const recap = items.find(i => i.identifier.startsWith('monthly-recap-'));
    expect(recap).toBeDefined();
    expect(recap!.triggerDate!.getHours()).toBe(19);
    expect(recap!.route).toBe('/(tabs)/progress');
  });

  it('does NOT schedule monthly recap when total words is 0', () => {
    const items = buildSchedule({ ...BASE_CTX, totalWords: 0, wordsThisWeek: 0 }, NOW);
    expect(items.find(i => i.identifier.startsWith('monthly-recap-'))).toBeUndefined();
  });

  it('monthly recap identifier includes current year-month', () => {
    const items = buildSchedule(BASE_CTX, NOW);
    const recap = items.find(i => i.identifier.startsWith('monthly-recap-'))!;
    expect(recap.identifier).toBe('monthly-recap-2026-03');
  });
});

describe('buildSchedule — nostalgia', () => {
  it('schedules nostalgia for upcoming 1-month anniversary', () => {
    // word added 1 month ago (today minus ~30 days) = anniversary is today/tomorrow
    const oneMonthAgo = new Date(NOW);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const dateStr = oneMonthAgo.toISOString().split('T')[0];

    const items = buildSchedule(
      { ...BASE_CTX, nostalgiaWords: [{ id: 42, word: 'mama', date_added: dateStr }] },
      NOW,
    );
    const nostalgia = items.find(i => i.identifier.startsWith('nostalgia-'));
    expect(nostalgia).toBeDefined();
    expect(nostalgia!.identifier).toBe('nostalgia-42-1m');
    expect(nostalgia!.body).toContain('mama');
    expect(nostalgia!.triggerDate!.getHours()).toBe(9);
    expect(nostalgia!.route).toBe('/(tabs)/home');
  });

  it('schedules nostalgia for upcoming 1-year anniversary', () => {
    const oneYearAgo = new Date(NOW);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateStr = oneYearAgo.toISOString().split('T')[0];

    const items = buildSchedule(
      { ...BASE_CTX, nostalgiaWords: [{ id: 7, word: 'dada', date_added: dateStr }] },
      NOW,
    );
    const nostalgia = items.find(i => i.identifier.startsWith('nostalgia-'));
    expect(nostalgia).toBeDefined();
    expect(nostalgia!.identifier).toBe('nostalgia-7-1y');
    expect(nostalgia!.body).toContain('dada');
  });

  it('picks exactly 1 nostalgia item even with multiple candidates', () => {
    const oneMonthAgo = new Date(NOW);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const dateStr = oneMonthAgo.toISOString().split('T')[0];
    const manyWords = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, word: `word-${i}`, date_added: dateStr,
    }));

    const items = buildSchedule({ ...BASE_CTX, nostalgiaWords: manyWords }, NOW);
    const nostalgiaItems = items.filter(i => i.identifier.startsWith('nostalgia-'));
    expect(nostalgiaItems).toHaveLength(1);
  });

  it('picks nostalgia deterministically for the same day', () => {
    const oneMonthAgo = new Date(NOW);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const dateStr = oneMonthAgo.toISOString().split('T')[0];
    const manyWords = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1, word: `word-${i}`, date_added: dateStr,
    }));

    const first = buildSchedule({ ...BASE_CTX, nostalgiaWords: manyWords }, NOW)
      .find(i => i.identifier.startsWith('nostalgia-'))!;
    const second = buildSchedule({ ...BASE_CTX, nostalgiaWords: manyWords }, NOW)
      .find(i => i.identifier.startsWith('nostalgia-'))!;
    expect(first.identifier).toBe(second.identifier);
  });

  it('skips nostalgia when no upcoming anniversaries', () => {
    const items = buildSchedule({ ...BASE_CTX, nostalgiaWords: [] }, NOW);
    expect(items.find(i => i.identifier.startsWith('nostalgia-'))).toBeUndefined();
  });
});

describe('buildSchedule — feature discovery', () => {
  it('schedules feature discovery when word_count > 5, assets = 0, not sent', () => {
    const items = buildSchedule(
      { ...BASE_CTX, totalWords: 6, totalAssets: 0, featureDiscoverySent: false },
      NOW,
    );
    const fd = items.find(i => i.identifier === 'feature-discovery');
    expect(fd).toBeDefined();
    expect(fd!.route).toBe('/(tabs)/home?action=add-word');
    expect(fd!.triggerDate!.getHours()).toBe(10);
  });

  it('does NOT schedule feature discovery when already sent', () => {
    const items = buildSchedule(
      { ...BASE_CTX, totalWords: 10, totalAssets: 0, featureDiscoverySent: true },
      NOW,
    );
    expect(items.find(i => i.identifier === 'feature-discovery')).toBeUndefined();
  });

  it('does NOT schedule feature discovery when assets > 0', () => {
    const items = buildSchedule(
      { ...BASE_CTX, totalWords: 10, totalAssets: 3, featureDiscoverySent: false },
      NOW,
    );
    expect(items.find(i => i.identifier === 'feature-discovery')).toBeUndefined();
  });

  it('does NOT schedule feature discovery when word_count <= 5', () => {
    const items = buildSchedule(
      { ...BASE_CTX, totalWords: 5, totalAssets: 0, featureDiscoverySent: false },
      NOW,
    );
    expect(items.find(i => i.identifier === 'feature-discovery')).toBeUndefined();
  });
});

describe('buildSchedule — category explorer', () => {
  it('schedules category explorer when inactive 7 days and empty categories exist', () => {
    const items = buildSchedule(
      { ...BASE_CTX, wordsLast7Days: 0, emptyCategoryNames: ['animals', 'food'] },
      NOW,
    );
    const cat = items.find(i => i.identifier.startsWith('category-'));
    expect(cat).toBeDefined();
    expect(['animals', 'food'].some(c => cat!.identifier.includes(c))).toBe(true);
    expect(cat!.route).toBe('/(tabs)/home?action=add-word');
    expect(cat!.triggerDate!.getHours()).toBe(10);
  });

  it('does NOT schedule category explorer when words added in last 7 days', () => {
    const items = buildSchedule(
      { ...BASE_CTX, wordsLast7Days: 2, emptyCategoryNames: ['animals'] },
      NOW,
    );
    expect(items.find(i => i.identifier.startsWith('category-'))).toBeUndefined();
  });

  it('does NOT schedule category explorer when all categories have words', () => {
    const items = buildSchedule(
      { ...BASE_CTX, wordsLast7Days: 0, emptyCategoryNames: [] },
      NOW,
    );
    expect(items.find(i => i.identifier.startsWith('category-'))).toBeUndefined();
  });

  it('picks category explorer deterministically for the same day', () => {
    const ctx = { ...BASE_CTX, wordsLast7Days: 0, emptyCategoryNames: ['animals', 'food', 'toys'] };
    const first = buildSchedule(ctx, NOW).find(i => i.identifier.startsWith('category-'))!;
    const second = buildSchedule(ctx, NOW).find(i => i.identifier.startsWith('category-'))!;
    expect(first.identifier).toBe(second.identifier);
  });
});

describe('buildSchedule — backup reminder', () => {
  it('schedules backup reminder when last backup was null', () => {
    const items = buildSchedule({ ...BASE_CTX, lastBackupDate: null }, NOW);
    const backup = items.find(i => i.identifier === 'backup-reminder');
    expect(backup).toBeDefined();
    expect(backup!.route).toBe('/(tabs)/settings?scrollTo=export');
    expect(backup!.triggerDate!.getHours()).toBe(18);
  });

  it('schedules backup reminder when last backup > 30 days ago', () => {
    const fortyDaysAgo = new Date(NOW.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const items = buildSchedule({ ...BASE_CTX, lastBackupDate: fortyDaysAgo }, NOW);
    expect(items.find(i => i.identifier === 'backup-reminder')).toBeDefined();
  });

  it('does NOT schedule backup reminder when last backup < 30 days ago', () => {
    const tenDaysAgo = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const items = buildSchedule({ ...BASE_CTX, lastBackupDate: tenDaysAgo }, NOW);
    expect(items.find(i => i.identifier === 'backup-reminder')).toBeUndefined();
  });
});

describe('buildSchedule — locale', () => {
  it('uses Portuguese content for pt-BR locale', () => {
    const items = buildSchedule({ ...BASE_CTX, locale: 'pt-BR' }, NOW);
    const nudge = items.find(i => i.identifier === 'nudge-3d')!;
    expect(nudge.title).toBe('Novos sons hoje?');
  });

  it('uses English content for en-US locale', () => {
    const items = buildSchedule({ ...BASE_CTX, locale: 'en-US' }, NOW);
    const nudge = items.find(i => i.identifier === 'nudge-3d')!;
    expect(nudge.title).toBe('New sounds today?');
  });

  it('falls back to English for unknown locale', () => {
    const items = buildSchedule({ ...BASE_CTX, locale: 'fr-FR' }, NOW);
    const nudge = items.find(i => i.identifier === 'nudge-3d')!;
    expect(nudge.title).toBe('New sounds today?');
  });
});

describe('buildSchedule — empty childName', () => {
  it('uses fallback name when childName is empty', () => {
    const items = buildSchedule({ ...BASE_CTX, childName: '' }, NOW);
    const nudge = items.find(i => i.identifier === 'nudge-3d')!;
    expect(nudge.body).toContain('your baby');
  });
});

describe('buildSchedule — edge cases', () => {
  it('uses default now when no date is passed', () => {
    // Call without the second argument to exercise the default parameter branch
    const items = buildSchedule(BASE_CTX);
    expect(items.length).toBeGreaterThan(0);
  });

  it('nextSunday correctly handles a Sunday input (|| 7 branch)', () => {
    // Sunday = 2026-03-22 → next Sunday should be 7 days later = 2026-03-29
    const sunday = new Date('2026-03-22T09:00:00');
    const items = buildSchedule({ ...BASE_CTX, wordsThisWeek: 3 }, sunday);
    const win = items.find(i => i.identifier.startsWith('weekly-win-'))!;
    expect(win).toBeDefined();
    expect(win.triggerDate!.getDate()).toBe(29); // 7 days after the Sunday input
  });

  it('skips 1-year anniversary outside the 30-day horizon', () => {
    // Word added 11 months ago → 1-year anniversary is 1 month away (just past horizon)
    const elevenMonthsAgo = new Date(NOW);
    elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
    const dateStr = elevenMonthsAgo.toISOString().split('T')[0];
    const items = buildSchedule(
      { ...BASE_CTX, nostalgiaWords: [{ id: 99, word: 'test', date_added: dateStr }] },
      NOW,
    );
    expect(items.find(i => i.identifier.startsWith('nostalgia-'))).toBeUndefined();
  });
});

describe('buildMilestoneContent', () => {
  it('returns first word message for count 1', () => {
    const content = buildMilestoneContent(1, 'Sofia', 'en-US');
    expect(content.title).toContain('First word');
    expect(content.body).toContain('Sofia');
  });

  it('returns milestone message for count 10', () => {
    const content = buildMilestoneContent(10, 'Sofia', 'en-US');
    expect(content.title).toContain('Milestone');
    expect(content.body).toContain('10');
    expect(content.body).toContain('Sofia');
  });

  it('returns Portuguese content for pt-BR', () => {
    const content = buildMilestoneContent(50, 'Sofia', 'pt-BR');
    expect(content.title).toContain('Marco');
    expect(content.body).toContain('50');
  });

  it('uses fallback name when childName is empty', () => {
    const content = buildMilestoneContent(1, '', 'en-US');
    expect(content.body).toContain('your baby');
  });

  it('returns Portuguese first-word message for pt-BR count=1', () => {
    const content = buildMilestoneContent(1, 'Sofia', 'pt-BR');
    expect(content.title).toContain('Primeira');
    expect(content.body).toContain('Sofia');
  });
});
