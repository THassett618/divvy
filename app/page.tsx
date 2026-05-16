"use client";

import { useState, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface FileData {
  name: string;
  header: string[];
  rows: string[][];
}

interface DownloadResult {
  name: string;
  count: number;
}

// ── CSV helpers (no external deps) ──────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
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

function rowToCSV(row: string[]): string {
  return row.map(f => {
    if (f.includes(",") || f.includes('"') || f.includes("\n")) {
      return '"' + f.replace(/"/g, '""') + '"';
    }
    return f;
  }).join(",");
}

function buildCSV(header: string[], rows: string[][]): string {
  return [header, ...rows].map(rowToCSV).join("\r\n");
}

// ── Download helpers ─────────────────────────────────────────────────────────

function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DivvyPage() {
  const [file, setFile] = useState<FileData | null>(null);
  const [parts, setParts] = useState(4);
  const [names, setNames] = useState<string[]>([]);
  const [done, setDone] = useState<DownloadResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File load ──────────────────────────────────────────────────────────────

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
      const baseName = f.name.replace(/\.csv$/i, "");
      setFile({ name: f.name, header, rows });
      setDone([]);
      initNames(baseName, parts);
    };
    reader.readAsText(f, "utf-8");
  }

  function initNames(base: string, n: number) {
    setNames(Array.from({ length: n }, (_, i) => `${base} - Part ${i + 1}`));
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts]);

  // ── Parts change ───────────────────────────────────────────────────────────

  function changeParts(n: number) {
    setParts(n);
    setDone([]);
    if (file) {
      const base = file.name.replace(/\.csv$/i, "");
      setNames(Array.from({ length: n }, (_, i) => `${base} - Part ${i + 1}`));
    } else {
      setNames(Array.from({ length: n }, (_, i) => `Part ${i + 1}`));
    }
  }

  // ── Split ──────────────────────────────────────────────────────────────────

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

  // ── Chunk size preview ─────────────────────────────────────────────────────

  function chunkSize(i: number): number {
    if (!file) return 0;
    const total = file.rows.length;
    return Math.floor(total / parts) + (i < total % parts ? 1 : 0);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Header */}
        <div style={s.header}>
          <span style={s.logo}>✂ Divvy</span>
          <span style={s.tagline}>Split a CSV into equal parts — instantly</span>
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
          </div>
        )}

      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "48px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    padding: "32px 36px",
    width: "100%",
    maxWidth: 620,
  },
  header: {
    marginBottom: 28,
  },
  logo: {
    display: "block",
    fontSize: 28,
    fontWeight: 700,
    color: "#111",
    letterSpacing: "-0.5px",
  },
  tagline: {
    display: "block",
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  dropzone: {
    border: "2px dashed #d0d5dd",
    borderRadius: 12,
    padding: "28px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.15s",
    marginBottom: 24,
    background: "#fafafa",
  },
  dropzoneActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
  },
  dropIcon: { fontSize: 32, marginBottom: 8 },
  dropText: { color: "#555", fontSize: 15 },
  fileName: { fontWeight: 600, fontSize: 15, color: "#111", marginBottom: 4 },
  fileInfo: { color: "#888", fontSize: 13 },
  section: { marginBottom: 24 },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 10,
  },
  pillRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: {
    padding: "6px 16px",
    borderRadius: 20,
    border: "1.5px solid #d0d5dd",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    color: "#444",
    transition: "all 0.1s",
  },
  pillActive: {
    background: "#2563eb",
    borderColor: "#2563eb",
    color: "#fff",
  },
  nameList: { display: "flex", flexDirection: "column", gap: 8 },
  nameRow: { display: "flex", alignItems: "center", gap: 10 },
  partBadge: {
    minWidth: 72,
    fontSize: 12,
    fontWeight: 600,
    color: "#888",
    flexShrink: 0,
  },
  rowCount: { fontWeight: 400, color: "#aaa" },
  nameInput: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1.5px solid #d0d5dd",
    fontSize: 14,
    outline: "none",
    color: "#111",
  },
  splitBtn: {
    width: "100%",
    padding: "13px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    transition: "background 0.15s",
  },
  splitBtnDisabled: {
    background: "#b0bec5",
    cursor: "not-allowed",
  },
  results: {
    marginTop: 24,
    background: "#f0fdf4",
    border: "1.5px solid #bbf7d0",
    borderRadius: 10,
    padding: "16px 18px",
  },
  resultsTitle: {
    fontWeight: 600,
    color: "#15803d",
    marginBottom: 10,
    fontSize: 14,
  },
  resultRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#444",
    padding: "4px 0",
    borderTop: "1px solid #dcfce7",
  },
  resultName: { color: "#111" },
  resultCount: { color: "#888" },
};
