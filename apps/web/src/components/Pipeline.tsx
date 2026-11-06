import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { day, STATUS_LABEL, type RequestRow } from '../lib/requests';
import StatusBadge from './StatusBadge';

interface Pipeline {
  year: number;
  outstanding: number;
  cards: { pendingRequests: number; ongoingRequests: number; pendingReview: number; ongoingReview: number };
  requestsByMonth: { month: number; pending: number; onGoing: number; submitted: number }[];
  reviewByMonth: { month: number; pending: number; onGoing: number; revision: number; approved: number }[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLOR = { pending: '#d49a1d', onGoing: '#6aa9c9', submitted: '#2f8f65', revision: '#d4693a', approved: '#2b6850' };

function Stat({ label, value, to, emphasis }: { label: string; value: number; to?: string; emphasis?: boolean }) {
  const body = (
    <>
      <div className={`display num ${emphasis ? 'text-[56px]' : 'text-[40px]'} text-neutral-900`} data-testid={`card-${label}`}>
        {value}
      </div>
      <div className="mt-2 text-xs leading-snug text-neutral-500">{label}</div>
    </>
  );
  const cls = 'card block p-5';
  return to ? (
    <Link to={to} className={`${cls} transition-shadow hover:shadow-[0_0_0_2px_var(--color-forest-300)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function StackedChart({ title, data, series }: { title: string; data: { month: number }[]; series: { key: string; name: string; color: string }[] }) {
  const rows = data.map((d) => ({ ...d, name: MONTHS[d.month - 1] }));
  return (
    <figure className="card p-5" aria-label={title}>
      <figcaption className="mb-4 text-sm font-semibold text-neutral-800">{title}</figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--color-neutral-200)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-neutral-500)' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-neutral-500)' }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'rgb(20 32 27 / 0.04)' }} contentStyle={{ borderRadius: 10, border: '1px solid var(--color-neutral-200)', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

const reviewLabel = (r: RequestRow) =>
  r.status === 'SUBMITTED' ? (r.reviewLevel >= 2 ? 'On Going' : 'Pending') : r.status === 'APPROVED' ? 'Approved' : r.status === 'NEED_REVISION' ? 'Need Revision' : null;

/** How far each data request has got: counts, monthly charts and a per-company watch list. */
export default function PipelineSection({ year: controlledYear }: { year?: string } = {}) {
  const { user } = useAuth();
  const isInvestee = user?.role === 'INVESTEE';
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [appliedLocal, setApplied] = useState(year);
  // When a parent owns the year (the executive dashboard), follow it and hide this section's own picker.
  const applied = controlledYear ?? appliedLocal;
  const [companyId, setCompanyId] = useState('');

  const dash = useQuery({ queryKey: ['dashboard', applied], queryFn: () => api<Pipeline>(`/dashboard?year=${applied}`) });
  const companies = useQuery({
    queryKey: ['companies', 'all'],
    enabled: !isInvestee,
    queryFn: () => api<{ items: { id: string; code: string; name: string }[] }>('/companies?pageSize=500&active=true'),
  });
  const monitor = useQuery({
    queryKey: ['monitor', companyId],
    enabled: isInvestee || !!companyId,
    queryFn: () => api<{ items: RequestRow[] }>(`/data-requests?pageSize=50${companyId ? `&companyId=${companyId}` : ''}`),
  });
  const d = dash.data;

  return (
    <section className="space-y-5" aria-label="Data collection pipeline">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1.5">Data collection</div>
          <h2 className="display text-[30px] text-neutral-900">Pipeline</h2>
        </div>
        {controlledYear === undefined && (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(year);
          }}
        >
          <div>
            <label htmlFor="dash-year" className="mb-1 block text-xs text-neutral-500">Year</label>
            <input id="dash-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-24 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm" />
          </div>
          <button type="submit" className="rounded-lg bg-forest-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-forest-800">Apply</button>
        </form>
        )}
      </div>

      {dash.isError && <p role="alert" className="rounded-lg bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">{(dash.error as Error).message}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="col-span-2 rounded-[14px] bg-forest-900 p-5 text-white lg:col-span-1">
          <div className="display num text-[56px] text-lime" data-testid="card-outstanding">{d?.outstanding ?? '–'}</div>
          <div className="mt-2 text-xs text-white/60">Total outstanding data</div>
        </div>
        <Stat label="Pending & resubmission data request" value={d?.cards.pendingRequests ?? 0} to="/data-request" />
        <Stat label="Ongoing data request" value={d?.cards.ongoingRequests ?? 0} to="/data-request" />
        {!isInvestee && <Stat label="Pending review" value={d?.cards.pendingReview ?? 0} to="/task-inbox" />}
        {!isInvestee && <Stat label="On going review" value={d?.cards.ongoingReview ?? 0} to="/task-inbox" />}
      </div>

      {d && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StackedChart
            title={`Data requests · ${d.year}`}
            data={d.requestsByMonth}
            series={[
              { key: 'pending', name: 'Pending', color: COLOR.pending },
              { key: 'onGoing', name: 'On going', color: COLOR.onGoing },
              { key: 'submitted', name: 'Submitted', color: COLOR.submitted },
            ]}
          />
          <StackedChart
            title={`Review · ${d.year}`}
            data={d.reviewByMonth}
            series={[
              { key: 'pending', name: 'Pending', color: COLOR.pending },
              { key: 'onGoing', name: 'On going', color: COLOR.onGoing },
              { key: 'revision', name: 'Revision', color: COLOR.revision },
              { key: 'approved', name: 'Approved', color: COLOR.approved },
            ]}
          />
        </div>
      )}

      <div className="card overflow-hidden" aria-label="Asset monitor list">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-neutral-800">Asset monitor list</h3>
          {!isInvestee && (
            <select aria-label="Asset" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm">
              <option value="">Select asset…</option>
              {companies.data?.items.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
            </select>
          )}
        </div>
        {!isInvestee && !companyId ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">Choose an asset to see its data requests.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500">
              <tr><th className="px-5 py-2.5 font-semibold">Request</th><th className="px-5 py-2.5 font-semibold">Data period</th><th className="px-5 py-2.5 font-semibold">Data request</th><th className="px-5 py-2.5 font-semibold">Review</th></tr>
            </thead>
            <tbody>
              {(monitor.data?.items ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-neutral-500">{monitor.isLoading ? 'Loading…' : 'No data requests'}</td></tr>
              ) : (
                monitor.data!.items.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-200/70 hover:bg-forest-50/50">
                    <td className="px-5 py-3"><Link to={`/data-request/${r.id}`} className="mono text-forest-700 hover:underline">{r.label}</Link></td>
                    <td className="num px-5 py-3 text-neutral-600">{day(r.periodStart)} – {day(r.periodEnd)}</td>
                    <td className="px-5 py-3"><StatusBadge status={r.status === 'APPROVED' || r.status === 'SUBMITTED' ? 'Submitted' : STATUS_LABEL[r.status]} /></td>
                    <td className="px-5 py-3">{reviewLabel(r) ? <StatusBadge status={reviewLabel(r)!} /> : <span className="text-neutral-400">–</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
