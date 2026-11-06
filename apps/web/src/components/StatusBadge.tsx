const TONES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700',
  submitted: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-700',
  ok: 'bg-green-100 text-green-700',
  errors: 'bg-red-100 text-red-700',
  pending: 'bg-orange-100 text-orange-700',
  'not started': 'bg-orange-100 text-orange-700',
  'on going': 'bg-sky-100 text-sky-700',
  'need revision': 'bg-yellow-100 text-yellow-700',
};

export default function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status.toLowerCase()] ?? 'bg-neutral-100 text-neutral-700';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>;
}
