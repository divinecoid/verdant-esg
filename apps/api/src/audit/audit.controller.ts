import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { Roles } from '../common/roles.decorator';
import { AuditService } from './audit.service';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** The export is meant for review, not bulk extraction; ask for a narrower range beyond this. */
const EXPORT_LIMIT = 20_000;

const day = (raw: string | undefined, name: string) => {
  if (raw === undefined || raw === '') return undefined;
  if (!DAY.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) throw new BadRequestException(`${name} must be a date like 2024-01-31`);
  return raw;
};

@Controller('audit-logs')
@Roles(Role.ESG_TEAM, Role.VIEWER)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(
    @Query('object') object?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ) {
    const take = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
    const [items, total] = await this.audit.list({ object, from: day(from, 'from'), to: day(to, 'to'), skip, take });
    return { items, total };
  }

  /** One spreadsheet row per changed member, with who/when repeated so it filters and pivots cleanly. */
  @Get('export')
  async export(@Res() res: Response, @Query('object') object?: string, @Query('from') from?: string, @Query('to') to?: string) {
    const logs = await this.audit.exportRows({ object, from: day(from, 'from'), to: day(to, 'to') }, EXPORT_LIMIT + 1);
    if (logs.length > EXPORT_LIMIT) throw new BadRequestException(`More than ${EXPORT_LIMIT} changes match; narrow the date range`);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Audit Trail');
    ws.columns = [
      { header: 'Object', key: 'object', width: 36 },
      { header: 'Type', key: 'action', width: 10 },
      { header: 'Changed Date (UTC)', key: 'date', width: 18 },
      { header: 'Changed Time (UTC)', key: 'time', width: 18 },
      { header: 'Changed By', key: 'by', width: 24 },
      { header: 'Member', key: 'member', width: 26 },
      { header: 'Old Value', key: 'old', width: 40 },
      { header: 'New Value', key: 'new', width: 40 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    for (const log of logs) {
      const iso = log.changedAt.toISOString();
      const base = { object: log.object, action: log.action, date: iso.slice(0, 10), time: iso.slice(11, 19), by: log.userName ?? '' };
      const lines = log.lines.length ? log.lines : [{ member: '', oldValue: null, newValue: null }];
      for (const l of lines) ws.addRow({ ...base, member: l.member, old: l.oldValue ?? '', new: l.newValue ?? '' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-trail.xlsx"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(await wb.xlsx.writeBuffer()));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const log = await this.audit.get(id);
    if (!log) throw new NotFoundException();
    return log;
  }
}
