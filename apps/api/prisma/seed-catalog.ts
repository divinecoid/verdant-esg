import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { attributes, emissionFactors, formulas, metrics, themes } from './catalog';

const prisma = new PrismaClient();

/**
 * Loads the starter catalog. Safe to run repeatedly: rows are matched by code and existing rows are left
 * exactly as they are, so edits made in the app are never overwritten.
 */
async function main() {
  const themeId = new Map<string, string>();
  for (const t of themes) {
    const row = await prisma.esgTheme.upsert({ where: { code: t.code }, update: {}, create: t });
    themeId.set(t.code, row.id);
  }

  const metricId = new Map<string, string>();
  for (const m of metrics) {
    const row = await prisma.esgMetric.upsert({
      where: { code: m.code },
      update: {},
      create: {
        code: m.code,
        name: m.name,
        themeId: themeId.get(m.theme)!,
        unit: m.unit,
        resultUnit: m.resultUnit,
        scope: m.scope,
        aggregation: m.aggregation ?? 'SUM',
        standardRefs: m.refs ?? [],
      },
    });
    metricId.set(m.code, row.id);
  }

  for (const a of attributes) {
    await prisma.dataInputAttribute.upsert({ where: { code: a.code }, update: {}, create: { ...a, dataType: 'decimal' } });
  }

  for (const f of emissionFactors) {
    await prisma.emissionFactor.upsert({
      where: { code: f.code },
      update: {},
      create: { code: f.code, name: f.name, description: f.description, values: { create: [{ year: f.year, value: f.value }] } },
    });
  }

  for (const f of formulas) {
    await prisma.formula.upsert({
      where: { code: f.code },
      update: {},
      create: { code: f.code, name: f.name, expression: f.expression, metricId: metricId.get(f.metric)! },
    });
  }

  console.log(`Catalog ready: ${themes.length} themes, ${metrics.length} metrics, ${attributes.length} input attributes, ${emissionFactors.length} emission factors, ${formulas.length} formulas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
