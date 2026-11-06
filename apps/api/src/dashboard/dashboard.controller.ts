import { BadRequestException, Controller, Get, Module, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { buildDashboard } from './dashboard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /** Request/review counts. Investees only ever see their own company's numbers. */
  @Get()
  @Roles(Role.ESG_TEAM, Role.VIEWER, Role.INVESTEE)
  async get(@CurrentUser() user: AuthUser, @Query('year') yearParam?: string) {
    const year = yearParam === undefined ? new Date().getUTCFullYear() : Number(yearParam);
    if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new BadRequestException('year must be a valid year');

    const rows = await this.prisma.dataRequest.findMany({
      where: user.role === Role.INVESTEE ? { companyId: user.companyId ?? '__none__' } : {},
      select: { status: true, reviewLevel: true, periodEnd: true },
    });
    return buildDashboard(rows, year);
  }
}

@Module({ controllers: [DashboardController] })
export class DashboardModule {}
