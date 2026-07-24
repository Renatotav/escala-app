"use client";

import { useEffect, useRef, useState } from "react";

type Resolvido = {
  id: number;
  numeroRedmine: string;
  numerosAssyst: string;
  tipo: string | null;
  situacao: string | null;
  titulo: string | null;
  descricao: string | null;
  ultimasNotas: string | null;
};

type Dados = {
  resolvidos: Resolvido[];
  esquecidos: string[];
  encontrados: string[];
  aguardandoEmChamados: string[];
  totalRedmine: number;
  chamadosMap: Record<string, string | null>;
  resolvidosRedmineNums: string[];
  totalResolvidos: number;
  page: number;
  totalPages: number;
};

function diasAberto(dataAbertura: string | null | undefined): number | null {
  if (!dataAbertura) return null;
  return Math.floor((Date.now() - new Date(dataAbertura).getTime()) / 86400000);
}

// Renderiza texto com #NNN como links clicáveis para o Redmine
// Se o número estiver em resolvidosSet → badge verde "✓ Resolvido"
// Se estiver resolvido mas o chamado atual não vinculado → badge laranja "⚠ Chamado não incluído"
function TextoComLinks({
  texto, resolvidosSet, redmineToAssystMap, assystNums,
}: {
  texto: string;
  resolvidosSet?: Set<string>;
  redmineToAssystMap?: Map<string, Set<string>>;
  assystNums?: string[];
}) {
  const partes = texto.split(/(#\d{4,})/g);
  return (
    <>
      {partes.map((parte, i) => {
        if (!/^#\d{4,}$/.test(parte)) return <span key={i}>{parte}</span>;
        const num = parte.slice(1);
        const isResolvido = resolvidosSet?.has(num) ?? false;
        const assystDessaRedmine = redmineToAssystMap?.get(num);
        const chamadoVinculado = !assystNums || !assystDessaRedmine
          ? true
          : assystNums.some(a => assystDessaRedmine.has(a.toUpperCase()));
        return (
          <span key={i} className="inline-flex items-center gap-1 flex-wrap">
            <a href={redmineUrl(num)} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline font-mono">
              {parte}
            </a>
            {isResolvido && chamadoVinculado && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                ✓ Resolvido
              </span>
            )}
            {isResolvido && !chamadoVinculado && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 whitespace-nowrap">
                ⚠ Chamado não incluído
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}


function preview(texto: string, max = 55): string {
  const s = texto.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cortado = s.slice(0, max);
  const ultimoEspaco = cortado.lastIndexOf(" ");
  return (ultimoEspaco > 10 ? cortado.slice(0, ultimoEspaco) : cortado) + "…";
}

function CelulaTexto({ label, texto, onClick, assystNums, resolvidoId }: {
  label: string;
  texto: string | null | undefined;
  onClick: (t: { titulo: string; corpo: string; assystNums?: string[]; resolvidoId?: number }) => void;
  assystNums?: string[];
  resolvidoId?: number;
}) {
  if (!texto) return <span className="text-gray-600">—</span>;
  return (
    <button onClick={() => onClick({ titulo: label, corpo: texto, assystNums, resolvidoId })}
      className="text-left text-xs text-gray-300 hover:text-blue-400 transition block underline-offset-2 hover:underline cursor-pointer">
      {preview(texto)}
    </button>
  );
}

function splitAssyst(raw: string): string[] {
  return raw.split(/[;/,|\\]|\s+e\s+/i).map(s => s.trim()).filter(Boolean);
}

function assystUrl(num: string) {
  return `https://cati.tjce.jus.br/assystnet/#events/${num}?eventType=1&currentIndex=0`;
}

function redmineUrl(num: string) {
  return `https://redmine.tjce.jus.br/issues/${num}`;
}

export default function RedmineResolvidosPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [xlsExporting, setXlsExporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<{ count?: number; skipped?: number; error?: string } | null>(null);
  const [aba, setAba] = useState<"esquecidos" | "resolvidos">("esquecidos");
  const [busca, setBusca] = useState("");
  const [paginaEsq, setPaginaEsq] = useState(1);
  const POR_PAGINA = 100;
  const [substituir, setSubstituir] = useState(true);
  const [textoModal, setTextoModal] = useState<{ titulo: string; corpo: string; assystNums?: string[]; resolvidoId?: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [marcadorRes, setMarcadorResState] = useState<{ assyst: string; page: number } | null>(null);
  const marcadorResRef = useRef<HTMLTableRowElement>(null);
  const marcadorResNavigated = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const MARKER_RES_KEY = "redmine-resolvidos-marcador-res";

  useEffect(() => {
    const savedRes = localStorage.getItem(MARKER_RES_KEY);
    if (savedRes) { try { setMarcadorResState(JSON.parse(savedRes)); } catch {} }
  }, []);

  function toggleMarcadorRes(assyst: string, page: number) {
    const key = assyst.toUpperCase();
    if (marcadorRes?.assyst === key) {
      localStorage.removeItem(MARKER_RES_KEY);
      setMarcadorResState(null);
    } else {
      const val = { assyst: key, page };
      localStorage.setItem(MARKER_RES_KEY, JSON.stringify(val));
      setMarcadorResState(val);
    }
  }

  function load(pg = 1, buscaQ = "") {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (buscaQ) params.set("busca", buscaQ);
    fetch(`/api/redmine-resolvidos?${params}`)
      .then(r => r.json())
      .then((d: Dados) => { setDados(d); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  // Recarga ao mudar busca (debounce) ou ao mudar para aba resolvidos
  useEffect(() => {
    if (aba !== "resolvidos") return;
    const t = setTimeout(() => load(1, busca), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, aba]);

  // Navega para a página do marcador (resolvidos) quando dados carregam — só uma vez
  useEffect(() => {
    if (!dados || !marcadorRes || marcadorResNavigated.current) return;
    marcadorResNavigated.current = true;
    setAba("resolvidos");
    load(marcadorRes.page, "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, marcadorRes]);

  useEffect(() => {
    if (aba === "resolvidos" && marcadorResRef.current) {
      setTimeout(() => marcadorResRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, [dados, aba]);

  async function handleImport() {
    if (selectedFiles.length === 0) return;
    setImporting(true);
    setImportResult(null);
    const texts = await Promise.all(selectedFiles.map(f => f.text()));
    const combined = texts[0] + (texts.length > 1
      ? "\n" + texts.slice(1).map(t => t.split("\n").slice(1).join("\n")).join("\n")
      : "");
    const res = await fetch(`/api/redmine-resolvidos?substituir=${substituir ? "1" : "0"}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: combined,
    });
    const data = await res.json();
    if (res.ok) {
      setImportResult({ count: data.count, skipped: data.skipped });
      setImportModal(false);
      setSelectedFiles([]);
      load();
    } else {
      setImportResult({ error: data.error ?? "Erro ao importar" });
    }
    setImporting(false);
  }

  async function handleLimpar() {
    if (!confirm("Limpar todos os Resolvidos importados?")) return;
    await fetch("/api/redmine-resolvidos", { method: "DELETE" });
    load();
  }

  async function exportXLS() {
    if (!dados) return;
    setXlsExporting(true);
    try {
      const res = await fetch("/api/redmine-resolvidos?export=1");
      const exportData = await res.json();
      const todosResolvidos: Resolvido[] = exportData.resolvidos ?? [];

      function esc(s: string) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      }

      const rows = todosResolvidos.map(r => {
        const redmineCell = `<a href="${esc(redmineUrl(r.numeroRedmine))}">${esc(r.numeroRedmine)}</a>`;
        const nums = splitAssyst(r.numerosAssyst);
        const assystCell = nums.length === 0
          ? esc(r.numerosAssyst)
          : nums.map(n => `<a href="${esc(assystUrl(n))}">${esc(n)}</a>`).join("<br>");
        return `<tr>
          <td>${redmineCell}</td>
          <td>${assystCell}</td>
          <td>${esc(r.tipo ?? "")}</td>
          <td>${esc(r.situacao ?? "")}</td>
          <td>${esc(r.titulo ?? "")}</td>
          <td>${esc(r.descricao ?? "")}</td>
          <td>${esc(r.ultimasNotas ?? "")}</td>
        </tr>`;
      }).join("");

      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8">
        <style>td{mso-wrap-text:auto;vertical-align:top;font-size:11pt;} th{background:#1e293b;color:#fff;font-size:11pt;}</style>
        </head><body>
        <table border="1">
          <tr>
            <th>Redmine #</th>
            <th>Nº Assyst</th>
            <th>Tipo</th>
            <th>Situação</th>
            <th>Título</th>
            <th>Descrição</th>
            <th>Últimas notas</th>
          </tr>
          ${rows}
        </table></body></html>`;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "redmine-resolvidos.xls";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setXlsExporting(false);
    }
  }

  const semResolvidoRaw = dados?.esquecidos ?? [];
  const comResolvido = dados?.encontrados ?? [];
  const aguardandoEmChamados = dados?.aguardandoEmChamados ?? [];
  const resolvidos = dados?.resolvidos ?? [];  // página atual (server-side)
  const chamadosMap = dados?.chamadosMap ?? {};

  const buscaLow = busca.toLowerCase();
  // Esquecidos: filtro client-side (array de strings, leve)
  const semResolvido = buscaLow
    ? semResolvidoRaw.filter(n => n.toLowerCase().includes(buscaLow))
    : semResolvidoRaw;

  // Paginação Esquecidos — client-side
  const totalPaginasEsq = Math.max(1, Math.ceil(semResolvido.length / POR_PAGINA));
  const paginaEsqAtual = Math.min(paginaEsq, totalPaginasEsq);
  const semResolvidoPag = semResolvido.slice((paginaEsqAtual - 1) * POR_PAGINA, paginaEsqAtual * POR_PAGINA);

  // Paginação Resolvidos — server-side
  const totalPaginasRes = dados?.totalPages ?? 1;
  const paginaResAtual = dados?.page ?? 1;
  const resolvidosPag = resolvidos;  // já paginado pelo servidor

  // Set de Redmine# encontrados — vem do servidor (leve: só os números)
  const resolvidosRedmineSet = new Set(dados?.resolvidosRedmineNums ?? []);

  // Mapa Redmine# → Set<Assyst#> — calculado da página atual (suficiente para o modal de notas)
  const redmineToAssystMap = new Map<string, Set<string>>();
  for (const r of resolvidos) {
    const key = r.numeroRedmine.trim();
    if (!redmineToAssystMap.has(key)) redmineToAssystMap.set(key, new Set());
    for (const a of splitAssyst(r.numerosAssyst)) redmineToAssystMap.get(key)!.add(a.toUpperCase());
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Redmine Resolvidos</h2>
          <p className="text-sm text-gray-400 mt-0.5">Comparativo entre Chamados Redmine e Resolvidos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {dados && resolvidos.length > 0 && (
            <>
              <button onClick={exportXLS} disabled={xlsExporting}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition">
                {xlsExporting ? "Exportando..." : "↓ Exportar XLS"}
              </button>
              <button onClick={handleLimpar}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
                Limpar resolvidos
              </button>
            </>
          )}
          <button onClick={() => { setImportModal(true); setSelectedFiles([]); setImportResult(null); }}
            className="bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar Resolvidos
          </button>
        </div>
      </div>

      {/* Cards */}
      {dados && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total Redmine</p>
            <p className="text-3xl font-bold text-white">{dados.totalRedmine}</p>
          </div>
          <a href="/chamados?filtro=redmine-resolvido"
            className={`rounded-xl p-4 border text-left transition block ${aguardandoEmChamados.length > 0 ? "bg-orange-950/30 border-orange-600 hover:bg-orange-950/50 animate-pulse" : "bg-gray-900 border-gray-800"}`}>
            <p className="text-xs text-gray-400 mb-1">Aguardando encerramento em Chamados</p>
            <p className={`text-3xl font-bold ${aguardandoEmChamados.length > 0 ? "text-orange-400" : "text-white"}`}>{aguardandoEmChamados.length}</p>
            {aguardandoEmChamados.length > 0 && (
              <p className="text-xs text-orange-500 mt-1">⚡ Ver filtrado em Chamados →</p>
            )}
          </a>
          <button
            onClick={() => { setAba("esquecidos"); setPaginaEsq(1); }}
            className={`rounded-xl p-4 border text-left transition ${aba === "esquecidos" ? "bg-red-900/40 border-red-500 ring-2 ring-red-400 animate-pulse" : semResolvido.length > 0 ? "bg-red-950/30 border-red-700 hover:bg-red-900/20" : "bg-gray-900 border-gray-800"}`}>
            <p className="text-xs text-gray-400 mb-1">Não resolvidos</p>
            <p className={`text-3xl font-bold ${semResolvido.length > 0 ? "text-red-400" : "text-white"}`}>{semResolvido.length}</p>
            {semResolvido.length > 0 && <p className="text-xs text-red-400 mt-1">⚠ Clique para ver</p>}
          </button>
          <button
            onClick={() => { setAba("resolvidos"); }}
            className={`rounded-xl p-4 border text-left transition ${aba === "resolvidos" ? "bg-green-900/40 border-green-500 ring-2 ring-green-400 animate-pulse" : "bg-gray-900 border-gray-800 hover:bg-gray-800"}`}>
            <p className="text-xs text-gray-400 mb-1">Encontrados nos Resolvidos</p>
            <p className="text-3xl font-bold text-green-400">{comResolvido.length}</p>
            <p className="text-xs text-green-600 mt-1">Clique para ver</p>
          </button>
        </div>
      )}

      {/* Pesquisa */}
      {dados && (dados.totalResolvidos > 0 || semResolvidoRaw.length > 0) && (
        <div className="mb-4">
          <div className="relative w-fit">
            <input
              type="text"
              value={busca}
              onChange={e => { setBusca(e.target.value); setPaginaEsq(1); }}
              placeholder="Pesquisar chamado..."
              className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg pl-7 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">🔍</span>
            {busca && (
              <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>
            )}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        {loading ? (
          <p className="px-4 py-8 text-center text-gray-500 text-sm">Carregando...</p>
        ) : !dados || resolvidos.length === 0 ? (
          <p className="px-4 py-12 text-center text-gray-500 text-sm">
            {dados?.totalRedmine === 0
              ? "Nenhum Chamado Redmine importado ainda. Importe os chamados primeiro."
              : "Nenhum arquivo de Resolvidos importado. Clique em \"Importar Resolvidos\"."}
          </p>
        ) : aba === "esquecidos" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nº Chamado (Assyst)</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {semResolvido.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-green-400 text-sm">Todos os chamados foram resolvidos!</td></tr>
              ) : semResolvidoPag.map(num => (
                <tr key={num} className="border-b border-gray-800 last:border-0 bg-red-950/20 border-l-2 border-l-red-600 hover:bg-red-950/30 transition">
                  <td className="px-4 py-3">
                    <a href={assystUrl(num)} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline transition">
                      {num}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                      ⚠ Ainda não resolvido
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 whitespace-nowrap">Redmine #</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Nº Assyst</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Tipo</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Situação</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Título</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Descrição</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Últimas notas</th>
              </tr>
            </thead>
            <tbody>
              {resolvidosPag.flatMap(r => {
                const nums = splitAssyst(r.numerosAssyst);
                const esMarcado = marcadorRes ? nums.some(n => n.toUpperCase() === marcadorRes.assyst) : false;
                const rows = [];
                if (esMarcado) {
                  rows.push(
                    <tr key={`div-${r.id}`}>
                      <td colSpan={7} className="px-4 py-2 bg-blue-950/50 border-y border-blue-500/40">
                        <span className="text-xs text-blue-300 font-semibold flex items-center gap-2">
                          📍 Você parou aqui — continue a partir deste chamado
                        </span>
                      </td>
                    </tr>
                  );
                }
                rows.push(
                  <tr key={r.id} ref={esMarcado ? marcadorResRef : undefined}
                    className={`border-b border-gray-800 last:border-0 transition border-l-2 ${esMarcado ? "bg-blue-950/20 border-l-blue-500 hover:bg-blue-950/30" : "border-l-transparent hover:bg-gray-800/50"}`}>
                    <td className="px-4 py-3">
                      <a href={redmineUrl(r.numeroRedmine)} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition">
                        {r.numeroRedmine}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {nums.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {nums.map(n => {
                            const dias = diasAberto(chamadosMap[n.toUpperCase()]);
                            const esMarcadoAssyst = marcadorRes?.assyst === n.toUpperCase();
                            return (
                              <div key={n} className="flex items-center gap-1.5">
                                <button onClick={() => toggleMarcadorRes(n, paginaResAtual)}
                                  title={esMarcadoAssyst ? "Remover marcador" : "Marcar posição aqui"}
                                  className={`text-sm leading-none transition shrink-0 ${esMarcadoAssyst ? "text-blue-400 hover:text-gray-500" : "text-gray-700 hover:text-blue-400"}`}>
                                  📍
                                </button>
                                <a href={assystUrl(n)} target="_blank" rel="noopener noreferrer"
                                  className={`font-mono hover:underline transition ${esMarcadoAssyst ? "text-blue-300 font-bold" : "text-blue-400 hover:text-blue-300"}`}>
                                  {n}
                                </a>
                                {dias !== null && (
                                  <span title="Chamado atrasado" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse whitespace-nowrap cursor-help">
                                    ⚠ {dias}d
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{r.tipo ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.situacao ? (
                        <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-green-500/20 text-green-400 border border-green-500/30">{r.situacao}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3"><CelulaTexto label="Título" texto={r.titulo} onClick={setTextoModal} /></td>
                    <td className="px-4 py-3"><CelulaTexto label="Descrição" texto={r.descricao} onClick={setTextoModal} /></td>
                    <td className="px-4 py-3"><CelulaTexto label="Últimas notas" texto={r.ultimasNotas} onClick={setTextoModal} assystNums={splitAssyst(r.numerosAssyst)} resolvidoId={r.id} /></td>
                  </tr>
                );
                return rows;
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {aba === "esquecidos" && totalPaginasEsq > 1 && semResolvido.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-gray-500">
            Exibindo <span className="text-gray-300">{(paginaEsqAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaEsqAtual * POR_PAGINA, semResolvido.length)}</span> de <span className="text-gray-300">{semResolvido.length}</span> registros
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPaginaEsq(p => Math.max(1, p - 1))} disabled={paginaEsqAtual === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
              ← Anterior
            </button>
            <span className="text-xs text-gray-400">Página {paginaEsqAtual} de {totalPaginasEsq}</span>
            <button onClick={() => setPaginaEsq(p => Math.min(totalPaginasEsq, p + 1))} disabled={paginaEsqAtual === totalPaginasEsq}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
              Próxima →
            </button>
          </div>
        </div>
      )}
      {aba === "resolvidos" && totalPaginasRes > 1 && (dados?.totalResolvidos ?? 0) > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-gray-500">
            Exibindo <span className="text-gray-300">{(paginaResAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaResAtual * POR_PAGINA, dados?.totalResolvidos ?? 0)}</span> de <span className="text-gray-300">{dados?.totalResolvidos ?? 0}</span> registros
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => load(paginaResAtual - 1, busca)} disabled={paginaResAtual === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
              ← Anterior
            </button>
            <span className="text-xs text-gray-400">Página {paginaResAtual} de {totalPaginasRes}</span>
            <button onClick={() => load(paginaResAtual + 1, busca)} disabled={paginaResAtual === totalPaginasRes}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Modal leitura de texto */}
      {textoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => { setTextoModal(null); setEditMode(false); }}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">{textoModal.titulo}</h3>
              <div className="flex items-center gap-2">
                {textoModal.titulo === "Últimas notas" && textoModal.resolvidoId && !editMode && (
                  <button onClick={() => { setEditValue(textoModal.corpo); setEditMode(true); }}
                    className="text-xs px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white transition">
                    ✏ Editar
                  </button>
                )}
                <button onClick={() => { setTextoModal(null); setEditMode(false); }} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
              </div>
            </div>
            {editMode ? (
              <div className="flex flex-col gap-3 px-5 py-4">
                <textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  rows={10}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 resize-y focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditMode(false)}
                    className="text-sm px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition">
                    Cancelar
                  </button>
                  <button disabled={saving} onClick={async () => {
                    if (!textoModal.resolvidoId) return;
                    setSaving(true);
                    await fetch("/api/redmine-resolvidos", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: textoModal.resolvidoId, ultimasNotas: editValue }),
                    });
                    setSaving(false);
                    setEditMode(false);
                    setTextoModal({ ...textoModal, corpo: editValue });
                    setDados(d => d ? {
                      ...d,
                      resolvidos: d.resolvidos.map(r => r.id === textoModal.resolvidoId ? { ...r, ultimasNotas: editValue } : r)
                    } : d);
                  }}
                    className="text-sm px-4 py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium transition">
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {textoModal.titulo === "Últimas notas"
                  ? <TextoComLinks
                      texto={textoModal.corpo}
                      resolvidosSet={resolvidosRedmineSet}
                      redmineToAssystMap={redmineToAssystMap}
                      assystNums={textoModal.assystNums}
                    />
                  : textoModal.corpo}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Importar */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Importar Redmine Resolvidos</h3>
            <p className="text-xs text-gray-400 mb-3">Selecione o arquivo CSV exportado do Redmine com os chamados resolvidos.</p>
            <div className="mb-3 flex gap-3">
              <label className={`flex-1 flex items-start gap-2 cursor-pointer rounded-lg border p-3 transition ${substituir ? "border-blue-500 bg-blue-950/30" : "border-gray-700 hover:border-gray-600"}`}>
                <input type="radio" name="modo-resolvidos" checked={substituir} onChange={() => setSubstituir(true)} className="accent-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-white font-medium">Substituir dados</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Substitui tudo. Chamados ativos no Assyst são protegidos automaticamente.</p>
                </div>
              </label>
              <label className={`flex-1 flex items-start gap-2 cursor-pointer rounded-lg border p-3 transition ${!substituir ? "border-green-500 bg-green-950/30" : "border-gray-700 hover:border-gray-600"}`}>
                <input type="radio" name="modo-resolvidos" checked={!substituir} onChange={() => setSubstituir(false)} className="accent-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-white font-medium">Adicionar aos existentes</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Insere apenas registros novos. Nada é removido. Ideal para lotes históricos.</p>
                </div>
              </label>
            </div>
            <div className="border-2 border-dashed border-gray-700 hover:border-green-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {selectedFiles.length === 0 ? "Clique para selecionar os arquivos (.csv)" : selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} arquivos selecionados`}
              </p>
              {selectedFiles.length > 1 && <p className="text-xs text-gray-500 mt-1">{selectedFiles.map(f => f.name).join(", ")}</p>}
              {importResult?.error && <p className="text-red-400 text-xs mt-2">{importResult.error}</p>}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" multiple className="hidden" onChange={e => { setSelectedFiles(Array.from(e.target.files ?? [])); setImportResult(null); }} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImportModal(false); setSelectedFiles([]); setImportResult(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
              <button onClick={handleImport} disabled={selectedFiles.length === 0 || importing}
                className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                {importing ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
