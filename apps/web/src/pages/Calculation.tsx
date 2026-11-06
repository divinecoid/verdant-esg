import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { day, FREQUENCY_LABEL, type RequestRow } from '../lib/requests';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import Tabs from '../components/Tabs';

interface RunRow {
  id: string;
  label: string;
  runAt: string;
  runByName: string;
  errorCount: number;
  latest: boolean;
  request: {
    id: string;
    number: number;
    type: 'PERIODIC' | 'AD_HOC';
    frequency: keyof typeof FREQUENCY_LABEL | null;
    periodStart: string;
    periodEnd: string;
    company: { id: string; name: string; sector: string | null };
  };
}

interface Line {
  id: string;
  metricName: string;
  themeName: string;
  esgGroup: 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE';
  scope: string | null;
  unit: string | null;
  inputValue: string | null;
  inputUnit: string | null;
  formulaCode: string | null;
  formulaExpression: string | null;
  emissionFactor: string | null;
  result: string | null;
  error: string | null;
}

interface RunDetail extends RunRow {
  lines: Line[];
}

const periodOf = (r: RunRow['request']) => `${day(r.periodStart)} – ${day(r.periodEnd)}`;
const fmt = (v: string | null) => (v === null ? '-' : String(Number(v)));

export function Calculation() {
  const { user } = useAuth();
  const canRun = user?.role === 'ADMIN' || user?.role === 'ESG_TEAM';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [running, setRunning] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['calculations', page, pageSize],
    queryFn: () => api<{ items: RunRow[]; total: number }>(`/calculations?page=${page}&pageSize=${pageSize}`),
  });

  const columns: ColumnDef<RunRow>[] = [
    { header: 'Calculation ID', accessorKey: 'label' },
    { header: 'Portfolio Company', accessorFn: (r) => r.request.company.name },
    { header: 'Frequency', accessorFn: (r) => (r.request.frequency ? FREQUENCY_LABEL[r.request.frequency] : 'Ad Hoc') },
    { header: 'Data Period', accessorFn: (r) => periodOf(r.request) },
    { header: 'Sector', accessorFn: (r) => r.request.company.sector ?? '-' },
    { header: 'Calculated', accessorFn: (r) => r.runAt.slice(0, 16).replace('T', ' ') },
    { header: 'Calculated By', accessorKey: 'runByName' },
    {
      header: 'Result',
      enableColumnFilter: false,
      accessorFn: (r) => (r.errorCount ? `${r.errorCount} error(s)` : 'OK'),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1">
          <StatusBadge status={row.original.errorCount ? 'Errors' : 'OK'} />
          {row.original.errorCount > 0 && <span className="text-xs text-red-600">{row.original.errorCount} metric(s)</span>}
          {row.original.latest && <span className="text-xs text-neutral-500">latest</span>}
        </span>
      ),
    },
    {
      id: 'view',
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <Link to={`/calculation/${row.original.id}`} className="rounded-md bg-forest-100 px-2.5 py-1 text-xs font-medium text-forest-800 hover:bg-forest-200">
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-[36px] text-neutral-900">Calculation Result List</h1>
        {canRun && (
          <button onClick={() => setRunning(true)} className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
            Run Calculation
          </button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyText="No calculations yet"
        pagination={{
          page,
          pageSize,
          total: data?.total ?? 0,
          onPageChange: setPage,
          onPageSizeChange: (n) => {
            setPageSize(n);
            setPage(1);
          },
        }}
      />
      {running && <RunDialog onClose={() => setRunning(false)} />}
    </div>
  );
}

function RunDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState<string>();
  const approved = useQuery({
    queryKey: ['data-requests', 'approved-all'],
    queryFn: () => api<{ items: RequestRow[] }>('/data-requests?status=APPROVED&pageSize=100'),
  });
  const run = useMutation({
    mutationFn: () => api<{ id: string }>('/calculations', { method: 'POST', body: JSON.stringify({ requestId }) }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['calculations'] });
      navigate(`/calculation/${created.id}`);
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Calculation failed'),
  });

  return (
    <Modal title="Run Calculation" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label htmlFor="run-request" className="mb-1 block text-xs font-medium text-neutral-700">
            Approved data request
          </label>
          <select id="run-request" value={requestId} onChange={(e) => setRequestId(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {approved.data?.items.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} – {r.company.name} – {day(r.periodStart)} to {day(r.periodEnd)}
              </option>
            ))}
          </select>
          {approved.data && approved.data.items.length === 0 && <p className="mt-1 text-xs text-neutral-500">No approved data requests yet.</p>}
        </div>
        <p className="text-xs text-neutral-500">Running again keeps the earlier results; the newest run is the one used in reports.</p>
        {error && <p role="alert" className="rounded bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Cancel</button>
          <button
            disabled={!requestId || run.isPending}
            onClick={() => {
              setError(undefined);
              run.mutate();
            }}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {run.isPending ? 'Calculating…' : 'Run'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ResultTable({ lines }: { lines: Line[] }) {
  if (!lines.length) return <p className="text-sm text-neutral-500">No metrics in this group.</p>;
  const themes = [...new Set(lines.map((l) => l.themeName))];
  return (
    <div className="space-y-5">
      {themes.map((theme) => (
        <section key={theme}>
          <h3 className="mb-2 text-sm font-semibold">{theme}</h3>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500 [&_th]:py-3 [&_th]:font-semibold">
                <tr>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Scope</th>
                  <th className="px-3 py-2">Result unit</th>
                  <th className="px-3 py-2">Input</th>
                  <th className="px-3 py-2">Emissions Factor</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {lines.filter((l) => l.themeName === theme).map((l) => (
                  <tr key={l.id} className="border-t border-neutral-100 align-top">
                    <td className="px-3 py-2">
                      {l.metricName}
                      {l.formulaExpression && (
                        <div className="font-mono text-xs text-neutral-500" title={l.formulaCode ?? ''}>{l.formulaExpression}</div>
                      )}
                      {l.error && <div role="alert" className="text-xs text-red-600">{l.error}</div>}
                    </td>
                    <td className="px-3 py-2">{l.scope ?? '-'}</td>
                    <td className="px-3 py-2">{l.unit ?? '-'}</td>
                    <td className="px-3 py-2">{l.inputValue ?? '-'} <span className="text-xs text-neutral-400">{l.inputUnit && l.inputUnit !== l.unit ? l.inputUnit : ''}</span></td>
                    <td className="px-3 py-2">{fmt(l.emissionFactor)}</td>
                    <td className="px-3 py-2 font-medium text-forest-700">{fmt(l.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export function CalculationDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['calculation', id], queryFn: () => api<RunDetail>(`/calculations/${id}`) });
  if (isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (error || !data) return <p role="alert" className="text-sm text-red-600">{(error as Error | null)?.message ?? 'Not found'}</p>;

  const group = (g: Line['esgGroup']) => data.lines.filter((l) => l.esgGroup === g);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/calculation" className="text-sm text-neutral-500 hover:text-neutral-900">← Back</Link>
        <h1 className="display text-[36px] text-neutral-900">Calculation Result Detail {data.label}</h1>
      </div>
      <section className="card p-5" aria-label="Information">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
          {[
            ['Portfolio Company', data.request.company.name],
            ['Sector', data.request.company.sector ?? '-'],
            ['Frequency', data.request.frequency ? FREQUENCY_LABEL[data.request.frequency] : 'Ad Hoc'],
            ['Data Period', periodOf(data.request)],
            ['Latest Calculate Date', data.runAt.slice(0, 16).replace('T', ' ')],
            ['Calculate By', data.runByName],
            ['Errors', String(data.errorCount)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-neutral-500">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Tabs
        tabs={[
          { id: 'E', label: 'Environmental', content: <ResultTable lines={group('ENVIRONMENTAL')} /> },
          { id: 'S', label: 'Social', content: <ResultTable lines={group('SOCIAL')} /> },
          { id: 'G', label: 'Governance', content: <ResultTable lines={group('GOVERNANCE')} /> },
        ]}
      />
    </div>
  );
}
