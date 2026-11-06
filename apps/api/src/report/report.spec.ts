import { renderReportPdf, type PdfReport } from './report-pdf';

const report: PdfReport = {
  request: { label: 'DR-000001', type: 'PERIODIC', frequency: 'MONTHLY', periodStart: '2024-01-01', periodEnd: '2024-01-31' },
  company: { name: 'PT Holding', sector: 'Infrastructure' },
  calculation: { runAt: '2024-02-10T00:00:00Z', runByName: 'Tester' },
  environmental: {
    unit: 'tCO2-e',
    total: 21.16,
    byScope: [
      { scope: 'Scope 1', value: 1.16, percentage: 5.48 },
      { scope: 'Scope 2', value: 15, percentage: 70.89 },
      { scope: 'Scope 3', value: 5, percentage: 23.63 },
      { scope: 'Total', value: 21.16, percentage: 100 },
    ],
    bySource: [{ source: 'Purchased electricity', scope: 'Scope 2', value: 15, percentage: 70.89 }],
  },
  social: [{ theme: 'Employee Training', metric: 'Total training hours', unit: 'hours', value: '120' }],
  governance: [],
};

describe('renderReportPdf', () => {
  it('produces a real PDF document', async () => {
    const pdf = await renderReportPdf(report);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('copes with an empty report and many rows (page breaks)', async () => {
    const many = { ...report, environmental: { ...report.environmental, bySource: Array.from({ length: 120 }, (_, i) => ({ source: `Source ${i}`, scope: 'Scope 1', value: i, percentage: 1 })) } };
    expect((await renderReportPdf(many)).subarray(0, 5).toString()).toBe('%PDF-');
    const empty = { ...report, environmental: { unit: 'tCO2-e', total: 0, byScope: [], bySource: [] }, social: [], governance: [] };
    expect((await renderReportPdf(empty)).subarray(0, 5).toString()).toBe('%PDF-');
  });
});
