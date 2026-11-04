// Builds and downloads a real .xlsx file (opens in Excel, Google Sheets, etc.).
// The Excel library (exceljs) is loaded only at the moment someone clicks
// "Export", so it adds nothing to how fast the page itself loads.

// A cell is plain text, a number, empty, or text with a colour:
//   "good" = green (winnings), "bad" = red (losses / penalties)
export type ExportCell = string | number | null | { text: string; tone: "good" | "bad" };

export type ExportOptions = {
  fileName: string; // without ".xlsx"
  sheetName: string;
  title: string;
  subtitleLines?: string[];
  headers: string[];
  rows: ExportCell[][];
  // 0-based column positions holding money. Numbers there are shown with a
  // sign (+19.80 / -30.00) and coloured green or red.
  moneyColumns?: number[];
};

const GOOD = { font: "FF006100", fill: "FFC6EFCE" };
const BAD = { font: "FF9C0006", fill: "FFFFC7CE" };
const MONEY_FORMAT = "+0.00;-0.00;0.00";
const BORDER_COLOR = "FFD9D9D9";

function safeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 100) || "export";
}

// Excel sheet names: max 31 characters, and none of  \ / ? * [ ] :
function safeSheetName(name: string) {
  return name.replace(/[\\/:?*[\]]+/g, "-").trim().slice(0, 31) || "Sheet1";
}

export async function buildWorkbook(opts: ExportOptions) {
  const mod = await import("exceljs");
  const ExcelJS = ("default" in mod ? mod.default : mod) as typeof mod;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(safeSheetName(opts.sheetName));
  const colCount = opts.headers.length;
  const money = new Set(opts.moneyColumns ?? []);
  const thinBorder = {
    top: { style: "thin" as const, color: { argb: BORDER_COLOR } },
    left: { style: "thin" as const, color: { argb: BORDER_COLOR } },
    bottom: { style: "thin" as const, color: { argb: BORDER_COLOR } },
    right: { style: "thin" as const, color: { argb: BORDER_COLOR } },
  };

  // Title and any extra info lines above the table
  const titleRow = ws.addRow([opts.title]);
  titleRow.font = { bold: true, size: 14 };
  ws.mergeCells(titleRow.number, 1, titleRow.number, colCount);

  for (const line of opts.subtitleLines ?? []) {
    const infoRow = ws.addRow([line]);
    infoRow.font = { color: { argb: "FF555555" } };
    ws.mergeCells(infoRow.number, 1, infoRow.number, colCount);
  }
  ws.addRow([]);

  // Header row
  const headerRow = ws.addRow(opts.headers);
  headerRow.height = 34;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14532D" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  });

  // Data rows
  for (const row of opts.rows) {
    const excelRow = ws.addRow(row.map((c) => (c !== null && typeof c === "object" ? c.text : c)));

    row.forEach((cell, i) => {
      const target = excelRow.getCell(i + 1);
      target.border = thinBorder;

      if (i === 0) {
        target.font = { bold: true };
        return;
      }
      target.alignment = { horizontal: "right" };

      let tone: "good" | "bad" | null = null;
      if (typeof cell === "number" && money.has(i)) {
        target.numFmt = MONEY_FORMAT;
        tone = cell > 0 ? "good" : cell < 0 ? "bad" : null;
      } else if (cell !== null && typeof cell === "object") {
        tone = cell.tone;
      } else if (cell === "–") {
        target.font = { color: { argb: "FF999999" } };
      }

      if (tone) {
        const style = tone === "good" ? GOOD : BAD;
        target.font = { color: { argb: style.font } };
        target.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.fill } };
      }
    });
  }

  // Column widths, a frozen header + name column, and filter arrows on the header
  opts.headers.forEach((header, i) => {
    ws.getColumn(i + 1).width = i === 0 ? 24 : Math.min(Math.max(header.length + 2, 12), 30);
  });
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: headerRow.number }];
  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  return wb;
}

export async function downloadWorkbook(opts: ExportOptions) {
  const wb = await buildWorkbook(opts);
  const buffer = await wb.xlsx.writeBuffer();

  const blob = new Blob([buffer as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(opts.fileName)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
