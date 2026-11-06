import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile, upload } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';

interface Meeting {
  id: string;
  eventDate: string;
  notes: string;
  attachmentName: string | null;
  hasAttachment: boolean;
  company: { id: string; code: string; name: string };
}
interface Company { id: string; code: string; name: string }

const inputClass = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500';

export default function MinutesOfMeeting() {
  const { user } = useAuth();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ESG_TEAM';
  const qc = useQueryClient();
  const [companyId, setCompanyId] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [applied, setApplied] = useState<{ companyId: string; year: string } | null>(null);
  const [editing, setEditing] = useState<Meeting | 'new' | null>(null);
  const [error, setError] = useState<string>();

  const companies = useQuery({ queryKey: ['companies', 'all'], queryFn: () => api<{ items: Company[] }>('/companies?pageSize=500&active=true') });
  const meetings = useQuery({
    queryKey: ['minutes', applied],
    enabled: !!applied,
    queryFn: () => api<{ items: Meeting[]; total: number }>(`/minutes?companyId=${applied!.companyId}&year=${applied!.year}&pageSize=100`),
  });
  const company = useQuery({
    queryKey: ['company', applied?.companyId],
    enabled: !!applied,
    queryFn: () => api<{ contacts: { name: string; phone: string | null; email: string | null }[] }>(`/companies/${applied!.companyId}`),
  });
  const related = useQuery({
    queryKey: ['company-children', applied?.companyId],
    enabled: !!applied,
    queryFn: () => api<{ items: { id: string; name: string }[] }>(`/companies?parentId=${applied!.companyId}&pageSize=100`),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['minutes'] });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/minutes/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (e) => setError(e instanceof Error ? e.message : 'Delete failed'),
  });

  return (
    <div className="space-y-4">
      <h1 className="display text-[36px] text-neutral-900">Minutes of Meeting</h1>

      <section className="card p-5" aria-label="Search criteria">
        <h2 className="mb-3 text-sm font-semibold">Search Criteria</h2>
        <form
          className="grid gap-3 md:grid-cols-[2fr_minmax(6rem,1fr)_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (companyId) {
              setError(undefined);
              setApplied({ companyId, year });
            }
          }}
        >
          <div>
            <label htmlFor="mom-company" className="mb-1 block text-xs font-medium text-neutral-700">Portfolio Company</label>
            <select id="mom-company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {companies.data?.items.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mom-year" className="mb-1 block text-xs font-medium text-neutral-700">Year</label>
            <input id="mom-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={!companyId} className="w-full rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Search</button>
          </div>
        </form>
      </section>

      {applied && (
        <>
          {company.data && (
            <section className="grid gap-3 card p-5 text-sm md:grid-cols-2" aria-label="Contacts and related portfolio">
              <div>
                <h3 className="mb-1 text-xs font-semibold text-neutral-500">Contact Person</h3>
                {company.data.contacts.length === 0 ? '-' : company.data.contacts.map((c, i) => (
                  <div key={i}>{c.name}{c.email && ` · ${c.email}`}{c.phone && ` · ${c.phone}`}</div>
                ))}
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold text-neutral-500">Related Portfolio</h3>
                {!related.data?.items.length ? '-' : related.data.items.map((c) => (
                  <span key={c.id} className="mr-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">{c.name}</span>
                ))}
              </div>
            </section>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Detail Minutes of Meetings</h2>
            {canWrite && (
              <button onClick={() => setEditing('new')} className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
                + Add New Minutes of Meetings
              </button>
            )}
          </div>
          {error && <p role="alert" className="rounded bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">{error}</p>}

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-500 [&_th]:py-3 [&_th]:font-semibold">
                <tr>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Event Date</th>
                  <th className="px-3 py-2">Attachment</th>
                  <th className="px-3 py-2">Notes</th>
                  {canWrite && <th className="px-3 py-2">Action</th>}
                </tr>
              </thead>
              <tbody>
                {meetings.isLoading ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-500">Loading…</td></tr>
                ) : (meetings.data?.items ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-500">No meetings recorded for this year</td></tr>
                ) : (
                  meetings.data!.items.map((m) => (
                    <tr key={m.id} className="border-t border-neutral-100 align-top">
                      <td className="px-3 py-2">{m.company.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{m.eventDate.slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        {m.hasAttachment ? (
                          <button className="rounded-md bg-forest-100 px-2.5 py-1 text-xs font-medium text-forest-800 hover:bg-forest-200" onClick={() => downloadFile(`/minutes/${m.id}/attachment`, m.attachmentName ?? 'minutes').catch((e) => setError(e.message))}>
                            Download Here
                          </button>
                        ) : '-'}
                      </td>
                      <td className="whitespace-pre-wrap px-3 py-2">{m.notes}</td>
                      {canWrite && (
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          <button className="mr-3 text-forest-700 hover:underline" onClick={() => setEditing(m)}>Edit</button>
                          <button className="text-red-600 hover:underline" onClick={() => window.confirm('Delete this meeting record?') && remove.mutate(m.id)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && applied && (
        <MeetingForm
          meeting={editing === 'new' ? null : editing}
          companyId={applied.companyId}
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

function MeetingForm({ meeting, companyId, onClose, onSaved }: { meeting: Meeting | null; companyId: string; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState<string>();
  const file = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, formState } = useForm<{ eventDate: string; notes: string }>({
    defaultValues: { eventDate: meeting?.eventDate.slice(0, 10) ?? '', notes: meeting?.notes ?? '' },
  });

  const save = useMutation({
    mutationFn: async (v: { eventDate: string; notes: string }) => {
      const saved = meeting
        ? await api<Meeting>(`/minutes/${meeting.id}`, { method: 'PATCH', body: JSON.stringify(v) })
        : await api<Meeting>('/minutes', { method: 'POST', body: JSON.stringify({ ...v, companyId }) });
      const chosen = file.current?.files?.[0];
      if (chosen) await upload(`/minutes/${saved.id}/attachment`, chosen);
      return saved;
    },
    onSuccess: onSaved,
    onError: (e) => setError(e instanceof Error ? e.message : 'Save failed'),
  });

  return (
    <Modal title={meeting ? 'Edit Minutes of Meeting' : 'Add New Minutes of Meetings'} onClose={onClose}>
      <form onSubmit={handleSubmit((v) => { setError(undefined); save.mutate(v); })} className="space-y-3">
        <div>
          <label htmlFor="m-date" className="mb-1 block text-xs font-medium text-neutral-700">Event Date <span className="text-red-600">*</span></label>
          <input id="m-date" type="date" className={inputClass} {...register('eventDate', { required: 'Event date is required' })} />
          {formState.errors.eventDate && <p className="mt-1 text-xs text-red-600">{formState.errors.eventDate.message}</p>}
        </div>
        <div>
          <label htmlFor="m-notes" className="mb-1 block text-xs font-medium text-neutral-700">Notes <span className="text-red-600">*</span></label>
          <textarea id="m-notes" rows={4} className={inputClass} {...register('notes', { required: 'Notes are required' })} />
          {formState.errors.notes && <p className="mt-1 text-xs text-red-600">{formState.errors.notes.message}</p>}
        </div>
        <div>
          <label htmlFor="m-file" className="mb-1 block text-xs font-medium text-neutral-700">
            Attachment (pdf, images, office files, csv, txt — max 10 MB){meeting?.hasAttachment && ' · choosing a file replaces the current one'}
          </label>
          <input id="m-file" ref={file} type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc,.csv,.txt" className="text-sm" />
        </div>
        {error && <p role="alert" className="rounded bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={save.isPending} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
