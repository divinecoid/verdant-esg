import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { api } from '../lib/api';
import { day, FREQUENCY_LABEL, periodText, STATUS_LABEL, type RequestRow } from '../lib/requests';
import DataTable from './DataTable';
import StatusBadge from './StatusBadge';

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2" title={`${value}%`}>
      <div className="h-2 w-20 overflow-hidden rounded bg-neutral-200">
        <div className="h-full bg-brand-500" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-neutral-600">{value}%</span>
    </div>
  );
}

/** Server-paged list of data requests filtered by status (comma list); the action link text is up to the caller. */
export default function RequestTable({
  statuses,
  actionLabel,
  showReviewLevel,
  refreshKey,
}: {
  statuses: string;
  actionLabel: (r: RequestRow) => string;
  showReviewLevel?: boolean;
  refreshKey?: number;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['data-requests', statuses, page, pageSize, search, refreshKey],
    queryFn: () =>
      api<{ items: RequestRow[]; total: number }>(
        `/data-requests?status=${statuses}&page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
      ),
  });

  const columns: ColumnDef<RequestRow>[] = [
    { header: 'Request No.', accessorKey: 'label' },
    { header: 'Portfolio Company', accessorFn: (r) => r.company.name },
    { header: 'Type', accessorFn: (r) => (r.type === 'AD_HOC' ? 'Ad Hoc' : 'Periodic') },
    { header: 'Frequency', accessorFn: (r) => (r.frequency ? FREQUENCY_LABEL[r.frequency] : '-') },
    { header: 'Data Period', accessorFn: periodText },
    { header: 'Due Date', accessorFn: (r) => day(r.dueDate) },
    { header: 'Requested By', accessorKey: 'requestedByName' },
    {
      header: 'Status',
      accessorFn: (r) => STATUS_LABEL[r.status],
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1">
          <StatusBadge status={STATUS_LABEL[row.original.status]} />
          {row.original.status === 'SUBMITTED' && (
            <span className="text-xs text-neutral-500">review {row.original.reviewLevel}/2</span>
          )}
        </span>
      ),
    },
    ...(showReviewLevel
      ? []
      : [{ header: 'Progress', accessorKey: 'progress', enableColumnFilter: false, cell: ({ row }: { row: { original: RequestRow } }) => <ProgressBar value={row.original.progress} /> } as ColumnDef<RequestRow>]),
    {
      id: 'action',
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <Link to={`/data-request/${row.original.id}`} className="rounded-md bg-forest-100 px-2.5 py-1 text-xs font-medium text-forest-800 hover:bg-forest-200">
          {actionLabel(row.original)}
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search company…"
        aria-label="Search company"
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyText="No requests"
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
    </div>
  );
}
