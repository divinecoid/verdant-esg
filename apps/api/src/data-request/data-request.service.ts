import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, RequestStatus, RequestType, ReviewDecision, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/current-user.decorator';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataRequestDto, ReviewDto, SaveValuesDto } from './dto';
import { afterReview, afterSubmit, canEdit, progressOf, statusAfterSave, WorkflowError } from './workflow';

const OBJECT = 'ESG Data Request';
export const requestLabel = (number: number) => `DR-${String(number).padStart(6, '0')}`;

const DETAIL = {
  company: { select: { id: true, code: true, name: true } },
  mapping: { select: { id: true, version: true } },
  values: {
    include: {
      metric: {
        select: {
          id: true,
          code: true,
          name: true,
          scope: true,
          unit: true,
          theme: { select: { id: true, code: true, name: true, group: true } },
        },
      },
    },
  },
  attachments: { orderBy: { createdAt: 'asc' } },
  approvals: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.DataRequestInclude;

const isFilled = (v: string | null) => v !== null && v.trim() !== '';
const parseDate = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
const clean = (v: string | null | undefined) => (v === undefined ? undefined : v === null || v.trim() === '' ? null : v.trim());

export interface NewRequest {
  companyId: string;
  type: RequestType;
  frequency?: CreateDataRequestDto['frequency'];
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  notes?: string;
}

@Injectable()
export class DataRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  // ---- access ------------------------------------------------------------

  /** Investees only see their own company's requests; everyone else with access to the module sees all. */
  private assertCompanyAccess(user: AuthUser, companyId: string) {
    if (user.role === Role.INVESTEE && user.companyId !== companyId) throw new ForbiddenException();
  }

  private async recipients(companyId: string) {
    const [contacts, users] = await Promise.all([
      this.prisma.companyContact.findMany({ where: { companyId }, select: { email: true } }),
      this.prisma.user.findMany({ where: { companyId, active: true }, select: { email: true } }),
    ]);
    return [...contacts.map((c) => c.email), ...users.map((u) => u.email)];
  }

  private async reviewerEmails(level: number) {
    const config = await this.prisma.appConfig.findUnique({ where: { code: level === 1 ? '1st_reviewer' : '2nd_reviewer' } });
    return (config?.value ?? '').split(/[;,]/).map((e) => e.trim());
  }

  // ---- reads -------------------------------------------------------------

  private async progressFor(ids: string[]) {
    if (!ids.length) return new Map<string, { filled: number; total: number }>();
    const rows = await this.prisma.dataRequestValue.findMany({ where: { requestId: { in: ids } }, select: { requestId: true, value: true } });
    const map = new Map<string, { filled: number; total: number }>();
    for (const r of rows) {
      const p = map.get(r.requestId) ?? { filled: 0, total: 0 };
      p.total++;
      if (isFilled(r.value)) p.filled++;
      map.set(r.requestId, p);
    }
    return map;
  }

  async list(
    user: AuthUser,
    q: { page: number; pageSize: number; type?: string; companyId?: string; status?: string; reviewLevel?: string; search?: string },
  ) {
    const where: Prisma.DataRequestWhereInput = {};
    if (q.type && q.type in RequestType) where.type = q.type as RequestType;
    const statuses = (q.status ?? '').split(',').filter((s): s is RequestStatus => s in RequestStatus);
    if (statuses.length) where.status = { in: statuses };
    if (q.reviewLevel) where.reviewLevel = Number(q.reviewLevel) || 0;
    where.companyId = user.role === Role.INVESTEE ? (user.companyId ?? '__none__') : q.companyId || undefined;
    if (q.search) where.company = { name: { contains: q.search, mode: 'insensitive' } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.dataRequest.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { number: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { company: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.dataRequest.count({ where }),
    ]);
    const progress = await this.progressFor(items.map((i) => i.id));
    return {
      items: items.map((r) => {
        const p = progress.get(r.id) ?? { filled: 0, total: 0 };
        return { ...r, label: requestLabel(r.number), progress: progressOf(p.filled, p.total) };
      }),
      total,
    };
  }

  async get(id: string, user: AuthUser) {
    const request = await this.prisma.dataRequest.findUnique({ where: { id }, include: DETAIL });
    if (!request) throw new NotFoundException();
    this.assertCompanyAccess(user, request.companyId);
    const filled = request.values.filter((v) => isFilled(v.value)).length;
    return { ...request, label: requestLabel(request.number), progress: progressOf(filled, request.values.length) };
  }

  // ---- create ------------------------------------------------------------

  /** Used by the API and the scheduler. Snapshots the company's active metric selection into empty value rows. */
  async createRequest(input: NewRequest, by: { id?: string; name: string }) {
    if (input.periodEnd < input.periodStart) throw new BadRequestException('Period end must not be before period start');
    const mapping = await this.prisma.metricMapping.findFirst({
      where: { companyId: input.companyId, active: true },
      include: { items: { select: { metricId: true } } },
    });
    if (!mapping) throw new BadRequestException('This company has no active metric selection (see Metrics Management)');
    const company = await this.prisma.company.findUnique({ where: { id: input.companyId }, select: { id: true, active: true } });
    if (!company) throw new BadRequestException('Company does not exist');

    const created = await this.prisma.dataRequest.create({
      data: {
        type: input.type,
        frequency: input.type === RequestType.PERIODIC ? input.frequency : null,
        companyId: input.companyId,
        mappingId: mapping.id,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        dueDate: input.dueDate,
        notes: input.notes,
        requestedById: by.id,
        requestedByName: by.name,
        values: { create: mapping.items.map((i) => ({ metricId: i.metricId })) },
      },
      include: { company: { select: { name: true } } },
    });

    await this.audit.record({
      object: OBJECT,
      objectId: created.id,
      action: AuditAction.CREATE,
      user: by.id ? ({ id: by.id, name: by.name } as AuthUser) : undefined,
      after: {
        number: requestLabel(created.number),
        type: created.type,
        company: created.company.name,
        period: `${created.periodStart.toISOString().slice(0, 10)} – ${created.periodEnd.toISOString().slice(0, 10)}`,
        dueDate: created.dueDate.toISOString().slice(0, 10),
        status: created.status,
      },
    });

    await this.mail.send(
      await this.recipients(input.companyId),
      `[ESG] New data request ${requestLabel(created.number)}`,
      `A ${created.type === RequestType.AD_HOC ? 'ad hoc' : 'periodic'} ESG data request was created for ${created.company.name}.\n` +
        `Period: ${created.periodStart.toISOString().slice(0, 10)} to ${created.periodEnd.toISOString().slice(0, 10)}\n` +
        `Due: ${created.dueDate.toISOString().slice(0, 10)}\n${created.notes ? `\nNotes: ${created.notes}\n` : ''}`,
    );
    return created;
  }

  create(dto: CreateDataRequestDto, user: AuthUser) {
    return this.createRequest(
      {
        companyId: dto.companyId,
        type: dto.type,
        frequency: dto.frequency,
        periodStart: parseDate(dto.periodStart),
        periodEnd: parseDate(dto.periodEnd),
        dueDate: parseDate(dto.dueDate),
        notes: dto.notes?.trim(),
      },
      { id: user.id, name: user.name },
    );
  }

  // ---- fill in & submit --------------------------------------------------

  private async loadEditable(id: string, user: AuthUser) {
    const request = await this.prisma.dataRequest.findUnique({
      where: { id },
      include: { values: { include: { metric: { select: { code: true, name: true, unit: true } } } } },
    });
    if (!request) throw new NotFoundException();
    this.assertCompanyAccess(user, request.companyId);
    if (!canEdit(request.status)) throw new BadRequestException('This request can no longer be edited');
    return request;
  }

  async saveValues(id: string, dto: SaveValuesDto, user: AuthUser) {
    const request = await this.loadEditable(id, user);
    const byMetric = new Map(request.values.map((v) => [v.metricId, v]));

    const seen = new Set<string>();
    for (const input of dto.values) {
      const row = byMetric.get(input.metricId);
      if (!row) throw new BadRequestException('A value refers to a metric that is not part of this request');
      if (seen.has(input.metricId)) throw new BadRequestException(`Metric ${row.metric.code} appears more than once`);
      seen.add(input.metricId);
      const value = clean(input.value);
      if (value && row.metric.unit && !Number.isFinite(Number(value.replace(/,/g, '')))) {
        throw new BadRequestException(`"${row.metric.name}" must be a number (unit ${row.metric.unit})`);
      }
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const nextStatus = statusAfterSave(request.status);

    await this.prisma.$transaction([
      ...dto.values.map((input) => {
        const row = byMetric.get(input.metricId)!;
        const next = {
          value: clean(input.value)?.replace(/,/g, '') ?? (input.value === undefined ? undefined : null),
          dataStatus: clean(input.dataStatus),
          description: clean(input.description),
          comment: clean(input.comment),
        };
        if (next.value !== undefined) {
          before[row.metric.code] = row.value;
          after[row.metric.code] = next.value;
        }
        return this.prisma.dataRequestValue.update({
          where: { requestId_metricId: { requestId: id, metricId: input.metricId } },
          data: next,
        });
      }),
      this.prisma.dataRequest.update({
        where: { id },
        data: { status: nextStatus, ...(dto.remarks !== undefined && { remarks: clean(dto.remarks) }) },
      }),
    ]);

    if (nextStatus !== request.status) {
      before.status = request.status;
      after.status = nextStatus;
    }
    await this.audit.record({ object: OBJECT, objectId: id, action: AuditAction.UPDATE, user, before, after });
    return this.get(id, user);
  }

  async submit(id: string, user: AuthUser) {
    const request = await this.loadEditable(id, user);
    const empty = request.values.filter((v) => !isFilled(v.value));
    if (empty.length) {
      throw new BadRequestException(`${empty.length} of ${request.values.length} metrics still have no value`);
    }
    let next;
    try {
      next = afterSubmit(request.status);
    } catch (e) {
      if (e instanceof WorkflowError) throw new BadRequestException(e.message);
      throw e;
    }
    await this.prisma.dataRequest.update({
      where: { id },
      data: { ...next, submittedAt: new Date(), submittedById: user.id },
    });
    await this.audit.record({
      object: OBJECT,
      objectId: id,
      action: AuditAction.UPDATE,
      user,
      before: { status: request.status, reviewLevel: request.reviewLevel },
      after: { status: next.status, reviewLevel: next.reviewLevel },
    });
    await this.mail.send(
      await this.reviewerEmails(1),
      `[ESG] ${requestLabel(request.number)} submitted for review`,
      `${user.name} submitted data request ${requestLabel(request.number)}. It is waiting for the first review.`,
    );
    return this.get(id, user);
  }

  // ---- review ------------------------------------------------------------

  async review(id: string, dto: ReviewDto, user: AuthUser) {
    const request = await this.prisma.dataRequest.findUnique({
      where: { id },
      include: { company: { select: { name: true } }, approvals: { orderBy: { createdAt: 'desc' } } },
    });
    if (!request) throw new NotFoundException();

    const levelOneApprover = request.approvals.find((a) => a.level === 1 && a.decision === ReviewDecision.APPROVED);
    let next;
    try {
      next = afterReview(request, dto.decision, user.id, levelOneApprover?.reviewerId);
    } catch (e) {
      if (e instanceof WorkflowError) throw new BadRequestException(e.message);
      throw e;
    }

    await this.prisma.$transaction([
      this.prisma.reviewApproval.create({
        data: {
          requestId: id,
          level: request.reviewLevel,
          decision: dto.decision,
          remarks: dto.remarks.trim(),
          reviewerId: user.id,
          reviewerName: user.name,
        },
      }),
      this.prisma.dataRequest.update({ where: { id }, data: next }),
    ]);
    await this.audit.record({
      object: OBJECT,
      objectId: id,
      action: AuditAction.UPDATE,
      user,
      before: { status: request.status, reviewLevel: request.reviewLevel },
      after: { status: next.status, reviewLevel: next.reviewLevel, [`review L${request.reviewLevel}`]: dto.decision },
    });

    const label = requestLabel(request.number);
    if (next.status === RequestStatus.SUBMITTED) {
      await this.mail.send(await this.reviewerEmails(2), `[ESG] ${label} waiting for second review`, `${label} passed the first review and needs a second reviewer.`);
    } else {
      const outcome = next.status === RequestStatus.APPROVED ? 'approved' : 'sent back for revision';
      await this.mail.send(
        await this.recipients(request.companyId),
        `[ESG] ${label} ${outcome}`,
        `Data request ${label} for ${request.company.name} was ${outcome}.\n\nRemarks: ${dto.remarks.trim()}`,
      );
    }
    return this.get(id, user);
  }

  /** Emails the company about requests whose due date is near or past; used by the daily job. */
  async remind(request: { id: string; number: number; companyId: string; dueDate: Date }, now: Date) {
    await this.mail.send(
      await this.recipients(request.companyId),
      `[ESG] Reminder: data request ${requestLabel(request.number)} is due ${request.dueDate.toISOString().slice(0, 10)}`,
      `Data request ${requestLabel(request.number)} has not been submitted yet. Please complete it by ${request.dueDate.toISOString().slice(0, 10)}.`,
    );
    await this.prisma.dataRequest.update({ where: { id: request.id }, data: { lastReminderAt: now } });
  }
}
