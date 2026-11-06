import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../common/roles.decorator';
import { renderReportPdf } from './report-pdf';
import { ReportService } from './report.service';

@Controller('reports')
@Roles(Role.ESG_TEAM, Role.VIEWER)
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  @Get('consolidated')
  consolidated(@Query('companyId') companyId?: string, @Query('year') year?: string) {
    const y = Number(year);
    if (!companyId || !Number.isInteger(y) || y < 1900 || y > 2200) {
      throw new BadRequestException('companyId and a valid year are required');
    }
    return this.reports.consolidated(companyId, y);
  }

  @Get('request/:id')
  forRequest(@Param('id') id: string) {
    return this.reports.forRequest(id);
  }

  @Get('request/:id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const report = await this.reports.forRequest(id);
    const pdf = await renderReportPdf(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="esg-report-${report.request.label}.pdf"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(pdf);
  }
}
