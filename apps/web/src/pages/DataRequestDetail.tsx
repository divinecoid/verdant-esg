import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile, upload } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { day, FREQUENCY_LABEL, periodText, STATUS_LABEL, type RequestDetail, type RequestValue } from '../lib/requests';
import { ProgressBar } from '../components/RequestTable';
import StatusBadge from '../components/StatusBadge';
import Tabs from '../components/Tabs';

type Draft = Record<string, { value: string; dataStatus: string; description: string; comment: string }>;

const GROUPS = [
  { key: 'ENVIRONMENTAL', label: 'Environmental Metrics' },
  { key: 'SOCIAL', label: 'Social Metrics' },
  { key: 'GOVERNANCE', label: 'Governance Metrics' },
] as const;

const fieldClass = 'w-full rounded border border-neutral-300 px-2 py-1 text-sm disabled:bg-neutral-100';

const toDraft = (values: RequestValue[]): Draft =>
  Object.fromEntries(
    values.map((v) => [
      v.metricId,
      { value: v.value ?? '', dataStatus: v.dataStatus ?? '', description: v.description ?? '', comment: v.comment ?? '' },
    ]),
  );

export default function DataRequestDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['data-request', id], queryFn: () => api<RequestDetail>(`/data-requests/${id}`) });
  // Messages live here, above the remounting form, so they survive the refresh that follows a save.
  const [messages, setMessages] = useState<Messages>({});

  if (isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (error || !data) return <p role="alert" className="text-sm text-red-600">{(error as Error | null)?.message ?? 'Request not found'}</p>;
  // Remount the form whenever the server copy changes so local edits never go stale.
  return <Detail key={`${data.id}:${data.updatedAt}`} request={data} messages={messages} setMessages={setMessages} />;
}

interface Messages {
  error?: string;
  notice?: string;
}

function Detail({
  request,
  messages,
  setMessages,
}: {
  request: RequestDetail;
  messages: Messages;
  setMessages: (m: Messages) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => toDraft(request.values));
  const [remarks, setRemarks] = useState(request.remarks ?? '');
  const { error, notice } = messages;
  const setError = (e: string | undefined) => setMessages({ error: e });
  const setNotice = (n: string | undefined) => setMessages({ notice: n });

  const isStaff = user?.role === 'ADMIN' || user?.role === 'ESG_TEAM';
  const canFill = (user?.role === 'INVESTEE' || isStaff) && ['NOT_STARTED', 'ON_GOING', 'NEED_REVISION'].includes(request.status);
  const canReview = isStaff && request.status === 'SUBMITTED';

  const refresh = () => qc.invalidateQueries({ queryKey: ['data-request', request.id] }).then(() => qc.invalidateQueries({ queryKey: ['data-requests'] }));
  const fail = (e: unknown) => {
    setNotice(undefined);
    setError(e instanceof Error ? e.message : 'Request failed');
  };

  const filledCount = useMemo(() => Object.values(draft).filter((d) => d.value.trim() !== '').length, [draft]);
  const livePercent = request.values.length ? Math.floor((filledCount / request.values.length) * 100) : 0;

  const payload = () => ({
    remarks,
    values: request.values.map((v) => ({ metricId: v.metricId, ...draft[v.metricId] })),
  });

  const save = useMutation({
    mutationFn: () => api(`/data-requests/${request.id}/values`, { method: 'PUT', body: JSON.stringify(payload()) }),
    onSuccess: () => {
      setError(undefined);
      setNotice('Draft saved');
      refresh();
    },
    onError: fail,
  });

  const submit = useMutation({
    mutationFn: async () => {
      await api(`/data-requests/${request.id}/values`, { method: 'PUT', body: JSON.stringify(payload()) });
      return api(`/data-requests/${request.id}/submit`, { method: 'POST' });
    },
    onSuccess: () => {
      setError(undefined);
      setNotice('Submitted for review');
      refresh();
    },
    onError: (e) => {
      fail(e);
      refresh(); // the draft part may have been saved even if the submit was refused
    },
  });

  const set = (metricId: string, patch: Partial<Draft[string]>) => setDraft((d) => ({ ...d, [metricId]: { ...d[metricId], ...patch } }));

  const metricTab = (group: (typeof GROUPS)[number]['key']) => {
    const rows = request.values.filter((v) => v.metric.theme.group === group);
    if (!rows.length) return <p className="text-sm text-neutral-500">No metrics in this group.</p>;
    const themes = [...new Map(rows.map((r) => [r.metric.theme.id, r.metric.theme.name])).entries()];
    return (
      <div className="space-y-5">
        {themes.map(([themeId, themeName]) => (
          <section key={themeId}>
            <h3 className="mb-2 text-sm font-semibold">{themeName}</h3>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500 [&_th]:py-3 [&_th]:font-semibold">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Units</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2">Data Status</th>
                    <th className="px-3 py-2">Item Description</th>
                    <th className="px-3 py-2">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((r) => r.metric.theme.id === themeId)
                    .map((r) => {
                      const d = draft[r.metricId];
                      return (
                        <tr key={r.id} className="border-t border-neutral-100 align-top">
                          <td className="px-3 py-2">
                            {r.metric.name}
                            {r.metric.scope && <span className="ml-1 text-xs text-neutral-500">({r.metric.scope})</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.metric.unit ?? '-'}</td>
                          <td className="px-3 py-2">
                            <input
                              aria-label={`Value for ${r.metric.name}`}
                              inputMode={r.metric.unit ? 'decimal' : undefined}
                              value={d.value}
                              disabled={!canFill}
                              onChange={(e) => set(r.metricId, { value: e.target.value })}
                              className={fieldClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              aria-label={`Data status for ${r.metric.name}`}
                              value={d.dataStatus}
                              disabled={!canFill}
                              onChange={(e) => set(r.metricId, { dataStatus: e.target.value })}
                              className={fieldClass}
                            >
                              <option value="">–</option>
                              <option>Actual</option>
                              <option>Estimated</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input aria-label={`Description for ${r.metric.name}`} value={d.description} disabled={!canFill} onChange={(e) => set(r.metricId, { description: e.target.value })} className={fieldClass} />
                          </td>
                          <td className="px-3 py-2">
                            <input aria-label={`Comment for ${r.metric.name}`} value={d.comment} disabled={!canFill} onChange={(e) => set(r.metricId, { comment: e.target.value })} className={fieldClass} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link to="/data-request" className="text-sm text-neutral-500 hover:text-neutral-900">← Back</Link>
          <h1 className="display text-[36px] text-neutral-900">Data Request {request.label}</h1>
          <StatusBadge status={STATUS_LABEL[request.status]} />
          {request.status === 'SUBMITTED' && <span className="text-xs text-neutral-500">waiting for review {request.reviewLevel} of 2</span>}
        </div>
        {canFill && (
          <div className="flex gap-2">
            <button onClick={() => { setError(undefined); setNotice(undefined); save.mutate(); }} disabled={save.isPending || submit.isPending} className="rounded-lg border border-neutral-300 bg-card px-3.5 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60">
              Save Draft
            </button>
            <button
              onClick={() => {
                if (window.confirm('Submit this data for review? You will not be able to edit it afterwards.')) {
                  setError(undefined);
                  setNotice(undefined);
                  submit.mutate();
                }
              }}
              disabled={save.isPending || submit.isPending}
              className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Final Submit
            </button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="rounded bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">{error}</p>}
      {notice && <p role="status" className="rounded bg-forest-100 px-3 py-2 text-sm text-forest-800">{notice}</p>}

      <section className="space-y-3 card p-5" aria-label="Information summary">
        <h2 className="text-sm font-semibold">Information Summary</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
          {[
            ['Portfolio Company', request.company.name],
            ['Type', request.type === 'AD_HOC' ? 'Ad Hoc' : 'Periodic'],
            ['Frequency', request.frequency ? FREQUENCY_LABEL[request.frequency] : '-'],
            ['Data Period', periodText(request)],
            ['Due Date', day(request.dueDate)],
            ['Requested By', request.requestedByName],
            ['Metric Version', `v${request.mapping.version}`],
            ['Notes', request.notes ?? '-'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-neutral-500">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <div className="mb-1 text-xs text-neutral-500">Progress in completing ESG data{canFill ? ' (updates as you type)' : ''}</div>
          <ProgressBar value={canFill ? livePercent : request.progress} />
        </div>
        <div>
          <label htmlFor="remarks" className="mb-1 block text-xs text-neutral-500">Remarks</label>
          <textarea id="remarks" rows={2} value={remarks} disabled={!canFill} onChange={(e) => setRemarks(e.target.value)} className={fieldClass} />
        </div>
      </section>

      {canReview && <ReviewPanel request={request} onDone={() => { setError(undefined); refresh(); }} onError={fail} currentUserId={user!.id} />}

      <Tabs
        tabs={[
          ...GROUPS.map((g) => ({ id: g.key, label: g.label, content: metricTab(g.key) })),
          { id: 'attachments', label: 'Attachments', content: <Attachments request={request} canFill={canFill} onChanged={refresh} onError={fail} /> },
          { id: 'history', label: 'History Approval', content: <History request={request} /> },
        ]}
      />
    </div>
  );
}

function ReviewPanel({
  request,
  onDone,
  onError,
  currentUserId,
}: {
  request: RequestDetail;
  onDone: () => void;
  onError: (e: unknown) => void;
  currentUserId: string;
}) {
  const [decision, setDecision] = useState<'APPROVED' | 'NEED_REVISION'>('APPROVED');
  const [remarks, setRemarks] = useState('');
  const firstApprover = [...request.approvals].reverse().find((a) => a.level === 1 && a.decision === 'APPROVED');
  const blocked = request.reviewLevel === 2 && firstApprover?.reviewerId === currentUserId;

  const review = useMutation({
    mutationFn: () => api(`/data-requests/${request.id}/review`, { method: 'POST', body: JSON.stringify({ decision, remarks }) }),
    onSuccess: onDone,
    onError,
  });

  return (
    <section className="space-y-3 card border-l-4 !border-l-forest-500 p-5" aria-label="Review">
      <h2 className="text-sm font-semibold">Review Internal – ESG (level {request.reviewLevel} of 2)</h2>
      {blocked && (
        <p className="rounded bg-[#fbf0d3] px-3 py-2 text-sm text-[#7a5a0c]">
          You approved the first review. A different reviewer must do the second review.
        </p>
      )}
      <fieldset className="flex gap-4 text-sm" disabled={blocked}>
        <legend className="mb-1 text-xs text-neutral-500">Select Status</legend>
        <label className="flex items-center gap-1"><input type="radio" name="decision" checked={decision === 'APPROVED'} onChange={() => setDecision('APPROVED')} /> Approved</label>
        <label className="flex items-center gap-1"><input type="radio" name="decision" checked={decision === 'NEED_REVISION'} onChange={() => setDecision('NEED_REVISION')} /> Need Revision</label>
      </fieldset>
      <div>
        <label htmlFor="review-remarks" className="mb-1 block text-xs text-neutral-500">Remarks <span className="text-red-600">*</span></label>
        <textarea id="review-remarks" rows={2} value={remarks} disabled={blocked} onChange={(e) => setRemarks(e.target.value)} className={fieldClass} />
      </div>
      <button
        disabled={blocked || !remarks.trim() || review.isPending}
        onClick={() => review.mutate()}
        className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {review.isPending ? 'Submitting…' : 'Submit'}
      </button>
    </section>
  );
}

function History({ request }: { request: RequestDetail }) {
  if (!request.approvals.length) return <p className="text-sm text-neutral-500">No review has been made yet.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500 [&_th]:py-3 [&_th]:font-semibold">
          <tr>
            <th className="px-3 py-2">Level</th>
            <th className="px-3 py-2">ESG Team</th>
            <th className="px-3 py-2">Status Approval</th>
            <th className="px-3 py-2">Timestamp</th>
            <th className="px-3 py-2">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {request.approvals.map((a) => (
            <tr key={a.id} className="border-t border-neutral-100">
              <td className="px-3 py-2">{a.level}</td>
              <td className="px-3 py-2">{a.reviewerName}</td>
              <td className="px-3 py-2"><StatusBadge status={a.decision === 'APPROVED' ? 'Approved' : 'Need Revision'} /></td>
              <td className="px-3 py-2">{a.createdAt.slice(0, 16).replace('T', ' ')}</td>
              <td className="px-3 py-2">{a.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const kb = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

function Attachments({
  request,
  canFill,
  onChanged,
  onError,
}: {
  request: RequestDetail;
  canFill: boolean;
  onChanged: () => void;
  onError: (e: unknown) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const add = useMutation({
    mutationFn: (file: File) => upload(`/data-requests/${request.id}/attachments`, file),
    onSuccess: () => {
      if (input.current) input.current.value = '';
      onChanged();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (attachmentId: string) => api(`/data-requests/${request.id}/attachments/${attachmentId}`, { method: 'DELETE' }),
    onSuccess: onChanged,
    onError,
  });

  return (
    <div className="space-y-3">
      {canFill && (
        <div>
          <label htmlFor="attach" className="mb-1 block text-xs text-neutral-600">
            Add a file (pdf, png, jpg, xlsx, xls, docx, doc, csv, txt — max 10 MB)
          </label>
          <input id="attach" ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc,.csv,.txt" disabled={add.isPending}
            onChange={(e) => e.target.files?.[0] && add.mutate(e.target.files[0])} className="text-sm" />
        </div>
      )}
      {request.attachments.length === 0 ? (
        <p className="text-sm text-neutral-500">No attachments.</p>
      ) : (
        <ul className="divide-y card text-sm">
          {request.attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-3 py-2">
              <span>
                {a.fileName} <span className="text-xs text-neutral-500">({kb(a.size)})</span>
              </span>
              <span className="flex gap-3 text-xs">
                <button className="text-forest-700 hover:underline" onClick={() => downloadFile(`/data-requests/${request.id}/attachments/${a.id}`, a.fileName).catch(onError)}>
                  Download
                </button>
                {canFill && (
                  <button className="text-red-600 hover:underline" onClick={() => window.confirm(`Remove ${a.fileName}?`) && remove.mutate(a.id)}>
                    Remove
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
