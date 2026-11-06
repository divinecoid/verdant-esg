import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EsgGroup, RequestStatus } from '@prisma/client';
import { requestLabel } from '../data-request/data-request.service';
import { PrismaService } from '../prisma/prisma.service';
import { summariseEmissions } from './emission-summary';

const num = (d: { toString(): string } | null | undefined) => (d === null || d === undefined ? null : Number(d.toString()));

type Line = {
  metricName: string;
  themeName: string;
  esgGroup: EsgGroup;
  scope: string | null;
  unit: string | null;
  inputValue: string | null;
  emissionFactor: unknown;
  result: unknown;
  error: string | null;
};

const asResultLine = (l: Line, company?: string) => ({
  metricName: l.metricName,
  scope: l.scope,
  unit: l.unit,
  result: num(l.result as { toString(): string } | null),
  company,
});

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /** The report for one approved request, built from its most recent calculation run. */
  async forRequest(requestId: string) {
    const request = await this.prisma.dataRequest.findUnique({
      where: { id: requestId },
      include: {
        company: { include: { contacts: true, children: { select: { id: true, code: true, name: true } } } },
        attachments: { select: { id: true, fileName: true, size: true } },
        approvals: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!request) throw new NotFoundException('Data request not found');
    if (request.status !== RequestStatus.APPROVED) throw new BadRequestException('Reports are only available for approved data requests');

    const run = await this.prisma.calculationRun.findFirst({
      where: { requestId },
      orderBy: { runAt: 'desc' },
      include: { lines: { orderBy: [{ themeName: 'asc' }, { metricName: 'asc' }] } },
    });
    if (!run) throw new NotFoundException('This request has not been calculated yet. Run the calculation first.');

    const inGroup = (g: EsgGroup) => run.lines.filter((l) => l.esgGroup === g);
    const plain = (g: EsgGroup) =>
      inGroup(g).map((l) => ({
        theme: l.themeName,
        metric: l.metricName,
        unit: l.unit,
        value: l.inputValue,
        result: num(l.result),
        error: l.error,
      }));

    return {
      request: {
        id: request.id,
        label: requestLabel(request.number),
        type: request.type,
        frequency: request.frequency,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
      },
      company: {
        id: request.company.id,
        code: request.company.code,
        name: request.company.name,
        sector: request.company.sector,
        contacts: request.company.contacts.map((c) => ({ name: c.name, phone: c.phone, email: c.email })),
        relatedPortfolio: request.company.children,
      },
      calculation: { id: run.id, number: run.number, runAt: run.runAt, runByName: run.runByName, errorCount: run.errorCount },
      environmental: {
        ...summariseEmissions(inGroup(EsgGroup.ENVIRONMENTAL).map((l) => asResultLine(l))),
        errors: inGroup(EsgGroup.ENVIRONMENTAL).filter((l) => l.error).map((l) => ({ metric: l.metricName, error: l.error })),
      },
      social: plain(EsgGroup.SOCIAL),
      governance: plain(EsgGroup.GOVERNANCE),
      approvals: request.approvals.map((a) => ({ level: a.level, decision: a.decision, reviewerName: a.reviewerName, remarks: a.remarks, createdAt: a.createdAt })),
      attachments: request.attachments,
    };
  }

  /**
   * A group view: the company plus its direct subsidiaries, every approved request whose period ends in `year`,
   * each counted once through its latest calculation. Figures are plain sums (no ownership weighting).
   */
  async consolidated(companyId: string, year: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { children: { select: { id: true, name: true } } },
    });
    if (!company) throw new NotFoundException('Company not found');

    const members = [{ id: company.id, name: company.name }, ...company.children];
    const requests = await this.prisma.dataRequest.findMany({
      where: {
        companyId: { in: members.map((m) => m.id) },
        status: RequestStatus.APPROVED,
        periodEnd: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) },
      },
      select: { id: true, number: true, companyId: true },
    });

    const nameOf = new Map(members.map((m) => [m.id, m.name]));
    const lines: ReturnType<typeof asResultLine>[] = [];
    const notCalculated: string[] = [];
    for (const r of requests) {
      const run = await this.prisma.calculationRun.findFirst({
        where: { requestId: r.id },
        orderBy: { runAt: 'desc' },
        include: { lines: { where: { esgGroup: EsgGroup.ENVIRONMENTAL } } },
      });
      if (!run) {
        notCalculated.push(requestLabel(r.number));
        continue;
      }
      lines.push(...run.lines.map((l) => asResultLine(l, nameOf.get(r.companyId))));
    }

    const summary = summariseEmissions(lines);
    const perCompany = members.map((m) => ({
      company: m.name,
      total: Math.round(summariseEmissions(lines.filter((l) => l.company === m.name)).total * 1e6) / 1e6,
    }));
    return {
      company: { id: company.id, name: company.name },
      year,
      requestsIncluded: requests.length - notCalculated.length,
      requestsSkippedNotCalculated: notCalculated,
      summary,
      perCompany,
      note: 'Plain sum of all approved periods ending in the year, across the company and its direct subsidiaries.',
    };
  }
}
