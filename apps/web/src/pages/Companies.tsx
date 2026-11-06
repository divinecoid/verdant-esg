import type { ColumnDef } from '@tanstack/react-table';
import MasterCrud, { type FieldDef } from '../components/MasterCrud';
import StatusBadge from '../components/StatusBadge';
import Tabs from '../components/Tabs';

interface Company {
  id: string;
  code: string;
  name: string;
  type: 'HOLDING' | 'ASSET';
  sector: string | null;
  active: boolean;
  contacts: { name: string }[];
}

const companyColumns: ColumnDef<Company>[] = [
  { header: 'Company Code', accessorKey: 'code' },
  { header: 'Company Name', accessorKey: 'name' },
  { header: 'Assign As', accessorFn: (r) => (r.type === 'HOLDING' ? 'Holding' : 'Asset') },
  { header: 'Sector', accessorFn: (r) => r.sector ?? '-' },
  { header: 'Contacts', accessorFn: (r) => r.contacts.map((c) => c.name).join(', ') || '-', enableColumnFilter: false },
  {
    header: 'Status',
    accessorKey: 'active',
    cell: ({ getValue }) => <StatusBadge status={getValue() ? 'Active' : 'Inactive'} />,
    enableColumnFilter: false,
  },
];

const companyFields: FieldDef[] = [
  { name: 'code', label: 'Company Code', kind: 'text', required: true },
  { name: 'name', label: 'Company Name', kind: 'text', required: true },
  {
    name: 'type',
    label: 'Assign As',
    kind: 'select',
    required: true,
    options: [
      { value: 'HOLDING', label: 'Holding' },
      { value: 'ASSET', label: 'Asset' },
    ],
  },
  {
    name: 'parentId',
    label: 'Parent',
    kind: 'select',
    optionsFrom: { path: '/companies', label: (c) => `${c.code} – ${c.name}` },
  },
  { name: 'sector', label: 'Sector', kind: 'text' },
  { name: 'active', label: 'Active', kind: 'checkbox' },
  {
    name: 'contacts',
    label: 'List of Contact',
    kind: 'rows',
    rows: [
      { name: 'name', label: 'Contact Name', kind: 'text', required: true },
      { name: 'phone', label: 'Contact Number', kind: 'text' },
      { name: 'email', label: 'Email', kind: 'text' },
    ],
  },
];

interface Project {
  id: string;
  name: string;
  sector: string | null;
  ownershipPct: string;
  investedCapital: string;
  company: { code: string; name: string };
}

const projectColumns: ColumnDef<Project>[] = [
  { header: 'Project Name', accessorKey: 'name' },
  { header: 'Company', accessorFn: (r) => r.company.name },
  { header: 'Sector', accessorFn: (r) => r.sector ?? '-' },
  { header: 'Total Ownership (%)', accessorFn: (r) => Number(r.ownershipPct), enableColumnFilter: false },
  {
    header: 'Total Investment Capital',
    accessorFn: (r) => Number(r.investedCapital).toLocaleString('en-US'),
    enableColumnFilter: false,
  },
];

const projectFields: FieldDef[] = [
  {
    name: 'companyId',
    label: 'Company',
    kind: 'select',
    required: true,
    optionsFrom: { path: '/companies', label: (c) => `${c.code} – ${c.name}` },
  },
  { name: 'name', label: 'Project Name', kind: 'text', required: true },
  { name: 'sector', label: 'Sector', kind: 'text' },
  { name: 'ownershipPct', label: 'Total Ownership (%)', kind: 'number', required: true },
  { name: 'investedCapital', label: 'Total Investment Capital', kind: 'number', required: true },
  { name: 'initialInvestedAt', label: 'Initial Investment Date', kind: 'date' },
  { name: 'closingDate', label: 'Closing Date', kind: 'date' },
];

export default function Companies() {
  return (
    <Tabs
      tabs={[
        {
          id: 'company',
          label: 'Company',
          content: (
            <MasterCrud<Company> title="Master Company" addLabel="Add Company" endpoint="/companies" columns={companyColumns} fields={companyFields} defaults={{ type: 'ASSET' }} />
          ),
        },
        {
          id: 'project',
          label: 'Project',
          content: (
            <MasterCrud<Project> title="Master Project" addLabel="Add Project" endpoint="/projects" columns={projectColumns} fields={projectFields} />
          ),
        },
      ]}
    />
  );
}
