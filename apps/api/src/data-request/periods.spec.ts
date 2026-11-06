import { Frequency as F } from '@prisma/client';
import { addDays, lastCompletedPeriod, reminderDue } from './periods';

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);
const period = (f: F, today: string) => {
  const p = lastCompletedPeriod(f, d(today));
  return [iso(p.start), iso(p.end)];
};

describe('lastCompletedPeriod', () => {
  it('monthly is the previous calendar month, including year and leap-day edges', () => {
    expect(period(F.MONTHLY, '2024-03-15')).toEqual(['2024-02-01', '2024-02-29']);
    expect(period(F.MONTHLY, '2025-01-02')).toEqual(['2024-12-01', '2024-12-31']);
  });

  it('quarterly is the previous calendar quarter', () => {
    expect(period(F.QUARTERLY, '2024-05-10')).toEqual(['2024-01-01', '2024-03-31']);
    expect(period(F.QUARTERLY, '2024-01-05')).toEqual(['2023-10-01', '2023-12-31']);
    expect(period(F.QUARTERLY, '2024-12-31')).toEqual(['2024-07-01', '2024-09-30']);
  });

  it('annually is the previous calendar year', () => {
    expect(period(F.ANNUALLY, '2024-06-01')).toEqual(['2023-01-01', '2023-12-31']);
  });
});

describe('addDays', () => {
  it('adds calendar days across a month end', () => {
    expect(iso(addDays(d('2024-02-29'), 60))).toBe('2024-04-29');
  });
});

describe('reminderDue', () => {
  const now = d('2024-04-10');
  it('is false while the due date is far away', () => {
    expect(reminderDue(d('2024-05-01'), now, null)).toBe(false);
  });
  it('is true within three days, and when overdue', () => {
    expect(reminderDue(d('2024-04-12'), now, null)).toBe(true);
    expect(reminderDue(d('2024-04-01'), now, null)).toBe(true);
  });
  it('does not repeat within a week of the last reminder', () => {
    expect(reminderDue(d('2024-04-12'), now, d('2024-04-08'))).toBe(false);
    expect(reminderDue(d('2024-04-12'), now, d('2024-04-01'))).toBe(true);
  });
});
