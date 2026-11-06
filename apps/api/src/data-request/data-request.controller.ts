import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { MAX_UPLOAD_BYTES } from '../common/storage';
import { AttachmentService } from './attachment.service';
import { DataRequestService } from './data-request.service';
import { CreateDataRequestDto, ReviewDto, SaveValuesDto } from './dto';
import { RequestScheduler } from './request.scheduler';

const clamp = (raw: string | undefined, fallback: number, max: number) =>
  Math.min(Math.max(parseInt(raw ?? '', 10) || fallback, 1), max);

const READ = [Role.ESG_TEAM, Role.VIEWER, Role.INVESTEE];
const FILL = [Role.ESG_TEAM, Role.INVESTEE];

@Controller('data-requests')
export class DataRequestController {
  constructor(
    private readonly requests: DataRequestService,
    private readonly attachments: AttachmentService,
    private readonly scheduler: RequestScheduler,
  ) {}

  @Get()
  @Roles(...READ)
  list(
    @CurrentUser() user: AuthUser,
    @Query()
    q: { page?: string; pageSize?: string; type?: string; companyId?: string; status?: string; reviewLevel?: string; search?: string },
  ) {
    return this.requests.list(user, { ...q, page: clamp(q.page, 1, 1_000_000), pageSize: clamp(q.pageSize, 10, 100) });
  }

  @Post()
  @Roles(Role.ESG_TEAM)
  create(@Body() dto: CreateDataRequestDto, @CurrentUser() user: AuthUser) {
    return this.requests.create(dto, user);
  }

  /** Runs the daily job on demand: generate due periodic requests, then send reminders. */
  @Post('jobs/run')
  @Roles(Role.ESG_TEAM)
  runJobs() {
    return this.scheduler.runDaily();
  }

  @Get(':id')
  @Roles(...READ)
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.requests.get(id, user);
  }

  @Put(':id/values')
  @Roles(...FILL)
  save(@Param('id') id: string, @Body() dto: SaveValuesDto, @CurrentUser() user: AuthUser) {
    return this.requests.saveValues(id, dto, user);
  }

  @Post(':id/submit')
  @Roles(...FILL)
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.requests.submit(id, user);
  }

  @Post(':id/review')
  @Roles(Role.ESG_TEAM)
  review(@Param('id') id: string, @Body() dto: ReviewDto, @CurrentUser() user: AuthUser) {
    return this.requests.review(id, dto, user);
  }

  @Post(':id/attachments')
  @Roles(...FILL)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthUser) {
    return this.attachments.add(id, file, user);
  }

  @Get(':id/attachments/:attachmentId')
  @Roles(...READ)
  async download(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const file = await this.attachments.locate(id, attachmentId, user);
    // Always a download, never rendered in the browser, whatever the uploader claimed the type was.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(file.path, file.fileName);
  }

  @Delete(':id/attachments/:attachmentId')
  @Roles(...FILL)
  removeAttachment(@Param('id') id: string, @Param('attachmentId') attachmentId: string, @CurrentUser() user: AuthUser) {
    return this.attachments.remove(id, attachmentId, user);
  }
}
