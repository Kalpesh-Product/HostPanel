import jsPDF from "jspdf";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportRowsAsCsv(
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, any>[]
) {
  const header = columns.map((col) => escapeCsvCell(col.header)).join(",");
  const body = rows
    .map((row) => columns.map((col) => escapeCsvCell(row[col.key])).join(","))
    .join("\n");
  const csvContent = `${header}\n${body}`;
  // Leading BOM so Excel opens UTF-8 CSVs without mangling special characters.
  const blob = new Blob(["﻿", csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportRowsAsPdf(
  filename: string,
  title: string,
  columns: ExportColumn[],
  rows: Record<string, any>[]
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const marginX = 32;
  const marginTop = 44;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginX * 2;

  const weights = columns.map((col) => col.width || 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const colWidths = weights.map((w) => (w / totalWeight) * usableWidth);

  const rowHeight = 18;
  let y = marginTop;

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(title, marginX, y);
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y + 14);
  doc.setTextColor(0);
  y += 34;

  const drawHeaderRow = () => {
    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    let x = marginX;
    columns.forEach((col, i) => {
      doc.text(col.header, x, y);
      x += colWidths[i];
    });
    doc.setFont(undefined, "normal");
    y += 6;
    doc.setDrawColor(210);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += rowHeight - 6;
  };

  drawHeaderRow();

  rows.forEach((row) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = marginTop;
      drawHeaderRow();
    }
    let x = marginX;
    columns.forEach((col, i) => {
      const raw = row[col.key];
      const cellValue = raw === null || raw === undefined ? "" : String(raw);
      const fitted = doc.splitTextToSize(cellValue, colWidths[i] - 6)[0] || "";
      doc.text(fitted, x, y);
      x += colWidths[i];
    });
    y += rowHeight;
  });

  if (rows.length === 0) {
    doc.setTextColor(150);
    doc.text("No records found.", marginX, y);
    doc.setTextColor(0);
  }

  doc.save(filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`);
}
