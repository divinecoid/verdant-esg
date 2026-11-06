import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import DataTable from './DataTable';
import Modal from './Modal';

type Option = { value: string; label: string };

export interface FieldDef {
  name: string;
  label: string;
  /** `tags` is a comma-separated list that is sent to the API as an array of strings. */
  kind: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date' | 'rows' | 'password' | 'tags';
  required?: boolean;
  options?: Option[];
  /** Load select options from another list endpoint. */
  optionsFrom?: { path: string; label: (row: any) => string };
  /** Sub-columns of a repeatable `rows` field. */
  rows?: { name: string; label: string; kind: 'text' | 'number'; required?: boolean }[];
  placeholder?: string;
}

interface Props<T> {
  title: string;
  addLabel: string;
  endpoint: string;
  columns: ColumnDef<T, any>[];
  fields: FieldDef[];
  /** Searching/filtering query string applied to the list request, e.g. `companyId=…`. */
  extraQuery?: string;
  defaults?: Record<string, unknown>;
  /** Hide the Delete action for resources the API cannot delete (e.g. users are deactivated instead). */
  allowDelete?: boolean;
}

const inputClass =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none transition-shadow placeholder:text-neutral-400 focus:border-forest-500 focus:shadow-[0_0_0_3px_var(--color-forest-200)]';

/** Server-side-paged list with add/edit modal and delete, driven entirely by `fields` and `columns`. */
export default function MasterCrud<T extends { id: string }>({
  title,
  addLabel,
  endpoint,
  columns,
  fields,
  extraQuery = '',
  defaults = {},
  allowDelete = true,
}: Props<T>) {
  const { user } = useAuth();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ESG_TEAM';
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [actionError, setActionError] = useState<string>();

  const listKey = [endpoint, page, pageSize, search, extraQuery];
  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () =>
      api<{ items: T[]; total: number }>(
        `${endpoint}?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(search)}${extraQuery ? `&${extraQuery}` : ''}`,
      ),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`${endpoint}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [endpoint] }),
    onError: (e) => setActionError(e instanceof Error ? e.message : 'Delete failed'),
  });

  const allColumns = useMemo<ColumnDef<T, any>[]>(
    () =>
      canWrite
        ? [
            ...columns,
            {
              id: 'actions',
              header: 'Action',
              enableColumnFilter: false,
              enableSorting: false,
              cell: ({ row }) => (
                <div className="flex gap-3 text-xs">
                  <button className="text-forest-700 hover:underline" onClick={() => setEditing(row.original)}>
                    Edit
                  </button>
                  {allowDelete && (
                    <button
                      className="text-bad hover:underline"
                      onClick={() => {
                        if (window.confirm('Delete this record?')) {
                          setActionError(undefined);
                          remove.mutate(row.original.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ),
            },
          ]
        : columns,
    [columns, canWrite, allowDelete, remove],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-neutral-900">{title}</h2>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search…"
            aria-label="Search"
            className="rounded-lg border border-neutral-300 bg-card px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-forest-500 focus:outline-none"
          />
          {canWrite && (
            <button
              onClick={() => setEditing('new')}
              className="rounded-lg bg-forest-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-800"
            >
              + {addLabel}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">
          {actionError}
        </p>
      )}

      <DataTable
        columns={allColumns}
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

      {editing && (
        <RecordForm
          title={editing === 'new' ? addLabel : `Edit – ${title}`}
          endpoint={endpoint}
          fields={fields}
          record={editing === 'new' ? null : editing}
          defaults={defaults}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: [endpoint] });
          }}
        />
      )}
    </div>
  );
}

function toFormValues(fields: FieldDef[], record: any | null, defaults: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = record ? record[f.name] : defaults[f.name];
    if (f.kind === 'checkbox') values[f.name] = raw ?? true;
    else if (f.kind === 'rows')
      values[f.name] = ((raw as any[]) ?? []).map((r) =>
        Object.fromEntries((f.rows ?? []).map((c) => [c.name, r[c.name] ?? ''])),
      );
    else if (f.kind === 'date') values[f.name] = raw ? String(raw).slice(0, 10) : '';
    else if (f.kind === 'tags') values[f.name] = Array.isArray(raw) ? raw.join(', ') : '';
    else values[f.name] = raw ?? '';
  }
  return values;
}

function toPayload(fields: FieldDef[], values: Record<string, any>, isEdit: boolean) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.kind === 'checkbox') out[f.name] = !!v;
    else if (f.kind === 'tags') out[f.name] = String(v ?? '').split(',').map((t) => t.trim()).filter(Boolean);
    else if (f.kind === 'rows')
      out[f.name] = (v as any[]).map((r) =>
        Object.fromEntries(
          (f.rows ?? []).map((c) => [c.name, c.kind === 'number' ? Number(r[c.name]) : r[c.name]]),
        ),
      );
    else if (v === '' || v === undefined) {
      // Empty optional values clear the column on edit and are omitted on create.
      if (isEdit && !f.required) out[f.name] = null;
    } else out[f.name] = f.kind === 'number' ? Number(v) : v;
  }
  return out;
}

function RecordForm({
  title,
  endpoint,
  fields,
  record,
  defaults,
  onClose,
  onSaved,
}: {
  title: string;
  endpoint: string;
  fields: FieldDef[];
  record: any | null;
  defaults: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!record;
  const [error, setError] = useState<string>();
  const { register, handleSubmit, control, formState } = useForm<Record<string, any>>({
    defaultValues: toFormValues(fields, record, defaults),
  });

  const optionQueries = useQueries({
    queries: fields
      .filter((f) => f.optionsFrom)
      .map((f) => ({
        queryKey: ['options', f.optionsFrom!.path],
        queryFn: () => api<{ items: any[] }>(`${f.optionsFrom!.path}?pageSize=500`),
      })),
  });
  const remoteOptions = new Map<string, Option[]>();
  fields
    .filter((f) => f.optionsFrom)
    .forEach((f, i) => {
      remoteOptions.set(
        f.name,
        (optionQueries[i].data?.items ?? []).map((row) => ({ value: row.id, label: f.optionsFrom!.label(row) })),
      );
    });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api(isEdit ? `${endpoint}/${record.id}` : endpoint, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof Error ? e.message : 'Save failed'),
  });

  const onSubmit = handleSubmit((values) => {
    setError(undefined);
    save.mutate(toPayload(fields, values, isEdit));
  });

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        {fields.map((f) => {
          const id = `f-${f.name}`;
          const err = formState.errors[f.name]?.message as string | undefined;
          const rules = { required: f.required ? `${f.label} is required` : false };

          if (f.kind === 'checkbox')
            return (
              <label key={f.name} className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register(f.name)} /> {f.label}
              </label>
            );

          if (f.kind === 'rows')
            return <RowsField key={f.name} field={f} control={control} register={register} />;

          return (
            <div key={f.name}>
              <label htmlFor={id} className="mb-1 block text-xs font-medium text-neutral-700">
                {f.label}
                {f.required && <span className="text-bad"> *</span>}
              </label>
              {f.kind === 'select' ? (
                <select id={id} className={inputClass} {...register(f.name, rules)}>
                  <option value="">{f.required ? 'Select…' : '–'}</option>
                  {(f.options ?? remoteOptions.get(f.name) ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.kind === 'textarea' ? (
                <textarea id={id} rows={3} className={inputClass} {...register(f.name, rules)} />
              ) : (
                <input
                  id={id}
                  type={f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : f.kind === 'password' ? 'password' : 'text'}
                  autoComplete={f.kind === 'password' ? 'new-password' : undefined}
                  step={f.kind === 'number' ? 'any' : undefined}
                  placeholder={f.placeholder}
                  className={inputClass}
                  {...register(f.name, rules)}
                />
              )}
              {err && <p className="mt-1 text-xs text-bad">{err}</p>}
            </div>
          );
        })}

        {error && (
          <p role="alert" className="rounded bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RowsField({ field, control, register }: { field: FieldDef; control: any; register: any }) {
  const { fields: rows, append, remove } = useFieldArray({ control, name: field.name });
  const cols = field.rows ?? [];
  return (
    <fieldset className="rounded-md border border-neutral-200 p-3">
      <legend className="px-1 text-xs font-medium text-neutral-700">{field.label}</legend>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-end gap-2">
            {cols.map((c) => (
              <div key={c.name} className="flex-1">
                <label className="mb-1 block text-xs text-neutral-600">{c.label}</label>
                <input
                  type={c.kind === 'number' ? 'number' : 'text'}
                  step={c.kind === 'number' ? 'any' : undefined}
                  className={inputClass}
                  {...register(`${field.name}.${i}.${c.name}`, { required: c.required })}
                />
              </div>
            ))}
            <button type="button" onClick={() => remove(i)} className="pb-2 text-xs text-bad">
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append(Object.fromEntries(cols.map((c) => [c.name, ''])))}
          className="text-xs text-forest-700 hover:underline"
        >
          + Add row
        </button>
      </div>
    </fieldset>
  );
}
