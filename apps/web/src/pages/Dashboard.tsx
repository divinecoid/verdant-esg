import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { day, STATUS_LABEL, type RequestRow } from '../lib/requests';
import StatusBadge from '../components/StatusBadge';

interface Dashboard {
  year: number;
  outstanding: number;
  cards: { pendingRequests: number; ongoingRequests: number; pendingReview: number; ongoingReview: number };
  requestsByMonth: { month: number; pending: number; onGoing: number; submitted: number }[];
  reviewByMonth: { month: number; pending: number; onGoing: number; revision: number; approved: number }[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLOR = { pending: '#f59e0b', onGoing: '#38bdf8', submitted: '#6aa817', revision: '#facc15', approved: '#6aa817' };

function Card({ label, value, to }: { label: string; value: number; to?: string }) {
  const body = (
    <>
      <div className="text-2xl font-semibold" data-testid={`card-${label}`}>{value}</div>
      <div className="mt-1 text-xs text-neutral-600">{label}</div>
    </>
  );
  const cls = 'rounded-lg bg-white p-4 shadow-sm';
  return to ? <Link to={to} className={`${cls} block hover:ring-2 hover:ring-brand-500`}>{body}</Link> : <div className={cls}>{body}</div>;
}

function StackedChart({ title, data, series }: { title: string; data: { month: number }[]; series: { key: string; name: string; color: string }[] }) {
  const rows = data.map((d) => ({ ...d, name: MONTHS[d.month - 1] }));
  return (
    <figure className="rounded-lg bg-white p-4 shadow-sm" aria-label={title}>
      <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

const reviewLabel = (r: RequestRow) =>
  r.status === 'SUBMITTED' ? (r.reviewLevel >= 2 ? 'On Going Review' : 'Pending Review') : r.status === 'APPROVED' ? 'Approved' : r.status === 'NEED_REVISION' ? 'Need Revision' : '-';

export default function DashboardPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [applied, setApplied] = useState(year);
  const [companyId, setCompanyId] = useState('');
  const isInvestee = user?.role === 'INVESTEE';

  const dash = useQuery({ queryKey: ['dashboard', applied], queryFn: () => api<Dashboard>(`/dashboard?year=${applied}`) });
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">ESG Dashboard</h1>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(year);
          }}
        >
          <div>
            <label htmlFor="dash-year" className="mb-1 block text-xs text-neutral-600">Year</label>
            <input id="dash-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">Apply</button>
        </form>
      </div>

      {dash.isError && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{(dash.error as Error).message}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-lg bg-white p-4 shadow-sm lg:row-span-1">
          <div className="text-3xl font-semibold" data-testid="card-outstanding">{d?.outstanding ?? '–'}</div>
          <div className="mt-1 text-xs text-neutral-600">Total Outstanding Data</div>
        </div>
        <Card label="Pending & Resubmission Data Request" value={d?.cards.pendingRequests ?? 0} to="/data-request" />
        <Card label="Ongoing Data Request" value={d?.cards.ongoingRequests ?? 0} to="/data-request" />
        {!isInvestee && <Card label="Pending Review" value={d?.cards.pendingReview ?? 0} to="/task-inbox" />}
        {!isInvestee && <Card label="On Going Review" value={d?.cards.ongoingReview ?? 0} to="/task-inbox" />}
      </div>

      {d && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StackedChart
            title={`Data Request ${d.year}`}
            data={d.requestsByMonth}
            series={[
              { key: 'pending', name: 'Pending', color: COLOR.pending },
              { key: 'onGoing', name: 'On Going', color: COLOR.onGoing },
              { key: 'submitted', name: 'Submitted', color: COLOR.submitted },
            ]}
          />
          <StackedChart
            title={`Review ${d.year}`}
            data={d.reviewByMonth}
            series={[
              { key: 'pending', name: 'Pending', color: COLOR.pending },
              { key: 'onGoing', name: 'On Going', color: COLOR.onGoing },
              { key: 'revision', name: 'Revision', color: COLOR.revision },
              { key: 'approved', name: 'Approved', color: COLOR.approved },
            ]}
          />
        </div>
      )}

      <section className="space-y-3 rounded-lg bg-white p-4 shadow-sm" aria-label="Asset monitor list">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Asset Monitor List</h2>
          {!isInvestee && (
            <select aria-label="Asset" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="">Select asset…</option>
              {companies.data?.items.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
            </select>
          )}
        </div>
        {!isInvestee && !companyId ? (
          <p className="text-sm text-neutral-500">Choose an asset to see its data requests.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-600 text-left text-white">
              <tr><th className="px-3 py-2">Request</th><th className="px-3 py-2">Data Period</th><th className="px-3 py-2">Data Request</th><th className="px-3 py-2">Review</th></tr>
            </thead>
            <tbody>
              {(monitor.data?.items ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-neutral-500">{monitor.isLoading ? 'Loading…' : 'No data requests'}</td></tr>
              ) : (
                monitor.data!.items.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2"><Link to={`/data-request/${r.id}`} className="text-sky-700 hover:underline">{r.label}</Link></td>
                    <td className="px-3 py-2">{day(r.periodStart)} – {day(r.periodEnd)}</td>
                    <td className="px-3 py-2"><StatusBadge status={r.status === 'APPROVED' || r.status === 'SUBMITTED' ? 'Submitted' : STATUS_LABEL[r.status]} /></td>
                    <td className="px-3 py-2">{reviewLabel(r) === '-' ? '-' : <StatusBadge status={reviewLabel(r).replace('On Going Review', 'On Going').replace('Pending Review', 'Pending')} />}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
