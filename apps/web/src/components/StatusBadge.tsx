type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'idle';

const TONE: Record<Tone, { chip: string; dot: string }> = {
  ok: { chip: 'bg-forest-100 text-forest-800', dot: 'bg-ok' },
  warn: { chip: 'bg-[#fbf0d3] text-[#7a5a0c]', dot: 'bg-warn' },
  bad: { chip: 'bg-[#f8e0da] text-[#8a2b17]', dot: 'bg-bad' },
  info: { chip: 'bg-[#dcebf3] text-[#25536f]', dot: 'bg-[#3a7ca5]' },
  idle: { chip: 'bg-neutral-200/70 text-neutral-600', dot: 'bg-neutral-400' },
};

const BY_LABEL: Record<string, Tone> = {
  active: 'ok',
  approved: 'ok',
  submitted: 'ok',
  ok: 'ok',
  met: 'ok',
  compliant: 'ok',
  closed: 'ok',
  inactive: 'idle',
  'not applicable': 'idle',
  low: 'idle',
  pending: 'warn',
  'not started': 'warn',
  'need revision': 'warn',
  'at risk': 'warn',
  partial: 'warn',
  open: 'warn',
  medium: 'warn',
  mitigating: 'info',
  'in progress': 'info',
  investigating: 'info',
  accepted: 'idle',
  'on going': 'info',
  errors: 'bad',
  'off track': 'bad',
  'non compliant': 'bad',
  high: 'bad',
  critical: 'bad',
};

/** Soft chip with a status dot; the tone comes from the label so the same word always looks the same. */
export default function StatusBadge({ status }: { status: string }) {
  const t = TONE[BY_LABEL[status.toLowerCase()] ?? 'idle'];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${t.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}
