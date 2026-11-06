export type RequestStatus = 'NOT_STARTED' | 'ON_GOING' | 'SUBMITTED' | 'NEED_REVISION' | 'APPROVED';

export const STATUS_LABEL: Record<RequestStatus, string> = {
  NOT_STARTED: 'Not Started',
  ON_GOING: 'On Going',
  SUBMITTED: 'Submitted',
  NEED_REVISION: 'Need Revision',
  APPROVED: 'Approved',
};

export const FREQUENCY_LABEL = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUALLY: 'Annually' } as const;

export interface RequestRow {
  id: string;
  label: string;
  type: 'PERIODIC' | 'AD_HOC';
  frequency: keyof typeof FREQUENCY_LABEL | null;
  status: RequestStatus;
  reviewLevel: number;
  progress: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  requestedByName: string;
  company: { id: string; code: string; name: string };
}

export interface RequestValue {
  id: string;
  metricId: string;
  value: string | null;
  dataStatus: string | null;
  description: string | null;
  comment: string | null;
  metric: {
    id: string;
    code: string;
    name: string;
    scope: string | null;
    unit: string | null;
    theme: { id: string; code: string; name: string; group: 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE' };
  };
}

export interface RequestDetail extends RequestRow {
  notes: string | null;
  remarks: string | null;
  updatedAt: string;
  mapping: { id: string; version: number };
  values: RequestValue[];
  attachments: { id: string; fileName: string; size: number; createdAt: string }[];
  approvals: { id: string; level: number; decision: 'APPROVED' | 'NEED_REVISION'; remarks: string; reviewerId: string; reviewerName: string; createdAt: string }[];
}

export const day = (iso: string) => iso.slice(0, 10);
export const periodText = (r: Pick<RequestRow, 'periodStart' | 'periodEnd'>) => `${day(r.periodStart)} – ${day(r.periodEnd)}`;
