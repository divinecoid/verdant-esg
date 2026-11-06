import { validate } from 'class-validator';
import { IsOptional } from 'class-validator';
import { IsCalendarDate, parseDay } from './dates';

describe('parseDay', () => {
  it('parses real days, with or without a time part', () => {
    expect(parseDay('2024-02-29')?.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    expect(parseDay('2024-03-31T17:45:00Z')?.toISOString()).toBe('2024-03-31T00:00:00.000Z');
  });

  it('rejects days that do not exist instead of rolling them over', () => {
    for (const bad of ['2024-02-31', '2023-02-29', '2024-04-31', '2024-13-01', '2024-00-10', '2024-01-00']) expect(parseDay(bad)).toBeNull();
  });

  it('rejects things that are not dates', () => {
    for (const bad of ['', 'yesterday', '31-12-2024', '2024/01/31', '20240131', 5, null, undefined, {}]) expect(parseDay(bad)).toBeNull();
  });
});

class Sample {
  @IsCalendarDate() when: string;
  @IsOptional() @IsCalendarDate() maybe?: string | null;
}

describe('IsCalendarDate', () => {
  const check = async (body: Partial<Sample>) => (await validate(Object.assign(new Sample(), body))).length;
  it('accepts real dates and optional blanks, refuses impossible ones', async () => {
    expect(await check({ when: '2024-02-29' })).toBe(0);
    expect(await check({ when: '2024-02-30' })).toBe(1);
    expect(await check({ when: '2024-01-01', maybe: null })).toBe(0);
    expect(await check({ when: '2024-01-01', maybe: '2024-06-31' })).toBe(1);
  });
});
