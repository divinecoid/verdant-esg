import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CrudService } from './crud.service';

const user = { id: 'u1', email: 'a@b.c', name: 'Tester', role: 'ADMIN' as const, companyId: null };

function setup(delegate: Record<string, jest.Mock>) {
  const audit = { record: jest.fn().mockResolvedValue({}) };
  const prisma = { thing: delegate, $transaction: (ops: unknown[]) => Promise.all(ops) };
  const service = new CrudService(prisma as any, audit as any, {
    model: 'thing',
    object: 'Thing',
    orderBy: { code: 'asc' },
    search: ['code', 'name'],
    filters: ['active'],
  });
  return { service, audit };
}

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: 'test' });

describe('CrudService', () => {
  it('audits create without timestamp noise', async () => {
    const created = { id: '1', code: 'A', createdAt: new Date(), updatedAt: new Date() };
    const { service, audit } = setup({ create: jest.fn().mockResolvedValue(created) });

    await service.create({ code: 'A' }, user);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ object: 'Thing', action: 'CREATE', after: { id: '1', code: 'A' } }),
    );
  });

  it('audits update with before and after', async () => {
    const { service, audit } = setup({
      findUnique: jest.fn().mockResolvedValue({ id: '1', name: 'old' }),
      update: jest.fn().mockResolvedValue({ id: '1', name: 'new' }),
    });

    await service.update('1', { name: 'new' }, user);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ before: { id: '1', name: 'old' }, after: { id: '1', name: 'new' } }),
    );
  });

  it('maps unique violations to 409', async () => {
    const { service } = setup({ create: jest.fn().mockRejectedValue(knownError('P2002')) });
    await expect(service.create({}, user)).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps foreign-key violations on delete to 409 and does not audit', async () => {
    const { service, audit } = setup({
      findUnique: jest.fn().mockResolvedValue({ id: '1' }),
      delete: jest.fn().mockRejectedValue(knownError('P2003')),
    });
    await expect(service.remove('1', user)).rejects.toBeInstanceOf(ConflictException);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('404s when the record is missing', async () => {
    const { service } = setup({ findUnique: jest.fn().mockResolvedValue(null) });
    await expect(service.get('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('builds search and exact filters for list', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const { service } = setup({ findMany, count });

    await service.list({ page: 2, pageSize: 5, q: 'foo', filters: { active: 'true', ignored: 'x' } });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: {
          active: true,
          OR: [
            { code: { contains: 'foo', mode: 'insensitive' } },
            { name: { contains: 'foo', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });
});
