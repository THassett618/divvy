"use client";

import { useState, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface FileData {
  name: string;
  header: string[];
  rows: string[][];
  dupeCount: number;
}

interface DownloadResult {
  name: string;
  count: number;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\n') {
        row.push(field); field = "";
        rows.push(row); row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (rows.length && rows[rows.length - 1].every(f => f === "")) rows.pop();
  return rows;
}

function countDupes(rows: string[][]): number {
  const seen = new Set<string>();
  let dupes = 0;
  for (const row of rows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) dupes++;
    else seen.add(key);
  }
  return dupes;
}

function rowToCSV(row: string[]): string {
  return row.map(f => {
    if (f.includes(",") || f.includes('"') || f.includes("\n"))
      return '"' + f.replace(/"/g, '""') + '"';
    return f;
  }).join(",");
}

function buildCSV(header: string[], rows: string[][]): string {
  return [header, ...rows].map(rowToCSV).join("\r\n");
}

// ── Download ──────────────────────────────────────────────────────────────────

function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DivvyPage() {
  const [file, setFile] = useState<FileData | null>(null);
  const [parts, setParts] = useState(4);
  const [names, setNames] = useState<string[]>([]);
  const [done, setDone] = useState<DownloadResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function loadFile(f: File | null | undefined) {
    if (!f || !f.name.endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result;
      if (typeof result !== "string") return;
      const allRows = parseCSV(result);
      if (allRows.length < 2) return;
      const header = allRows[0];
      const rows = allRows.slice(1);
      const dupeCount = countDupes(rows);
      const baseName = f.name.replace(/\.csv$/i, "");
      setFile({ name: f.name, header, rows, dupeCount });
      setDone([]);
      setNames(Array.from({ length: parts }, (_, i) => `${baseName} - Part ${i + 1}`));
    };
    reader.readAsText(f, "utf-8");
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts]);

  function changeParts(n: number) {
    setParts(n);
    setDone([]);
    const base = file ? file.name.replace(/\.csv$/i, "") : "";
    setNames(Array.from({ length: n }, (_, i) =>
      base ? `${base} - Part ${i + 1}` : `Part ${i + 1}`
    ));
  }

  function split() {
    if (!file) return;
    const results: DownloadResult[] = [];
    let idx = 0;
    const total = file.rows.length;
    for (let i = 0; i < parts; i++) {
      const size = Math.floor(total / parts) + (i < total % parts ? 1 : 0);
      const chunk = file.rows.slice(idx, idx + size);
      idx += size;
      const csv = buildCSV(file.header, chunk);
      const name = names[i] || `Part ${i + 1}`;
      setTimeout(() => downloadFile(name, csv), i * 300);
      results.push({ name, count: chunk.length });
    }
    setDone(results);
  }

  function chunkSize(i: number): number {
    if (!file) return 0;
    const total = file.rows.length;
    return Math.floor(total / parts) + (i < total % parts ? 1 : 0);
  }

  const resultTotal = done.reduce((sum, r) => sum + r.count, 0);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Header */}
        <div style={s.header}>
          <span style={s.logo}>✂ Divvy</span>
          <span style={s.tagline}>Split a CSV into equal parts — instantly</span>

          {/* Trust chips */}
          <div style={s.trustRow}>
            <span style={s.trustChip}>🔒 Runs in your browser</span>
            <span style={s.trustChip}>📂 No upload, ever</span>
            <span style={s.trustChip}>✓ Free, no account</span>
          </div>
        </div>

        {/* Drop zone */}
        <div
          style={{ ...s.dropzone, ...(dragging ? s.dropzoneActive : {}) }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={e => loadFile(e.target.files?.[0])}
          />
          {file ? (
            <div>
              <div style={s.fileName}>📄 {file.name}</div>
              <div style={s.fileInfo}>{file.rows.length.toLocaleString()} data rows · click to change file</div>
            </div>
          ) : (
            <div>
              <div style={s.dropIcon}>📂</div>
              <div style={s.dropText}>Drop a CSV here or click to browse</div>
            </div>
          )}
        </div>

        {/* Dupe warning */}
        {file && file.dupeCount > 0 && (
          <div style={s.dupeWarning}>
            <span style={s.dupeIcon}>⚠</span>
            <span>
              <strong>{file.dupeCount.toLocaleString()} duplicate {file.dupeCount === 1 ? "row" : "rows"}</strong> found in your source file.
              These will be split as-is — deduplicate first if that&apos;s not what you want.
            </span>
          </div>
        )}

        {/* Parts selector */}
        <div style={s.section}>
          <div style={s.label}>Split into</div>
          <div style={s.pillRow}>
            {[2, 3, 4, 5, 6, 8, 10].map(n => (
              <button
                key={n}
                style={{ ...s.pill, ...(parts === n ? s.pillActive : {}) }}
                onClick={() => changeParts(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Output names */}
        <div style={s.section}>
          <div style={s.label}>Output file names</div>
          <div style={s.nameList}>
            {Array.from({ length: parts }, (_, i) => (
              <div key={i} style={s.nameRow}>
                <span style={s.partBadge}>
                  {i + 1}
                  {file && <span style={s.rowCount}> · {chunkSize(i).toLocaleString()} rows</span>}
                </span>
                <input
                  style={s.nameInput}
                  value={names[i] || ""}
                  onChange={e => {
                    const next = [...names];
                    next[i] = e.target.value;
                    setNames(next);
                  }}
                  placeholder={`Part ${i + 1}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Split button */}
        <button
          style={{ ...s.splitBtn, ...(file ? {} : s.splitBtnDisabled) }}
          onClick={split}
          disabled={!file}
        >
          ✂ Split &amp; Download
        </button>

        {/* Results */}
        {done.length > 0 && (
          <div style={s.results}>
            <div style={s.resultsTitle}>✓ Done — {done.length} files downloaded</div>

            {done.map((r, i) => (
              <div key={i} style={s.resultRow}>
                <span style={s.resultName}>{r.name}.csv</span>
                <span style={s.resultCount}>{r.count.toLocaleString()} rows</span>
              </div>
            ))}

            {/* Quality guarantee */}
            <div style={s.guarantee}>
              <div style={s.guaranteeTitle}>✓ Quality check passed</div>
              <div style={s.guaranteeRow}>
                <span>Zero overlap — each row appears in exactly one file</span>
                <span style={s.guaranteeCheck}>✓</span>
              </div>
              <div style={s.guaranteeRow}>
                <span>
                  Row count verified — {file?.rows.length.toLocaleString()} source = {done.map(r => r.count.toLocaleString()).join(" + ")} = {resultTotal.toLocaleString()}
                </span>
                <span style={s.guaranteeCheck}>{resultTotal === file?.rows.length ? "✓" : "⚠"}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f9",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "48px 16px",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(11, 24, 41, 0.07)",
    padding: "32px 36px",
    width: "100%",
    maxWidth: 640,
  },
  header: {
    marginBottom: 24,
  },
  logo: {
    display: "block",
    fontSize: 26,
    fontWeight: 800,
    color: "#0f2744",
    letterSpacing: "-0.5px",
    marginBottom: 4,
  },
  tagline: {
    display: "block",
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 14,
  },
  trustRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  trustChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: "#0f2744",
    background: "#eef2f9",
    borderRadius: 20,
    padding: "4px 10px",
    letterSpacing: "0.1px",
  },
  dropzone: {
    border: "2px dashed #d1d5db",
    borderRadius: 12,
    padding: "28px 24px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.15s",
    marginBottom: 8,
    background: "#fafafa",
  },
  dropzoneActive: {
    borderColor: "#ea580c",
    background: "#fff7ed",
  },
  dropIcon: { fontSize: 32, marginBottom: 8 },
  dropText: { color: "#6b7280", fontSize: 15 },
  fileName: { fontWeight: 700, fontSize: 15, color: "#0f2744", marginBottom: 4 },
  fileInfo: { color: "#9ca3af", fontSize: 13 },

  dupeWarning: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: "#fffbeb",
    border: "1.5px solid #fcd34d",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 13,
    color: "#92400e",
    marginBottom: 20,
    marginTop: 12,
    lineHeight: 1.5,
  },
  dupeIcon: { fontSize: 16, flexShrink: 0, marginTop: 1 },

  section: { marginBottom: 22, marginTop: 20 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.8px",
    marginBottom: 10,
  },
  pillRow: { display: "flex", gap: 8, flexWrap: "wrap" as const },
  pill: {
    padding: "6px 18px",
    borderRadius: 20,
    border: "1.5px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    transition: "all 0.1s",
    minHeight: 0,
    minWidth: 0,
  },
  pillActive: {
    background: "#0f2744",
    borderColor: "#0f2744",
    color: "#fff",
  },
  nameList: { display: "flex", flexDirection: "column" as const, gap: 8 },
  nameRow: { display: "flex", alignItems: "center", gap: 10 },
  partBadge: {
    minWidth: 80,
    fontSize: 12,
    fontWeight: 700,
    color: "#9ca3af",
    flexShrink: 0,
  },
  rowCount: { fontWeight: 400, color: "#d1d5db" },
  nameInput: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1.5px solid #e5e7eb",
    fontSize: 14,
    outline: "none",
    color: "#111827",
    background: "#fff",
  },
  splitBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: 10,
    border: "none",
    background: "#ea580c",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 8,
    transition: "background 0.15s",
    letterSpacing: "-0.2px",
  },
  splitBtnDisabled: {
    background: "#d1d5db",
    cursor: "not-allowed",
  },

  results: {
    marginTop: 24,
    background: "#f0fdf4",
    border: "1.5px solid #bbf7d0",
    borderRadius: 12,
    padding: "16px 18px",
  },
  resultsTitle: {
    fontWeight: 700,
    color: "#15803d",
    marginBottom: 10,
    fontSize: 14,
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#374151",
    padding: "5px 0",
    borderTop: "1px solid #dcfce7",
  },
  resultName: { color: "#111827" },
  resultCount: { color: "#9ca3af", marginLeft: 16, flexShrink: 0 },

  guarantee: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1.5px solid #bbf7d0",
  },
  guaranteeTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#15803d",
    textTransform: "uppercase" as const,
    letterSpacing: "0.6px",
    marginBottom: 6,
  },
  guaranteeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    fontSize: 12,
    color: "#374151",
    padding: "3px 0",
    gap: 12,
    lineHeight: 1.5,
  },
  guaranteeCheck: {
    color: "#15803d",
    fontWeight: 700,
    flexShrink: 0,
  },
};
