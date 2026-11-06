import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from './current-user.decorator';
import { CrudService } from './crud.service';
import { Roles } from './roles.decorator';

interface Options {
  path: string;
  service: Type<CrudService>;
  createDto: Type<unknown>;
  updateDto: Type<unknown>;
}

const pipe = (expectedType: Type<unknown>) =>
  new ValidationPipe({ whitelist: true, transform: true, expectedType });

const clamp = (raw: string | undefined, fallback: number, max: number) =>
  Math.min(Math.max(parseInt(raw ?? '', 10) || fallback, 1), max);

/** Builds a REST controller: ESG_TEAM (and ADMIN) may write, ESG_TEAM/VIEWER may read. */
export function createCrudController({ path, service, createDto, updateDto }: Options) {
  @Controller(path)
  @Roles(Role.ESG_TEAM)
  class GeneratedCrudController {
    constructor(@Inject(service) private readonly svc: CrudService) {}

    @Get()
    @Roles(Role.ESG_TEAM, Role.VIEWER)
    list(@Query() query: Record<string, string>) {
      const { page, pageSize, q, ...filters } = query;
      return this.svc.list({ page: clamp(page, 1, 1_000_000), pageSize: clamp(pageSize, 10, 500), q, filters });
    }

    @Get(':id')
    @Roles(Role.ESG_TEAM, Role.VIEWER)
    get(@Param('id') id: string) {
      return this.svc.get(id);
    }

    @Post()
    create(@Body(pipe(createDto)) dto: unknown, @CurrentUser() user: AuthUser) {
      return this.svc.create(dto, user);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body(pipe(updateDto)) dto: unknown, @CurrentUser() user: AuthUser) {
      return this.svc.update(id, dto, user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
      return this.svc.remove(id, user);
    }
  }
  return GeneratedCrudController;
}
