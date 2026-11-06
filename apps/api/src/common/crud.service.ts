import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from './current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

export interface CrudConfig {
  /** Prisma delegate name, e.g. 'esgTheme'. */
  model: string;
  /** Label written to the audit log, e.g. 'ESG Configuration - Theme'. */
  object: string;
  orderBy: Record<string, 'asc' | 'desc'>;
  /** String columns matched by the `q` query parameter. */
  search?: string[];
  /** Query parameters that filter by exact value. */
  filters?: string[];
  include?: Record<string, unknown>;
}

export interface ListParams {
  page: number;
  pageSize: number;
  q?: string;
  filters: Record<string, string | undefined>;
}

const NOISE = new Set(['createdAt', 'updatedAt']);

function mapPrismaError(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') throw new ConflictException('A record with the same unique value already exists');
    if (e.code === 'P2003') throw new ConflictException('Record is referenced by other data');
    if (e.code === 'P2025') throw new NotFoundException();
  }
  throw e;
}

/** Generic create/read/update/delete with audit logging; subclasses supply config and may override the data hooks. */
export class CrudService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly audit: AuditService,
    protected readonly config: CrudConfig,
  ) {}

  protected get delegate(): any {
    return (this.prisma as any)[this.config.model];
  }

  /** Convert a validated DTO into Prisma create data. */
  protected toCreateData(dto: any): any {
    return dto;
  }

  /** Convert a validated partial DTO into Prisma update data. */
  protected toUpdateData(dto: any): any {
    return dto;
  }

  private snapshot(record: Record<string, unknown> | null) {
    if (!record) return null;
    return Object.fromEntries(Object.entries(record).filter(([k]) => !NOISE.has(k)));
  }

  async list({ page, pageSize, q, filters }: ListParams) {
    const { search = [], filters: allowed = [], include, orderBy } = this.config;
    const where: Record<string, unknown> = {};
    for (const key of allowed) {
      const v = filters[key];
      if (v === undefined || v === '') continue;
      where[key] = v === 'true' ? true : v === 'false' ? false : v;
    }
    if (q && search.length) {
      where.OR = search.map((field) => ({ [field]: { contains: q, mode: 'insensitive' } }));
    }
    const [items, total] = await this.prisma.$transaction([
      this.delegate.findMany({ where, orderBy, include, skip: (page - 1) * pageSize, take: pageSize }),
      this.delegate.count({ where }),
    ]);
    return { items, total };
  }

  async get(id: string) {
    const record = await this.delegate.findUnique({ where: { id }, include: this.config.include });
    if (!record) throw new NotFoundException();
    return record;
  }

  async create(dto: unknown, user: AuthUser) {
    try {
      const created = await this.delegate.create({
        data: this.toCreateData(dto),
        include: this.config.include,
      });
      await this.audit.record({
        object: this.config.object,
        objectId: created.id,
        action: AuditAction.CREATE,
        user,
        after: this.snapshot(created),
      });
      return created;
    } catch (e) {
      mapPrismaError(e);
    }
  }

  async update(id: string, dto: unknown, user: AuthUser) {
    const before = await this.get(id);
    try {
      const updated = await this.delegate.update({
        where: { id },
        data: this.toUpdateData(dto),
        include: this.config.include,
      });
      await this.audit.record({
        object: this.config.object,
        objectId: id,
        action: AuditAction.UPDATE,
        user,
        before: this.snapshot(before),
        after: this.snapshot(updated),
      });
      return updated;
    } catch (e) {
      mapPrismaError(e);
    }
  }

  async remove(id: string, user: AuthUser) {
    const before = await this.get(id);
    try {
      await this.delegate.delete({ where: { id } });
    } catch (e) {
      mapPrismaError(e);
    }
    await this.audit.record({
      object: this.config.object,
      objectId: id,
      action: AuditAction.DELETE,
      user,
      before: this.snapshot(before),
    });
    return { id };
  }
}
