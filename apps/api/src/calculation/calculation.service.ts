import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, RequestStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/current-user.decorator';
import { FormulaService } from '../formula/formula.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculateLine } from './line-calculator';

export const calculationLabel = (number: number) => `CALC-${String(number).padStart(6, '0')}`;

const RUN_INCLUDE = {
  request: {
    select: {
      id: true,
      number: true,
      type: true,
      frequency: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      company: { select: { id: true, code: true, name: true, sector: true } },
    },
  },
} satisfies Prisma.CalculationRunInclude;

@Injectable()
export class CalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly formulas: FormulaService,
  ) {}

  /** Calculates every metric of an approved request. Each run is kept, so a re-run never overwrites history. */
  async run(requestId: string, user: AuthUser) {
    const request = await this.prisma.dataRequest.findUnique({
      where: { id: requestId },
      include: {
        values: {
          include: {
            metric: { select: { id: true, name: true, scope: true, unit: true, resultUnit: true, theme: { select: { name: true, group: true } } } },
          },
        },
      },
    });
    if (!request) throw new NotFoundException('Data request not found');
    if (request.status !== RequestStatus.APPROVED) {
      throw new BadRequestException('Only approved data requests can be calculated');
    }

    // Emission factors are looked up for the year the reporting period ends in.
    const year = request.periodEnd.getUTCFullYear();
    const metricIds = request.values.map((v) => v.metricId);
    const formulas = await this.prisma.formula.findMany({ where: { metricId: { in: metricIds }, active: true }, orderBy: { code: 'asc' } });
    const byMetric = new Map<string, { code: string; expression: string }[]>();
    for (const f of formulas) byMetric.set(f.metricId, [...(byMetric.get(f.metricId) ?? []), { code: f.code, expression: f.expression }]);

    const lines: Prisma.CalculationResultLineCreateManyRunInput[] = [];
    for (const v of request.values) {
      const out = await calculateLine({
        value: v.value,
        formulas: byMetric.get(v.metricId) ?? [],
        resolve: (names) => this.formulas.resolve(names, year),
      });
      lines.push({
        metricId: v.metricId,
        metricName: v.metric.name,
        themeName: v.metric.theme.name,
        esgGroup: v.metric.theme.group,
        scope: v.metric.scope,
        // `unit` is the unit of the result (what reports total up); `inputUnit` is what the company typed in.
        unit: v.metric.resultUnit ?? v.metric.unit,
        inputUnit: v.metric.unit,
        inputValue: v.value,
        formulaCode: out.formulaCode,
        formulaExpression: out.formulaExpression,
        emissionFactor: out.emissionFactor,
        result: out.result,
        variables: out.variables as unknown as Prisma.InputJsonValue,
        error: out.error,
      });
    }

    const errorCount = lines.filter((l) => l.error).length;
    const created = await this.prisma.calculationRun.create({
      data: { requestId, runById: user.id, runByName: user.name, errorCount, lines: { createMany: { data: lines } } },
    });
    await this.audit.record({
      object: 'Calculation Result',
      objectId: created.id,
      action: AuditAction.CREATE,
      user,
      after: { calculation: calculationLabel(created.number), request: requestId, year, lines: lines.length, errors: errorCount },
    });
    return this.get(created.id);
  }

  async list(page: number, pageSize: number, companyId?: string) {
    const where: Prisma.CalculationRunWhereInput = companyId ? { request: { companyId } } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.calculationRun.findMany({
        where,
        orderBy: { runAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: RUN_INCLUDE,
      }),
      this.prisma.calculationRun.count({ where }),
    ]);
    // A run is "latest" when no newer run exists for the same request.
    const latest = await this.prisma.calculationRun.groupBy({
      by: ['requestId'],
      where: { requestId: { in: items.map((i) => i.requestId) } },
      _max: { runAt: true },
    });
    const latestAt = new Map(latest.map((l) => [l.requestId, l._max.runAt?.getTime()]));
    return {
      items: items.map((r) => ({ ...r, label: calculationLabel(r.number), latest: latestAt.get(r.requestId) === r.runAt.getTime() })),
      total,
    };
  }

  async get(id: string) {
    const run = await this.prisma.calculationRun.findUnique({
      where: { id },
      include: { ...RUN_INCLUDE, lines: { orderBy: [{ esgGroup: 'asc' }, { themeName: 'asc' }, { metricName: 'asc' }] } },
    });
    if (!run) throw new NotFoundException();
    return { ...run, label: calculationLabel(run.number) };
  }
}
