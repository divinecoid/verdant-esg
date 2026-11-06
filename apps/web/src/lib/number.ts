/**
 * Mirrors the API's rule for numbers typed into data requests, so mistakes show up while typing.
 * Accepted: 1234.5, -3, 1,234.5 (comma = thousands only). Not accepted: 12,5 or 1.234,5, which would be misread.
 */
const PLAIN = /^-?\d+(\.\d+)?$/;
const GROUPED = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;

export const isAcceptableNumber = (raw: string) => {
  const t = raw.trim();
  return PLAIN.test(t) || GROUPED.test(t);
};

export const NUMBER_RULE = 'Use a dot for decimals, e.g. 1234.5 (a comma is only a thousands separator, so 12,5 is not accepted).';
