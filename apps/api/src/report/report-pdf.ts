import PDFDocument from 'pdfkit';

/** The subset of the request report the PDF needs; kept structural so the renderer is easy to test. */
export interface PdfReport {
  request: { label: string; type: string; frequency: string | null; periodStart: Date | string; periodEnd: Date | string };
  company: { name: string; sector: string | null };
  calculation: { runAt: Date | string; runByName: string };
  environmental: {
    unit: string;
    total: number;
    byScope: { scope: string; value: number; percentage: number }[];
    bySource: { source: string; scope: string; value: number; percentage: number }[];
  };
  social: { theme: string; metric: string; unit: string | null; value: string | null }[];
  governance: { theme: string; metric: string; unit: string | null; value: string | null }[];
}

const GREEN = '#5a9112';
const GREY = '#555555';
const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });

/** Renders the report as a PDF buffer: summary tables, a scope bar chart, and the social/governance answers. */
export function renderReportPdf(report: PdfReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `ESG Report ${report.request.label}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;

    const heading = (text: string) => {
      ensureSpace(40);
      doc.moveDown(0.8).fillColor(GREEN).font('Helvetica-Bold').fontSize(12).text(text, left).fillColor('black').moveDown(0.3);
    };
    function ensureSpace(h: number) {
      if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
    }
    const table = (head: string[], rows: string[][], colWidths: number[]) => {
      const rowH = 18;
      const draw = (cells: string[], bold: boolean, fill?: string) => {
        ensureSpace(rowH);
        const y = doc.y;
        if (fill) doc.rect(left, y, width, rowH).fill(fill);
        let x = left;
        doc.fillColor(fill ? 'white' : 'black').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        cells.forEach((c, i) => {
          doc.text(c, x + 4, y + 5, { width: colWidths[i] - 8, height: rowH - 6, ellipsis: true, lineBreak: false });
          x += colWidths[i];
        });
        doc.fillColor('black');
        doc.y = y + rowH;
      };
      draw(head, true, GREY);
      rows.forEach((r) => draw(r, false));
    };

    doc.font('Helvetica-Bold').fontSize(18).fillColor(GREEN).text('ESG Output Report', left);
    doc.fillColor('black').font('Helvetica').fontSize(10).moveDown(0.4);
    doc.text(`${report.company.name}${report.company.sector ? ` · ${report.company.sector}` : ''}`);
    doc.text(
      `${report.request.label} · ${report.request.type === 'AD_HOC' ? 'Ad hoc' : 'Periodic'}${report.request.frequency ? ` (${report.request.frequency.toLowerCase()})` : ''} · ` +
        `${day(report.request.periodStart)} to ${day(report.request.periodEnd)}`,
    );
    doc.fillColor(GREY).text(`Calculated ${day(report.calculation.runAt)} by ${report.calculation.runByName}`).fillColor('black');

    // --- Environmental summary + chart
    heading(`Environmental – Total GHG Emission (${report.environmental.unit})`);
    table(
      ['Item', 'Units', 'Value', 'Percentage'],
      report.environmental.byScope.map((r) => [r.scope === 'Total' ? 'Total Emission' : r.scope, report.environmental.unit, fmt(r.value), `${r.percentage}%`]),
      [width * 0.4, width * 0.2, width * 0.2, width * 0.2],
    );

    const scopes = report.environmental.byScope.filter((r) => r.scope !== 'Total');
    const max = Math.max(...scopes.map((s) => s.value), 0);
    ensureSpace(130);
    doc.moveDown(0.8);
    const chartTop = doc.y;
    const chartH = 90;
    const barW = Math.min(70, width / (scopes.length * 2));
    scopes.forEach((s, i) => {
      const h = max === 0 ? 0 : (s.value / max) * chartH;
      const x = left + 30 + i * (barW + 30);
      doc.rect(x, chartTop + chartH - h, barW, h).fill(GREEN);
      doc.fillColor('black').font('Helvetica').fontSize(8).text(fmt(s.value), x - 10, chartTop + chartH - h - 11, { width: barW + 20, align: 'center' });
      doc.text(s.scope, x - 10, chartTop + chartH + 4, { width: barW + 20, align: 'center' });
    });
    doc.y = chartTop + chartH + 22;

    heading('Emissions by Source');
    table(
      ['Item', 'Scope', 'Value', 'Percentage'],
      report.environmental.bySource.length
        ? report.environmental.bySource.map((s) => [s.source, s.scope, fmt(s.value), `${s.percentage}%`])
        : [['No greenhouse-gas results', '', '', '']],
      [width * 0.5, width * 0.15, width * 0.2, width * 0.15],
    );

    for (const [title, rows] of [['Social', report.social], ['Governance', report.governance]] as const) {
      heading(title);
      table(
        ['Theme', 'Metric', 'Value'],
        rows.length ? rows.map((r) => [r.theme, r.metric, `${r.value ?? '-'}${r.unit && r.value ? ` ${r.unit}` : ''}`]) : [['No metrics', '', '']],
        [width * 0.3, width * 0.45, width * 0.25],
      );
    }

    doc.end();
  });
}
