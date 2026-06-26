"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Chamado = {
  id: number;
  referencia: string;
  dataRegistro: string | null;
  nomeDpsAtribuido: string | null;
  nomeUsuarioAtribuido: string | null;
  ultimaAcao: string | null;
  alerta: string | null;
  nivelEscalacao: number | null;
};

type DadosChamados = {
  total: number;
  chamados: Chamado[];
  page: number;
  pageSize: number;
  totalPages: number;
  dataMin: string | null;
  dataMax: string | null;
  usuarios: string[];
  ultimaAcoes: string[];
  totalUrgentes: number;
};

type UsuarioStats = {
  nome: string;
  total: number;
};

type EquipeStats = {
  equipe: string;
  total: number;
  usuarios: UsuarioStats[];
};

type DadosStats = {
  total: number;
  porEquipe: EquipeStats[];
  dataMin: string | null;
  dataMax: string | null;
};

// ─── CSV parser ───────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 /]/g, "")
    .trim();
}

const HEADER_MAP: Record<string, string> = {
  "referencia": "referencia",
  "alerta": "alerta",
  "nivel de escalacao": "nivelEscalacao",
  "estado texto": "estado",
  "estado": "estado",
  "data hora de registro": "dataRegistro",
  "data/hora de registro": "dataRegistro",
  "nome afetado": "nomeAfetado",
  "nome da secao": "nomeSecao",
  "nome do item": "nomeItem",
  "nome de categoria": "nomeCategoria",
  "nome do dps atribuido": "nomeDpsAtribuido",
  "nome do usuario atribuido": "nomeUsuarioAtribuido",
  "nome da ultima acao realizada": "ultimaAcao",
};

// Parser de CSV completo — processa caracter a caracter para suportar
// quebras de linha dentro de campos entre aspas (RFC 4180).
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
      i++;
      row.push(cur.trim()); rows.push(row); row = []; cur = "";
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

function parseDateBR(s: string): string | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00`;
}

type ChamadoParsed = Record<string, string | number | null>;

function parsePaste(text: string): ChamadoParsed[] {
  const clean = text.replace(/^﻿/, ""); // remove BOM
  if (!clean.trim()) return [];

  // detecta delimitador pela primeira linha
  const firstNl = clean.indexOf('\n');
  const firstLine = (firstNl >= 0 ? clean.slice(0, firstNl) : clean).replace(/\r$/, "");
  const delim = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

  const rows = parseCsvFull(clean, delim);
  if (rows.length < 2) return [];

  const rawHeaders = rows[0];
  const fieldMap = rawHeaders.map((h) => HEADER_MAP[normalize(h)] ?? null);

  const result: ChamadoParsed[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.every(c => !c)) continue;
    const obj: ChamadoParsed = {};
    for (let j = 0; j < fieldMap.length; j++) {
      const field = fieldMap[j];
      if (!field) continue;
      const raw = (cols[j] ?? "").replace(/^"|"$/g, "").trim();
      if (field === "dataRegistro") {
        obj[field] = parseDateBR(raw);
      } else if (field === "nivelEscalacao") {
        obj[field] = raw ? Number(raw) : null;
      } else {
        obj[field] = raw || null;
      }
    }
    if ((obj.referencia as string | null)?.trim()) result.push(obj);
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function urgenciaCfg(ultimaAcao: string | null) {
  if (ultimaAcao === "Solicitação de Urgência") {
    return { rowClass: "bg-red-950/30 border-l-2 border-red-500/60", badge: true, acaoClass: "text-red-400 font-medium" };
  }
  return { rowClass: "", badge: false, acaoClass: "text-gray-400" };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChamadosPage() {
  const [view, setView] = useState<"lista" | "quantitativo">("lista");
  const [dados, setDados] = useState<DadosChamados | null>(null);
  const [stats, setStats] = useState<DadosStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [usuario, setUsuario] = useState("");
  const [urgentes, setUrgentes] = useState(false);

  const [importModal, setImportModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ChamadoParsed[]>([]);
  const [substituir, setSubstituir] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<{ count: number; skipped: number; parsed: number } | null>(null);

  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (usuario) params.set("usuario", usuario);
    if (urgentes) params.set("urgentes", "1");
    fetch(`/api/chamados?${params}`)
      .then((r) => r.json())
      .then(setDados)
      .finally(() => setLoading(false));
  }, [page, usuario, urgentes]);

  useEffect(() => { load(); }, [load]);

  const loadStats = useCallback(() => {
    fetch("/api/chamados?stats=1")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  function setFilter(key: "usuario", value: string) {
    if (key === "usuario") setUsuario(value);
    setPage(1);
  }

  function toggleUrgentes() {
    setUrgentes((v) => !v);
    setPage(1);
  }

  function clearFilters() {
    setUsuario("");
    setUrgentes(false);
    setPage(1);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportError("");
    setParsed([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parsePaste(text);
      setParsed(result);
      if (result.length === 0)
        setImportError("Nenhum chamado encontrado. Verifique se o arquivo tem o cabeçalho correto.");
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    if (parsed.length === 0) return;
    const parsedCount = parsed.length;
    setImporting(true);
    try {
      const res = await fetch("/api/chamados/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chamados: parsed, substituir }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportResult({ count: data.count, skipped: data.skipped ?? 0, parsed: parsedCount });
        setFileName("");
        setParsed([]);
        load();
        loadStats();
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    await fetch("/api/chamados", { method: "DELETE" });
    setClearing(false);
    setConfirmClear(false);
    load();
    loadStats();
  }

  const temFiltro = !!(usuario || urgentes);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Chamados</h2>
          <p className="text-sm text-gray-400 mt-0.5">Listagem de chamados por atendente</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {dados && dados.total > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-red-400 border border-gray-700 transition">
              Limpar dados
            </button>
          )}
          <button
            onClick={() => { setImportModal(true); setFileName(""); setParsed([]); setImportError(""); setImportResult(null); }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar chamados
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("lista")}
          className={`text-sm px-4 py-1.5 rounded-md transition ${view === "lista" ? "bg-gray-700 text-white font-medium" : "text-gray-500 hover:text-gray-300"}`}>
          Lista
        </button>
        <button
          onClick={() => setView("quantitativo")}
          className={`text-sm px-4 py-1.5 rounded-md transition ${view === "quantitativo" ? "bg-gray-700 text-white font-medium" : "text-gray-500 hover:text-gray-300"}`}>
          Quantitativo
        </button>
      </div>

      {/* Summary cards */}
      {dados && dados.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-1">Total de chamados</p>
            <p className="text-3xl font-bold text-white tabular-nums">
              {dados.total.toLocaleString("pt-BR")}
            </p>
          </div>
          <div
            onClick={toggleUrgentes}
            className={`rounded-xl border p-4 cursor-pointer transition ${urgentes ? "bg-red-900/30 border-red-500/50" : "bg-gray-900 border-gray-800 hover:border-red-500/30"}`}>
            <p className="text-xs text-gray-500 mb-1">Solicitação de Urgência</p>
            <p className={`text-3xl font-bold tabular-nums ${dados.totalUrgentes > 0 ? "text-red-400" : "text-gray-600"}`}>
              {dados.totalUrgentes.toLocaleString("pt-BR")}
            </p>
            {urgentes && <p className="text-xs text-red-400 mt-1">Filtro ativo</p>}
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-1">Atendentes</p>
            <p className="text-3xl font-bold text-white tabular-nums">
              {dados.usuarios.length}
            </p>
          </div>
          {dados.dataMin && dados.dataMax && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <p className="text-xs text-gray-500 mb-1">Período dos dados</p>
              <p className="text-sm font-medium text-gray-300">
                {fmtDateShort(dados.dataMin)} → {fmtDateShort(dados.dataMax)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lista e filtros — apenas na aba Lista */}
      {view === "lista" && dados && dados.usuarios.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select
            value={usuario}
            onChange={(e) => setFilter("usuario", e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]">
            <option value="">Todos os atendentes</option>
            {dados.usuarios.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <button
            onClick={toggleUrgentes}
            className={`text-xs px-3 py-2 rounded-lg border transition ${
              urgentes
                ? "bg-red-600/30 border-red-500/60 text-red-400"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
            }`}>
            Solicitação de Urgência
          </button>
          {temFiltro && (
            <button
              onClick={clearFilters}
              className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Table — apenas na aba Lista */}
      {view === "lista" && loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : view === "lista" && (!dados || dados.total === 0) ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500 text-sm mb-1">Nenhum dado importado ainda.</p>
          <p className="text-gray-600 text-xs">Clique em "Importar chamados" e selecione o arquivo CSV exportado do sistema.</p>
        </div>
      ) : view === "lista" && dados && dados.chamados.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
          <p className="text-gray-500 text-sm">Nenhum chamado encontrado com os filtros aplicados.</p>
        </div>
      ) : view === "lista" && dados ? (
        <>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 w-32">Referência</th>
                  <th className="text-left px-4 py-3 w-36">Data/hora</th>
                  <th className="text-left px-4 py-3">Nome do DPS Atribuído</th>
                  <th className="text-left px-4 py-3 w-44">Usuário Atribuído</th>
                  <th className="text-left px-4 py-3">Última ação</th>
                </tr>
              </thead>
              <tbody>
                {dados.chamados.map((c) => {
                  const urg = urgenciaCfg(c.ultimaAcao);
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40 transition ${urg.rowClass}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs text-gray-200">{c.referencia}</span>
                          {urg.badge && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 leading-none">
                              URGENTE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
                          {fmtDateTime(c.dataRegistro)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-300">{c.nomeDpsAtribuido ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {c.nomeUsuarioAtribuido ? (
                          <span className="text-xs text-gray-200">{c.nomeUsuarioAtribuido}</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">
                            Triagem
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs ${urg.acaoClass}`}>
                          {c.ultimaAcao ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {dados.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">
                {((page - 1) * dados.pageSize + 1).toLocaleString("pt-BR")}–
                {Math.min(page * dados.pageSize, dados.total).toLocaleString("pt-BR")} de{" "}
                {dados.total.toLocaleString("pt-BR")} chamados
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                  «
                </button>
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                  ‹ Anterior
                </button>
                <span className="text-xs px-3 py-1 text-gray-300 tabular-nums">
                  {page} / {dados.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === dados.totalPages}
                  className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                  Próximo ›
                </button>
                <button
                  onClick={() => setPage(dados.totalPages)}
                  disabled={page === dados.totalPages}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                  »
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Tabela quantitativa */}
      {view === "quantitativo" && (
        <>
          {!stats || stats.total === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
              <p className="text-gray-500 text-sm">Nenhum dado importado ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.porEquipe.map((eq) => (
                <div key={eq.equipe} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  {/* Cabeçalho da equipe */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/40">
                    <span className="text-sm font-semibold text-white">{eq.equipe}</span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {eq.total.toLocaleString("pt-BR")} chamado{eq.total !== 1 ? "s" : ""}
                      <span className="ml-2 text-gray-600">
                        ({((eq.total / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  {/* Usuários */}
                  <table className="w-full text-sm">
                    <tbody>
                      {eq.usuarios.map((u, i) => {
                        const pct = eq.total > 0 ? (u.total / eq.total) * 100 : 0;
                        return (
                          <tr key={u.nome} className="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40 transition">
                            <td className="px-3 py-2.5 text-center w-9">
                              <span className="text-xs font-mono text-gray-600">{i + 1}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-200">{u.nome}</span>
                                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden min-w-[40px] max-w-[80px]">
                                  <div className="h-full rounded-full bg-blue-600/60" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right w-24">
                              <span className="font-mono font-bold tabular-nums text-white">{u.total}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de importação */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Importar chamados</h3>
                <p className="text-xs text-gray-500 mt-0.5">Selecione o arquivo CSV exportado do sistema</p>
              </div>
              <button onClick={() => setImportModal(false)} className="text-gray-600 hover:text-gray-400 transition">✕</button>
            </div>

            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition
              ${fileName ? "border-blue-500/50 bg-blue-500/5" : "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800"}`}>
              <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileChange} className="hidden" />
              {fileName ? (
                <>
                  <span className="text-2xl mb-1">📄</span>
                  <span className="text-sm font-medium text-blue-400">{fileName}</span>
                  <span className="text-xs text-gray-500 mt-0.5">Clique para trocar</span>
                </>
              ) : (
                <>
                  <span className="text-2xl mb-1">📂</span>
                  <span className="text-sm text-gray-400">Clique para selecionar o arquivo</span>
                  <span className="text-xs text-gray-600 mt-0.5">.csv · .txt · .tsv</span>
                </>
              )}
            </label>

            {parsed.length > 0 && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                {parsed.length.toLocaleString("pt-BR")} chamado{parsed.length !== 1 ? "s" : ""} encontrado{parsed.length !== 1 ? "s" : ""}{" "}
                · {new Set(parsed.map((c) => c.nomeUsuarioAtribuido)).size} atendente{new Set(parsed.map((c) => c.nomeUsuarioAtribuido)).size !== 1 ? "s" : ""}
              </div>
            )}
            {importError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {importError}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo" checked={substituir} onChange={() => setSubstituir(true)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Substituir todos os dados</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo" checked={!substituir} onChange={() => setSubstituir(false)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Adicionar aos existentes</span>
              </label>
            </div>
            {substituir && (
              <p className="text-xs text-amber-500/80 mt-1.5">
                Os dados anteriores serão apagados antes de importar.
              </p>
            )}

            {importResult && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-0.5">
                <p className="text-gray-400">{importResult.parsed.toLocaleString("pt-BR")} linha{importResult.parsed !== 1 ? "s" : ""} lida{importResult.parsed !== 1 ? "s" : ""} do arquivo</p>
                <p>{importResult.count.toLocaleString("pt-BR")} chamado{importResult.count !== 1 ? "s" : ""} importado{importResult.count !== 1 ? "s" : ""}</p>
                {importResult.skipped > 0 && (
                  <p className="text-gray-500">{importResult.skipped.toLocaleString("pt-BR")} ignorado{importResult.skipped !== 1 ? "s" : ""} (referência já existia)</p>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setImportModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                {importResult ? "Fechar" : "Cancelar"}
              </button>
              {!importResult && (
                <button
                  onClick={handleImport}
                  disabled={parsed.length === 0 || importing}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2 transition">
                  {importing ? "Importando..." : `Importar ${parsed.length > 0 ? parsed.length.toLocaleString("pt-BR") : ""} chamados`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de limpeza */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-2">Limpar todos os dados?</h3>
            <p className="text-sm text-gray-400 mb-4">
              Todos os {dados?.total.toLocaleString("pt-BR")} chamados serão removidos permanentemente.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmClear(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
              <button onClick={handleClear} disabled={clearing}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition">
                {clearing ? "Limpando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
