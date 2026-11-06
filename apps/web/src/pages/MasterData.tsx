import type { ColumnDef } from '@tanstack/react-table';
import MasterCrud, { type FieldDef } from '../components/MasterCrud';
import StatusBadge from '../components/StatusBadge';
import Tabs from '../components/Tabs';
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

interface Metric { id: string; code: string; name: string; scope: string | null; unit: string | null; active: boolean; theme: { name: string } }
const metricColumns: ColumnDef<Metric>[] = [
  { header: 'ESG Metric Code', accessorKey: 'code' },
  { header: 'ESG Metric Name', accessorKey: 'name' },
  { header: 'ESG Theme', accessorFn: (r) => r.theme.name },
  { header: 'Scope', accessorFn: (r) => r.scope ?? '-' },
  { header: 'Unit', accessorFn: (r) => r.unit ?? '-' },
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
  { name: 'unit', label: 'Unit', kind: 'text', placeholder: 'tCO2-e' },
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

export default function MasterData() {
  return (
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
          id: 'base-year',
          label: 'Base Year GHG',
          content: (
            <MasterCrud<BaseYear> title="Base Year GHG Emissions Table List" addLabel="Add New Base Year" endpoint="/base-year-ghg" columns={baseYearColumns} fields={baseYearFields} />
          ),
        },
      ]}
    />
  );
}
