import { RequestStatus as S, ReviewDecision as D } from '@prisma/client';
import { afterReview, afterSubmit, canEdit, progressOf, statusAfterSave, WorkflowError } from './workflow';

describe('request workflow', () => {
  it('allows edits only before submission or after a revision request', () => {
    expect([S.NOT_STARTED, S.ON_GOING, S.NEED_REVISION].every(canEdit)).toBe(true);
    expect(canEdit(S.SUBMITTED)).toBe(false);
    expect(canEdit(S.APPROVED)).toBe(false);
  });

  it('starts a request on first save and keeps a revision as a revision', () => {
    expect(statusAfterSave(S.NOT_STARTED)).toBe(S.ON_GOING);
    expect(statusAfterSave(S.ON_GOING)).toBe(S.ON_GOING);
    expect(statusAfterSave(S.NEED_REVISION)).toBe(S.NEED_REVISION);
  });

  it('computes progress as a whole percentage', () => {
    expect(progressOf(0, 0)).toBe(0);
    expect(progressOf(1, 3)).toBe(33);
    expect(progressOf(3, 3)).toBe(100);
  });

  it('submits into review level 1, and not twice', () => {
    expect(afterSubmit(S.ON_GOING)).toEqual({ status: S.SUBMITTED, reviewLevel: 1 });
    expect(afterSubmit(S.NEED_REVISION)).toEqual({ status: S.SUBMITTED, reviewLevel: 1 });
    expect(() => afterSubmit(S.SUBMITTED)).toThrow(WorkflowError);
    expect(() => afterSubmit(S.APPROVED)).toThrow(WorkflowError);
  });

  it('walks level 1 → level 2 → approved', () => {
    const l1 = afterReview({ status: S.SUBMITTED, reviewLevel: 1 }, D.APPROVED, 'alice');
    expect(l1).toEqual({ status: S.SUBMITTED, reviewLevel: 2 });
    expect(afterReview(l1, D.APPROVED, 'bob', 'alice')).toEqual({ status: S.APPROVED, reviewLevel: 0 });
  });

  it('requires a different person for the second review', () => {
    expect(() => afterReview({ status: S.SUBMITTED, reviewLevel: 2 }, D.APPROVED, 'alice', 'alice')).toThrow(
      'different reviewer',
    );
  });

  it('lets either level send the request back', () => {
    for (const reviewLevel of [1, 2]) {
      expect(afterReview({ status: S.SUBMITTED, reviewLevel }, D.NEED_REVISION, 'alice', 'alice')).toEqual({
        status: S.NEED_REVISION,
        reviewLevel: 0,
      });
    }
  });

  it('rejects reviews of requests that are not waiting', () => {
    expect(() => afterReview({ status: S.ON_GOING, reviewLevel: 0 }, D.APPROVED, 'a')).toThrow(WorkflowError);
    expect(() => afterReview({ status: S.APPROVED, reviewLevel: 0 }, D.APPROVED, 'a')).toThrow(WorkflowError);
  });
});
