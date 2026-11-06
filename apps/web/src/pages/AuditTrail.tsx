import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { api, downloadFile } from '../lib/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

interface AuditRow {
  id: string;
  object: string;
  action: string;
  userName: string | null;
  changedAt: string;
  _count: { lines: number };
}

interface AuditDetail extends Omit<AuditRow, '_count'> {
  lines: { id: string; member: string; oldValue: string | null; newValue: string | null }[];
}

export default function AuditTrail() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string | null>(null);
  const [object, setObject] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exportError, setExportError] = useState<string>();

  const filters = new URLSearchParams();
  if (object.trim()) filters.set('object', object.trim());
  if (from) filters.set('from', from);
  if (to) filters.set('to', to);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', page, pageSize, filters.toString()],
    queryFn: () => api<{ items: AuditRow[]; total: number }>(`/audit-logs?page=${page}&pageSize=${pageSize}&${filters}`),
  });

  const columns: ColumnDef<AuditRow>[] = [
    { header: 'Object', accessorKey: 'object' },
    { header: 'Type', accessorKey: 'action' },
    { header: 'Changed Date (UTC)', accessorFn: (r) => r.changedAt.slice(0, 10) },
    { header: 'Changed Time (UTC)', accessorFn: (r) => r.changedAt.slice(11, 16) },
    { header: 'Number of Changes', accessorFn: (r) => r._count.lines, enableColumnFilter: false },
    { header: 'Changed By', accessorFn: (r) => r.userName ?? '-' },
    {
      id: 'view',
      header: 'Action',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <button className="text-xs text-sky-700 hover:underline" onClick={() => setSelected(row.original.id)}>
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-lg font-semibold">Audit Trail Overview</h1>
        <button
          onClick={() => {
            setExportError(undefined);
            downloadFile(`/audit-logs/export?${filters}`, 'audit-trail.xlsx').catch((e) => setExportError(e.message));
          }}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Export to Excel
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-3">
        {[
          ['Object', 'text', object, setObject],
          ['From (UTC)', 'date', from, setFrom],
          ['To (UTC)', 'date', to, setTo],
        ].map(([label, type, value, set]) => (
          <div key={label as string}>
            <label className="mb-1 block text-xs text-neutral-600" htmlFor={`audit-${label}`}>{label as string}</label>
            <input
              id={`audit-${label}`}
              type={type as string}
              value={value as string}
              onChange={(e) => {
                (set as (v: string) => void)(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>
      {exportError && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{exportError}</p>}
      {error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{(error as Error).message}</p>}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
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
      {selected && <LogDetails id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function LogDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['audit-log', id], queryFn: () => api<AuditDetail>(`/audit-logs/${id}`) });
  return (
    <Modal title="Log Details" onClose={onClose}>
      {!data ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <div className="space-y-3 text-sm">
          <p>
            <b>{data.object}</b> · {data.action} by {data.userName ?? '-'} · {data.changedAt.replace('T', ' ').slice(0, 16)} UTC
          </p>
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100">
              <tr>
                <th className="px-2 py-1">Member</th>
                <th className="px-2 py-1">Old Value</th>
                <th className="px-2 py-1">New Value</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-2 py-1 font-medium">{l.member}</td>
                  <td className="break-all px-2 py-1">{l.oldValue ?? '-'}</td>
                  <td className="break-all px-2 py-1">{l.newValue ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
