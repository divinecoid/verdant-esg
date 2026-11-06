import { BadRequestException, Controller, Get, Injectable, Module, NotFoundException, Query } from '@nestjs/common';
import { FindingStatus, IncidentStatus, RequestStatus, RiskStatus, Role, Severity } from '@prisma/client';
import { parseNumber } from '../common/number';
import { Roles } from '../common/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPerformance,
  HIGH_RISK_SCORE,
  isOverdue,
  riskMatrix,
  riskScore,
  type Aggregation,
  type Direction,
  type Group,
  type MetricPerformanceInput,
  type Observation,
} from './performance';

const toNumber = parseNumber;

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async forCompany(companyId: string, year: number, now = new Date()) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true, code: true, name: true, sector: true } });
    if (!company) throw new NotFoundException('Company not found');

    const targets = await this.prisma.metricTarget.findMany({
      where: { companyId, year },
      include: { metric: { select: { id: true, code: true, name: true, unit: true, resultUnit: true, aggregation: true, theme: { select: { group: true } } } } },
    });

    // Approved periods ending in the year, each with its latest calculation (if any).
    const requests = await this.prisma.dataRequest.findMany({
      where: {
        companyId,
        status: RequestStatus.APPROVED,
        periodEnd: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) },
      },
      select: { id: true, periodEnd: true, values: { select: { metricId: true, value: true } } },
    });
    const runs = await this.prisma.calculationRun.findMany({
      where: { requestId: { in: requests.map((r) => r.id) } },
      orderBy: { runAt: 'desc' },
      select: { requestId: true, lines: { select: { metricId: true, result: true } } },
    });
    const latestRun = new Map<string, Map<string, number | null>>();
    for (const run of runs) {
      if (latestRun.has(run.requestId)) continue; // runs are newest first
      latestRun.set(run.requestId, new Map(run.lines.map((l) => [l.metricId, l.result === null ? null : Number(l.result)])));
    }

    const inputs: MetricPerformanceInput[] = targets.map((t) => {
      // A calculated metric (it has a result unit) is measured by its result; anything else by what was entered.
      const calculated = t.metric.resultUnit !== null;
      const observations: Observation[] = [];
      for (const r of requests) {
        const raw = r.values.find((v) => v.metricId === t.metricId)?.value;
        const value = calculated ? (latestRun.get(r.id)?.get(t.metricId) ?? null) : toNumber(raw);
        if (value !== null) observations.push({ periodEnd: r.periodEnd, value });
      }
      return {
        metricId: t.metricId,
        code: t.metric.code,
        name: t.metric.name,
        group: t.metric.theme.group as Group,
        unit: t.metric.resultUnit ?? t.metric.unit,
        aggregation: t.metric.aggregation as Aggregation,
        observations,
        target: { value: Number(t.value), direction: t.direction as Direction },
      };
    });

    return { company, year, performance: buildPerformance(inputs), indicators: await this.indicators(companyId, now) };
  }

  /** Operational risk signals from the registers; these are current, not tied to a reporting year. */
  async indicators(companyId: string, now: Date) {
    const [incidents, findings, risks, compliance] = await Promise.all([
      this.prisma.incident.findMany({ where: { companyId, status: { not: IncidentStatus.CLOSED } }, select: { severity: true } }),
      this.prisma.auditFinding.findMany({ where: { companyId, status: { not: FindingStatus.CLOSED } }, select: { severity: true, dueDate: true, status: true } }),
      this.prisma.risk.findMany({ where: { companyId, status: { not: RiskStatus.CLOSED } }, select: { likelihood: true, impact: true } }),
      this.prisma.complianceItem.groupBy({ by: ['status'], where: { companyId }, _count: true }),
    ]);
    const serious = (s: Severity) => s === Severity.HIGH || s === Severity.CRITICAL;
    const complianceCounts = Object.fromEntries(compliance.map((c) => [c.status, c._count]));
    const applicable = compliance.filter((c) => c.status !== 'NOT_APPLICABLE').reduce((n, c) => n + c._count, 0);

    return {
      incidents: { open: incidents.length, serious: incidents.filter((i) => serious(i.severity)).length },
      findings: {
        open: findings.length,
        serious: findings.filter((f) => serious(f.severity)).length,
        overdue: findings.filter((f) => isOverdue(f.dueDate, false, now)).length,
      },
      risks: { open: risks.length, high: risks.filter((r) => riskScore(r) >= HIGH_RISK_SCORE).length, matrix: riskMatrix(risks) },
      compliance: {
        counts: complianceCounts as Record<string, number>,
        // Share of applicable items that are fully compliant; null when nothing has been entered.
        rate: applicable === 0 ? null : Math.round(((complianceCounts.COMPLIANT ?? 0) / applicable) * 1000) / 10,
      },
    };
  }
}

@Controller('dashboard/esg')
export class PerformanceController {
  constructor(private readonly performance: PerformanceService) {}

  @Get()
  @Roles(Role.ESG_TEAM, Role.VIEWER)
  get(@Query('companyId') companyId?: string, @Query('year') yearParam?: string) {
    const year = yearParam === undefined ? new Date().getUTCFullYear() : Number(yearParam);
    if (!companyId) throw new BadRequestException('companyId is required');
    if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new BadRequestException('year must be a valid year');
    return this.performance.forCompany(companyId, year);
  }
}

@Module({ controllers: [PerformanceController], providers: [PerformanceService] })
export class PerformanceModule {}
