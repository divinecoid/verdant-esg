import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
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
export default function DataTable<T>({ columns, data, pagination, loading, emptyText = 'Nothing here yet' }: Props<T>) {
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
  const rows = table.getRowModel().rows;
  const pageBtn = 'inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-card text-neutral-600 hover:border-neutral-300 disabled:opacity-35 disabled:hover:border-neutral-200';

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                      className="whitespace-nowrap border-b border-neutral-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500"
                    >
                      <button
                        type="button"
                        disabled={!header.column.getCanSort()}
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 uppercase tracking-[0.1em] enabled:hover:text-neutral-800"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' && <ArrowUp size={11} className="text-forest-600" />}
                        {sorted === 'desc' && <ArrowDown size={11} className="text-forest-600" />}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
            <tr>
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th key={header.id} className="border-b border-neutral-200 bg-card px-3 py-1.5 font-normal">
                  {header.column.getCanFilter() && (
                    <input
                      value={(header.column.getFilterValue() as string) ?? ''}
                      onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                      placeholder="Filter"
                      aria-label={`Filter ${String(header.column.columnDef.header)}`}
                      className="w-full min-w-16 rounded-md border border-transparent bg-neutral-50 px-2 py-1 text-xs placeholder:text-neutral-400 hover:border-neutral-200 focus:border-forest-400 focus:bg-card focus:outline-none"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }, (_, i) => (
                <tr key={i} className="border-t border-neutral-200/70">
                  <td colSpan={columns.length} className="px-4 py-3">
                    <div className="skeleton h-5 w-full" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <Inbox size={22} className="mx-auto mb-2 text-neutral-300" />
                  <div className="text-sm text-neutral-500">{emptyText}</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-neutral-200/70 transition-colors hover:bg-forest-50/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle text-neutral-800">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/60 px-4 py-2.5 text-xs text-neutral-500">
          <label className="flex items-center gap-2">
            Rows
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-neutral-200 px-1.5 py-1 text-neutral-700"
            >
              {[5, 10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <span className="num">
            Page {pagination.page} of {lastPage} · {pagination.total} {pagination.total === 1 ? 'row' : 'rows'}
          </span>
          <div className="flex gap-1.5">
            <button aria-label="Previous page" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)} className={pageBtn}>
              <ChevronLeft size={15} />
            </button>
            <button aria-label="Next page" disabled={pagination.page >= lastPage} onClick={() => pagination.onPageChange(pagination.page + 1)} className={pageBtn}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
