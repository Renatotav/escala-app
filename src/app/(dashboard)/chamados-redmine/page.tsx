"use client";

import { useEffect, useRef, useState } from "react";

type ChamadoRedmine = {
  id: number;
  numero: string;
  dataAbertura: string | null;
  equipeAtribuida: string | null;
  dataMovimentacao: string | null;
  situacaoRegra: string | null;
};

// ─── Parser (mesmo mecanismo dos Chamados PJe) ───────────────────────────────

function parseCsvFull(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      row.push(cur.trim()); cur = "";
    } else if (ch === '\r' && text[i + 1] === '\n' && !inQ) {
      i++; row.push(cur.trim()); rows.push(row); row = []; cur = "";
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      row.push(cur.trim()); rows.push(row); row = []; cur = "";
    } else {
      cur += ch;
    }
  }
  if (row.length > 0 || cur.trim()) {
    row.push(cur.trim());
    if (row.some(c => c !== "")) rows.push(row);
  }
  return rows;
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 /]/g, "").trim();
}

// Formato Redmine: M/D/YYYY H:MM:SS AM/PM  ou  M/D/YYYY H:MM AM/PM
function parseDateRedmine(raw: string): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const HEADER_MAP_REDMINE: Record<string, string> = {
  "numero do chamado":   "numero",
  "data/hora da abertura": "dataAbertura",
  "equipe atribuida":    "equipeAtribuida",
  "data/hora da movimentacao": "dataMovimentacao",
  "situacao regra":      "situacaoRegra",
};

type RedmineParsed = {
  numero: string;
  dataAbertura: string | null;
  equipeAtribuida: string | null;
  dataMovimentacao: string | null;
  situacaoRegra: string | null;
};

function parseRedmine(text: string): RedmineParsed[] {
  const clean = text.replace(/^﻿/, ""); // remove BOM
  if (!clean.trim()) return [];
  const firstNl = clean.indexOf("\n");
  const firstLine = (firstNl >= 0 ? clean.slice(0, firstNl) : clean).replace(/\r$/, "");
  const delim = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
  const rows = parseCsvFull(clean, delim);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => HEADER_MAP_REDMINE[normalize(h)] ?? null);

  const result: RedmineParsed[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.every(c => !c)) continue;
    const obj: Partial<RedmineParsed> = {};
    for (let j = 0; j < headers.length; j++) {
      const field = headers[j];
      if (!field) continue;
      const raw = cols[j]?.replace(/^"|"$/g, "").trim() ?? "";
      if (field === "dataAbertura" || field === "dataMovimentacao") {
        (obj as Record<string, string | null>)[field] = parseDateRedmine(raw);
      } else {
        (obj as Record<string, string | null>)[field] = raw || null;
      }
    }
    if (obj.numero?.trim()) result.push(obj as RedmineParsed);
  }
  return result;
}

function diasDesde(dataAbertura: string | null): number {
  if (!dataAbertura) return 0;
  return Math.floor((Date.now() - new Date(dataAbertura).getTime()) / 86400000);
}

function DiasBadge({ dias }: { dias: number }) {
  if (dias > 50) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
        ⚠ {dias}d
      </span>
    );
  }
  if (dias > 20) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold">
        {dias}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-600 text-white text-xs font-bold">
      {dias}d
    </span>
  );
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ChamadosRedminePage() {
  const [chamados, setChamados] = useState<ChamadoRedmine[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [parsed, setParsed] = useState<RedmineParsed[]>([]);
  const [importError, setImportError] = useState("");
  const [filtroEquipe, setFiltroEquipe] = useState("Todas");
  const [filtroSituacao, setFiltroSituacao] = useState("Todas");
  const [filtroAtraso, setFiltroAtraso] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch("/api/chamados-redmine")
      .then(r => r.json())
      .then((data: ChamadoRedmine[]) => { setChamados(data); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setFileNames(files.map(f => f.name));
    setImportError("");
    setParsed([]);
    let completed = 0;
    const all: RedmineParsed[] = [];
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        all.push(...parseRedmine(text));
        completed++;
        if (completed === files.length) {
          if (all.length === 0) setImportError("Nenhum chamado encontrado no arquivo.");
          else setParsed(all);
        }
      };
      reader.readAsText(file, "UTF-8");
    }
  }

  async function handleImport() {
    if (parsed.length === 0) return;
    setImporting(true);
    await fetch("/api/chamados-redmine", { method: "DELETE" });
    await fetch("/api/chamados-redmine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    setImporting(false);
    setImportModal(false);
    setParsed([]);
    setFileNames([]);
    load();
  }

  async function handleLimpar() {
    if (!confirm("Limpar todos os chamados Redmine importados?")) return;
    await fetch("/api/chamados-redmine", { method: "DELETE" });
    load();
  }

  // Derived data
  const equipes = ["Todas", ...Array.from(new Set(chamados.map(c => c.equipeAtribuida ?? "").filter(Boolean))).sort()];
  const situacoes = ["Todas", ...Array.from(new Set(chamados.map(c => c.situacaoRegra ?? "").filter(Boolean))).sort()];

  const filtrados = chamados.filter(c => {
    const dias = diasDesde(c.dataAbertura);
    if (filtroEquipe !== "Todas" && c.equipeAtribuida !== filtroEquipe) return false;
    if (filtroSituacao !== "Todas" && c.situacaoRegra !== filtroSituacao) return false;
    if (filtroAtraso && dias <= 50) return false;
    return true;
  });

  const totalAtraso = chamados.filter(c => diasDesde(c.dataAbertura) > 50).length;

  const datas = chamados.map(c => c.dataAbertura).filter(Boolean) as string[];
  const periodoMin = datas.length ? fmtDateTime(datas.reduce((a, b) => a < b ? a : b)) : "—";
  const periodoMax = datas.length ? fmtDateTime(datas.reduce((a, b) => a > b ? a : b)) : "—";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Chamados Redmine</h2>
          <p className="text-sm text-gray-400 mt-0.5">Listagem de chamados por equipe</p>
        </div>
        <div className="flex gap-2">
          {chamados.length > 0 && (
            <button onClick={handleLimpar}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
              Limpar dados
            </button>
          )}
          <button onClick={() => { setImportModal(true); setParsed([]); setFileNames([]); setImportError(""); }}
            className="bg-red-700 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar chamados
          </button>
        </div>
      </div>

      {/* Stats */}
      {chamados.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total de chamados</p>
            <p className="text-3xl font-bold text-white">{chamados.length.toLocaleString("pt-BR")}</p>
          </div>
          <div className={`rounded-xl p-4 border ${totalAtraso > 0 ? "bg-red-950 border-red-700" : "bg-gray-900 border-gray-800"}`}>
            <p className="text-xs text-gray-400 mb-1">Em atraso (&gt;50 dias)</p>
            <p className={`text-3xl font-bold ${totalAtraso > 0 ? "text-red-400" : "text-white"}`}>{totalAtraso}</p>
            {totalAtraso > 0 && <p className="text-xs text-red-500 mt-1">⚠ Atenção requerida</p>}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Equipes atribuídas</p>
            <p className="text-3xl font-bold text-white">{equipes.length - 1}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Período dos dados</p>
            <p className="text-sm font-medium text-gray-300 mt-1">{periodoMin.slice(0, 8)} → {periodoMax.slice(0, 8)}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      {chamados.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500">
            {equipes.map(e => <option key={e}>{e === "Todas" ? "Todas as equipes" : e}</option>)}
          </select>
          <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500">
            {situacoes.map(s => <option key={s}>{s === "Todas" ? "Todas as situações" : s}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input type="checkbox" checked={filtroAtraso} onChange={e => setFiltroAtraso(e.target.checked)}
              className="accent-red-500 w-4 h-4" />
            Somente em atraso (&gt;50d)
          </label>
          {(filtroEquipe !== "Todas" || filtroSituacao !== "Todas" || filtroAtraso) && (
            <button onClick={() => { setFiltroEquipe("Todas"); setFiltroSituacao("Todas"); setFiltroAtraso(false); }}
              className="text-xs text-gray-400 hover:text-white underline">
              Limpar filtros
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">{filtrados.length} de {chamados.length} chamados</span>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Referência</th>
              <th className="text-left px-4 py-3">Abertura</th>
              <th className="text-left px-4 py-3">Equipe Atribuída</th>
              <th className="text-left px-4 py-3">Movimentação</th>
              <th className="text-left px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                {chamados.length === 0 ? "Nenhum chamado importado" : "Nenhum resultado para os filtros selecionados"}
              </td></tr>
            )}
            {filtrados.map(c => {
              const dias = diasDesde(c.dataAbertura);
              const atrasado = dias > 50;
              return (
                <tr key={c.id}
                  className={`border-b border-gray-800 last:border-0 transition ${atrasado ? "bg-red-950/30 hover:bg-red-950/50 border-l-2 border-l-red-600" : "hover:bg-gray-800/50"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono font-medium">{c.numero}</span>
                      <DiasBadge dias={dias} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">
                    {fmtDateTime(c.dataAbertura)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 whitespace-nowrap">
                      {c.equipeAtribuida ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">
                    {fmtDateTime(c.dataMovimentacao)}
                  </td>
                  <td className="px-4 py-3">
                    {c.situacaoRegra ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.situacaoRegra.toLowerCase() === "aberto"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-gray-700 text-gray-400"
                      }`}>
                        {c.situacaoRegra}
                      </span>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Importar */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Importar Chamados Redmine</h3>
            <p className="text-xs text-gray-400 mb-4">Selecione o arquivo TSV exportado do Redmine. Os dados anteriores serão substituídos.</p>
            <div className="border-2 border-dashed border-gray-700 hover:border-red-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {fileNames.length > 0
                  ? fileNames.join(", ")
                  : "Clique para selecionar o arquivo (.txt / .tsv / .csv)"}
              </p>
              {parsed.length > 0 && (
                <p className="text-green-400 text-xs mt-2">{parsed.length} chamados encontrados</p>
              )}
              {importError && (
                <p className="text-red-400 text-xs mt-2">{importError}</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".txt,.tsv,.csv" multiple className="hidden"
              onChange={handleFileChange} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImportModal(false); setParsed([]); setFileNames([]); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
              <button onClick={handleImport} disabled={parsed.length === 0 || importing}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                {importing ? "Importando..." : `Importar ${parsed.length > 0 ? `(${parsed.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
