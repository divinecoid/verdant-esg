import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/current-user.decorator';
import { CrudService } from '../common/crud.service';
import { PrismaService } from '../prisma/prisma.service';
import { Ast, evaluateFormula, FormulaError, parseFormula, variablesOf } from './formula-engine';

export type VariableSource = 'input' | 'emission-factor' | 'base-year' | 'unknown';

export interface ResolvedVariable {
  name: string;
  source: VariableSource;
  /** Present for emission factors and base years; inputs get their value from the caller. */
  value: number | null;
}

@Injectable()
export class FormulaService extends CrudService {
  constructor(prisma: PrismaService, audit: AuditService) {
    super(prisma, audit, {
      model: 'formula',
      object: 'ESG Configuration - Formula',
      orderBy: { code: 'asc' },
      search: ['code', 'name', 'expression'],
      filters: ['metricId', 'active'],
      include: { metric: { select: { id: true, code: true, name: true } } },
    });
  }

  /** Works out where each variable comes from: data-input attribute, emission factor or base-year GHG. */
  async resolve(names: string[], year?: number): Promise<ResolvedVariable[]> {
    if (!names.length) return [];
    const [attributes, factors, baseYears] = await Promise.all([
      this.prisma.dataInputAttribute.findMany({ where: { code: { in: names } }, select: { code: true } }),
      this.prisma.emissionFactor.findMany({ where: { code: { in: names } }, include: { values: true } }),
      this.prisma.baseYearGhg.findMany({ where: { code: { in: names } } }),
    ]);
    const attributeCodes = new Set(attributes.map((a) => a.code));
    const factorByCode = new Map(factors.map((f) => [f.code, f]));
    const baseYearByCode = new Map(baseYears.map((b) => [b.code, b]));

    return names.map((name): ResolvedVariable => {
      const factor = factorByCode.get(name);
      if (factor) {
        const values = [...factor.values].sort((a, b) => b.year - a.year);
        const pick = year === undefined ? values[0] : values.find((v) => v.year <= year);
        return { name, source: 'emission-factor', value: pick ? Number(pick.value) : null };
      }
      const baseYear = baseYearByCode.get(name);
      if (baseYear) return { name, source: 'base-year', value: Number(baseYear.value) };
      if (attributeCodes.has(name)) return { name, source: 'input', value: null };
      return { name, source: 'unknown', value: null };
    });
  }

  private parse(expression: string): Ast {
    try {
      return parseFormula(expression);
    } catch (e) {
      if (e instanceof FormulaError) throw new BadRequestException(`Invalid formula: ${e.message}`);
      throw e;
    }
  }

  /** Syntax must parse and every variable must be a known attribute, emission factor or base-year code. */
  private async assertValid(expression: string) {
    const names = variablesOf(this.parse(expression));
    const unknown = (await this.resolve(names)).filter((v) => v.source === 'unknown').map((v) => v.name);
    if (unknown.length) throw new BadRequestException(`Unknown variable(s): ${unknown.join(', ')}`);
  }

  async create(dto: any, user: AuthUser) {
    await this.assertValid(dto.expression);
    return super.create(dto, user);
  }

  async update(id: string, dto: any, user: AuthUser) {
    if (dto.expression !== undefined) await this.assertValid(dto.expression);
    return super.update(id, dto, user);
  }

  async simulate(expression: string, inputs: Record<string, number> = {}, year?: number) {
    let ast: Ast;
    try {
      ast = parseFormula(expression);
    } catch (e) {
      if (e instanceof FormulaError) return { variables: [], missing: [], result: null, error: e.message };
      throw e;
    }

    const variables = await this.resolve(variablesOf(ast), year);
    const values: Record<string, number> = Object.create(null);
    for (const v of variables) {
      const provided = v.source === 'input' ? inputs[v.name] : v.value;
      if (typeof provided === 'number' && Number.isFinite(provided)) {
        values[v.name] = provided;
        if (v.source === 'input') v.value = provided;
      }
    }

    const unknown = variables.filter((v) => v.source === 'unknown').map((v) => v.name);
    if (unknown.length) return { variables, missing: [], result: null, error: `Unknown variable(s): ${unknown.join(', ')}` };

    const missing = variables.filter((v) => !(v.name in values)).map((v) => v.name);
    if (missing.length) return { variables, missing, result: null, error: null };

    try {
      return { variables, missing: [], result: evaluateFormula(ast, values), error: null };
    } catch (e) {
      if (e instanceof FormulaError) return { variables, missing: [], result: null, error: e.message };
      throw e;
    }
  }
}
