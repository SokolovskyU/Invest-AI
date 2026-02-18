import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { listAlertNotifications } from "./alerts";
import { isFeatureEnabled } from "./featureFlags";
import { listHistoryEvents, listHistorySnapshots } from "./history";

export type ReportFormat = "json" | "xlsx" | "pdf";

export type PortfolioReport = {
  accountId: string;
  generatedAt: string;
  summary: {
    snapshots: number;
    events: number;
    alerts: number;
    latestTotal: number;
    latestProfit: number;
    latestYieldPct: number;
  };
  snapshots: ReturnType<typeof listHistorySnapshots>;
  events: ReturnType<typeof listHistoryEvents>;
  alerts: ReturnType<typeof listAlertNotifications>;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function isReportsEnabled(): boolean {
  return isFeatureEnabled("reports_export_enabled");
}

export function buildPortfolioReport(accountId: string): PortfolioReport {
  const snapshots = listHistorySnapshots(accountId, 365);
  const events = listHistoryEvents(accountId, 500);
  const alerts = listAlertNotifications(accountId, 500);
  const latest = snapshots[0];
  return {
    accountId,
    generatedAt: nowIso(),
    summary: {
      snapshots: snapshots.length,
      events: events.length,
      alerts: alerts.length,
      latestTotal: latest?.totalValue || 0,
      latestProfit: latest?.profitValue || 0,
      latestYieldPct: latest?.yieldPct || 0,
    },
    snapshots,
    events,
    alerts,
  };
}

export function reportToJsonBuffer(report: PortfolioReport): Buffer {
  return Buffer.from(JSON.stringify(report, null, 2), "utf8");
}

function toCellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return JSON.stringify(value);
}

function appendRowsFromObjects(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  rows: Array<Record<string, unknown>>
): void {
  const worksheet = workbook.addWorksheet(sheetName);
  if (!rows.length) {
    worksheet.addRow(["empty"]);
    return;
  }

  const keys = Array.from(
    rows.reduce((acc, row) => {
      for (const key of Object.keys(row)) acc.add(key);
      return acc;
    }, new Set<string>())
  );
  worksheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(14, Math.min(48, key.length + 6)),
  }));

  for (const row of rows) {
    const normalized = Object.fromEntries(keys.map((key) => [key, toCellValue(row[key])]));
    worksheet.addRow(normalized);
  }
}

export async function reportToXlsxBuffer(report: PortfolioReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  appendRowsFromObjects(workbook, "summary", [
    { metric: "accountId", value: report.accountId },
    { metric: "generatedAt", value: report.generatedAt },
    { metric: "snapshots", value: report.summary.snapshots },
    { metric: "events", value: report.summary.events },
    { metric: "alerts", value: report.summary.alerts },
    { metric: "latestTotal", value: report.summary.latestTotal },
    { metric: "latestProfit", value: report.summary.latestProfit },
    { metric: "latestYieldPct", value: report.summary.latestYieldPct },
  ]);
  appendRowsFromObjects(workbook, "snapshots", report.snapshots as Array<Record<string, unknown>>);
  appendRowsFromObjects(workbook, "events", report.events as Array<Record<string, unknown>>);
  appendRowsFromObjects(workbook, "alerts", report.alerts as Array<Record<string, unknown>>);

  const data = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export async function reportToPdfBuffer(report: PortfolioReport): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));

    doc.fontSize(18).text("Invest Portfolio Report");
    doc.moveDown();
    doc.fontSize(11).text(`Account: ${report.accountId}`);
    doc.text(`Generated at: ${report.generatedAt}`);
    doc.moveDown();
    doc.fontSize(13).text("Summary");
    doc.fontSize(11).text(`Snapshots: ${report.summary.snapshots}`);
    doc.text(`Events: ${report.summary.events}`);
    doc.text(`Alerts: ${report.summary.alerts}`);
    doc.text(`Latest total: ${report.summary.latestTotal.toFixed(2)}`);
    doc.text(`Latest profit: ${report.summary.latestProfit.toFixed(2)}`);
    doc.text(`Latest yield %: ${report.summary.latestYieldPct.toFixed(2)}`);
    doc.moveDown();
    doc.fontSize(13).text("Recent snapshots");
    for (const row of report.snapshots.slice(0, 10)) {
      doc
        .fontSize(10)
        .text(
          `${row.capturedAt} | ${row.source} | total=${row.totalValue.toFixed(2)} | profit=${(row.profitValue || 0).toFixed(2)}`
        );
    }
    doc.end();
  });
}
