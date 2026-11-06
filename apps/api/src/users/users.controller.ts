import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { CreateUserDto, UpdateUserDto, UsersService } from './users.service';

const clamp = (raw: string | undefined, fallback: number, max: number) =>
  Math.min(Math.max(parseInt(raw ?? '', 10) || fallback, 1), max);

/** User administration is ADMIN-only (RolesGuard lets ADMIN through; no other role is listed). */
@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('q') q?: string) {
    return this.users.list(clamp(page, 1, 1_000_000), clamp(pageSize, 10, 100), q);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.update(id, dto, actor);
  }
}
