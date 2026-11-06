import { normaliseNumber, parseNumber } from './number';

describe('normaliseNumber', () => {
  it('accepts plain and comma-grouped numbers and returns the canonical text', () => {
    expect(normaliseNumber('1234.5')).toBe('1234.5');
    expect(normaliseNumber('1,234.5')).toBe('1234.5');
    expect(normaliseNumber('1,234,567')).toBe('1234567');
    expect(normaliseNumber(' 42 ')).toBe('42');
    expect(normaliseNumber('-3.25')).toBe('-3.25');
    expect(normaliseNumber('0')).toBe('0');
  });

  it('refuses locale-style input instead of silently misreading it', () => {
    expect(normaliseNumber('1.234,5')).toBeNull(); // was stored as 1.2345
    expect(normaliseNumber('12,5')).toBeNull(); // was stored as 125
    expect(normaliseNumber('1,23')).toBeNull(); // was stored as 123
    expect(normaliseNumber('12.345.678')).toBeNull();
    expect(normaliseNumber('1,2345')).toBeNull();
  });

  it('refuses anything that only looks numeric to JavaScript', () => {
    for (const bad of ['1e3', '0x10', 'Infinity', 'NaN', '.5', '5.', '+5', '1 000', '١٢٣', '', ' ', 'abc', '1,234.', ',234']) {
      expect(normaliseNumber(bad)).toBeNull();
    }
  });

  it('treats null and undefined as no value', () => {
    expect(normaliseNumber(null)).toBeNull();
    expect(normaliseNumber(undefined)).toBeNull();
  });
});

describe('parseNumber', () => {
  it('returns the numeric value of acceptable text only', () => {
    expect(parseNumber('1,234.5')).toBe(1234.5);
    expect(parseNumber('12,5')).toBeNull();
    expect(parseNumber('0x10')).toBeNull();
  });
});
