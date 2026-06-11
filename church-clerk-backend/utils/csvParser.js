function escapeRegex(input) {
  return String(input || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

function parseCsvLine(line) {
  const s = String(line ?? "");
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      const next = s[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((v) => String(v ?? "").trim());
}

function parseCsvToObjects(csvText) {
  const text = String(csvText || "").replace(/^\uFEFF/, "");
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines = rawLines.map((l) => String(l || "").trim()).filter((l) => l.length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const headerParts = parseCsvLine(lines[0]);
  const headers = headerParts.map(normalizeHeader);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      if (!key) continue;
      obj[key] = parts[j] ?? "";
    }
    rows.push(obj);
  }

  return { headers, rows };
}

export { escapeRegex, normalizeHeader, parseCsvLine, parseCsvToObjects };
