"use client";

import { useEffect, useRef, useState } from "react";

type Atribuido = {
  id: number;
  numeroRedmine: string;
  numerosAssyst: string;
  criadoEm: string | null;
  tipo: string | null;
  situacao: string | null;
  titulo: string | null;
  atribuidoPara: string | null;
  alteradoEm: string | null;
  descricao: string | null;
  ultimasNotas: string | null;
  solicitadoEm: string | null;
  solicitadoObs: string | null;
  solicitadoOperador: string | null;
};

type DadosAtribuidos = {
  registros: Atribuido[];
  total: number;
  page: number;
  totalPages: number;
  totalGeral: number;
  emAcompanhamento: number;
  emAtrasoTotal: number;
  emAtencaoTotal: number;
  paraDevolver: number;
  assystAtivos: string[];
  chamadosEmFila: string[];
  contagemPorPessoa: { nome: string; total: number; emAtraso: number }[];
  idsDevolver: number[];
  devolverInfo: { assyst: string; redmine: string }[];
};

function splitAssyst(raw: string): string[] {
  return raw.split(/[;/,|\\]|\s+e\s+/i).map(s => s.trim()).filter(Boolean);
}

function parseDias(criadoEm: string | null): number | null {
  if (!criadoEm) return null;
  const match = criadoEm.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const ts = Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return Math.floor((Date.now() - ts) / 86400000);
  }
  const d = new Date(criadoEm.trim());
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function badgeDias(dias: number | null) {
  if (dias === null) return null;
  if (dias >= 5) return { cls: "bg-red-600 text-white", label: `⚠ ${dias}d` };
  if (dias >= 3) return { cls: "bg-yellow-500 text-white", label: `⚠ ${dias}d` };
  return null;
}

function assystUrl(num: string) {
  return `https://cati.tjce.jus.br/assystnet/#events/${num}?eventType=1&currentIndex=0`;
}

function redmineUrl(num: string) {
  return `https://redmine.tjce.jus.br/issues/${num}`;
}

function corSituacao(sit: string) {
  const s = sit.toLowerCase();
  if (s.includes("cancelad")) return "bg-gray-600/30 text-gray-400 border border-gray-500/30";
  return "bg-green-500/20 text-green-400 border border-green-500/30";
}

function preview(texto: string, max = 55): string {
  const s = texto.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cortado = s.slice(0, max);
  const ultimoEspaco = cortado.lastIndexOf(" ");
  return (ultimoEspaco > 10 ? cortado.slice(0, ultimoEspaco) : cortado) + "…";
}

function CelulaTexto({ label, texto, onClick, resolvidoId }: {
  label: string;
  texto: string | null | undefined;
  onClick: (t: { titulo: string; corpo: string; resolvidoId?: number }) => void;
  resolvidoId?: number;
}) {
  if (!texto) return <span className="text-gray-600">—</span>;
  return (
    <button onClick={() => onClick({ titulo: label, corpo: texto, resolvidoId })}
      className="text-left text-xs text-gray-300 hover:text-blue-400 transition block underline-offset-2 hover:underline cursor-pointer">
      {preview(texto)}
    </button>
  );
}

export default function RedmineAtribuidosPage() {
  const [dados, setDados] = useState<DadosAtribuidos | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [xlsExporting, setXlsExporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<{ count?: number; skipped?: number; error?: string } | null>(null);
  const [filtroPessoa, setFiltroPessoa] = useState("");
  const [filtroAtraso, setFiltroAtraso] = useState<"atraso" | "atencao" | null>(null);
  const [busca, setBusca] = useState("");
  const [substituir, setSubstituir] = useState(true);
  const [textoModal, setTextoModal] = useState<{ titulo: string; corpo: string; resolvidoId?: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [solicitandoId, setSolicitandoId] = useState<number | null>(null);
  const [solicitandoObs, setSolicitandoObs] = useState("");
  const [solicitandoOperador, setSolicitandoOperador] = useState("");
  const [filtroAcomp, setFiltroAcomp] = useState(false);
  const [filtroDevolverTI, setFiltroDevolverTI] = useState(false);
  const [modalDevolverTI, setModalDevolverTI] = useState(false);
  const [colaboradores, setColaboradores] = useState<{ id: number; nome: string }[]>([]);

  useEffect(() => {
    fetch("/api/colaboradores?all=true")
      .then(r => r.json())
      .then(d => setColaboradores((d.colaboradores ?? []).filter((c: { ativo: boolean }) => c.ativo)));
  }, []);

  const fileRef = useRef<HTMLInputElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  function buildParams(pg: number, buscaQ: string, pessoaQ: string, atrasoQ: string | null, acompQ: boolean, devolverQ: boolean) {
    const p = new URLSearchParams({ page: String(pg) });
    if (buscaQ) p.set("busca", buscaQ);
    if (pessoaQ) p.set("pessoa", pessoaQ);
    if (atrasoQ) p.set("filtroAtraso", atrasoQ);
    if (acompQ) p.set("acomp", "1");
    if (devolverQ) p.set("devolver", "1");
    return p;
  }

  function load(pg = 1, buscaQ = busca, pessoaQ = filtroPessoa, atrasoQ = filtroAtraso, acompQ = filtroAcomp, devolverQ = filtroDevolverTI) {
    setLoading(true);
    fetch(`/api/redmine-atribuidos?${buildParams(pg, buscaQ, pessoaQ, atrasoQ, acompQ, devolverQ)}`)
      .then(r => r.json())
      .then((d: DadosAtribuidos) => { setDados(d); setLoading(false); });
  }

  useEffect(() => { load(1, "", "", null, false, false); }, []);

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => load(1, busca, filtroPessoa, filtroAtraso, filtroAcomp, filtroDevolverTI), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function handleFiltroAtraso(f: "atraso" | "atencao") {
    const novo = filtroAtraso === f ? null : f;
    setFiltroAtraso(novo);
    load(1, busca, filtroPessoa, novo, filtroAcomp, filtroDevolverTI);
  }
  function handleFiltroAcomp() {
    const novo = !filtroAcomp;
    setFiltroAcomp(novo);
    load(1, busca, filtroPessoa, filtroAtraso, novo, filtroDevolverTI);
  }
  function handleFiltroDevolverTI() {
    const novo = !filtroDevolverTI;
    setFiltroDevolverTI(novo);
    load(1, busca, filtroPessoa, filtroAtraso, filtroAcomp, novo);
  }
  function handleFiltroPessoa(nome: string) {
    const novo = filtroPessoa === nome ? "" : nome;
    setFiltroPessoa(novo);
    load(1, busca, novo, filtroAtraso, filtroAcomp, filtroDevolverTI);
  }

  async function handleImport() {
    if (selectedFiles.length === 0) return;
    setImporting(true);
    setImportResult(null);
    const texts = await Promise.all(selectedFiles.map(f => f.text()));
    const combined = texts[0] + (texts.length > 1
      ? "\n" + texts.slice(1).map(t => t.split("\n").slice(1).join("\n")).join("\n")
      : "");
    const res = await fetch(`/api/redmine-atribuidos?substituir=${substituir ? "1" : "0"}`, {
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
    if (!confirm("Limpar todos os Atribuídos importados?")) return;
    await fetch("/api/redmine-atribuidos", { method: "DELETE" });
    load(1, "", "", null, false, false);
  }

  async function salvarSolicitado(id: number, obs: string, operador: string) {
    setSaving(true);
    const agora = new Date().toISOString();
    await fetch("/api/redmine-atribuidos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, solicitadoEm: agora, solicitadoObs: obs, solicitadoOperador: operador || null }),
    });
    setSaving(false);
    setSolicitandoId(null);
    setSolicitandoObs("");
    setSolicitandoOperador("");
    setDados(d => d ? { ...d, registros: d.registros.map(r => r.id === id ? { ...r, solicitadoEm: agora, solicitadoObs: obs, solicitadoOperador: operador || null } : r) } : d);
  }

  async function limparSolicitado(id: number) {
    await fetch("/api/redmine-atribuidos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, limparSolicitado: true }),
    });
    setDados(d => d ? { ...d, registros: d.registros.map(r => r.id === id ? { ...r, solicitadoEm: null, solicitadoObs: null, solicitadoOperador: null } : r) } : d);
  }

  function diasSolicitado(iso: string | null): number | null {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  async function exportXLS() {
    setXlsExporting(true);
    try {
      const params = buildParams(1, busca, filtroPessoa, filtroAtraso, filtroAcomp, filtroDevolverTI);
      params.set("export", "1");
      const res = await fetch(`/api/redmine-atribuidos?${params}`);
      const data = await res.json();
      const todos: Atribuido[] = data.registros ?? [];

      function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
      const rows = todos.map(r => {
        const redmineCell = `<a href="${esc(redmineUrl(r.numeroRedmine))}">${esc(r.numeroRedmine)}</a>`;
        const nums = splitAssyst(r.numerosAssyst);
        const assystCell = nums.length === 0 ? esc(r.numerosAssyst) : nums.map(n => `<a href="${esc(assystUrl(n))}">${esc(n)}</a>`).join("<br>");
        return `<tr><td>${redmineCell}</td><td>${assystCell}</td><td>${esc(r.criadoEm ?? "")}</td><td>${esc(r.alteradoEm ?? "")}</td><td>${esc(r.tipo ?? "")}</td><td>${esc(r.situacao ?? "")}</td><td>${esc(r.titulo ?? "")}</td><td>${esc(r.atribuidoPara ?? "")}</td><td>${esc(r.descricao ?? "")}</td><td>${esc(r.ultimasNotas ?? "")}</td></tr>`;
      }).join("");
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>td{mso-wrap-text:auto;vertical-align:top;font-size:11pt;}th{background:#1e293b;color:#fff;font-size:11pt;}</style></head><body><table border="1"><tr><th>Redmine #</th><th>Nº Assyst</th><th>Criado em</th><th>Alterado em</th><th>Tipo</th><th>Situação</th><th>Título</th><th>Atribuído para</th><th>Descrição</th><th>Últimas notas</th></tr>${rows}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "redmine-atribuidos.xls"; a.click();
      URL.revokeObjectURL(url);
    } finally { setXlsExporting(false); }
  }

  // Derived
  const registros = dados?.registros ?? [];
  const assystAtivos = new Set((dados?.assystAtivos ?? []).map(n => n.toUpperCase()));
  const chamadosEmFila = new Set((dados?.chamadosEmFila ?? []).map(n => n.toUpperCase()));
  const totalGeral = dados?.totalGeral ?? 0;
  const emAcompanhamento = dados?.emAcompanhamento ?? 0;
  const emAtrasoTotal = dados?.emAtrasoTotal ?? 0;
  const emAtencaoTotal = dados?.emAtencaoTotal ?? 0;
  const paraDevolver = dados?.paraDevolver ?? 0;
  const contagemPorPessoa = dados?.contagemPorPessoa ?? [];
  const idsDevolver = new Set(dados?.idsDevolver ?? []);
  const devolverInfo = dados?.devolverInfo ?? [];
  const devolverAbertos = devolverInfo.filter(i => chamadosEmFila.has(i.assyst.toUpperCase()));
  const devolverEncerrados = devolverInfo.filter(i => !chamadosEmFila.has(i.assyst.toUpperCase()));
  const page = dados?.page ?? 1;
  const totalPages = dados?.totalPages ?? 1;
  const total = dados?.total ?? 0;

  function assystEncerrado(r: Atribuido): boolean {
    return idsDevolver.has(r.id);
  }

  return (
    <div>
      <div ref={topScrollRef} className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Redmine Atribuídos</h2>
          <p className="text-sm text-gray-400 mt-0.5">Redmines atribuídos à Coordenadoria de Atendimento</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {totalGeral > 0 && (
            <>
              <button onClick={exportXLS} disabled={xlsExporting}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition">
                {xlsExporting ? "Exportando..." : "↓ Exportar XLS"}
              </button>
              <button onClick={handleLimpar}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
                Limpar
              </button>
            </>
          )}
          <button onClick={() => { setImportModal(true); setSelectedFiles([]); setImportResult(null); }}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar Atribuídos
          </button>
        </div>
      </div>

      {/* Stats */}
      {dados && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total importados</p>
            <p className="text-3xl font-bold text-blue-400">{totalGeral}</p>
          </div>
          <button
            onClick={() => handleFiltroAtraso("atraso")}
            className={`rounded-xl p-4 border text-left transition cursor-pointer ${filtroAtraso === "atraso" ? "ring-2 ring-red-500 animate-pulse" : ""} ${emAtrasoTotal > 0 ? "bg-red-950/30 border-red-700 hover:border-red-500" : "bg-gray-900 border-gray-800 hover:border-gray-600"}`}>
            <p className="text-xs text-gray-400 mb-1">Em atraso (≥5 dias)</p>
            <p className={`text-3xl font-bold ${emAtrasoTotal > 0 ? "text-red-400" : "text-white"}`}>{emAtrasoTotal}</p>
            <p className="text-xs mt-1 text-gray-500">{filtroAtraso === "atraso" ? "✓ Filtro ativo — clique para remover" : "⚠ Clique para filtrar"}</p>
          </button>
          <button
            onClick={() => handleFiltroAtraso("atencao")}
            className={`rounded-xl p-4 border text-left transition cursor-pointer ${filtroAtraso === "atencao" ? "ring-2 ring-yellow-500 animate-pulse" : ""} ${emAtencaoTotal > 0 ? "bg-yellow-950/30 border-yellow-700 hover:border-yellow-500" : "bg-gray-900 border-gray-800 hover:border-gray-600"}`}>
            <p className="text-xs text-gray-400 mb-1">Em atenção (≥3 dias)</p>
            <p className={`text-3xl font-bold ${emAtencaoTotal > 0 ? "text-yellow-400" : "text-white"}`}>{emAtencaoTotal}</p>
            <p className="text-xs mt-1 text-gray-500">{filtroAtraso === "atencao" ? "✓ Filtro ativo — clique para remover" : "⚠ Clique para filtrar"}</p>
          </button>
          <button
            onClick={handleFiltroDevolverTI}
            className={`rounded-xl p-4 border text-left transition cursor-pointer ${filtroDevolverTI ? "ring-2 ring-yellow-400 animate-pulse bg-yellow-950/30 border-yellow-600" : paraDevolver > 0 ? "bg-yellow-950/20 border-yellow-800 hover:border-yellow-600" : "bg-gray-900 border-gray-800 hover:border-gray-600"}`}>
            <p className="text-xs text-gray-400 mb-1">Devolver à TI</p>
            <p className={`text-3xl font-bold ${paraDevolver > 0 ? "text-yellow-400" : "text-white"}`}>{paraDevolver}</p>
            <p className="text-xs mt-1 text-gray-500">{filtroDevolverTI ? "✓ Filtro ativo" : "Assyst encerrado"}</p>
          </button>
          <button
            onClick={handleFiltroAcomp}
            className={`rounded-xl p-4 border text-left transition cursor-pointer ${filtroAcomp ? "ring-2 ring-orange-500 animate-pulse bg-orange-950/30 border-orange-600" : emAcompanhamento > 0 ? "bg-orange-950/20 border-orange-800 hover:border-orange-600" : "bg-gray-900 border-gray-800 hover:border-gray-600"}`}>
            <p className="text-xs text-gray-400 mb-1">Em acompanhamento</p>
            <p className={`text-3xl font-bold ${emAcompanhamento > 0 ? "text-orange-400" : "text-white"}`}>{emAcompanhamento}</p>
            <p className="text-xs mt-1 text-gray-500">{filtroAcomp ? "✓ Filtro ativo" : "📌 Clique para filtrar"}</p>
          </button>
        </div>
      )}

      {/* Alerta Devolver à TI */}
      {paraDevolver > 0 && (
        <button
          onClick={() => setModalDevolverTI(true)}
          className="w-full flex items-center gap-3 px-4 py-3 mb-6 rounded-xl border border-yellow-700 bg-yellow-950/30 hover:bg-yellow-950/50 transition cursor-pointer text-left">
          <span className="text-yellow-400 text-xl">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-300">
              {paraDevolver} Chamado{paraDevolver > 1 ? "s" : ""} no Assyst, verificar se não pode{paraDevolver > 1 ? "m" : ""} ser encerrado{paraDevolver > 1 ? "s" : ""}.
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">O operador ainda está com o chamado em aberto no Cati — clique para ver a lista.</p>
          </div>
          <span className="text-yellow-600 text-xs shrink-0">Ver lista →</span>
        </button>
      )}

      {/* Por responsável */}
      {contagemPorPessoa.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Por responsável</p>
          <div className="flex flex-wrap gap-3">
            {contagemPorPessoa.map(p => (
              <button
                key={p.nome}
                onClick={() => handleFiltroPessoa(p.nome)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${
                  filtroPessoa === p.nome ? "bg-blue-600/20 border-blue-500/50 animate-pulse" : "bg-gray-900 border-gray-800 hover:border-gray-600"
                }`}>
                <div>
                  <p className="text-sm font-medium text-white">{p.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-bold text-white tabular-nums">{p.total}</span> redmine{p.total !== 1 ? "s" : ""}
                    {p.emAtraso > 0 && <span className="ml-2 font-semibold text-red-400">· {p.emAtraso} em atraso</span>}
                  </p>
                </div>
              </button>
            ))}
            {filtroPessoa && (
              <button onClick={() => handleFiltroPessoa("")}
                className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition self-center">
                Limpar filtro
              </button>
            )}
          </div>
        </div>
      )}

      {/* Busca */}
      {totalGeral > 0 && (
        <div className="mb-4">
          <div className="relative w-fit">
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar chamado..."
              className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg pl-7 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]" />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">🔍</span>
            {busca && <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div ref={tableScrollRef} className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        {loading ? (
          <p className="px-4 py-8 text-center text-gray-500 text-sm">Carregando...</p>
        ) : totalGeral === 0 ? (
          <p className="px-4 py-12 text-center text-gray-500 text-sm">Nenhum Redmine atribuído importado. Clique em "Importar Atribuídos".</p>
        ) : registros.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-500 text-sm">Nenhum registro encontrado para os filtros selecionados.</p>
        ) : (
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 whitespace-nowrap">Acomp.</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Redmine #</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Nº Assyst</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Criado em</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Alterado em</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Tipo</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Situação</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Título</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Atribuído para</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Descrição</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Últimas notas</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(r => {
                const nums = splitAssyst(r.numerosAssyst);
                return (
                  <tr key={r.id} className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition ${r.solicitadoEm ? "border-l-2 border-l-orange-500/60" : ""}`}>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {r.solicitadoEm ? (
                        <div className="flex flex-col gap-1">
                          <button title={r.solicitadoObs ?? "Em acompanhamento"}
                            onClick={() => { setSolicitandoId(r.id); setSolicitandoObs(r.solicitadoObs ?? ""); setSolicitandoOperador(r.solicitadoOperador ?? ""); }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-medium hover:bg-orange-500/30 transition cursor-pointer">
                            📌 {diasSolicitado(r.solicitadoEm) === 0 ? "hoje" : `${diasSolicitado(r.solicitadoEm)}d`}
                            {r.solicitadoOperador && <span className="ml-0.5 opacity-80">· {r.solicitadoOperador.split(" ")[0]}</span>}
                          </button>
                          <button onClick={() => limparSolicitado(r.id)} className="text-xs text-gray-600 hover:text-red-400 transition text-left">✕ limpar</button>
                        </div>
                      ) : (
                        <button onClick={() => { setSolicitandoId(r.id); setSolicitandoObs(""); setSolicitandoOperador(""); }}
                          className="text-gray-600 hover:text-orange-400 transition text-lg leading-none" title="Marcar em acompanhamento">
                          📌
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a href={redmineUrl(r.numeroRedmine)} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition">
                        {r.numeroRedmine}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {nums.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {nums.map(n => (
                            <a key={n} href={assystUrl(n)} target="_blank" rel="noopener noreferrer"
                              className="font-mono text-blue-400 hover:text-blue-300 hover:underline transition">
                              {n}
                            </a>
                          ))}
                          {assystEncerrado(r) && (
                            <span className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
                              ⚠ Devolver à TI
                            </span>
                          )}
                        </div>
                      ) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.criadoEm
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-300 border border-gray-600/40">{r.criadoEm}</span>
                        : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{r.alteradoEm ?? "—"}</span>
                        {(() => { const b = badgeDias(parseDias(r.alteradoEm)); return b ? <span title="Chamado atrasado" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse cursor-help ${b.cls}`}>{b.label}</span> : null; })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{r.tipo ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.situacao
                        ? <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${corSituacao(r.situacao)}`}>{r.situacao}</span>
                        : "—"}
                    </td>
                    <td className="px-4 py-3"><CelulaTexto label="Título" texto={r.titulo} onClick={setTextoModal} /></td>
                    <td className="px-4 py-3">
                      {r.atribuidoPara
                        ? <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-blue-500/20 text-blue-300 border border-blue-500/30">{r.atribuidoPara}</span>
                        : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3"><CelulaTexto label="Descrição" texto={r.descricao} onClick={setTextoModal} /></td>
                    <td className="px-4 py-3"><CelulaTexto label="Últimas notas" texto={r.ultimasNotas} onClick={setTextoModal} resolvidoId={r.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && total > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-gray-500">
            Exibindo <span className="text-gray-300">{(page - 1) * 100 + 1}–{Math.min(page * 100, total)}</span> de <span className="text-gray-300">{total}</span> registros
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => load(page - 1)} disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
              ← Anterior
            </button>
            <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
            <button onClick={() => load(page + 1)} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Modal: Devolver à TI */}
      {modalDevolverTI && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setModalDevolverTI(false)}>
          <div className="bg-gray-900 border border-yellow-800/50 rounded-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-yellow-300">⚠ Chamados no Assyst para verificar</h3>
                <p className="text-xs text-gray-500 mt-0.5">Redmines cujo Assyst saiu da fila — verifique a situação e devolva à TI</p>
              </div>
              <button onClick={() => setModalDevolverTI(false)} className="text-gray-600 hover:text-gray-400 transition">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-4">
              {devolverEncerrados.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-2">✓ Assyst encerrado — pode fechar o Redmine ({devolverEncerrados.length})</p>
                  <div className="space-y-2">
                    {devolverEncerrados.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-950/20 border border-green-900/40">
                        <div>
                          <a href={`https://cati.tjce.jus.br/assystnet/#events/${item.assyst}?eventType=1&currentIndex=0`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline transition">{item.assyst}</a>
                          <p className="text-xs text-gray-500 mt-0.5">Redmine #{item.redmine}</p>
                        </div>
                        <span className="text-xs text-green-400 font-medium">✓ Fechar Redmine</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {devolverAbertos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-yellow-400 mb-2">⚠ Ainda aberto em Chamados — cobrar operador ({devolverAbertos.length})</p>
                  <div className="space-y-2">
                    {devolverAbertos.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-yellow-950/20 border border-yellow-900/40">
                        <div>
                          <a href={`https://cati.tjce.jus.br/assystnet/#events/${item.assyst}?eventType=1&currentIndex=0`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline transition">{item.assyst}</a>
                          <p className="text-xs text-gray-500 mt-0.5">Redmine #{item.redmine}</p>
                        </div>
                        <span className="text-xs text-yellow-600 font-medium">Devolver à TI</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setModalDevolverTI(false)}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal texto */}
      {textoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => { setTextoModal(null); setEditMode(false); }}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">{textoModal.titulo}</h3>
              <div className="flex items-center gap-2">
                {textoModal.titulo === "Últimas notas" && textoModal.resolvidoId && !editMode && (
                  <button onClick={() => { setEditValue(textoModal.corpo); setEditMode(true); }}
                    className="text-xs px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white transition">✏ Editar</button>
                )}
                <button onClick={() => { setTextoModal(null); setEditMode(false); }} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
              </div>
            </div>
            {editMode ? (
              <div className="flex flex-col gap-3 px-5 py-4">
                <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={10}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 resize-y focus:outline-none focus:border-blue-500" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditMode(false)}
                    className="text-sm px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition">Cancelar</button>
                  <button disabled={saving} onClick={async () => {
                    if (!textoModal.resolvidoId) return;
                    setSaving(true);
                    await fetch("/api/redmine-atribuidos", {
                      method: "PATCH", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: textoModal.resolvidoId, ultimasNotas: editValue }),
                    });
                    setSaving(false);
                    setEditMode(false);
                    setTextoModal({ ...textoModal, corpo: editValue });
                    setDados(d => d ? { ...d, registros: d.registros.map(r => r.id === textoModal.resolvidoId ? { ...r, ultimasNotas: editValue } : r) } : d);
                  }}
                    className="text-sm px-4 py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium transition">
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {textoModal.corpo}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal acompanhamento */}
      {solicitandoId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => { setSolicitandoId(null); setSolicitandoObs(""); setSolicitandoOperador(""); }}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-1">📌 Marcar em acompanhamento</h3>
            <p className="text-xs text-gray-400 mb-4">A data de hoje será registrada. Tickets marcados não são removidos ao sincronizar.</p>
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1.5">Operador</label>
              <div className="relative">
                <select value={solicitandoOperador} onChange={e => setSolicitandoOperador(e.target.value)}
                  className="w-full appearance-none bg-gray-800 border border-gray-600 text-sm rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer pr-8">
                  <option value="">Todos os atendentes</option>
                  {colaboradores.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
              </div>
            </div>
            <div className="mb-1">
              <label className="block text-xs text-gray-500 mb-1.5">Observação</label>
              <textarea value={solicitandoObs} onChange={e => setSolicitandoObs(e.target.value)}
                placeholder="Ex: Verificando com o usuário se o problema foi resolvido..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 resize-y focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setSolicitandoId(null); setSolicitandoObs(""); setSolicitandoOperador(""); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
              <button onClick={() => salvarSolicitado(solicitandoId, solicitandoObs, solicitandoOperador)} disabled={saving}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal importar */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Importar Redmine Atribuídos</h3>
            <p className="text-xs text-gray-400 mb-3">Dados do Redmine são sempre atualizados. Marcações 📌 nunca são removidas automaticamente.</p>
            <div className="mb-2 flex flex-col gap-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="modo-atribuidos" checked={substituir} onChange={() => setSubstituir(true)} className="accent-blue-500 mt-0.5" />
                <div>
                  <span className="text-sm text-gray-300">Sincronizar fila</span>
                  <p className="text-xs text-gray-500">Remove tickets sem 📌 que saíram do CSV. Tickets em trânsito (com 📌) são preservados.</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="modo-atribuidos" checked={!substituir} onChange={() => setSubstituir(false)} className="accent-blue-500 mt-0.5" />
                <div>
                  <span className="text-sm text-gray-300">Atualizar e adicionar</span>
                  <p className="text-xs text-gray-500">Mantém todos os tickets anteriores, insere novos e atualiza os dados.</p>
                </div>
              </label>
            </div>
            <div className="border-2 border-dashed border-gray-700 hover:border-blue-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {selectedFiles.length === 0 ? "Clique para selecionar arquivo(s) (.csv)" : selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} arquivos selecionados`}
              </p>
              {importResult?.error && <p className="text-red-400 text-xs mt-2">{importResult.error}</p>}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" multiple className="hidden"
              onChange={e => { setSelectedFiles(Array.from(e.target.files ?? [])); setImportResult(null); }} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImportModal(false); setSelectedFiles([]); setImportResult(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
              <button onClick={handleImport} disabled={selectedFiles.length === 0 || importing}
                className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                {importing ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
