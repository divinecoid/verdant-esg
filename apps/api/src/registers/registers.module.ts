import { Injectable, Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { createCrudController } from '../common/crud.controller';
import { CrudConfig, CrudService } from '../common/crud.service';
import { PrismaService } from '../prisma/prisma.service';
import * as dto from './dto';

const COMPANY = { select: { id: true, code: true, name: true } };

/** "2024-03-31" → Date, null stays null (clears the column), undefined stays untouched. */
const asDate = (v: unknown) => (typeof v === 'string' && v ? new Date(`${v.slice(0, 10)}T00:00:00Z`) : v === null ? null : undefined);
const withDates = <T extends Record<string, any>>(data: T, keys: string[]): T => {
  const out: Record<string, any> = { ...data };
  for (const k of keys) if (k in out) out[k] = asDate(out[k]);
  return out as T;
};

abstract class Register extends CrudService {
  protected abstract readonly dateKeys: string[];
  constructor(prisma: PrismaService, audit: AuditService, config: CrudConfig) {
    super(prisma, audit, config);
  }
  protected toCreateData(d: any) {
    return withDates(d, this.dateKeys);
  }
  protected toUpdateData(d: any) {
    return withDates(d, this.dateKeys);
  }
}

@Injectable()
export class TargetsService extends Register {
  protected readonly dateKeys = [];
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'metricTarget',
      object: 'ESG Target',
      orderBy: { year: 'desc' },
      filters: ['companyId', 'metricId', 'year'],
      numericFilters: ['year'],
      include: { company: COMPANY, metric: { select: { id: true, code: true, name: true, unit: true, resultUnit: true, theme: { select: { group: true } } } } },
    });
  }
}

@Injectable()
export class IncidentsService extends Register {
  protected readonly dateKeys = ['occurredAt'];
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'incident',
      object: 'Incident Register',
      orderBy: { occurredAt: 'desc' },
      search: ['type', 'description'],
      filters: ['companyId', 'status', 'severity'],
      include: { company: COMPANY },
    });
  }
}

@Injectable()
export class FindingsService extends Register {
  protected readonly dateKeys = ['reportedAt', 'dueDate'];
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'auditFinding',
      object: 'Audit Findings',
      orderBy: { reportedAt: 'desc' },
      search: ['source', 'description', 'owner'],
      filters: ['companyId', 'status', 'severity'],
      include: { company: COMPANY },
    });
  }
}

@Injectable()
export class RisksService extends Register {
  protected readonly dateKeys = ['reviewDate'];
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'risk',
      object: 'Risk Register',
      orderBy: { createdAt: 'desc' },
      search: ['title', 'category', 'owner'],
      filters: ['companyId', 'status', 'category'],
      include: { company: COMPANY },
    });
  }
}

@Injectable()
export class ComplianceService extends Register {
  protected readonly dateKeys = ['dueDate', 'lastReviewedAt'];
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'complianceItem',
      object: 'Compliance Checklist',
      orderBy: { createdAt: 'desc' },
      search: ['regulation', 'requirement'],
      filters: ['companyId', 'status'],
      include: { company: COMPANY },
    });
  }
}

const resources = [
  { path: 'targets', service: TargetsService, createDto: dto.CreateTargetDto, updateDto: dto.UpdateTargetDto },
  { path: 'incidents', service: IncidentsService, createDto: dto.CreateIncidentDto, updateDto: dto.UpdateIncidentDto },
  { path: 'audit-findings', service: FindingsService, createDto: dto.CreateFindingDto, updateDto: dto.UpdateFindingDto },
  { path: 'risks', service: RisksService, createDto: dto.CreateRiskDto, updateDto: dto.UpdateRiskDto },
  { path: 'compliance-items', service: ComplianceService, createDto: dto.CreateComplianceDto, updateDto: dto.UpdateComplianceDto },
];

@Module({
  controllers: resources.map(createCrudController),
  providers: resources.map((r) => r.service),
})
export class RegistersModule {}
