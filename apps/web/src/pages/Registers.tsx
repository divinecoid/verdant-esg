import type { ColumnDef } from '@tanstack/react-table';
import MasterCrud, { type FieldDef } from '../components/MasterCrud';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Tabs from '../components/Tabs';

const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');
const SEVERITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => ({ value, label: label(value) }));
const COMPANY_FIELD: FieldDef = {
  name: 'companyId',
  label: 'Company',
  kind: 'select',
  required: true,
  optionsFrom: { path: '/companies', label: (c) => `${c.code} – ${c.name}` },
};
const companyColumn = <T extends { company: { name: string } }>(): ColumnDef<T> => ({ header: 'Company', accessorFn: (r) => r.company.name });
const badge = <T,>(header: string, key: keyof T): ColumnDef<T> => ({
  header,
  accessorFn: (r) => label(String(r[key])),
  cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
});
const day = (v: string | null) => (v ? v.slice(0, 10) : '–');

// ---- Incidents (health & safety, environmental spills, …) -------------------
interface Incident { id: string; occurredAt: string; type: string; severity: string; description: string; lostDays: number | null; status: string; company: { name: string } }
const incidentColumns: ColumnDef<Incident>[] = [
  { header: 'Date', accessorFn: (r) => day(r.occurredAt) },
  companyColumn<Incident>(),
  { header: 'Type', accessorKey: 'type' },
  badge<Incident>('Severity', 'severity'),
  { header: 'Lost days', accessorFn: (r) => r.lostDays ?? '–', enableColumnFilter: false },
  { header: 'Description', accessorKey: 'description', cell: ({ getValue }) => <span className="line-clamp-2 max-w-md">{String(getValue())}</span> },
  badge<Incident>('Status', 'status'),
];
const incidentFields: FieldDef[] = [
  COMPANY_FIELD,
  { name: 'occurredAt', label: 'Date of incident', kind: 'date', required: true },
  {
    name: 'type',
    label: 'Type',
    kind: 'select',
    required: true,
    options: ['Injury', 'Fatality', 'Near miss', 'Occupational illness', 'Environmental spill', 'Fire', 'Security', 'Other'].map((v) => ({ value: v, label: v })),
  },
  { name: 'severity', label: 'Severity', kind: 'select', required: true, options: SEVERITY },
  { name: 'description', label: 'What happened', kind: 'textarea', required: true },
  { name: 'lostDays', label: 'Lost working days (if any)', kind: 'number' },
  { name: 'status', label: 'Status', kind: 'select', options: ['OPEN', 'INVESTIGATING', 'CLOSED'].map((value) => ({ value, label: label(value) })) },
];

// ---- Audit findings -----------------------------------------------------------
interface Finding { id: string; source: string; reportedAt: string; severity: string; description: string; owner: string | null; dueDate: string | null; status: string; company: { name: string } }
const findingColumns: ColumnDef<Finding>[] = [
  { header: 'Reported', accessorFn: (r) => day(r.reportedAt) },
  companyColumn<Finding>(),
  { header: 'Source', accessorKey: 'source' },
  badge<Finding>('Severity', 'severity'),
  { header: 'Finding', accessorKey: 'description', cell: ({ getValue }) => <span className="line-clamp-2 max-w-md">{String(getValue())}</span> },
  { header: 'Owner', accessorFn: (r) => r.owner ?? '–' },
  {
    header: 'Due',
    accessorFn: (r) => day(r.dueDate),
    cell: ({ row }) => {
      const overdue = row.original.status !== 'CLOSED' && row.original.dueDate && row.original.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
      return <span className={overdue ? 'font-medium text-bad' : ''}>{day(row.original.dueDate)}{overdue ? ' · overdue' : ''}</span>;
    },
  },
  badge<Finding>('Status', 'status'),
];
const findingFields: FieldDef[] = [
  COMPANY_FIELD,
  { name: 'source', label: 'Source', kind: 'select', required: true, options: ['Internal audit', 'External audit', 'Regulator', 'Certification body', 'Self-assessment'].map((v) => ({ value: v, label: v })) },
  { name: 'reportedAt', label: 'Date reported', kind: 'date', required: true },
  { name: 'severity', label: 'Severity', kind: 'select', required: true, options: SEVERITY },
  { name: 'description', label: 'Finding', kind: 'textarea', required: true },
  { name: 'owner', label: 'Owner', kind: 'text' },
  { name: 'dueDate', label: 'Due date', kind: 'date' },
  { name: 'status', label: 'Status', kind: 'select', options: ['OPEN', 'IN_PROGRESS', 'CLOSED'].map((value) => ({ value, label: label(value) })) },
];

// ---- Risk register ---------------------------------------------------------------
interface Risk { id: string; title: string; category: string; likelihood: number; impact: number; owner: string | null; status: string; company: { name: string } }
const scoreBand = (s: number) => (s >= 15 ? { bg: 'rgb(212 105 58 / 0.22)', fg: '#8a2b17' } : s >= 10 ? { bg: 'rgb(212 154 29 / 0.22)', fg: '#7a5a0c' } : s >= 5 ? { bg: 'rgb(155 196 58 / 0.25)', fg: '#4f6410' } : { bg: 'rgb(95 165 131 / 0.2)', fg: '#1f4a38' });
const riskColumns: ColumnDef<Risk>[] = [
  { header: 'Risk', accessorKey: 'title' },
  companyColumn<Risk>(),
  { header: 'Category', accessorKey: 'category' },
  {
    header: 'Score',
    enableColumnFilter: false,
    accessorFn: (r) => r.likelihood * r.impact,
    cell: ({ row }) => {
      const score = row.original.likelihood * row.original.impact;
      const c = scoreBand(score);
      return (
        <span className="num inline-flex items-center gap-2" title={`Likelihood ${row.original.likelihood} × impact ${row.original.impact}`}>
          <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-md px-1.5 text-sm font-semibold" style={{ background: c.bg, color: c.fg }}>{score}</span>
          <span className="text-xs text-neutral-400">{row.original.likelihood}×{row.original.impact}</span>
        </span>
      );
    },
  },
  { header: 'Owner', accessorFn: (r) => r.owner ?? '–' },
  badge<Risk>('Status', 'status'),
];
const scale = (name: string, text: string): FieldDef => ({
  name,
  label: text,
  kind: 'select',
  required: true,
  options: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}` })),
});
const riskFields: FieldDef[] = [
  COMPANY_FIELD,
  { name: 'title', label: 'Risk', kind: 'text', required: true },
  { name: 'category', label: 'Category', kind: 'select', required: true, options: ['Environmental', 'Social', 'Governance', 'Operational', 'Financial', 'Legal & regulatory', 'Reputation'].map((v) => ({ value: v, label: v })) },
  scale('likelihood', 'Likelihood (1 rare – 5 almost certain)'),
  scale('impact', 'Impact (1 minor – 5 severe)'),
  { name: 'owner', label: 'Owner', kind: 'text' },
  { name: 'mitigation', label: 'Mitigation', kind: 'textarea' },
  { name: 'reviewDate', label: 'Next review', kind: 'date' },
  { name: 'status', label: 'Status', kind: 'select', options: ['OPEN', 'MITIGATING', 'ACCEPTED', 'CLOSED'].map((value) => ({ value, label: label(value) })) },
];

// ---- Compliance checklist -------------------------------------------------------------
interface Item { id: string; regulation: string; requirement: string; status: string; dueDate: string | null; lastReviewedAt: string | null; company: { name: string } }
const complianceColumns: ColumnDef<Item>[] = [
  companyColumn<Item>(),
  { header: 'Regulation', accessorKey: 'regulation' },
  { header: 'Requirement', accessorKey: 'requirement', cell: ({ getValue }) => <span className="line-clamp-2 max-w-md">{String(getValue())}</span> },
  { header: 'Last reviewed', accessorFn: (r) => day(r.lastReviewedAt) },
  { header: 'Due', accessorFn: (r) => day(r.dueDate) },
  badge<Item>('Status', 'status'),
];
const complianceFields: FieldDef[] = [
  COMPANY_FIELD,
  { name: 'regulation', label: 'Regulation or standard', kind: 'text', required: true },
  { name: 'requirement', label: 'Requirement', kind: 'textarea', required: true },
  { name: 'status', label: 'Status', kind: 'select', options: ['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NOT_APPLICABLE'].map((value) => ({ value, label: label(value) })) },
  { name: 'lastReviewedAt', label: 'Last reviewed', kind: 'date' },
  { name: 'dueDate', label: 'Next due', kind: 'date' },
  { name: 'notes', label: 'Notes', kind: 'textarea' },
];

export default function Registers() {
  return (
    <>
      <PageHeader
        eyebrow="Monitor"
        title="Risk & Compliance"
        description="Safety incidents, audit findings, the risk register and the compliance checklist. Open items feed the risk indicators on the dashboard."
      />
      <Tabs
        tabs={[
          { id: 'incidents', label: 'Incidents', content: <MasterCrud<Incident> title="Incident register" addLabel="Log incident" endpoint="/incidents" columns={incidentColumns} fields={incidentFields} defaults={{ status: 'OPEN', severity: 'LOW' }} /> },
          { id: 'findings', label: 'Audit findings', content: <MasterCrud<Finding> title="Audit findings" addLabel="Add finding" endpoint="/audit-findings" columns={findingColumns} fields={findingFields} defaults={{ status: 'OPEN', severity: 'MEDIUM' }} /> },
          { id: 'risks', label: 'Risk register', content: <MasterCrud<Risk> title="Risk register" addLabel="Add risk" endpoint="/risks" columns={riskColumns} fields={riskFields} defaults={{ status: 'OPEN', likelihood: 3, impact: 3 }} /> },
          { id: 'compliance', label: 'Compliance checklist', content: <MasterCrud<Item> title="Compliance checklist" addLabel="Add requirement" endpoint="/compliance-items" columns={complianceColumns} fields={complianceFields} defaults={{ status: 'NON_COMPLIANT' }} /> },
        ]}
      />
    </>
  );
}
