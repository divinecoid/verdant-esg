import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calculateLine } from './calculation/line-calculator';
import { requestGuard } from './common/request-guard';
import { evaluateFormula, parseFormula } from './formula/formula-engine';
import { MetricMappingService } from './formula/metric-mapping.service';
import { CompaniesService } from './master-data/services';

describe('requestGuard', () => {
  const run = (req: { query: Record<string, unknown>; originalUrl: string }) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requestGuard(req as any, res as any, next);
    return { res, next };
  };

  it('lets ordinary requests through', () => {
    const { next, res } = run({ query: { q: 'abc', page: '2' }, originalUrl: '/api/companies?q=abc' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('answers 400 (not 500) when a parameter is repeated', () => {
    const { res, next } = run({ query: { q: ['a', 'b'] }, originalUrl: '/api/companies?q=a&q=b' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 400 for a NUL byte in the URL', () => {
    expect(run({ query: {}, originalUrl: '/api/companies/%00' }).res.status).toHaveBeenCalledWith(400);
  });
});

describe('calculation reads numbers strictly', () => {
  const resolve = async (names: string[]) => names.map((name) => ({ name, source: name === 'kwh' ? ('input' as const) : ('emission-factor' as const), value: name === 'kwh' ? null : 0.5 }));
  const formulas = [{ code: 'F', expression: 'EF * {kwh}' }];

  it('rejects a comma decimal instead of computing with a value 10x off', async () => {
    expect((await calculateLine({ value: '12,5', formulas, resolve })).error).toContain('is not a number');
  });

  it('accepts a thousands separator', async () => {
    expect((await calculateLine({ value: '1,200', formulas, resolve })).result).toBe(600);
  });
});

describe('formula results', () => {
  it('hide floating point noise', () => {
    expect(evaluateFormula(parseFormula('0.1 + 0.2'), {})).toBe(0.3);
    expect(evaluateFormula(parseFormula('1 / 3 * 3'), {})).toBe(1);
  });
});

describe('company parent checks', () => {
  const tree: Record<string, string | null> = { root: null, mid: 'root', leaf: 'mid' };
  const service = () => {
    const prisma = {
      company: {
        findUnique: jest.fn(async ({ where }: any) => (where.id in tree ? { parentId: tree[where.id] } : null)),
        update: jest.fn().mockResolvedValue({ id: 'x', contacts: [] }),
        create: jest.fn().mockResolvedValue({ id: 'x', contacts: [] }),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue({}) };
    return { svc: new CompaniesService(prisma as any, audit as any), prisma };
  };
  const actor = { id: 'u', name: 'U' };

  it('refuses a company as its own parent', async () => {
    const { svc, prisma } = service();
    await expect(svc.update('leaf', { parentId: 'leaf' }, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.company.update).not.toHaveBeenCalled();
  });

  it('refuses a parent that sits below the company (a loop)', async () => {
    const { svc } = service();
    await expect(svc.update('root', { parentId: 'leaf' }, actor)).rejects.toThrow('inside its own branch');
  });

  it('refuses a parent that does not exist, and allows a valid one or none', async () => {
    const { svc } = service();
    await expect(svc.create({ parentId: 'ghost' }, actor)).rejects.toThrow('does not exist');
    await expect(svc.update('leaf', { parentId: 'root' }, actor)).resolves.toBeDefined();
    await expect(svc.update('leaf', { parentId: null }, actor)).resolves.toBeDefined();
  });
});

describe('metric selection versions', () => {
  const collision = () => new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 't' });
  const created = { id: 'm', version: 2, company: { code: 'C' }, items: [{ metric: { code: 'M1' } }] };

  it('retries when two creators collide on the same version number', async () => {
    const prisma = { $transaction: jest.fn().mockRejectedValueOnce(collision()).mockRejectedValueOnce(collision()).mockResolvedValue(created) };
    const audit = { record: jest.fn().mockResolvedValue({}) };
    const svc = new MetricMappingService(prisma as any, audit as any);
    await expect(svc.create({ companyId: 'c', metricIds: ['a'] }, { id: 'u', name: 'U' } as any)).resolves.toBe(created);
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('gives up with the original error if it keeps colliding', async () => {
    const prisma = { $transaction: jest.fn().mockRejectedValue(collision()) };
    const svc = new MetricMappingService(prisma as any, { record: jest.fn() } as any);
    await expect(svc.create({ companyId: 'c', metricIds: ['a'] }, { id: 'u' } as any)).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(prisma.$transaction).toHaveBeenCalledTimes(4);
  });
});
