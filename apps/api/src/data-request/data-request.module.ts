import { Module } from '@nestjs/common';
import { createCrudController } from '../common/crud.controller';
import { AttachmentService } from './attachment.service';
import { CaptureScheduleService } from './capture-schedule.service';
import { DataRequestController } from './data-request.controller';
import { DataRequestService } from './data-request.service';
import { CreateCaptureScheduleDto, UpdateCaptureScheduleDto } from './dto';
import { RequestScheduler } from './request.scheduler';

const CaptureScheduleController = createCrudController({
  path: 'capture-schedules',
  service: CaptureScheduleService,
  createDto: CreateCaptureScheduleDto,
  updateDto: UpdateCaptureScheduleDto,
});

@Module({
  controllers: [DataRequestController, CaptureScheduleController],
  providers: [DataRequestService, AttachmentService, RequestScheduler, CaptureScheduleService],
  exports: [DataRequestService],
})
export class DataRequestModule {}
