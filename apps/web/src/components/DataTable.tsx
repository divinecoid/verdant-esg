import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';

interface Props<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  /** Server-side pagination: pass total + current page + callbacks. */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  loading?: boolean;
  emptyText?: string;
}

/** Table with sortable headers, per-column text filters and server-side paging (sort/filter apply to the loaded page). */
export default function DataTable<T>({ columns, data, pagination, loading, emptyText = 'No data' }: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: { filterFn: 'includesString' },
  });

  const lastPage = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-600 text-left text-white">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-medium"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? ''}
                  </th>
                ))}
              </tr>
            ))}
            <tr className="bg-white text-neutral-900">
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th key={header.id} className="px-2 py-1 font-normal">
                  {header.column.getCanFilter() && (
                    <input
                      value={(header.column.getFilterValue() as string) ?? ''}
                      onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                      placeholder="Filter"
                      aria-label={`Filter ${String(header.column.columnDef.header)}`}
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-neutral-500">Loading…</td></tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-neutral-500">{emptyText}</td></tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2 text-xs text-neutral-600">
          <label className="flex items-center gap-2">
            Rows per page
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="rounded border border-neutral-300 px-1 py-0.5"
            >
              {[5, 10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <span>
            Page {pagination.page} of {lastPage} · {pagination.total} rows
          </span>
          <div className="flex gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="rounded border border-neutral-300 px-2 py-0.5 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={pagination.page >= lastPage}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="rounded border border-neutral-300 px-2 py-0.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
