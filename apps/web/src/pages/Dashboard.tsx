import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, ClipboardCheck, ShieldAlert, Siren, Target } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { fmtNum, GROUPS, PILLARS, type Group } from '../lib/pillars';
import { AttainmentBar, PillarRings, Sparkline } from '../components/charts';
import PageHeader from '../components/PageHeader';
import Pipeline from '../components/Pipeline';
import StatusBadge from '../components/StatusBadge';

type Status = 'met' | 'at_risk' | 'off_track';
interface MetricPerf {
  metricId: string;
  code: string;
  name: string;
  group: Group;
  unit: string | null;
  direction: 'AT_MOST' | 'AT_LEAST';
  target: number;
  actual: number | null;
  attainment: number | null;
  status: Status | null;
  series: { periodEnd: string; value: number }[];
}
interface Executive {
  company: { id: string; code: string; name: string; sector: string | null };
  year: number;
  performance: {
    pillars: { group: Group; index: number | null; targets: number; measured: number; met: number }[];
    overall: number | null;
    metrics: MetricPerf[];
  };
  indicators: {
    incidents: { open: number; serious: number };
    findings: { open: number; serious: number; overdue: number };
    risks: { open: number; high: number; matrix: number[][] };
    compliance: { counts: Record<string, number>; rate: number | null };
  };
}
interface Company { id: string; code: string; name: string; parentId: string | null }

const STATUS_LABEL: Record<Status, string> = { met: 'Met', at_risk: 'At risk', off_track: 'Off track' };
const STATUS_COLOR: Record<Status, string> = { met: 'var(--color-ok)', at_risk: 'var(--color-warn)', off_track: 'var(--color-bad)' };
const STATUS_RANK: Record<Status, number> = { off_track: 0, at_risk: 1, met: 2 };

/** Concentric contour lines: a quiet nod to growth rings that gives the hero some depth without an image. */
function Contours() {
  return (
    <svg className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] opacity-[0.07] sm:opacity-[0.16]" viewBox="0 0 520 520" fill="none" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse key={i} cx="260" cy="260" rx={30 + i * 18} ry={24 + i * 17} stroke="var(--color-lime)" strokeWidth="1" transform={`rotate(${i * 5} 260 260)`} />
      ))}
    </svg>
  );
}

function PillarColumn({ group, perf }: { group: Group; perf: Executive['performance']['pillars'][number] }) {
  const p = PILLARS[group];
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-2 text-[13px] text-white/70">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden="true" />
        {p.label}
      </div>
      <div className="display num text-[46px] leading-none text-white" data-testid={`pillar-${p.short}`}>
        {perf.index === null ? '–' : Math.round(perf.index)}
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${perf.index ?? 0}%`, background: p.color }} />
      </div>
      <div className="mt-2 text-xs text-white/50">
        {perf.targets === 0 ? 'No targets set' : `${perf.met} of ${perf.measured || perf.targets} targets met`}
      </div>
    </div>
  );
}

function Hero({ data }: { data: Executive }) {
  const { performance: perf } = data;
  const measured = perf.pillars.reduce((n, p) => n + p.measured, 0);
  const met = perf.pillars.reduce((n, p) => n + p.met, 0);
  const total = perf.pillars.reduce((n, p) => n + p.targets, 0);
  const byGroup = Object.fromEntries(perf.pillars.map((p) => [p.group, p])) as Record<Group, Executive['performance']['pillars'][number]>;

  return (
    <section
      aria-label="ESG index"
      className="relative overflow-hidden rounded-[22px] p-7 text-white sm:p-10"
      style={{ background: 'radial-gradient(90% 120% at 0% 0%, #1d4a39 0%, var(--color-forest-950) 62%)', boxShadow: 'var(--shadow-pop)' }}
    >
      <Contours />
      <div className="relative grid items-center gap-10 lg:grid-cols-[260px_1fr]">
        <div className="mx-auto">
          <PillarRings size={260} rings={GROUPS.map((g) => ({ label: PILLARS[g].label, value: byGroup[g].index, color: PILLARS[g].color }))}>
            <div className="eyebrow !text-white/50">ESG index</div>
            <div className="display num mt-1 text-[78px] text-lime" data-testid="esg-index">
              {perf.overall === null ? '–' : Math.round(perf.overall)}
            </div>
            <div className="text-[11px] text-white/40">out of 100</div>
          </PillarRings>
        </div>

        <div className="min-w-0">
          <div className="eyebrow !text-white/45">{data.company.code} · {data.year}</div>
          <h2 className="display mt-2 text-[34px] leading-[1.05] sm:text-[44px]">
            {total === 0 ? (
              <>Set targets to see how <em className="text-lime">{data.company.name}</em> is performing.</>
            ) : (
              <>
                {met} of {measured || total} targets met<span className="text-white/45">, across all three pillars.</span>
              </>
            )}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">
            The index is the average share of each target achieved, per pillar, using approved data only. It is a progress measure for this
            organisation, not an external rating.
          </p>
          {total === 0 && (
            <Link to="/master-data" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-lime px-3.5 py-2 text-sm font-medium text-forest-950 hover:brightness-95">
              Set targets <ArrowUpRight size={15} />
            </Link>
          )}
          <div className="mt-8 grid grid-cols-3 gap-6">
            {GROUPS.map((g) => (
              <PillarColumn key={g} group={g} perf={byGroup[g]} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TargetsTable({ metrics }: { metrics: MetricPerf[] }) {
  const [filter, setFilter] = useState<Group | 'ALL'>('ALL');
  const rows = useMemo(
    () =>
      metrics
        .filter((m) => filter === 'ALL' || m.group === filter)
        .sort((a, b) => (a.status ? STATUS_RANK[a.status] : 3) - (b.status ? STATUS_RANK[b.status] : 3) || a.name.localeCompare(b.name)),
    [metrics, filter],
  );
  const chip = (active: boolean) => `rounded-full px-3 py-1 text-xs font-medium transition-colors ${active ? 'bg-forest-800 text-white' : 'bg-neutral-200/60 text-neutral-600 hover:bg-neutral-200'}`;

  return (
    <section className="card overflow-hidden" aria-label="Targets versus actual">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-neutral-900">Targets vs actual</h3>
          <p className="mt-0.5 text-xs text-neutral-500">Needs attention first. Trend is one point per approved period.</p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Filter by pillar">
          <button className={chip(filter === 'ALL')} onClick={() => setFilter('ALL')}>All</button>
          {GROUPS.map((g) => (
            <button key={g} className={chip(filter === g)} onClick={() => setFilter(g)}>{PILLARS[g].label}</button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <Target size={24} className="mx-auto mb-3 text-neutral-300" />
          <p className="text-sm text-neutral-600">No targets for this selection.</p>
          <Link to="/master-data" className="mt-2 inline-block text-sm font-medium text-forest-700 hover:underline">Add targets in the ESG Catalog</Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Metric</th>
                <th className="px-4 py-3 text-right font-semibold">Actual</th>
                <th className="px-4 py-3 text-right font-semibold">Target</th>
                <th className="w-44 px-4 py-3 font-semibold">Attainment</th>
                <th className="px-4 py-3 font-semibold">Trend</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.metricId} className="border-t border-neutral-200/70 hover:bg-forest-50/50">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-1 rounded-full" style={{ background: PILLARS[m.group].color }} aria-hidden="true" />
                      <div>
                        <div className="font-medium text-neutral-900">{m.name}</div>
                        <div className="mono text-[11px] text-neutral-400">{m.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num px-4 py-3.5 text-right">
                    {fmtNum(m.actual)} <span className="text-xs text-neutral-400">{m.unit}</span>
                  </td>
                  <td className="num px-4 py-3.5 text-right text-neutral-600">
                    <span className="text-neutral-400">{m.direction === 'AT_MOST' ? '≤' : '≥'}</span> {fmtNum(m.target)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <AttainmentBar value={m.attainment} color={m.status ? STATUS_COLOR[m.status] : 'var(--color-neutral-300)'} />
                      <span className="num w-10 text-right text-xs text-neutral-600">{m.attainment === null ? '–' : `${Math.round(m.attainment)}%`}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Sparkline values={m.series.map((s) => s.value)} color={m.status ? STATUS_COLOR[m.status] : 'var(--color-neutral-400)'} />
                  </td>
                  <td className="px-6 py-3.5">{m.status ? <StatusBadge status={STATUS_LABEL[m.status]} /> : <span className="text-xs text-neutral-400">No data yet</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** likelihood (rows, 5 at the top) × impact (columns); the colour follows likelihood × impact. */
function RiskMatrix({ matrix }: { matrix: number[][] }) {
  const band = (score: number) =>
    score >= 15 ? 'rgb(212 105 58 / 0.55)' : score >= 10 ? 'rgb(212 154 29 / 0.45)' : score >= 5 ? 'rgb(155 196 58 / 0.4)' : 'rgb(95 165 131 / 0.22)';
  return (
    <div className="card p-6" aria-label="Risk matrix">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold text-neutral-900">Risk matrix</h3>
        <span className="text-xs text-neutral-500">Open risks by likelihood × impact</span>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3">
        <div className="flex flex-col justify-around py-1 text-right text-[11px] text-neutral-400" aria-hidden="true">
          {[5, 4, 3, 2, 1].map((n) => <span key={n}>{n}</span>)}
        </div>
        <div className="grid grid-cols-5 gap-1.5" role="table" aria-label="Likelihood rows, impact columns">
          {[5, 4, 3, 2, 1].flatMap((likelihood) =>
            [1, 2, 3, 4, 5].map((impact) => {
              const count = matrix[likelihood - 1]?.[impact - 1] ?? 0;
              return (
                <div
                  key={`${likelihood}-${impact}`}
                  role="cell"
                  title={`Likelihood ${likelihood}, impact ${impact}: ${count} risk(s)`}
                  className="num flex aspect-[1.35] items-center justify-center rounded-lg text-sm font-semibold text-neutral-900"
                  style={{ background: band(likelihood * impact), opacity: count ? 1 : 0.55 }}
                >
                  {count || <span className="h-1 w-1 rounded-full bg-neutral-900/20" />}
                </div>
              );
            }),
          )}
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="pt-1 text-center text-[11px] text-neutral-400" aria-hidden="true">{n}</div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-6 text-[11px] text-neutral-400" aria-hidden="true">
        <span>↑ Likelihood</span>
        <span>Impact →</span>
      </div>
    </div>
  );
}

function Indicator({ icon: Icon, label, value, sub, tone }: { icon: typeof Siren; label: string; value: string | number; sub: string; tone: 'ok' | 'warn' | 'bad' }) {
  const color = tone === 'bad' ? 'var(--color-bad)' : tone === 'warn' ? 'var(--color-warn)' : 'var(--color-ok)';
  return (
    <Link to="/registers" className="card group flex items-center gap-4 p-5 transition-shadow hover:shadow-[0_0_0_2px_var(--color-forest-300)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="display num text-[34px] leading-none text-neutral-900">{value}</div>
        <div className="mt-1 text-[13px] text-neutral-700">{label}</div>
        <div className="text-xs text-neutral-400">{sub}</div>
      </div>
      <ArrowUpRight size={16} className="text-neutral-300 transition-colors group-hover:text-forest-600" />
    </Link>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-[340px] rounded-[22px]" />
      <div className="skeleton h-64" />
    </div>
  );
}

function ExecutiveView() {
  const thisYear = new Date().getFullYear();
  const [companyId, setCompanyId] = useState('');
  const [year, setYear] = useState(String(thisYear));

  const companies = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => api<{ items: Company[] }>('/companies?pageSize=500&active=true'),
  });
  useEffect(() => {
    if (!companyId && companies.data?.items.length) {
      setCompanyId((companies.data.items.find((c) => !c.parentId) ?? companies.data.items[0]).id);
    }
  }, [companies.data, companyId]);

  const valid = /^\d{4}$/.test(year);
  const esg = useQuery({
    queryKey: ['esg-dashboard', companyId, year],
    enabled: !!companyId && valid,
    queryFn: () => api<Executive>(`/dashboard/esg?companyId=${companyId}&year=${year}`),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Executive overview"
        title="How are we doing?"
        description="Performance against targets, the risks that need attention, and how far data collection has got."
        actions={
          <>
            <label className="sr-only" htmlFor="exec-company">Company</label>
            <select id="exec-company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="max-w-56 rounded-lg border border-neutral-300 bg-card px-3 py-2 text-sm">
              {companies.data?.items.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
            </select>
            <label className="sr-only" htmlFor="exec-year">Year</label>
            <input id="exec-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-24 rounded-lg border border-neutral-300 bg-card px-3 py-2 text-sm" />
          </>
        }
      />

      {companies.data && companies.data.items.length === 0 && (
        <div className="card px-6 py-14 text-center">
          <p className="text-sm text-neutral-600">No companies yet.</p>
          <Link to="/companies" className="mt-2 inline-block text-sm font-medium text-forest-700 hover:underline">Add your first company</Link>
        </div>
      )}
      {esg.isError && <p role="alert" className="rounded-lg bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">{(esg.error as Error).message}</p>}
      {esg.isLoading && <Skeleton />}

      {esg.data && (
        <div className="space-y-5">
          <Hero data={esg.data} />
          <TargetsTable metrics={esg.data.performance.metrics} />

          <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <RiskMatrix matrix={esg.data.indicators.risks.matrix} />
            <div className="grid content-start gap-4">
              <Indicator icon={Siren} label="Serious incidents open" value={esg.data.indicators.incidents.serious} sub={`${esg.data.indicators.incidents.open} open in total`} tone={esg.data.indicators.incidents.serious ? 'bad' : 'ok'} />
              <Indicator icon={AlertTriangle} label="Overdue audit findings" value={esg.data.indicators.findings.overdue} sub={`${esg.data.indicators.findings.open} open · ${esg.data.indicators.findings.serious} serious`} tone={esg.data.indicators.findings.overdue ? 'bad' : 'ok'} />
              <Indicator icon={ShieldAlert} label="High risks" value={esg.data.indicators.risks.high} sub={`${esg.data.indicators.risks.open} open risks`} tone={esg.data.indicators.risks.high ? 'warn' : 'ok'} />
              <Indicator
                icon={ClipboardCheck}
                label="Compliance rate"
                value={esg.data.indicators.compliance.rate === null ? '–' : `${esg.data.indicators.compliance.rate}%`}
                sub={esg.data.indicators.compliance.rate === null ? 'No checklist items yet' : `${esg.data.indicators.compliance.counts.NON_COMPLIANT ?? 0} non-compliant`}
                tone={(esg.data.indicators.compliance.counts.NON_COMPLIANT ?? 0) > 0 ? 'warn' : 'ok'}
              />
            </div>
          </div>
        </div>
      )}

      <Pipeline year={valid ? year : undefined} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'INVESTEE') {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Your company" title="What's waiting for you" description="Data requests that need your input, and where each one stands in review." />
        <Pipeline />
      </div>
    );
  }
  return <ExecutiveView />;
}
