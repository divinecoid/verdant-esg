import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { parseDay } from '../common/dates';
import { CrudConfig, CrudService } from '../common/crud.service';
import { PrismaService } from '../prisma/prisma.service';

const toDate = (v: unknown) => (v ? (parseDay(v) ?? undefined) : v === null ? null : undefined);

abstract class Base extends CrudService {
  constructor(prisma: PrismaService, audit: AuditService, config: CrudConfig) {
    super(prisma, audit, config);
  }
}

@Injectable()
export class CompaniesService extends Base {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'company',
      object: 'Master Company',
      orderBy: { code: 'asc' },
      search: ['code', 'name', 'sector'],
      filters: ['type', 'active', 'parentId'],
      include: { contacts: true },
    });
  }

  /** A parent must exist and must not be the company itself or one of its own descendants. */
  private async assertValidParent(selfId: string | undefined, parentId: string | null | undefined) {
    if (!parentId) return;
    if (parentId === selfId) throw new BadRequestException('A company cannot be its own parent');
    const seen = new Set<string>();
    for (let current: string | null = parentId; current; ) {
      if (current === selfId) throw new BadRequestException('That parent would put the company inside its own branch');
      if (seen.has(current)) break; // an older loop already in the data; do not spin on it
      seen.add(current);
      const row: { parentId: string | null } | null = await this.prisma.company.findUnique({ where: { id: current }, select: { parentId: true } });
      if (!row) throw new BadRequestException('The parent company does not exist');
      current = row.parentId;
    }
  }

  async create(dto: any, user: any) {
    await this.assertValidParent(undefined, dto.parentId);
    return super.create(dto, user);
  }

  async update(id: string, dto: any, user: any) {
    if (dto.parentId !== undefined) await this.assertValidParent(id, dto.parentId);
    return super.update(id, dto, user);
  }

  protected toCreateData({ contacts, ...rest }: any) {
    return { ...rest, ...(contacts && { contacts: { create: contacts } }) };
  }

  protected toUpdateData({ contacts, ...rest }: any) {
    // Contacts are replaced as a whole when supplied.
    return { ...rest, ...(contacts && { contacts: { deleteMany: {}, create: contacts } }) };
  }
}

@Injectable()
export class ProjectsService extends Base {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'project',
      object: 'Master Project',
      orderBy: { name: 'asc' },
      search: ['name', 'sector'],
      filters: ['companyId'],
      include: { company: { select: { id: true, code: true, name: true } } },
    });
  }

  protected toCreateData(dto: any) {
    return { ...dto, initialInvestedAt: toDate(dto.initialInvestedAt), closingDate: toDate(dto.closingDate) };
  }

  protected toUpdateData(dto: any) {
    return this.toCreateData(dto);
  }
}

@Injectable()
export class EsgThemesService extends Base {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'esgTheme',
      object: 'ESG Configuration - Theme',
      orderBy: { code: 'asc' },
      search: ['code', 'name'],
      filters: ['group', 'active'],
    });
  }
}

@Injectable()
export class EsgMetricsService extends Base {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'esgMetric',
      object: 'ESG Configuration - Metric',
      orderBy: { code: 'asc' },
      search: ['code', 'name'],
      filters: ['themeId', 'active'],
      include: { theme: { select: { id: true, code: true, name: true, group: true } } },
    });
  }
}

@Injectable()
export class DataInputAttributesService extends Base {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'dataInputAttribute',
      object: 'ESG Configuration - Data Input Attribute',
      orderBy: { code: 'asc' },
      search: ['code', 'name'],
      filters: ['active'],
    });
  }
}

@Injectable()
export class EmissionFactorsService extends Base {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'emissionFactor',
      object: 'ESG Configuration - Emission Factor',
      orderBy: { code: 'asc' },
      search: ['code', 'name'],
      include: { values: { orderBy: { year: 'desc' } } },
    });
  }

  protected toCreateData({ values, ...rest }: any) {
    return { ...rest, ...(values && { values: { create: values } }) };
  }

  protected toUpdateData({ values, ...rest }: any) {
    return { ...rest, ...(values && { values: { deleteMany: {}, create: values } }) };
  }
}

@Injectable()
export class BaseYearGhgService extends Base {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'baseYearGhg',
      object: 'ESG Configuration - Base Year GHG',
      orderBy: { year: 'desc' },
      search: ['code'],
      filters: ['active'],
    });
  }
}

@Injectable()
export class AppConfigService extends Base {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'appConfig',
      object: 'General Configuration',
      orderBy: { code: 'asc' },
      search: ['code', 'description'],
    });
  }
}
