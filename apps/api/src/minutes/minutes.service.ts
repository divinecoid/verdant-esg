import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { AuditAction, Prisma } from '@prisma/client';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/current-user.decorator';
import { deleteUpload, saveUpload, uploadPath } from '../common/storage';
import { PrismaService } from '../prisma/prisma.service';

export class CreateMinutesDto {
  @IsString() @IsNotEmpty() companyId: string;
  @IsDateString() eventDate: string;
  @IsString() @IsNotEmpty() @MaxLength(5000) notes: string;
}
export class UpdateMinutesDto extends PartialType(CreateMinutesDto) {}

const OBJECT = 'Minutes of Meeting';
const COMPANY = { select: { id: true, code: true, name: true } };
const parseDate = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);

/** Strip storage internals before returning a row to a client. */
const present = <T extends { attachmentKey: string | null }>({ attachmentKey, ...rest }: T) => ({ ...rest, hasAttachment: !!attachmentKey });

@Injectable()
export class MinutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(page: number, pageSize: number, companyId?: string, year?: number) {
    const where: Prisma.MinutesOfMeetingWhereInput = {};
    if (companyId) where.companyId = companyId;
    if (year) where.eventDate = { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.minutesOfMeeting.findMany({ where, orderBy: { eventDate: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { company: COMPANY } }),
      this.prisma.minutesOfMeeting.count({ where }),
    ]);
    return { items: items.map(present), total };
  }

  private async find(id: string) {
    const row = await this.prisma.minutesOfMeeting.findUnique({ where: { id }, include: { company: COMPANY } });
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(dto: CreateMinutesDto, user: AuthUser) {
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId }, select: { id: true } });
    if (!company) throw new BadRequestException('Company does not exist');
    const created = await this.prisma.minutesOfMeeting.create({
      data: { companyId: dto.companyId, eventDate: parseDate(dto.eventDate), notes: dto.notes.trim(), createdById: user.id, createdByName: user.name },
      include: { company: COMPANY },
    });
    await this.audit.record({
      object: OBJECT,
      objectId: created.id,
      action: AuditAction.CREATE,
      user,
      after: { company: created.company.name, eventDate: dto.eventDate.slice(0, 10), notes: created.notes },
    });
    return present(created);
  }

  async update(id: string, dto: UpdateMinutesDto, user: AuthUser) {
    const before = await this.find(id);
    if (dto.companyId && dto.companyId !== before.companyId) throw new BadRequestException('A meeting cannot be moved to another company');
    const updated = await this.prisma.minutesOfMeeting.update({
      where: { id },
      data: { ...(dto.eventDate && { eventDate: parseDate(dto.eventDate) }), ...(dto.notes && { notes: dto.notes.trim() }) },
      include: { company: COMPANY },
    });
    await this.audit.record({
      object: OBJECT,
      objectId: id,
      action: AuditAction.UPDATE,
      user,
      before: { eventDate: before.eventDate.toISOString().slice(0, 10), notes: before.notes },
      after: { eventDate: updated.eventDate.toISOString().slice(0, 10), notes: updated.notes },
    });
    return present(updated);
  }

  async remove(id: string, user: AuthUser) {
    const before = await this.find(id);
    await this.prisma.minutesOfMeeting.delete({ where: { id } });
    if (before.attachmentKey) await deleteUpload(before.attachmentKey);
    await this.audit.record({
      object: OBJECT,
      objectId: id,
      action: AuditAction.DELETE,
      user,
      before: { company: before.company.name, eventDate: before.eventDate.toISOString().slice(0, 10), notes: before.notes },
    });
    return { id };
  }

  /** Attaching a file replaces the previous one. */
  async attach(id: string, file: Express.Multer.File | undefined, user: AuthUser) {
    const before = await this.find(id);
    const stored = await saveUpload(file);
    const updated = await this.prisma.minutesOfMeeting.update({
      where: { id },
      data: { attachmentName: stored.fileName, attachmentKey: stored.storageKey, attachmentMime: stored.mimeType, attachmentSize: stored.size },
      include: { company: COMPANY },
    });
    if (before.attachmentKey) await deleteUpload(before.attachmentKey);
    await this.audit.record({
      object: OBJECT,
      objectId: id,
      action: AuditAction.UPDATE,
      user,
      before: { attachment: before.attachmentName },
      after: { attachment: stored.fileName },
    });
    return present(updated);
  }

  async locate(id: string) {
    const row = await this.find(id);
    if (!row.attachmentKey || !row.attachmentName) throw new NotFoundException('This meeting has no attachment');
    return { path: uploadPath(row.attachmentKey), fileName: row.attachmentName };
  }
}
