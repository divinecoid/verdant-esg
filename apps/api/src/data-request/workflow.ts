import { RequestStatus, ReviewDecision } from '@prisma/client';

export class WorkflowError extends Error {}

/** Statuses in which the company may still change the data. */
const EDITABLE: ReadonlySet<RequestStatus> = new Set([
  RequestStatus.NOT_STARTED,
  RequestStatus.ON_GOING,
  RequestStatus.NEED_REVISION,
]);

export const canEdit = (status: RequestStatus) => EDITABLE.has(status);

/** Saving a draft starts a request; a revision stays "need revision" until it is submitted again. */
export const statusAfterSave = (status: RequestStatus): RequestStatus =>
  status === RequestStatus.NOT_STARTED ? RequestStatus.ON_GOING : status;

export const progressOf = (filled: number, total: number) => (total === 0 ? 0 : Math.floor((filled / total) * 100));

export interface ReviewState {
  status: RequestStatus;
  reviewLevel: number;
}

export const REVIEW_LEVELS = 2;

export function afterSubmit(status: RequestStatus): ReviewState {
  if (!canEdit(status)) throw new WorkflowError('This request can no longer be edited or submitted');
  return { status: RequestStatus.SUBMITTED, reviewLevel: 1 };
}

/**
 * Two-step review: level 1 approval moves to level 2, level 2 approval completes the request, and
 * "need revision" at either level sends it back to the company. The level-2 reviewer must be a different
 * person than whoever approved level 1.
 */
export function afterReview(
  state: ReviewState,
  decision: ReviewDecision,
  reviewerId: string,
  levelOneApproverId?: string,
): ReviewState {
  if (state.status !== RequestStatus.SUBMITTED || state.reviewLevel < 1) {
    throw new WorkflowError('This request is not waiting for review');
  }
  if (decision === ReviewDecision.NEED_REVISION) return { status: RequestStatus.NEED_REVISION, reviewLevel: 0 };
  if (state.reviewLevel >= REVIEW_LEVELS) {
    if (levelOneApproverId && levelOneApproverId === reviewerId) {
      throw new WorkflowError('The second review must be done by a different reviewer than the first');
    }
    return { status: RequestStatus.APPROVED, reviewLevel: 0 };
  }
  return { status: RequestStatus.SUBMITTED, reviewLevel: state.reviewLevel + 1 };
}
