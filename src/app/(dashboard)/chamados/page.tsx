"use client";

import { useEffect, useState, useCallback } from "react";

type MembroStats = { nome: string; total: number };
type EquipeStats = { equipe: string; total: number; membros: MembroStats[] };
type DadosChamados = {
  total: number;
  porEquipe: EquipeStats[];
  dataMin: string | null;
  dataMax: string | null;
};

// ─── CSV/TSV parser ───────────────────────────────────────────────────────────

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

function parseCsvLine(line: string, delim: string): string[] {
  if (delim === "\t") return line.split("\t").map((v) => v.trim());
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      result.push(cur.trim()); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseDateBR(s: string): string | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00`;
}

type ChamadoParsed = Record<string, string | number | null>;

function parsePaste(text: string): ChamadoParsed[] {
  // Strip UTF-8 BOM (﻿) common in Brazilian system exports
  const clean = text.replace(/^﻿/, "");
  const lines = clean.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delim = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

  const rawHeaders = parseCsvLine(firstLine, delim);
  const fieldMap = rawHeaders.map((h) => HEADER_MAP[normalize(h)] ?? null);

  const result: ChamadoParsed[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i], delim);
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

    // Include every row that has a ticket reference
    if ((obj.referencia as string | null)?.trim()) result.push(obj);
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthRange(mes: string): { dataInicio: string; dataFim: string } {
  const [y, m] = mes.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { dataInicio: `${mes}-01`, dataFim: `${mes}-${String(last).padStart(2, "0")}` };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChamadosPage() {
  const [dados, setDados] = useState<DadosChamados | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<"tudo" | "mes" | "custom">("tudo");
  const [mes, setMes] = useState(currentMonth());
  const [customInicio, setCustomInicio] = useState("");
  const [customFim, setCustomFim] = useState("");

  // Import modal
  const [importModal, setImportModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ChamadoParsed[]>([]);
  const [substituir, setSubstituir] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // Clear
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtro === "mes") {
      const r = monthRange(mes);
      params.set("dataInicio", r.dataInicio);
      params.set("dataFim", r.dataFim);
    } else if (filtro === "custom" && customInicio && customFim) {
      params.set("dataInicio", customInicio);
      params.set("dataFim", customFim);
    }
    fetch(`/api/chamados?${params}`)
      .then((r) => r.json())
      .then(setDados)
      .finally(() => setLoading(false));
  }, [filtro, mes, customInicio, customFim]);

  useEffect(() => { load(); }, [load]);

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
      if (result.length === 0) {
        setImportError("Nenhum chamado encontrado. Verifique se o arquivo tem o cabeçalho correto.");
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    if (parsed.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/chamados/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chamados: parsed, substituir }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportModal(false);
        setFileName("");
        setParsed([]);
        load();
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
  }

  const totalEquipes = dados?.porEquipe.length ?? 0;
  const totalAtendentes = dados?.porEquipe.reduce((acc, eq) => acc + eq.membros.length, 0) ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Chamados</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Contagem de chamados por atendente
          </p>
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
            onClick={() => { setImportModal(true); setFileName(""); setParsed([]); setImportError(""); }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar chamados
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {dados && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 col-span-2 md:col-span-1">
            <p className="text-xs text-gray-500 mb-1">Total de Chamados</p>
            <p className="text-3xl font-bold text-white tabular-nums">
              {dados.total.toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-1">Equipes</p>
            <p className="text-3xl font-bold text-white tabular-nums">{totalEquipes}</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-1">Atendentes</p>
            <p className="text-3xl font-bold text-white tabular-nums">{totalAtendentes}</p>
          </div>
          {dados.dataMin && dados.dataMax && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 col-span-2 md:col-span-1">
              <p className="text-xs text-gray-500 mb-1">Período dos dados</p>
              <p className="text-sm font-medium text-gray-300">
                {fmtDate(dados.dataMin)} → {fmtDate(dados.dataMax)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filtros de período */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mr-1">Período:</span>
        <button
          onClick={() => setFiltro("tudo")}
          className={`text-xs px-3 py-1.5 rounded-lg border transition ${filtro === "tudo" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-900 text-gray-400 border-gray-700 hover:text-white"}`}>
          Todo o período
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFiltro("mes")}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${filtro === "mes" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-900 text-gray-400 border-gray-700 hover:text-white"}`}>
            Por mês
          </button>
          {filtro === "mes" && (
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFiltro("custom")}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${filtro === "custom" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-900 text-gray-400 border-gray-700 hover:text-white"}`}>
            Personalizado
          </button>
          {filtro === "custom" && (
            <>
              <input type="date" value={customInicio} onChange={(e) => setCustomInicio(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-500 text-xs">até</span>
              <input type="date" value={customFim} onChange={(e) => setCustomFim(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </>
          )}
        </div>
      </div>

      {/* Ranking table */}
      {loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : !dados || dados.total === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500 text-sm mb-1">Nenhum dado importado ainda.</p>
          <p className="text-gray-600 text-xs">Clique em "Importar chamados" e selecione o arquivo CSV exportado do sistema.</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-center px-4 py-3 w-10">#</th>
                <th className="text-left px-4 py-3">Equipe / Atendente</th>
                <th className="text-right px-4 py-3 w-20">Total</th>
                <th className="text-right px-4 py-3 w-16">% geral</th>
                <th className="px-4 py-3 w-48"></th>
              </tr>
            </thead>
            <tbody>
              {dados.porEquipe.flatMap((eq) => [
                <tr key={`eq-${eq.equipe}`} className="bg-gray-800/70 border-b border-gray-700">
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">
                      {eq.equipe}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-mono font-bold text-white tabular-nums">{eq.total}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-mono text-xs text-gray-400 tabular-nums">
                      {dados.total > 0 ? `${((eq.total / dados.total) * 100).toFixed(1)}%` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/50"
                        style={{ width: `${dados.total > 0 ? (eq.total / dados.total) * 100 : 0}%` }}
                      />
                    </div>
                  </td>
                </tr>,
                ...eq.membros.map((m, mi) => {
                  const pct = dados.total > 0 ? (m.total / dados.total) * 100 : 0;
                  const barPct = eq.total > 0 ? (m.total / eq.total) * 100 : 0;
                  return (
                    <tr key={`${eq.equipe}-${m.nome}-${mi}`} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition">
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-xs font-mono text-gray-600">{mi + 1}</span>
                      </td>
                      <td className="px-4 py-2.5 pl-8">
                        <span className="text-sm text-gray-300">{m.nome}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono font-bold tabular-nums text-gray-200">{m.total}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-xs tabular-nums text-gray-500">{pct.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-600/60" style={{ width: `${barPct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                }),
              ])}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700 bg-gray-800/30">
                <td colSpan={2} className="px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Total — {totalEquipes} equipe{totalEquipes !== 1 ? "s" : ""} · {totalAtendentes} atendente{totalAtendentes !== 1 ? "s" : ""}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono font-bold text-white tabular-nums">
                    {dados.total.toLocaleString("pt-BR")}
                  </span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal de importação */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Importar chamados</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Selecione o arquivo CSV exportado do sistema
                </p>
              </div>
              <button onClick={() => setImportModal(false)} className="text-gray-600 hover:text-gray-400 transition">✕</button>
            </div>

            {/* File input */}
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

            {/* Preview info */}
            {parsed.length > 0 && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                {parsed.length.toLocaleString("pt-BR")} chamado{parsed.length !== 1 ? "s" : ""} encontrado{parsed.length !== 1 ? "s" : ""}{" "}
                · {new Set(parsed.map((c) => c.nomeDpsAtribuido)).size} equipe{new Set(parsed.map((c) => c.nomeDpsAtribuido)).size !== 1 ? "s" : ""}{" "}
                · {new Set(parsed.map((c) => c.nomeUsuarioAtribuido)).size} atendente{new Set(parsed.map((c) => c.nomeUsuarioAtribuido)).size !== 1 ? "s" : ""}
              </div>
            )}
            {importError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {importError}
              </div>
            )}

            {/* Opção substituir/adicionar */}
            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modo"
                  checked={substituir}
                  onChange={() => setSubstituir(true)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-300">Substituir todos os dados</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modo"
                  checked={!substituir}
                  onChange={() => setSubstituir(false)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-300">Adicionar aos existentes</span>
              </label>
            </div>
            {substituir && (
              <p className="text-xs text-amber-500/80 mt-1.5">
                Os dados anteriores serão apagados antes de importar.
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setImportModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={parsed.length === 0 || importing}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2 transition">
                {importing ? "Importando..." : `Importar ${parsed.length > 0 ? parsed.length.toLocaleString("pt-BR") : ""} chamados`}
              </button>
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
