import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/current-user.decorator';
import { deleteUpload, saveUpload, uploadPath } from '../common/storage';
import { PrismaService } from '../prisma/prisma.service';
import { DataRequestService } from './data-request.service';
import { canEdit } from './workflow';

@Injectable()
export class AttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly requests: DataRequestService,
  ) {}

  async add(requestId: string, file: Express.Multer.File | undefined, user: AuthUser) {
    const request = await this.requests.get(requestId, user); // also enforces company access
    if (!canEdit(request.status)) throw new BadRequestException('Attachments can no longer be changed on this request');

    const stored = await saveUpload(file);
    const created = await this.prisma.dataRequestAttachment.create({
      data: { requestId, ...stored, uploadedById: user.id },
    });
    await this.audit.record({
      object: 'ESG Data Request',
      objectId: requestId,
      action: AuditAction.UPDATE,
      user,
      after: { attachmentAdded: created.fileName },
    });
    return created;
  }

  private async find(requestId: string, attachmentId: string, user: AuthUser) {
    await this.requests.get(requestId, user);
    const attachment = await this.prisma.dataRequestAttachment.findFirst({ where: { id: attachmentId, requestId } });
    if (!attachment) throw new NotFoundException();
    return attachment;
  }

  async locate(requestId: string, attachmentId: string, user: AuthUser) {
    const a = await this.find(requestId, attachmentId, user);
    return { path: uploadPath(a.storageKey), fileName: a.fileName, mimeType: a.mimeType };
  }

  async remove(requestId: string, attachmentId: string, user: AuthUser) {
    const a = await this.find(requestId, attachmentId, user);
    const request = await this.requests.get(requestId, user);
    if (!canEdit(request.status)) throw new BadRequestException('Attachments can no longer be changed on this request');
    await this.prisma.dataRequestAttachment.delete({ where: { id: a.id } });
    await deleteUpload(a.storageKey);
    await this.audit.record({
      object: 'ESG Data Request',
      objectId: requestId,
      action: AuditAction.UPDATE,
      user,
      before: { attachment: a.fileName },
      after: { attachment: null },
    });
    return { id: a.id };
  }
}
