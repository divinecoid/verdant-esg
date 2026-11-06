import { RequestStatus } from '@prisma/client';

export interface DashboardRow {
  status: RequestStatus;
  reviewLevel: number;
  periodEnd: Date;
}

export interface Dashboard {
  year: number;
  /** Every request that is not yet approved, in any year. */
  outstanding: number;
  cards: { pendingRequests: number; ongoingRequests: number; pendingReview: number; ongoingReview: number };
  requestsByMonth: { month: number; pending: number; onGoing: number; submitted: number }[];
  reviewByMonth: { month: number; pending: number; onGoing: number; revision: number; approved: number }[];
}

const S = RequestStatus;

/** The company still has to act: it never started, or the reviewers sent it back. */
const isPendingRequest = (s: RequestStatus) => s === S.NOT_STARTED || s === S.NEED_REVISION;
/** Waiting for the first reviewer; the second reviewer is "on going" review. */
const isPendingReview = (r: DashboardRow) => r.status === S.SUBMITTED && r.reviewLevel <= 1;
const isOngoingReview = (r: DashboardRow) => r.status === S.SUBMITTED && r.reviewLevel >= 2;

export function buildDashboard(rows: DashboardRow[], year: number): Dashboard {
  const inYear = rows.filter((r) => r.periodEnd.getUTCFullYear() === year);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthOf = (r: DashboardRow) => r.periodEnd.getUTCMonth() + 1;

  return {
    year,
    outstanding: rows.filter((r) => r.status !== S.APPROVED).length,
    cards: {
      pendingRequests: rows.filter((r) => isPendingRequest(r.status)).length,
      ongoingRequests: rows.filter((r) => r.status === S.ON_GOING).length,
      pendingReview: rows.filter(isPendingReview).length,
      ongoingReview: rows.filter(isOngoingReview).length,
    },
    requestsByMonth: months.map((month) => {
      const m = inYear.filter((r) => monthOf(r) === month);
      return {
        month,
        pending: m.filter((r) => isPendingRequest(r.status)).length,
        onGoing: m.filter((r) => r.status === S.ON_GOING).length,
        submitted: m.filter((r) => r.status === S.SUBMITTED || r.status === S.APPROVED).length,
      };
    }),
    reviewByMonth: months.map((month) => {
      const m = inYear.filter((r) => monthOf(r) === month);
      return {
        month,
        pending: m.filter(isPendingReview).length,
        onGoing: m.filter(isOngoingReview).length,
        revision: m.filter((r) => r.status === S.NEED_REVISION).length,
        approved: m.filter((r) => r.status === S.APPROVED).length,
      };
    }),
  };
}
