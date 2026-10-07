// src/Components/bulkAnalyzeFile.js
//
// Parses a CSV / XLSX File and returns email statistics
// (total, invalid format, duplicates, unique emails, unique domains).
//
// Used by bulkAnalyze.worker.js (normal path, off the main thread) and by
// BulkValidator.js as a main-thread fallback when the worker cannot run.
//
// - CSV  : light quote-aware scanner, only the email column is kept (no SheetJS)
// - XLSX : SheetJS is lazy-loaded, only the first sheet is parsed and only the
//          email column is read cell-by-cell (no giant row objects)
//
// Errors:
//   - err.hard === true     -> the file itself is unusable (no email column,
//                              empty sheet). Show it and block Verify.
//   - err.friendly === true -> message is safe to show as-is (e.g. file read
//                              failure), but Verify stays enabled.
//   - anything else         -> unexpected; callers show a generic preview error.

import { createEmailAnalyzer, findEmailColumnIndex } from "./bulkAnalyzeCore";

export class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = "UserError";
    this.hard = true;
  }
}

function readError(cause) {
  const err = new Error(
    "Couldn't read the file. If it's open in another program or only stored in the cloud (OneDrive), close it, make sure it's downloaded, and select it again.",
  );
  err.name = "FileReadError";
  err.friendly = true;
  err.cause = cause;
  return err;
}

// ───────────────────────── CSV ─────────────────────────

function sniffDelimiter(text) {
  const counts = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "\n" || ch === "\r") break;
    if (ch in counts) counts[ch]++;
  }

  let best = ",";
  for (const d of [";", "\t", "|"]) {
    if (counts[d] > counts[best]) best = d;
  }
  return best;
}

function analyzeCsvText(input) {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const n = text.length;
  const delimiter = sniffDelimiter(text);
  let pos = 0;

  // Reads one logical row (handles quoted fields, escaped quotes and
  // newlines inside quotes). When collectAll is false only the field at
  // targetCol is materialised.
  function nextRow(collectAll, targetCol) {
    if (pos >= n) return null;

    const cells = collectAll ? [] : null;
    let col = 0;
    let buf = "";
    let len = 0;
    let hasContent = false;
    let target = "";
    let inQuotes = false;

    const endField = () => {
      if (len > 0) hasContent = true;
      if (collectAll) cells.push(buf);
      else if (col === targetCol) target = buf;
      col++;
      buf = "";
      len = 0;
    };

    while (pos < n) {
      const ch = text[pos];
      const keep = collectAll || col === targetCol;

      if (inQuotes) {
        if (ch === '"') {
          if (text[pos + 1] === '"') {
            if (keep) buf += '"';
            len++;
            pos += 2;
            continue;
          }
          inQuotes = false;
          pos++;
          continue;
        }
        if (keep) buf += ch;
        len++;
        pos++;
        continue;
      }

      if (ch === '"' && len === 0) {
        inQuotes = true;
        pos++;
        continue;
      }

      if (ch === delimiter) {
        endField();
        pos++;
        continue;
      }

      if (ch === "\n" || ch === "\r") {
        endField();
        if (ch === "\r" && text[pos + 1] === "\n") pos++;
        pos++;
        return { cells, target, hasContent };
      }

      if (keep) buf += ch;
      len++;
      pos++;
    }

    // last line without trailing newline
    endField();
    return { cells, target, hasContent };
  }

  // header = first non-blank row (same as the backend sheet parsing)
  let header = null;
  for (;;) {
    const row = nextRow(true, -1);
    if (!row) break;
    if (row.hasContent) {
      header = row;
      break;
    }
  }

  if (!header) throw new UserError("Empty sheet");

  const emailCol = findEmailColumnIndex(header.cells);
  if (emailCol < 0) throw new UserError("No email column found");

  const analyzer = createEmailAnalyzer();
  let dataRows = 0;

  for (;;) {
    const row = nextRow(false, emailCol);
    if (!row) break;
    if (!row.hasContent) continue; // fully blank line is skipped by the backend too
    dataRows++;
    analyzer.add(row.target);
  }

  if (!dataRows) throw new UserError("Empty sheet");

  return analyzer.result();
}

// ───────────────────────── XLSX ─────────────────────────

async function analyzeXlsxBuffer(buffer) {
  const mod = await import("xlsx");
  const XLSX = mod.default || mod;

  let wb = XLSX.read(buffer, {
    type: "array",
    sheets: 0, // first sheet only (backend also reads SheetNames[0])
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
  });

  const sheetName = wb.SheetNames && wb.SheetNames[0];
  const ws = sheetName ? wb.Sheets[sheetName] : null;

  if (!ws || !ws["!ref"]) throw new UserError("Empty sheet");

  const range = XLSX.utils.decode_range(ws["!ref"]);

  // header row = first row of the sheet range (same as sheet_to_json)
  const headers = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })];
    headers.push(cell ? (cell.w ?? cell.v ?? "") : "");
  }

  const emailIdx = findEmailColumnIndex(headers);
  if (emailIdx < 0) {
    if (range.e.r <= range.s.r) throw new UserError("Empty sheet");
    throw new UserError("No email column found");
  }

  const emailC = range.s.c + emailIdx;

  // sheet_to_json (used by the backend) treats a row as present when any of
  // its cells exist, even if they hold an empty string - mirror that.
  const hasValue = (cell) => !!cell && cell.v !== undefined && cell.v !== null;

  const analyzer = createEmailAnalyzer();
  let dataRows = 0;

  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const emailCell = ws[XLSX.utils.encode_cell({ r, c: emailC })];

    if (hasValue(emailCell)) {
      dataRows++;
      analyzer.add(emailCell.v);
      continue;
    }

    // email cell empty: only count the row if some other cell has data
    // (fully blank rows are skipped by the backend sheet parsing)
    let rowHasData = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (c === emailC) continue;
      if (hasValue(ws[XLSX.utils.encode_cell({ r, c })])) {
        rowHasData = true;
        break;
      }
    }

    if (rowHasData) {
      dataRows++;
      analyzer.add("");
    }
  }

  wb = null; // let the workbook be garbage collected

  if (!dataRows) throw new UserError("Empty sheet");

  return analyzer.result();
}

// ───────────────────────── public API ─────────────────────────

export async function analyzeFile(file) {
  const name = String(file?.name || "").toLowerCase();
  const isCsv = name.endsWith(".csv");

  let content;
  try {
    content = isCsv ? await file.text() : await file.arrayBuffer();
  } catch (e) {
    throw readError(e);
  }

  return isCsv ? analyzeCsvText(content) : analyzeXlsxBuffer(content);
}

// Normalises any thrown value into a plain, structured-cloneable object.
export function describeAnalyzeError(err) {
  const hard = !!(err && err.hard);
  const friendly = !!(err && err.friendly);
  const detail = `${(err && err.name) || "Error"}: ${
    (err && err.message) || String(err)
  }`.slice(0, 200);

  return {
    hard,
    friendly,
    detail,
    message:
      hard || friendly
        ? err.message
        : "Couldn't preview this file. You can still click Verify.",
  };
}
