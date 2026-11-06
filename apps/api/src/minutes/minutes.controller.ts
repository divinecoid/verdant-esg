import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
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
import { CreateMinutesDto, MinutesService, UpdateMinutesDto } from './minutes.service';

const clamp = (raw: string | undefined, fallback: number, max: number) =>
  Math.min(Math.max(parseInt(raw ?? '', 10) || fallback, 1), max);

@Controller('minutes')
@Roles(Role.ESG_TEAM)
export class MinutesController {
  constructor(private readonly minutes: MinutesService) {}

  @Get()
  @Roles(Role.ESG_TEAM, Role.VIEWER)
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('companyId') companyId?: string, @Query('year') year?: string) {
    const y = Number(year);
    return this.minutes.list(clamp(page, 1, 1_000_000), clamp(pageSize, 10, 100), companyId || undefined, Number.isInteger(y) && y > 1900 ? y : undefined);
  }

  @Post()
  create(@Body() dto: CreateMinutesDto, @CurrentUser() user: AuthUser) {
    return this.minutes.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMinutesDto, @CurrentUser() user: AuthUser) {
    return this.minutes.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.minutes.remove(id, user);
  }

  @Post(':id/attachment')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  attach(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthUser) {
    return this.minutes.attach(id, file, user);
  }

  @Get(':id/attachment')
  @Roles(Role.ESG_TEAM, Role.VIEWER)
  async download(@Param('id') id: string, @Res() res: Response) {
    const file = await this.minutes.locate(id);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(file.path, file.fileName);
  }
}

@Module({ controllers: [MinutesController], providers: [MinutesService] })
export class MinutesModule {}
