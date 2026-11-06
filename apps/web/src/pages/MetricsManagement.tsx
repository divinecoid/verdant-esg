import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

interface Company { id: string; code: string; name: string }
interface Metric { id: string; code: string; name: string; scope: string | null; unit: string | null; theme: { id: string; name: string; group: string } }
interface Mapping {
  id: string;
  version: number;
  active: boolean;
  companyId: string;
  updatedAt: string;
  items: { metricId: string }[];
}

const list = <T,>(path: string) => api<{ items: T[]; total: number }>(path);

export default function MetricsManagement() {
  const { user } = useAuth();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ESG_TEAM';
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState('');
  const [editing, setEditing] = useState<Mapping | 'new' | null>(null);
  const [error, setError] = useState<string>();

  const companies = useQuery({ queryKey: ['companies', 'all'], queryFn: () => list<Company>('/companies?pageSize=500&active=true') });
  const versions = useQuery({
    queryKey: ['metric-mappings', companyId],
    enabled: !!companyId,
    queryFn: () => list<Mapping>(`/metric-mappings?companyId=${companyId}&pageSize=100`),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['metric-mappings'] });
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : 'Request failed');

  const activate = useMutation({
    mutationFn: (id: string) => api(`/metric-mappings/${id}`, { method: 'PATCH', body: JSON.stringify({ active: true }) }),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/metric-mappings/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: fail,
  });

  const rows = versions.data?.items ?? [];
  const latest = rows[0];

  return (
    <div className="space-y-4">
      <h1 className="display text-[36px] text-neutral-900">Metrics Management</h1>

      <div className="flex flex-wrap items-end justify-between gap-3 card p-5">
        <div className="min-w-64">
          <label htmlFor="mm-company" className="mb-1 block text-xs font-medium text-neutral-700">
            Portfolio Company
          </label>
          <select
            id="mm-company"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setError(undefined);
            }}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Select company…</option>
            {companies.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} – {c.name}
              </option>
            ))}
          </select>
        </div>
        {canWrite && (
          <button
            disabled={!companyId}
            onClick={() => setEditing('new')}
            className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            + New version
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">{error}</p>}

      {companyId && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500 [&_th]:py-3 [&_th]:font-semibold">
              <tr>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Metrics</th>
                <th className="px-3 py-2">Modified</th>
                {canWrite && <th className="px-3 py-2">Action</th>}
              </tr>
            </thead>
            <tbody>
              {versions.isLoading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-500">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-500">No metric selection yet for this company</td></tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2">v{m.version}</td>
                    <td className="px-3 py-2"><StatusBadge status={m.active ? 'Active' : 'Inactive'} /></td>
                    <td className="px-3 py-2">{m.items.length}</td>
                    <td className="px-3 py-2">{m.updatedAt.slice(0, 16).replace('T', ' ')}</td>
                    {canWrite && (
                      <td className="flex gap-3 px-3 py-2 text-xs">
                        <button className="text-forest-700 hover:underline" onClick={() => setEditing(m)}>Edit</button>
                        {!m.active && (
                          <>
                            <button className="text-green-700 hover:underline" onClick={() => { setError(undefined); activate.mutate(m.id); }}>
                              Activate
                            </button>
                            <button
                              className="text-red-600 hover:underline"
                              onClick={() => {
                                if (window.confirm(`Delete version ${m.version}?`)) {
                                  setError(undefined);
                                  remove.mutate(m.id);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SelectionEditor
          companyId={companyId}
          mapping={editing === 'new' ? null : editing}
          startFrom={editing === 'new' ? latest : undefined}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function SelectionEditor({
  companyId,
  mapping,
  startFrom,
  onClose,
  onSaved,
}: {
  companyId: string;
  mapping: Mapping | null;
  startFrom?: Mapping;
  onClose: () => void;
  onSaved: () => void;
}) {
  const source = mapping ?? startFrom;
  const [selected, setSelected] = useState<Set<string>>(new Set(source?.items.map((i) => i.metricId) ?? []));
  const [active, setActive] = useState(mapping ? mapping.active : true);
  const [error, setError] = useState<string>();

  const metrics = useQuery({ queryKey: ['metrics', 'active'], queryFn: () => list<Metric>('/esg-metrics?pageSize=500&active=true') });

  const byTheme = useMemo(() => {
    const groups = new Map<string, { name: string; group: string; metrics: Metric[] }>();
    for (const m of metrics.data?.items ?? []) {
      const g = groups.get(m.theme.id) ?? { name: m.theme.name, group: m.theme.group, metrics: [] };
      g.metrics.push(m);
      groups.set(m.theme.id, g);
    }
    return [...groups.entries()];
  }, [metrics.data]);

  const toggle = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  const save = useMutation({
    mutationFn: () => {
      const metricIds = [...selected];
      return mapping
        ? api(`/metric-mappings/${mapping.id}`, { method: 'PATCH', body: JSON.stringify({ metricIds, active }) })
        : api('/metric-mappings', { method: 'POST', body: JSON.stringify({ companyId, metricIds, active }) });
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof Error ? e.message : 'Save failed'),
  });

  return (
    <Modal title={mapping ? `Edit version v${mapping.version}` : 'New metric selection version'} onClose={onClose}>
      <div className="space-y-4">
        {metrics.isLoading && <p className="text-sm text-neutral-500">Loading metrics…</p>}
        {!metrics.isLoading && byTheme.length === 0 && (
          <p className="text-sm text-neutral-600">No active ESG metrics exist yet. Add them under ESG Configuration first.</p>
        )}
        {byTheme.map(([themeId, theme]) => {
          const ids = theme.metrics.map((m) => m.id);
          const all = ids.every((id) => selected.has(id));
          const some = ids.some((id) => selected.has(id));
          return (
            <fieldset key={themeId} className="rounded-md border border-neutral-200 p-3">
              <legend className="px-1">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={all}
                    ref={(el) => {
                      if (el) el.indeterminate = some && !all;
                    }}
                    onChange={(e) => toggle(ids, e.target.checked)}
                  />
                  {theme.name} <span className="text-xs font-normal text-neutral-500">({theme.group.toLowerCase()})</span>
                </label>
              </legend>
              <ul className="space-y-1 pl-6">
                {theme.metrics.map((m) => (
                  <li key={m.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selected.has(m.id)} onChange={(e) => toggle([m.id], e.target.checked)} />
                      {m.name}
                      {(m.scope || m.unit) && (
                        <span className="text-xs text-neutral-500">
                          {[m.scope, m.unit].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          );
        })}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Set as the active version (deactivates the current one)
        </label>

        {error && <p role="alert" className="rounded bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-2">
          <span className="text-xs text-neutral-500">{selected.size} metric(s) selected</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Cancel</button>
            <button
              type="button"
              disabled={selected.size === 0 || save.isPending}
              onClick={() => {
                setError(undefined);
                save.mutate();
              }}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
