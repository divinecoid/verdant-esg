import { RequestStatus as S } from '@prisma/client';
import { buildDashboard } from './dashboard';

const row = (status: S, periodEnd: string, reviewLevel = 0) => ({ status, reviewLevel, periodEnd: new Date(`${periodEnd}T00:00:00Z`) });

const rows = [
  row(S.NOT_STARTED, '2024-01-31'),
  row(S.NEED_REVISION, '2024-01-31'),
  row(S.ON_GOING, '2024-02-29'),
  row(S.SUBMITTED, '2024-02-29', 1),
  row(S.SUBMITTED, '2024-03-31', 2),
  row(S.APPROVED, '2024-03-31'),
  row(S.NOT_STARTED, '2023-12-31'), // other year: counts as outstanding, not in the 2024 charts
];

describe('buildDashboard', () => {
  const d = buildDashboard(rows, 2024);

  it('counts everything that is not approved as outstanding, across years', () => {
    expect(d.outstanding).toBe(6);
  });

  it('fills the status cards', () => {
    expect(d.cards).toEqual({ pendingRequests: 3, ongoingRequests: 1, pendingReview: 1, ongoingReview: 1 });
  });

  it('buckets requests by the month their period ends, for the chosen year only', () => {
    expect(d.requestsByMonth).toHaveLength(12);
    expect(d.requestsByMonth[0]).toEqual({ month: 1, pending: 2, onGoing: 0, submitted: 0 });
    expect(d.requestsByMonth[1]).toEqual({ month: 2, pending: 0, onGoing: 1, submitted: 1 });
    expect(d.requestsByMonth[2]).toEqual({ month: 3, pending: 0, onGoing: 0, submitted: 2 });
    expect(d.requestsByMonth[11].pending).toBe(0);
  });

  it('splits review progress by level and outcome', () => {
    expect(d.reviewByMonth[0]).toEqual({ month: 1, pending: 0, onGoing: 0, revision: 1, approved: 0 });
    expect(d.reviewByMonth[1]).toEqual({ month: 2, pending: 1, onGoing: 0, revision: 0, approved: 0 });
    expect(d.reviewByMonth[2]).toEqual({ month: 3, pending: 0, onGoing: 1, revision: 0, approved: 1 });
  });

  it('is all zeros with no data', () => {
    const empty = buildDashboard([], 2024);
    expect(empty.outstanding).toBe(0);
    expect(empty.requestsByMonth.every((m) => m.pending + m.onGoing + m.submitted === 0)).toBe(true);
  });
});
