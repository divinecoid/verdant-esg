import { forwardRef, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/** Labelled input that works with react-hook-form's `register`. */
const FormField = forwardRef<HTMLInputElement, Props>(function FormField({ label, error, id, ...rest }, ref) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-neutral-700">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 ${
          error ? 'border-red-500' : 'border-neutral-300'
        }`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default FormField;
