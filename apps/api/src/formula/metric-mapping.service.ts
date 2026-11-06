import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/current-user.decorator';
import { CrudService } from '../common/crud.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Versioned metric selection per company. Each save of a selection is a new version; at most one version
 * per company is active at a time (activating one deactivates the others).
 */
@Injectable()
export class MetricMappingService extends CrudService {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'metricMapping',
      object: 'Metrics Management',
      orderBy: { version: 'desc' },
      filters: ['companyId', 'active'],
      include: {
        company: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            theme: { select: { id: true, code: true, name: true, group: true } },
            metric: { select: { id: true, code: true, name: true, scope: true, unit: true } },
          },
        },
      },
    });
  }

  private async itemsFor(tx: Prisma.TransactionClient, metricIds: string[]) {
    const metrics = await tx.esgMetric.findMany({ where: { id: { in: metricIds } }, select: { id: true, themeId: true } });
    if (metrics.length !== metricIds.length) throw new BadRequestException('One or more metrics do not exist');
    return metrics.map((m) => ({ metricId: m.id, themeId: m.themeId }));
  }

  async create(dto: { companyId: string; metricIds: string[]; active?: boolean }, user: AuthUser) {
    const active = dto.active ?? true;
    const created = await this.createWithRetry(dto, active);
    await this.audit.record({
      object: this.config.object,
      objectId: created.id,
      action: AuditAction.CREATE,
      user,
      after: this.summary(created),
    });
    return created;
  }

  /** Version numbers come from "latest + 1", so two simultaneous creators can collide on the unique key; try again. */
  private async createWithRetry(dto: { companyId: string; metricIds: string[] }, active: boolean) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.createVersion(dto, active);
      } catch (e) {
        const collided = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
        if (!collided || attempt >= 4) throw e;
      }
    }
  }

  private createVersion(dto: { companyId: string; metricIds: string[] }, active: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({ where: { id: dto.companyId }, select: { id: true } });
      if (!company) throw new BadRequestException('Company does not exist');
      const items = await this.itemsFor(tx, dto.metricIds);
      const last = await tx.metricMapping.aggregate({ where: { companyId: dto.companyId }, _max: { version: true } });
      if (active) await tx.metricMapping.updateMany({ where: { companyId: dto.companyId }, data: { active: false } });
      return tx.metricMapping.create({
        data: { companyId: dto.companyId, version: (last._max.version ?? 0) + 1, active, items: { create: items } },
        include: this.config.include,
      });
    });
  }

  async update(id: string, dto: { active?: boolean; metricIds?: string[] }, user: AuthUser) {
    const before = await this.get(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.active) {
        await tx.metricMapping.updateMany({ where: { companyId: before.companyId, id: { not: id } }, data: { active: false } });
      }
      const data: Prisma.MetricMappingUpdateInput = {};
      if (dto.active !== undefined) data.active = dto.active;
      if (dto.metricIds) data.items = { deleteMany: {}, create: await this.itemsFor(tx, dto.metricIds) };
      return tx.metricMapping.update({ where: { id }, data, include: this.config.include });
    });
    await this.audit.record({
      object: this.config.object,
      objectId: id,
      action: AuditAction.UPDATE,
      user,
      before: this.summary(before),
      after: this.summary(updated),
    });
    return updated;
  }

  async remove(id: string, user: AuthUser) {
    const before = await this.get(id);
    if (before.active) throw new BadRequestException('Deactivate or replace the active version before deleting it');
    return super.remove(id, user);
  }

  /** Audit snapshot: keep it readable instead of dumping every item row. */
  private summary(m: any) {
    return {
      company: m.company?.code,
      version: m.version,
      active: m.active,
      metrics: m.items.map((i: any) => i.metric.code).sort().join(', '),
    };
  }

  /** The currently active selection for a company, or 404. Used by data requests in a later phase. */
  async activeFor(companyId: string) {
    const found = await this.prisma.metricMapping.findFirst({
      where: { companyId, active: true },
      include: this.config.include,
    });
    if (!found) throw new NotFoundException('No active metric mapping for this company');
    return found;
  }
}
