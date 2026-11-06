import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Frequency, RequestStatus, RequestType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DataRequestService } from './data-request.service';
import { addDays, lastCompletedPeriod, reminderDue } from './periods';

const OPEN: RequestStatus[] = [RequestStatus.NOT_STARTED, RequestStatus.ON_GOING, RequestStatus.NEED_REVISION];

const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

@Injectable()
export class RequestScheduler {
  private readonly log = new Logger(RequestScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: DataRequestService,
  ) {}

  @Cron('0 6 * * *')
  async scheduled() {
    try {
      const result = await this.runDaily();
      this.log.log(`Daily job: ${JSON.stringify(result)}`);
    } catch (e) {
      this.log.error(`Daily job failed: ${(e as Error).message}`);
    }
  }

  async runDaily(now = new Date()) {
    const generated = await this.generatePeriodic(now);
    const reminded = await this.sendReminders(now);
    return { ...generated, reminded };
  }

  /** Creates the request for the last completed period of each active schedule, once per company/frequency/period. */
  async generatePeriodic(now: Date) {
    const today = startOfUtcDay(now);
    const schedules = await this.prisma.captureSchedule.findMany({
      where: { active: true, company: { active: true } },
    });
    let created = 0;
    let skipped = 0;
    const failed: { companyId: string; frequency: Frequency; reason: string }[] = [];

    for (const s of schedules) {
      const period = lastCompletedPeriod(s.frequency, today);
      const exists = await this.prisma.dataRequest.findFirst({
        where: { companyId: s.companyId, type: RequestType.PERIODIC, frequency: s.frequency, periodStart: period.start },
        select: { id: true },
      });
      if (exists) {
        skipped++;
        continue;
      }
      try {
        await this.requests.createRequest(
          {
            companyId: s.companyId,
            type: RequestType.PERIODIC,
            frequency: s.frequency,
            periodStart: period.start,
            periodEnd: period.end,
            dueDate: addDays(period.end, s.dueDays),
          },
          { name: 'System' },
        );
        created++;
      } catch (e) {
        // e.g. the company has no active metric selection yet; keep going with the others.
        failed.push({ companyId: s.companyId, frequency: s.frequency, reason: (e as Error).message });
      }
    }
    return { created, skipped, failed };
  }

  async sendReminders(now: Date) {
    const candidates = await this.prisma.dataRequest.findMany({
      where: { status: { in: OPEN }, dueDate: { lte: addDays(now, 3) } },
      select: { id: true, number: true, companyId: true, dueDate: true, lastReminderAt: true },
    });
    let sent = 0;
    for (const r of candidates) {
      if (!reminderDue(r.dueDate, now, r.lastReminderAt)) continue;
      await this.requests.remind(r, now);
      sent++;
    }
    return sent;
  }
}
