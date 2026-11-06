import { BadRequestException, ConflictException } from '@nestjs/common';
import { RequestStatus as S, ReviewDecision as D } from '@prisma/client';
import { DataRequestService } from './data-request.service';

const user = { id: 'u-investee', name: 'Investee', email: 'i@x.id', role: 'INVESTEE' as const, companyId: 'c1' };
const esg = { id: 'u-alice', name: 'Alice', email: 'a@x.id', role: 'ESG_TEAM' as const, companyId: null };

const request = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  number: 7,
  companyId: 'c1',
  status: S.ON_GOING,
  reviewLevel: 0,
  submittedAt: null,
  values: [
    { metricId: 'kwh', value: null, metric: { code: 'E-EN-01', name: 'Electricity purchased', unit: 'kWh' } },
    { metricId: 'pol', value: null, metric: { code: 'G-AC-03', name: 'Anti-bribery policy', unit: null } },
  ],
  approvals: [],
  company: { name: 'PT Holding' },
  ...over,
});

function setup(row: ReturnType<typeof request>, claimed = 1) {
  const tx = {
    dataRequest: { updateMany: jest.fn().mockResolvedValue({ count: claimed }) },
    dataRequestValue: { update: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(0) },
    reviewApproval: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    dataRequest: { findUnique: jest.fn().mockResolvedValue(row) },
    appConfig: { findUnique: jest.fn().mockResolvedValue(null) },
    companyContact: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const audit = { record: jest.fn().mockResolvedValue({}) };
  const mail = { send: jest.fn().mockResolvedValue(undefined) };
  return { service: new DataRequestService(prisma as any, audit as any, mail as any), prisma, tx, audit };
}

describe('DataRequestService.saveValues', () => {
  it('rejects locale-style numbers rather than storing a misread value', async () => {
    const { service, prisma } = setup(request());
    for (const bad of ['12,5', '1.234,5', '1e3', '0x10']) {
      await expect(service.saveValues('r1', { values: [{ metricId: 'kwh', value: bad }] }, user)).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('stores numbers in canonical form but leaves text answers exactly as typed', async () => {
    const { service, tx } = setup(request());
    await service.saveValues('r1', { values: [{ metricId: 'kwh', value: '1,234.5' }, { metricId: 'pol', value: 'Approved, effective 1 Jan, reviewed yearly' }] }, user);

    const written = Object.fromEntries(tx.dataRequestValue.update.mock.calls.map(([a]) => [a.where.requestId_metricId.metricId, a.data.value]));
    expect(written).toEqual({ kwh: '1234.5', pol: 'Approved, effective 1 Jan, reviewed yearly' });
  });

  it('writes nothing when the request was submitted a moment earlier', async () => {
    const { service, tx } = setup(request(), 0);
    await expect(service.saveValues('r1', { values: [{ metricId: 'kwh', value: '5' }] }, user)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.dataRequestValue.update).not.toHaveBeenCalled();
  });

  it('only lets a save through while the request is still editable', async () => {
    const { service, tx } = setup(request());
    await service.saveValues('r1', { values: [{ metricId: 'kwh', value: '5' }] }, user);
    expect(tx.dataRequest.updateMany.mock.calls[0][0].where).toEqual({ id: 'r1', status: { in: [S.NOT_STARTED, S.ON_GOING, S.NEED_REVISION] } });
  });
});

describe('DataRequestService.submit', () => {
  const filled = () => request({ values: request().values.map((v) => ({ ...v, value: '1' })) });

  it('refuses a second submit that races the first', async () => {
    const { service } = setup(filled(), 0);
    await expect(service.submit('r1', user)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back when a value was emptied while submitting', async () => {
    const { service, tx } = setup(filled());
    tx.dataRequestValue.count.mockResolvedValue(1);
    await expect(service.submit('r1', user)).rejects.toThrow('still have no value');
  });
});

describe('DataRequestService.review', () => {
  const waiting = (level: number, approvals: unknown[] = []) =>
    request({ status: S.SUBMITTED, reviewLevel: level, submittedAt: new Date('2024-05-01T00:00:00Z'), approvals });

  it('records no approval when another reviewer got there first', async () => {
    const { service, tx } = setup(waiting(1), 0);
    await expect(service.review('r1', { decision: D.APPROVED, remarks: 'ok' }, esg)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.reviewApproval.create).not.toHaveBeenCalled();
  });

  it('claims the request at the exact step it read', async () => {
    const { service, tx } = setup(waiting(1));
    await service.review('r1', { decision: D.APPROVED, remarks: 'ok' }, esg);
    expect(tx.dataRequest.updateMany.mock.calls[0][0].where).toEqual({ id: 'r1', status: S.SUBMITTED, reviewLevel: 1 });
  });

  const l1 = (reviewerId: string, at: string) => ({ level: 1, decision: D.APPROVED, reviewerId, createdAt: new Date(at) });

  it('bars anyone who approved level 1 in this cycle from level 2, even if not the latest approver', async () => {
    const approvals = [l1('u-bob', '2024-05-03T00:00:00Z'), l1('u-alice', '2024-05-02T00:00:00Z')]; // newest first
    const { service } = setup(waiting(2, approvals));
    await expect(service.review('r1', { decision: D.APPROVED, remarks: 'ok' }, esg)).rejects.toThrow('different reviewer');
  });

  it('does not hold an approval from an earlier, already-rejected cycle against the reviewer', async () => {
    const approvals = [l1('u-alice', '2024-03-01T00:00:00Z')]; // before this cycle's submission on 2024-05-01
    const { service } = setup(waiting(2, approvals));
    const out = await service.review('r1', { decision: D.APPROVED, remarks: 'ok' }, esg);
    expect(out).toBeDefined();
  });
});

describe('DataRequestService.list', () => {
  it('ignores enum filters that are really inherited object properties', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { dataRequest: { findMany, count: jest.fn() }, dataRequestValue: { findMany: jest.fn().mockResolvedValue([]) }, $transaction: (ops: unknown[]) => Promise.all(ops) };
    const service = new DataRequestService(prisma as any, {} as any, {} as any);
    await service.list(esg, { page: 1, pageSize: 10, type: 'toString', status: 'constructor,__proto__,APPROVED' });
    const where = findMany.mock.calls[0][0].where;
    expect(where.type).toBeUndefined();
    expect(where.status).toEqual({ in: [S.APPROVED] });
  });
});
