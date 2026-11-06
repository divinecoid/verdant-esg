import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import RequestTable from '../components/RequestTable';
import Tabs from '../components/Tabs';

interface Company { id: string; code: string; name: string }
interface FormValues {
  companyId: string;
  type: 'PERIODIC' | 'AD_HOC';
  frequency: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  notes: string;
}

const inputClass = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500';

function NewRequest({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [error, setError] = useState<string>();
  const { register, handleSubmit, watch, formState } = useForm<FormValues>({ defaultValues: { type: 'AD_HOC', frequency: 'MONTHLY' } });
  const type = watch('type');
  const companies = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => api<{ items: Company[] }>('/companies?pageSize=500&active=true'),
  });

  const create = useMutation({
    mutationFn: (v: FormValues) =>
      api('/data-requests', {
        method: 'POST',
        body: JSON.stringify({
          companyId: v.companyId,
          type: v.type,
          ...(v.type === 'PERIODIC' ? { frequency: v.frequency } : { notes: v.notes }),
          periodStart: v.periodStart,
          periodEnd: v.periodEnd,
          dueDate: v.dueDate,
        }),
      }),
    onSuccess: onCreated,
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not create the request'),
  });

  const field = (name: keyof FormValues, label: string, children: React.ReactNode) => (
    <div>
      <label htmlFor={`nr-${name}`} className="mb-1 block text-xs font-medium text-neutral-700">
        {label} <span className="text-red-600">*</span>
      </label>
      {children}
      {formState.errors[name] && <p className="mt-1 text-xs text-red-600">{label} is required</p>}
    </div>
  );

  return (
    <Modal title="Send Data Request" onClose={onClose}>
      <form
        onSubmit={handleSubmit((v) => {
          setError(undefined);
          create.mutate(v);
        })}
        className="space-y-3"
      >
        {field(
          'companyId',
          'Portfolio Company',
          <select id="nr-companyId" className={inputClass} {...register('companyId', { required: true })}>
            <option value="">Select…</option>
            {companies.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} – {c.name}
              </option>
            ))}
          </select>,
        )}
        {field(
          'type',
          'Request Option',
          <select id="nr-type" className={inputClass} {...register('type')}>
            <option value="AD_HOC">Ad Hoc</option>
            <option value="PERIODIC">Periodic</option>
          </select>,
        )}
        {type === 'PERIODIC' &&
          field(
            'frequency',
            'Frequency',
            <select id="nr-frequency" className={inputClass} {...register('frequency')}>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUALLY">Annually</option>
            </select>,
          )}
        <div className="grid grid-cols-2 gap-3">
          {field('periodStart', 'Period Start Date', <input id="nr-periodStart" type="date" className={inputClass} {...register('periodStart', { required: true })} />)}
          {field('periodEnd', 'Period End Date', <input id="nr-periodEnd" type="date" className={inputClass} {...register('periodEnd', { required: true })} />)}
        </div>
        {field('dueDate', 'Due Date', <input id="nr-dueDate" type="date" className={inputClass} {...register('dueDate', { required: true })} />)}
        {type === 'AD_HOC' &&
          field('notes', 'Notes', <textarea id="nr-notes" rows={3} className={inputClass} {...register('notes', { required: true })} />)}

        {error && <p role="alert" className="rounded bg-[#f8e0da] px-3 py-2 text-sm text-[#8a2b17]">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={create.isPending} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {create.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function DataRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'ESG_TEAM';
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fills = user?.role === 'INVESTEE' || canCreate;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-[36px] text-neutral-900">Data Request List</h1>
        {canCreate && (
          <button onClick={() => setCreating(true)} className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">
            + Send Data Request
          </button>
        )}
      </div>
      <Tabs
        tabs={[
          {
            id: 'pending',
            label: 'Pending Data Request List',
            content: (
              <RequestTable statuses="NOT_STARTED,ON_GOING,NEED_REVISION" refreshKey={refreshKey} actionLabel={() => (fills ? 'Input' : 'View')} />
            ),
          },
          {
            id: 'review',
            label: 'In Review',
            content: <RequestTable statuses="SUBMITTED" refreshKey={refreshKey} actionLabel={() => 'View'} />,
          },
          {
            id: 'done',
            label: 'Completed Data Request List',
            content: <RequestTable statuses="APPROVED" refreshKey={refreshKey} actionLabel={() => 'View'} />,
          },
        ]}
      />
      {creating && (
        <NewRequest
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setRefreshKey((k) => k + 1);
            qc.invalidateQueries({ queryKey: ['data-requests'] });
          }}
        />
      )}
    </div>
  );
}
