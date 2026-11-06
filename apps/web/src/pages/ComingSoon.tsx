export default function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold">{title}</h1>
      <p className="text-sm text-neutral-600">Planned for Phase {phase}.</p>
    </div>
  );
}
