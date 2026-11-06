import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';
import { parseDay } from '../common/dates';

const stringify = (v: unknown) => (v === undefined || v === null ? null : typeof v === 'object' ? JSON.stringify(v) : String(v));

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records a change; only fields whose value differs are written as log lines. */
  async record(params: {
    object: string;
    objectId?: string;
    action: AuditAction;
    user?: AuthUser;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  }) {
    const { before, after } = params;
    const members = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
    const lines = [...members]
      .map((member) => ({
        member,
        oldValue: stringify(before?.[member]),
        newValue: stringify(after?.[member]),
      }))
      .filter((l) => l.oldValue !== l.newValue);

    return this.prisma.auditLog.create({
      data: {
        object: params.object,
        objectId: params.objectId,
        action: params.action,
        userId: params.user?.id,
        userName: params.user?.name,
        lines: { create: lines },
      },
    });
  }

  /** Filters shared by the list and the Excel export. `from`/`to` are UTC calendar days, both inclusive. */
  private where(f: { object?: string; from?: string; to?: string }): Prisma.AuditLogWhereInput {
    const changedAt: Prisma.DateTimeFilter = {};
    if (f.from) changedAt.gte = parseDay(f.from) ?? undefined;
    if (f.to) {
      const end = parseDay(f.to);
      if (end) changedAt.lte = new Date(end.getTime() + 86_399_999);
    }
    return {
      ...(f.object && { object: { contains: f.object, mode: 'insensitive' } }),
      ...(Object.keys(changedAt).length && { changedAt }),
    };
  }

  async exportRows(filters: { object?: string; from?: string; to?: string }, limit: number) {
    return this.prisma.auditLog.findMany({
      where: this.where(filters),
      orderBy: { changedAt: 'desc' },
      take: limit,
      include: { lines: true },
    });
  }

  list(params: { object?: string; from?: string; to?: string; skip: number; take: number }) {
    const where = this.where(params);
    return this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        skip: params.skip,
        take: params.take,
        include: { _count: { select: { lines: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
  }

  get(id: string) {
    return this.prisma.auditLog.findUnique({ where: { id }, include: { lines: true } });
  }
}
