import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CrudService } from '../common/crud.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CaptureScheduleService extends CrudService {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'captureSchedule',
      object: 'Configuration - Capture Schedule',
      orderBy: { createdAt: 'desc' },
      filters: ['companyId', 'frequency', 'active'],
      include: { company: { select: { id: true, code: true, name: true } } },
    });
  }
}
