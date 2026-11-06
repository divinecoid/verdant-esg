import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Variable {
  name: string;
  source: 'input' | 'emission-factor' | 'base-year' | 'unknown';
  value: number | null;
}
interface SimulateResult {
  variables: Variable[];
  missing: string[];
  result: number | null;
  error: string | null;
}

const SOURCE_LABEL: Record<Variable['source'], string> = {
  input: 'Data input',
  'emission-factor': 'Emission factor',
  'base-year': 'Base year GHG',
  unknown: 'Unknown',
};

/** Try a formula: variables from emission factors / base years are filled in; data inputs are typed in. */
export default function FormulaSimulator() {
  const [expression, setExpression] = useState('');
  const [year, setYear] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const simulate = useMutation({
    mutationFn: () => {
      const numeric = Object.fromEntries(
        Object.entries(inputs)
          .filter(([, v]) => v.trim() !== '' && Number.isFinite(Number(v)))
          .map(([k, v]) => [k, Number(v)]),
      );
      return api<SimulateResult>('/formulas/simulate', {
        method: 'POST',
        body: JSON.stringify({ expression, inputs: numeric, ...(year ? { year: Number(year) } : {}) }),
      });
    },
  });

  const out = simulate.data;
  const needsInput = out?.variables.filter((v) => v.source === 'input') ?? [];

  return (
    <section className="space-y-3 card p-4" aria-label="Formula simulator">
      <h2 className="text-sm font-semibold">Formula Simulator</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor="sim-expression" className="mb-1 block text-xs font-medium text-neutral-700">
            Formula
          </label>
          <input
            id="sim-expression"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="EF_ELEC * {data_input_purchased_elec} / 1000"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label htmlFor="sim-year" className="mb-1 block text-xs font-medium text-neutral-700">
            Year (optional)
          </label>
          <input
            id="sim-year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {needsInput.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {needsInput.map((v) => (
            <div key={v.name}>
              <label htmlFor={`sim-in-${v.name}`} className="mb-1 block text-xs font-medium text-neutral-700">
                {v.name}
              </label>
              <input
                id={`sim-in-${v.name}`}
                type="number"
                step="any"
                value={inputs[v.name] ?? ''}
                onChange={(e) => setInputs((prev) => ({ ...prev, [v.name]: e.target.value }))}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => simulate.mutate()}
        disabled={!expression.trim() || simulate.isPending}
        className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {needsInput.length ? 'Simulate' : 'Check formula'}
      </button>

      {simulate.isError && <p role="alert" className="text-sm text-red-600">{(simulate.error as Error).message}</p>}
      {out?.error && <p role="alert" className="text-sm text-red-600">{out.error}</p>}
      {out && !out.error && out.missing.length > 0 && (
        <p className="text-sm text-neutral-600">Enter a value for: {out.missing.join(', ')}, then simulate again.</p>
      )}
      {out && out.result !== null && (
        <p className="text-sm">
          Result: <b data-testid="sim-result">{out.result}</b>
        </p>
      )}

      {out && out.variables.length > 0 && (
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-100">
            <tr>
              <th className="px-2 py-1">Variable</th>
              <th className="px-2 py-1">Source</th>
              <th className="px-2 py-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {out.variables.map((v) => (
              <tr key={v.name} className="border-t">
                <td className="px-2 py-1 font-mono">{v.name}</td>
                <td className="px-2 py-1">{SOURCE_LABEL[v.source]}</td>
                <td className="px-2 py-1">{v.value ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
