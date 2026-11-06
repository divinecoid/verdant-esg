import type { ColumnDef } from '@tanstack/react-table';
import MasterCrud, { type FieldDef } from '../components/MasterCrud';
import StatusBadge from '../components/StatusBadge';
import Tabs from '../components/Tabs';
import PageHeader from '../components/PageHeader';
import FormulaSimulator from '../components/FormulaSimulator';

const activeCell = ({ getValue }: { getValue: () => unknown }) => (
  <StatusBadge status={getValue() ? 'Active' : 'Inactive'} />
);
const GROUP_OPTIONS = [
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'GOVERNANCE', label: 'Governance' },
];
const groupLabel = (g: string) => GROUP_OPTIONS.find((o) => o.value === g)?.label ?? g;

interface Theme { id: string; code: string; name: string; group: string; active: boolean }
const themeColumns: ColumnDef<Theme>[] = [
  { header: 'ESG Theme Code', accessorKey: 'code' },
  { header: 'ESG Theme Name', accessorKey: 'name' },
  { header: 'ESG Group', accessorFn: (r) => groupLabel(r.group) },
  { header: 'Status', accessorKey: 'active', cell: activeCell, enableColumnFilter: false },
];
const themeFields: FieldDef[] = [
  { name: 'code', label: 'Code', kind: 'text', required: true },
  { name: 'name', label: 'Name', kind: 'text', required: true },
  { name: 'group', label: 'ESG Group', kind: 'select', required: true, options: GROUP_OPTIONS },
  { name: 'active', label: 'Active', kind: 'checkbox' },
];

interface Metric { id: string; code: string; name: string; scope: string | null; unit: string | null; resultUnit: string | null; aggregation: string; standardRefs: string[]; active: boolean; theme: { name: string } }
const metricColumns: ColumnDef<Metric>[] = [
  { header: 'ESG Metric Code', accessorKey: 'code' },
  { header: 'ESG Metric Name', accessorKey: 'name' },
  { header: 'ESG Theme', accessorFn: (r) => r.theme.name },
  { header: 'Scope', accessorFn: (r) => r.scope ?? '-' },
  { header: 'Entered as', accessorFn: (r) => r.unit ?? '-' },
  { header: 'Result', accessorFn: (r) => r.resultUnit ?? '–' },
  { header: 'Standards', accessorFn: (r) => r.standardRefs.join(', ') || '–' },
  { header: 'Status', accessorKey: 'active', cell: activeCell, enableColumnFilter: false },
];
const metricFields: FieldDef[] = [
  { name: 'code', label: 'Code', kind: 'text', required: true },
  { name: 'name', label: 'Name', kind: 'text', required: true },
  {
    name: 'themeId',
    label: 'ESG Theme',
    kind: 'select',
    required: true,
    optionsFrom: { path: '/esg-themes', label: (t) => `${t.name} (${groupLabel(t.group)})` },
  },
  { name: 'scope', label: 'Scope', kind: 'text', placeholder: 'Scope 1 / Scope 2 / Scope 3' },
  { name: 'unit', label: 'Unit the company enters', kind: 'text', placeholder: 'kWh, %, count…  (empty for yes/no or text answers)' },
  { name: 'resultUnit', label: 'Unit after calculation (only if a formula converts it)', kind: 'text', placeholder: 'tCO2-e' },
  {
    name: 'aggregation',
    label: 'How periods combine into a yearly figure',
    kind: 'select',
    options: [
      { value: 'SUM', label: 'Add up (energy, waste, incidents)' },
      { value: 'AVERAGE', label: 'Average (rates, hours per person)' },
      { value: 'LATEST', label: 'Latest period (headcount, shares)' },
    ],
  },
  { name: 'standardRefs', label: 'Standards (comma-separated)', kind: 'tags', placeholder: 'GRI 302-1, IFRS S2' },
  { name: 'active', label: 'Active', kind: 'checkbox' },
];

interface Attribute { id: string; code: string; name: string; description: string | null; unit: string | null; dataType: string; active: boolean }
const attributeColumns: ColumnDef<Attribute>[] = [
  { header: 'Attribute Code', accessorKey: 'code' },
  { header: 'Attribute Name', accessorKey: 'name' },
  { header: 'Description', accessorFn: (r) => r.description ?? '-' },
  { header: 'Unit', accessorFn: (r) => r.unit ?? '-' },
  { header: 'Data Type', accessorKey: 'dataType' },
  { header: 'Status', accessorKey: 'active', cell: activeCell, enableColumnFilter: false },
];
const attributeFields: FieldDef[] = [
  { name: 'code', label: 'Code', kind: 'text', required: true },
  { name: 'name', label: 'Name', kind: 'text', required: true },
  { name: 'description', label: 'Description', kind: 'textarea' },
  { name: 'unit', label: 'Unit', kind: 'text', placeholder: 'kWh' },
  {
    name: 'dataType',
    label: 'Data Type',
    kind: 'select',
    options: [
      { value: 'int', label: 'Integer' },
      { value: 'decimal', label: 'Decimal' },
      { value: 'text', label: 'Text' },
    ],
  },
  { name: 'active', label: 'Active', kind: 'checkbox' },
];

interface EmissionFactor { id: string; code: string; name: string; description: string | null; values: { year: number; value: string }[] }
const efColumns: ColumnDef<EmissionFactor>[] = [
  { header: 'EF Code', accessorKey: 'code' },
  { header: 'EF Name', accessorKey: 'name' },
  { header: 'Description', accessorFn: (r) => r.description ?? '-' },
  {
    header: 'Values',
    enableColumnFilter: false,
    accessorFn: (r) => r.values.map((v) => `${v.year}: ${Number(v.value)}`).join(', ') || '-',
  },
];
const efFields: FieldDef[] = [
  { name: 'code', label: 'Code', kind: 'text', required: true },
  { name: 'name', label: 'Name', kind: 'text', required: true },
  { name: 'description', label: 'Description', kind: 'textarea' },
  {
    name: 'values',
    label: 'Values per year',
    kind: 'rows',
    rows: [
      { name: 'year', label: 'Year', kind: 'number', required: true },
      { name: 'value', label: 'Emission factor', kind: 'number', required: true },
    ],
  },
];

interface BaseYear { id: string; code: string; year: number; value: string; active: boolean }
const baseYearColumns: ColumnDef<BaseYear>[] = [
  { header: 'Code', accessorKey: 'code' },
  { header: 'Year', accessorKey: 'year' },
  { header: 'Base Year GHG Emission', accessorFn: (r) => Number(r.value), enableColumnFilter: false },
  { header: 'Status', accessorKey: 'active', cell: activeCell, enableColumnFilter: false },
];
const baseYearFields: FieldDef[] = [
  { name: 'code', label: 'Code', kind: 'text', required: true, placeholder: 'BY2024' },
  { name: 'year', label: 'Year', kind: 'number', required: true },
  { name: 'value', label: 'Base Year GHG Emission (tCO2-e)', kind: 'number', required: true },
  { name: 'active', label: 'Active', kind: 'checkbox' },
];

interface Formula { id: string; code: string; name: string; expression: string; active: boolean; metric: { name: string } }
const formulaColumns: ColumnDef<Formula>[] = [
  { header: 'Formula Code', accessorKey: 'code' },
  { header: 'Formula Name', accessorKey: 'name' },
  { header: 'Formula Value', accessorKey: 'expression', cell: ({ getValue }) => <code className="text-xs">{String(getValue())}</code> },
  { header: 'ESG Metric', accessorFn: (r) => r.metric.name },
  { header: 'Status', accessorKey: 'active', cell: activeCell, enableColumnFilter: false },
];
const formulaFields: FieldDef[] = [
  { name: 'code', label: 'Formula Code', kind: 'text', required: true },
  { name: 'name', label: 'Formula Name', kind: 'text', required: true },
  {
    name: 'metricId',
    label: 'ESG Metric',
    kind: 'select',
    required: true,
    optionsFrom: { path: '/esg-metrics', label: (m) => `${m.code} – ${m.name}` },
  },
  {
    name: 'expression',
    label: 'Formula (use attribute, emission factor or base-year codes)',
    kind: 'textarea',
    required: true,
    placeholder: 'EF_ELEC * {data_input_purchased_elec} / 1000',
  },
  { name: 'active', label: 'Active', kind: 'checkbox' },
];

interface Target { id: string; year: number; value: string; direction: 'AT_MOST' | 'AT_LEAST'; company: { code: string; name: string }; metric: { code: string; name: string; unit: string | null; resultUnit: string | null } }
const targetColumns: ColumnDef<Target>[] = [
  { header: 'Company', accessorFn: (r) => `${r.company.code} – ${r.company.name}` },
  { header: 'Metric', accessorFn: (r) => r.metric.name },
  { header: 'Year', accessorKey: 'year' },
  {
    header: 'Target',
    enableColumnFilter: false,
    accessorFn: (r) => `${r.direction === 'AT_MOST' ? '≤' : '≥'} ${Number(r.value)} ${r.metric.resultUnit ?? r.metric.unit ?? ''}`.trim(),
  },
];
const targetFields: FieldDef[] = [
  { name: 'companyId', label: 'Company', kind: 'select', required: true, optionsFrom: { path: '/companies', label: (c) => `${c.code} – ${c.name}` } },
  { name: 'metricId', label: 'Metric', kind: 'select', required: true, optionsFrom: { path: '/esg-metrics', label: (m) => `${m.code} – ${m.name}${m.resultUnit ? ` (${m.resultUnit})` : m.unit ? ` (${m.unit})` : ''}` } },
  { name: 'year', label: 'Year', kind: 'number', required: true },
  {
    name: 'direction',
    label: 'Goal',
    kind: 'select',
    required: true,
    options: [
      { value: 'AT_MOST', label: 'Stay at or below the target (emissions, accidents, waste)' },
      { value: 'AT_LEAST', label: 'Reach at least the target (renewables, training, diversity)' },
    ],
  },
  { name: 'value', label: 'Target value (in the unit shown for the metric)', kind: 'number', required: true },
];

export default function MasterData() {
  return (
    <>
    <PageHeader eyebrow="Setup" title="ESG Catalog" description="The themes, metrics, formulas and targets every company reports against." />
    <Tabs
      tabs={[
        {
          id: 'theme',
          label: 'ESG Theme',
          content: (
            <MasterCrud<Theme> title="ESG Theme Master List" addLabel="Add New ESG Theme" endpoint="/esg-themes" columns={themeColumns} fields={themeFields} />
          ),
        },
        {
          id: 'metric',
          label: 'ESG Metric',
          content: (
            <MasterCrud<Metric> title="ESG Metric Master List" addLabel="Add New ESG Metric" endpoint="/esg-metrics" columns={metricColumns} fields={metricFields} />
          ),
        },
        {
          id: 'formula',
          label: 'Formula',
          content: (
            <div className="space-y-6">
              <MasterCrud<Formula> title="Formula List" addLabel="Add New Formula" endpoint="/formulas" columns={formulaColumns} fields={formulaFields} />
              <FormulaSimulator />
            </div>
          ),
        },
        {
          id: 'attribute',
          label: 'Data Input Attribute',
          content: (
            <MasterCrud<Attribute> title="Data Input Attribute List" addLabel="Add New Attribute" endpoint="/data-input-attributes" columns={attributeColumns} fields={attributeFields} defaults={{ dataType: 'decimal' }} />
          ),
        },
        {
          id: 'ef',
          label: 'Emission Factor',
          content: (
            <MasterCrud<EmissionFactor> title="Emission Factor Table List" addLabel="Add New EF Theme" endpoint="/emission-factors" columns={efColumns} fields={efFields} />
          ),
        },
        {
          id: 'targets',
          label: 'Targets',
          content: (
            <MasterCrud<Target> title="Targets by company and year" addLabel="Add Target" endpoint="/targets" columns={targetColumns} fields={targetFields} defaults={{ year: new Date().getFullYear(), direction: 'AT_MOST' }} />
          ),
        },
        {
          id: 'base-year',
          label: 'Base Year GHG',
          content: (
            <MasterCrud<BaseYear> title="Base Year GHG Emissions Table List" addLabel="Add New Base Year" endpoint="/base-year-ghg" columns={baseYearColumns} fields={baseYearFields} />
          ),
        },
      ]}
    />
    </>
  );
}
