import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '../auth/AuthContext';
import MasterCrud, { type FieldDef } from '../components/MasterCrud';
import StatusBadge from '../components/StatusBadge';
import Tabs from '../components/Tabs';
import PageHeader from '../components/PageHeader';

interface Config { id: string; code: string; value: string; description: string | null }

const configColumns: ColumnDef<Config>[] = [
  { header: 'Code', accessorKey: 'code' },
  { header: 'Value', accessorKey: 'value' },
  { header: 'Description', accessorFn: (r) => r.description ?? '-' },
];

const configFields: FieldDef[] = [
  { name: 'code', label: 'Code', kind: 'text', required: true, placeholder: '1st_reviewer' },
  { name: 'value', label: 'Value', kind: 'text', required: true, placeholder: 'reviewer@example.com' },
  { name: 'description', label: 'Description', kind: 'textarea' },
];

interface Schedule { id: string; frequency: string; dueDays: number; active: boolean; company: { code: string; name: string } }

const FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
];

const scheduleColumns: ColumnDef<Schedule>[] = [
  { header: 'Portfolio Company', accessorFn: (r) => `${r.company.code} – ${r.company.name}` },
  { header: 'Frequency', accessorFn: (r) => FREQUENCIES.find((f) => f.value === r.frequency)?.label ?? r.frequency },
  { header: 'Due (days after period end)', accessorKey: 'dueDays', enableColumnFilter: false },
  {
    header: 'Status',
    accessorKey: 'active',
    enableColumnFilter: false,
    cell: ({ getValue }) => <StatusBadge status={getValue() ? 'Active' : 'Inactive'} />,
  },
];

const scheduleFields: FieldDef[] = [
  {
    name: 'companyId',
    label: 'Portfolio Company',
    kind: 'select',
    required: true,
    optionsFrom: { path: '/companies', label: (c) => `${c.code} – ${c.name}` },
  },
  { name: 'frequency', label: 'Frequency', kind: 'select', required: true, options: FREQUENCIES },
  { name: 'dueDays', label: 'Due (days after the period ends)', kind: 'number', required: true },
  { name: 'active', label: 'Active', kind: 'checkbox' },
];

interface UserRow { id: string; email: string; name: string; role: string; active: boolean; company: { name: string } | null }

const userColumns: ColumnDef<UserRow>[] = [
  { header: 'Email', accessorKey: 'email' },
  { header: 'Name', accessorKey: 'name' },
  { header: 'Role', accessorKey: 'role' },
  { header: 'Company', accessorFn: (r) => r.company?.name ?? '-' },
  {
    header: 'Status',
    accessorKey: 'active',
    enableColumnFilter: false,
    cell: ({ getValue }) => <StatusBadge status={getValue() ? 'Active' : 'Inactive'} />,
  },
];

const userFields: FieldDef[] = [
  { name: 'email', label: 'Email', kind: 'text', required: true },
  { name: 'name', label: 'Name', kind: 'text', required: true },
  {
    name: 'role',
    label: 'Role',
    kind: 'select',
    required: true,
    options: [
      { value: 'ADMIN', label: 'Admin' },
      { value: 'ESG_TEAM', label: 'ESG Team' },
      { value: 'INVESTEE', label: 'Investee (portfolio company)' },
      { value: 'VIEWER', label: 'Viewer' },
    ],
  },
  {
    name: 'companyId',
    label: 'Company (required for investees)',
    kind: 'select',
    optionsFrom: { path: '/companies', label: (c) => `${c.code} – ${c.name}` },
  },
  { name: 'password', label: 'Password (min 8 characters; leave empty to keep the current one)', kind: 'password' },
  { name: 'active', label: 'Active', kind: 'checkbox' },
];

export default function Configuration() {
  const { user } = useAuth();
  return (
    <>
    <PageHeader eyebrow="Setup" title="Settings" description="Reviewers, data-capture schedules and user accounts." />
    <Tabs
      tabs={[
        {
          id: 'general',
          label: 'General Configuration',
          content: <MasterCrud<Config> title="General Configuration" addLabel="Add New" endpoint="/configs" columns={configColumns} fields={configFields} />,
        },
        {
          id: 'schedule',
          label: 'Scheduling Data Capture',
          content: (
            <MasterCrud<Schedule> title="Scheduling Data Capture List" addLabel="Add Schedule" endpoint="/capture-schedules" columns={scheduleColumns} fields={scheduleFields} defaults={{ frequency: 'MONTHLY', dueDays: 60 }} />
          ),
        },
        ...(user?.role === 'ADMIN'
          ? [
              {
                id: 'users',
                label: 'Users',
                content: (
                  <MasterCrud<UserRow> title="User Overview" addLabel="Add User" endpoint="/users" columns={userColumns} fields={userFields} allowDelete={false} />
                ),
              },
            ]
          : []),
      ]}
    />
    </>
  );
}
