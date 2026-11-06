/**
 * Numbers typed into data requests.
 *
 * The only accepted shapes are a plain number ("1234.5", "-3") or one with comma thousands separators
 * ("1,234,567.89"). A comma is never read as a decimal point: "12,5" or "1.234,5" are rejected instead of being
 * silently turned into 125 or 1.2345, which is what happens with locale-style input if separators are just stripped.
 */
const PLAIN = /^-?\d+(\.\d+)?$/;
const GROUPED = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;

/** The canonical text of a number ("1,234.5" → "1234.5"), or null when the text is not an acceptable number. */
export function normaliseNumber(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const text = raw.trim();
  if (PLAIN.test(text)) return text;
  if (GROUPED.test(text)) return text.replace(/,/g, '');
  return null;
}

/** The numeric value of acceptable text, or null (empty, or not a number in an accepted shape). */
export function parseNumber(raw: string | null | undefined): number | null {
  const normalised = normaliseNumber(raw);
  if (normalised === null) return null;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

export const NUMBER_HINT = 'Use digits with a dot for decimals, e.g. 1234.5 or 1,234.5 (a comma is a thousands separator, not a decimal point)';
