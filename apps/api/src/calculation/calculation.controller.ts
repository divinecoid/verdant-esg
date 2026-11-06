import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { CalculationService } from './calculation.service';

class RunCalculationDto {
  @IsString() @IsNotEmpty() requestId: string;
}

const clamp = (raw: string | undefined, fallback: number, max: number) =>
  Math.min(Math.max(parseInt(raw ?? '', 10) || fallback, 1), max);

@Controller('calculations')
export class CalculationController {
  constructor(private readonly calculations: CalculationService) {}

  @Get()
  @Roles(Role.ESG_TEAM, Role.VIEWER)
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('companyId') companyId?: string) {
    return this.calculations.list(clamp(page, 1, 1_000_000), clamp(pageSize, 10, 100), companyId || undefined);
  }

  @Post()
  @Roles(Role.ESG_TEAM)
  run(@Body() dto: RunCalculationDto, @CurrentUser() user: AuthUser) {
    return this.calculations.run(dto.requestId, user);
  }

  @Get(':id')
  @Roles(Role.ESG_TEAM, Role.VIEWER)
  get(@Param('id') id: string) {
    return this.calculations.get(id);
  }
}
