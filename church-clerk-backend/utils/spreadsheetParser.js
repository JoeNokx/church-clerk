import ExcelJS from "exceljs";
import { normalizeHeader, parseCsvToObjects } from "./csvParser.js";

function cellText(cell) {
  const v = cell?.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t?.text || "").join("");
    if (v.result !== undefined && v.result !== null) return String(v.result);
    if (v.text !== undefined) return String(v.text);
    if (v.hyperlink) return String(v.text ?? v.hyperlink);
    return String(v);
  }
  return String(v);
}

async function parseExcelToObjects(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = normalizeHeader(cellText(cell));
  });

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    let hasValue = false;
    headers.forEach((key, colNumber) => {
      if (!key) return;
      const value = cellText(row.getCell(colNumber)).trim();
      if (value) hasValue = true;
      obj[key] = value;
    });
    if (hasValue) rows.push(obj);
  });

  return { headers: headers.filter(Boolean), rows };
}

function looksLikeExcel(file) {
  const name = String(file?.originalname || "").toLowerCase();
  const mime = String(file?.mimetype || "").toLowerCase();
  if (name.endsWith(".csv") || mime === "text/csv") return false;
  if (name.endsWith(".xlsx") || mime.includes("spreadsheetml")) return true;
  if (name.endsWith(".xls") || mime.includes("ms-excel")) return true;
  const buf = file?.buffer;
  return Boolean(buf && buf.length > 2 && buf[0] === 0x50 && buf[1] === 0x4b); // zip-based .xlsx
}

async function parseImportFileToObjects(file) {
  if (!file?.buffer) return { headers: [], rows: [] };
  if (looksLikeExcel(file)) {
    return await parseExcelToObjects(file.buffer);
  }
  return parseCsvToObjects(file.buffer.toString("utf8"));
}

export { parseImportFileToObjects };
