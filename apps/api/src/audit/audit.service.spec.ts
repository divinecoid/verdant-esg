import { AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';

describe('AuditService.record', () => {
  it('only writes lines for changed members', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditService({ auditLog: { create } } as any);

    await service.record({
      object: 'Company',
      action: AuditAction.UPDATE,
      before: { name: 'A', sector: 'Energy' },
      after: { name: 'B', sector: 'Energy' },
    });

    const lines = create.mock.calls[0][0].data.lines.create;
    expect(lines).toEqual([{ member: 'name', oldValue: 'A', newValue: 'B' }]);
  });

  it('records every member on create', async () => {
    const create = jest.fn().mockResolvedValue({});
    const service = new AuditService({ auditLog: { create } } as any);

    await service.record({ object: 'Company', action: AuditAction.CREATE, after: { name: 'A', sector: null } });

    const lines = create.mock.calls[0][0].data.lines.create;
    expect(lines).toEqual([{ member: 'name', oldValue: null, newValue: 'A' }]);
  });
});
