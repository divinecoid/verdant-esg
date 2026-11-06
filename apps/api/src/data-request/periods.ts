import { Frequency } from '@prisma/client';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

export interface Period {
  start: Date;
  end: Date;
}

/** The most recent period that has fully ended before `today` (all dates are UTC calendar days). */
export function lastCompletedPeriod(frequency: Frequency, today: Date): Period {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  switch (frequency) {
    case Frequency.MONTHLY:
      return { start: utc(y, m - 1, 1), end: utc(y, m, 0) };
    case Frequency.QUARTERLY: {
      const quarterStart = Math.floor(m / 3) * 3;
      return { start: utc(y, quarterStart - 3, 1), end: utc(y, quarterStart, 0) };
    }
    case Frequency.ANNUALLY:
      return { start: utc(y - 1, 0, 1), end: utc(y - 1, 11, 31) };
  }
}

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

const DAY = 86_400_000;

/** A reminder goes out when the due date is within `windowDays` (or past) and none was sent in the last `repeatDays`. */
export function reminderDue(dueDate: Date, now: Date, lastReminderAt: Date | null, windowDays = 3, repeatDays = 7) {
  const dueSoon = dueDate.getTime() - now.getTime() <= windowDays * DAY;
  const recentlySent = lastReminderAt !== null && now.getTime() - lastReminderAt.getTime() < repeatDays * DAY;
  return dueSoon && !recentlySent;
}
