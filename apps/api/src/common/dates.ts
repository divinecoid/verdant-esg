import { registerDecorator, type ValidationOptions } from 'class-validator';

const DAY = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/;

/**
 * "2024-03-31" (optionally followed by a time) → that calendar day at 00:00 UTC. Returns null for text that is not
 * a real date; JavaScript alone would roll "2024-02-31" over to March 2 and carry on.
 */
export function parseDay(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null;
  const m = DAY.exec(raw);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null;
}

/** Validates that a string is a real calendar day (replacement for IsDateString, which accepts 2024-02-31). */
export function IsCalendarDate(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isCalendarDate',
      target: target.constructor,
      propertyName,
      options: { message: `${propertyName} must be a real date like 2024-03-31`, ...options },
      validator: { validate: (value: unknown) => parseDay(value) !== null },
    });
}
