import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, downloadFile } from '../lib/api';
import { day, type RequestRow } from '../lib/requests';
import StatusBadge from '../components/StatusBadge';
import Tabs from '../components/Tabs';

interface Summary {
  unit: string;
  total: number;
  byScope: { scope: string; value: number; percentage: number }[];
  bySource: { source: string; scope: string; company?: string; value: number; percentage: number }[];
  other: { metricName: string; unit: string | null; result: number }[];
}

interface Report {
  request: { id: string; label: string; type: string; frequency: string | null; periodStart: string; periodEnd: string };
  company: {
    id: string;
    code: string;
    name: string;
    sector: string | null;
    contacts: { name: string; phone: string | null; email: string | null }[];
    relatedPortfolio: { id: string; code: string; name: string }[];
  };
  calculation: { number: number; runAt: string; runByName: string; errorCount: number };
  environmental: Summary & { errors: { metric: string; error: string }[] };
  social: { theme: string; metric: string; unit: string | null; value: string | null }[];
  governance: { theme: string; metric: string; unit: string | null; value: string | null }[];
  approvals: { level: number; decision: 'APPROVED' | 'NEED_REVISION'; reviewerName: string; remarks: string; createdAt: string }[];
  attachments: { id: string; fileName: string; size: number }[];
}

interface Consolidated {
  company: { name: string };
  year: number;
  requestsIncluded: number;
  requestsSkippedNotCalculated: string[];
  summary: Summary;
  perCompany: { company: string; total: number }[];
  note: string;
}

const GREEN = '#6aa817';
const GREY = '#b5b5b5';
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });

function ScopeChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  return (
    <figure className="card p-3" aria-label={title}>
      <figcaption className="mb-2 text-center text-xs font-medium text-neutral-600">{title}</figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} width={48} />
            <Tooltip formatter={(v) => fmt(Number(v))} />
            <Bar dataKey="value" label={{ position: 'top', fontSize: 10, formatter: (v: unknown) => fmt(Number(v)) }}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.name.startsWith('Total') ? GREY : GREEN} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function EmissionTables({ summary, showCompany }: { summary: Summary; showCompany?: boolean }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Summary View</h3>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500 [&_th]:py-3 [&_th]:font-semibold">
              <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Units</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Percentage</th></tr>
            </thead>
            <tbody>
              {summary.byScope.map((r) => (
                <tr key={r.scope} className="border-t border-neutral-100">
                  <td className={`px-3 py-2 ${r.scope === 'Total' ? 'font-semibold' : ''}`}>{r.scope === 'Total' ? 'Total Emission' : r.scope}</td>
                  <td className="px-3 py-2">{summary.unit}</td>
                  <td className="px-3 py-2">{fmt(r.value)}</td>
                  <td className="px-3 py-2">{r.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScopeChart title={`Total GHG Emissions by Scope (${summary.unit})`} data={summary.byScope.map((r) => ({ name: r.scope === 'Total' ? 'Total' : r.scope, value: r.value }))} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Emissions by Source</h3>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500 [&_th]:py-3 [&_th]:font-semibold">
              <tr>
                <th className="px-3 py-2">Item</th>
                {showCompany && <th className="px-3 py-2">Company</th>}
                <th className="px-3 py-2">Scope</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {summary.bySource.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-neutral-500">No greenhouse-gas results</td></tr>
              ) : (
                summary.bySource.map((s, i) => (
                  <tr key={`${s.source}-${i}`} className="border-t border-neutral-100">
                    <td className="px-3 py-2">{s.source}</td>
                    {showCompany && <td className="px-3 py-2">{s.company}</td>}
                    <td className="px-3 py-2">{s.scope}</td>
                    <td className="px-3 py-2">{fmt(s.value)}</td>
                    <td className="px-3 py-2">{s.percentage}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ScopeChart title="Emissions by Source" data={summary.bySource.map((s) => ({ name: s.source, value: s.value }))} />
      </section>

      {summary.other.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Other environmental results</h3>
          <ul className="text-sm">
            {summary.other.map((o) => (
              <li key={o.metricName}>{o.metricName}: {fmt(o.result)} {o.unit ?? ''}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AnswerTable({ rows }: { rows: Report['social'] }) {
  if (!rows.length) return <p className="text-sm text-neutral-500">No metrics in this group.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500 [&_th]:py-3 [&_th]:font-semibold">
        <tr><th className="px-3 py-2">Theme</th><th className="px-3 py-2">Metric</th><th className="px-3 py-2">Value</th></tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-neutral-100">
            <td className="px-3 py-2">{r.theme}</td>
            <td className="px-3 py-2">{r.metric}</td>
            <td className="px-3 py-2">{r.value ?? '-'} {r.unit && r.value ? r.unit : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OutputReport() {
  const thisYear = new Date().getFullYear();
  const [companyId, setCompanyId] = useState('');
  const [year, setYear] = useState(String(thisYear));
  const [requestId, setRequestId] = useState('');
  const [search, setSearch] = useState<{ requestId: string } | null>(null);
  const [consolidated, setConsolidated] = useState(false);
  const [pdfError, setPdfError] = useState<string>();

  const companies = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => api<{ items: { id: string; code: string; name: string }[] }>('/companies?pageSize=500&active=true'),
  });
  const requests = useQuery({
    queryKey: ['data-requests', 'approved', companyId],
    enabled: !!companyId,
    queryFn: () => api<{ items: RequestRow[] }>(`/data-requests?status=APPROVED&companyId=${companyId}&pageSize=100`),
  });
  const inYear = (requests.data?.items ?? []).filter((r) => r.periodEnd.slice(0, 4) === year);

  const report = useQuery({
    queryKey: ['report', search?.requestId],
    enabled: !!search,
    queryFn: () => api<Report>(`/reports/request/${search!.requestId}`),
  });
  const group = useQuery({
    queryKey: ['report-consolidated', companyId, year],
    enabled: consolidated && !!companyId,
    queryFn: () => api<Consolidated>(`/reports/consolidated?companyId=${companyId}&year=${year}`),
  });

  const field = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm';

  return (
    <div className="space-y-4">
      <h1 className="display text-[36px] text-neutral-900">ESG Output Report</h1>

      <section className="card p-5" aria-label="Search criteria">
        <h2 className="mb-3 text-sm font-semibold">Search Criteria</h2>
        <form
          className="grid gap-3 md:grid-cols-[2fr_minmax(6rem,1fr)_3fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (requestId) {
              setSearch({ requestId });
              setConsolidated(false);
              setPdfError(undefined);
            }
          }}
        >
          <div>
            <label htmlFor="rep-company" className="mb-1 block text-xs font-medium text-neutral-700">Portfolio Company</label>
            <select id="rep-company" className={field} value={companyId} onChange={(e) => { setCompanyId(e.target.value); setRequestId(''); setSearch(null); setConsolidated(false); }}>
              <option value="">Select…</option>
              {companies.data?.items.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rep-year" className="mb-1 block text-xs font-medium text-neutral-700">Year</label>
            <input id="rep-year" type="number" className={field} value={year} onChange={(e) => { setYear(e.target.value); setRequestId(''); setConsolidated(false); }} />
          </div>
          <div>
            <label htmlFor="rep-request" className="mb-1 block text-xs font-medium text-neutral-700">Periodic Data Request</label>
            <select id="rep-request" className={field} value={requestId} onChange={(e) => setRequestId(e.target.value)} disabled={!companyId}>
              <option value="">{inYear.length || !companyId ? 'Select…' : 'No approved requests in this year'}</option>
              {inYear.map((r) => <option key={r.id} value={r.id}>{r.label} – {day(r.periodStart)} to {day(r.periodEnd)}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={!requestId} className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
              Search
            </button>
          </div>
        </form>
      </section>

      {report.isError && <p role="alert" className="rounded bg-[#fbf0d3] px-3 py-2 text-sm text-[#7a5a0c]">{(report.error as Error).message}</p>}

      {report.data && (
        <>
          <section className="space-y-3 card p-5" aria-label="Portfolio company information">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Portfolio Company Information</h2>
              <div className="flex gap-2">
                {companyId && (
                  <button onClick={() => setConsolidated((c) => !c)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
                    {consolidated ? 'Hide consolidated report' : 'View consolidated report'}
                  </button>
                )}
                <button
                  onClick={() => downloadFile(`/reports/request/${report.data.request.id}/pdf`, `esg-report-${report.data.request.label}.pdf`).catch((e) => setPdfError(e.message))}
                  className="rounded-lg border border-neutral-300 bg-card px-3.5 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Export to PDF
                </button>
              </div>
            </div>
            {pdfError && <p role="alert" className="text-sm text-red-600">{pdfError}</p>}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
              {[
                ['Portfolio Company', report.data.company.name],
                ['Sector', report.data.company.sector ?? '-'],
                ['Data Period', `${day(report.data.request.periodStart)} – ${day(report.data.request.periodEnd)}`],
                ['Request', report.data.request.label],
                ['Calculated', `${report.data.calculation.runAt.slice(0, 16).replace('T', ' ')} by ${report.data.calculation.runByName}`],
                ['Contact', report.data.company.contacts.map((c) => c.name).join(', ') || '-'],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-neutral-500">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {report.data.company.relatedPortfolio.length > 0 && (
              <div className="text-sm">
                <span className="text-xs text-neutral-500">Related Portfolio: </span>
                {report.data.company.relatedPortfolio.map((c) => (
                  <span key={c.id} className="mr-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">{c.name}</span>
                ))}
              </div>
            )}
            {report.data.calculation.errorCount > 0 && (
              <p role="alert" className="rounded bg-[#fbf0d3] px-3 py-2 text-sm text-[#7a5a0c]">
                {report.data.calculation.errorCount} metric(s) could not be calculated, so totals may be incomplete:{' '}
                {report.data.environmental.errors.map((e) => `${e.metric} (${e.error})`).join('; ')}
              </p>
            )}
          </section>

          {consolidated && (
            <section className="space-y-3 card border-l-4 !border-l-forest-500 p-5" aria-label="Consolidated report">
              <h2 className="text-sm font-semibold">Consolidated Report – {group.data?.company.name ?? ''} {year}</h2>
              {group.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
              {group.isError && <p role="alert" className="text-sm text-red-600">{(group.error as Error).message}</p>}
              {group.data && (
                <>
                  <p className="text-xs text-neutral-500">
                    {group.data.note} Requests included: {group.data.requestsIncluded}
                    {group.data.requestsSkippedNotCalculated.length > 0 && <> · not calculated, left out: {group.data.requestsSkippedNotCalculated.join(', ')}</>}
                  </p>
                  <ul className="text-sm">
                    {group.data.perCompany.map((c) => <li key={c.company}>{c.company}: {fmt(c.total)} {group.data!.summary.unit}</li>)}
                  </ul>
                  <EmissionTables summary={group.data.summary} showCompany />
                </>
              )}
            </section>
          )}

          <Tabs
            tabs={[
              { id: 'E', label: 'Environmental', content: <EmissionTables summary={report.data.environmental} /> },
              { id: 'S', label: 'Social', content: <AnswerTable rows={report.data.social} /> },
              { id: 'G', label: 'Governance', content: <AnswerTable rows={report.data.governance} /> },
              {
                id: 'H',
                label: 'History',
                content: report.data.approvals.length ? (
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500 [&_th]:py-3 [&_th]:font-semibold">
                      <tr><th className="px-3 py-2">Level</th><th className="px-3 py-2">Reviewer</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Remarks</th></tr>
                    </thead>
                    <tbody>
                      {report.data.approvals.map((a, i) => (
                        <tr key={i} className="border-t border-neutral-100">
                          <td className="px-3 py-2">{a.level}</td>
                          <td className="px-3 py-2">{a.reviewerName}</td>
                          <td className="px-3 py-2"><StatusBadge status={a.decision === 'APPROVED' ? 'Approved' : 'Need Revision'} /></td>
                          <td className="px-3 py-2">{a.createdAt.slice(0, 16).replace('T', ' ')}</td>
                          <td className="px-3 py-2">{a.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-sm text-neutral-500">No review history.</p>,
              },
              {
                id: 'A',
                label: 'Attachments',
                content: report.data.attachments.length ? (
                  <ul className="text-sm">
                    {report.data.attachments.map((a) => <li key={a.id}>{a.fileName}</li>)}
                  </ul>
                ) : <p className="text-sm text-neutral-500">No attachments.</p>,
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
