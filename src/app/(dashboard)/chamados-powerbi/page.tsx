"use client";

import { useEffect, useRef, useState } from "react";

type ChamadoPowerbi = {
  id: number;
  numero: string;
  dataAbertura: string | null;
  equipeAtribuida: string | null;
  usuarioAtribuido: string | null;
  dataMovimentacao: string | null;
  situacaoRegra: string | null;
};

type CategoriaStats = { categoria: string; total: number };

type Dados = {
  chamados: ChamadoPowerbi[];
  total: number;
  page: number;
  totalPages: number;
  totalValidos: number;
  periodoMin: string | null;
  periodoMax: string | null;
  porCategoria: CategoriaStats[];
};

const SLA_RULES = [
  { keyword: "Cadastro",      days: 2  },
  { keyword: "Migração",      days: 15 },
  { keyword: "Orientação",    days: 5  },
  { keyword: "Erro ou Falha", days: 5  },
];

function getSLA(equipeAtribuida: string | null): number | null {
  if (!equipeAtribuida) return null;
  const lower = equipeAtribuida.toLowerCase();
  for (const { keyword, days } of SLA_RULES) {
    if (lower.includes(keyword.toLowerCase())) return days;
  }
  return null;
}

function diasDesde(dataAbertura: string | null): number {
  if (!dataAbertura) return 0;
  return Math.floor((Date.now() - new Date(dataAbertura).getTime()) / 86400000);
}

function DiasBadge({ dias, equipeAtribuida }: { dias: number; equipeAtribuida: string | null }) {
  const sla = getSLA(equipeAtribuida);
  if (sla === null || dias < sla) return null;
  return (
    <span title={`SLA: ${sla}d`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse cursor-help">
      ⚠ {dias}d
    </span>
  );
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ChamadosPowerbiPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [xlsExporting, setXlsExporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<{ count?: number; skipped?: number; error?: string } | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [substituir, setSubstituir] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function load(pg = 1, buscaQ = "", cat: string | null = null) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (buscaQ) params.set("busca", buscaQ);
    if (cat) params.set("categoria", cat);
    fetch(`/api/chamados-powerbi?${params}`)
      .then(r => r.json())
      .then((d: Dados) => { setDados(d); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(1, busca, filtroCategoria), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function toggleCategoria(cat: string) {
    const novo = filtroCategoria === cat ? null : cat;
    setFiltroCategoria(novo);
    load(1, busca, novo);
  }

  function clearFiltros() {
    setFiltroCategoria(null);
    load(1, busca, null);
  }

  async function handleImport() {
    if (selectedFiles.length === 0) return;
    setImporting(true);
    setImportResult(null);
    let totalCount = 0;
    let totalSkipped = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      const formData = new FormData();
      formData.append("file", selectedFiles[i]);
      formData.append("substituir", (i === 0 && substituir) ? "1" : "0");
      const res = await fetch("/api/chamados-powerbi/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({ error: data.error ?? "Erro ao importar" });
        setImporting(false);
        return;
      }
      totalCount += data.count ?? 0;
      totalSkipped += data.skipped ?? 0;
    }
    setImportResult({ count: totalCount, skipped: totalSkipped });
    setImportModal(false);
    setSelectedFiles([]);
    load(1, busca, filtroAtraso, filtroCategoria);
    setImporting(false);
  }

  async function handleLimpar() {
    if (!confirm("Limpar todos os chamados importados?")) return;
    await fetch("/api/chamados-powerbi", { method: "DELETE" });
    setFiltroCategoria(null);
    load();
  }

  async function exportXLS() {
    setXlsExporting(true);
    try {
      const params = new URLSearchParams({ export: "1" });
      if (filtroCategoria) params.set("categoria", filtroCategoria);
      if (busca) params.set("busca", busca);
      const res = await fetch(`/api/chamados-powerbi?${params}`);
      const data = await res.json();
      const todos: ChamadoPowerbi[] = data.chamados ?? [];

      function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
      const dataRows = todos.map(c => {
        const dias = diasDesde(c.dataAbertura);
        const url = `https://cati.tjce.jus.br/assystnet/#events/${c.numero}?eventType=1&currentIndex=0`;
        return `<tr><td><a href="${esc(url)}">${esc(c.numero)}</a></td><td>${dias ?? ""}</td><td>${esc(fmtDateTime(c.dataAbertura))}</td><td>${esc(c.equipeAtribuida ?? "")}</td><td>${esc(c.usuarioAtribuido ?? "")}</td><td>${esc(fmtDateTime(c.dataMovimentacao))}</td><td>${esc(c.situacaoRegra ?? "")}</td></tr>`;
      }).join("");
      const html = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}th{background:#f0f0f0}a{color:#1155cc}</style></head><body><table><tr><th>Nº Chamado (Assyst)</th><th>Dias em aberto</th><th>Abertura</th><th>Equipe Atribuída</th><th>Usuário Atribuído</th><th>Movimentação</th><th>Situação</th></tr>${dataRows}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "chamados_powerbi.xls"; a.click();
      URL.revokeObjectURL(url);
    } finally { setXlsExporting(false); }
  }

  const totalValidos = dados?.totalValidos ?? 0;
  const chamados = dados?.chamados ?? [];
  const page = dados?.page ?? 1;
  const totalPages = dados?.totalPages ?? 1;
  const total = dados?.total ?? 0;
  const porCategoria = dados?.porCategoria ?? [];
  const temFiltro = filtroCategoria !== null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Chamados Power BI</h2>
          <p className="text-sm text-gray-400 mt-0.5">Listagem de chamados por equipe e usuário</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {totalValidos > 0 && (
            <button onClick={exportXLS} disabled={xlsExporting}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {xlsExporting ? "Exportando..." : "↓ Exportar XLS"}
            </button>
          )}
          {totalValidos > 0 && (
            <button onClick={handleLimpar}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
              Limpar dados
            </button>
          )}
          <button onClick={() => { setImportModal(true); setSelectedFiles([]); setImportResult(null); }}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar chamados
          </button>
        </div>
      </div>

      {/* Stats principais */}
      {dados && (
        <>
          {/* Todos os cards numa linha só */}
          <div className="flex flex-wrap gap-3 mb-4">
            {/* Total */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-w-[150px] border-t-2 border-t-blue-600">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Total</p>
              <p className="text-3xl font-bold text-white tabular-nums">{totalValidos.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-gray-500 mt-1">chamados</p>
            </div>

            {/* Período */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-w-[150px] border-t-2 border-t-gray-600">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Período</p>
              <p className="text-xs font-medium text-gray-300">
                {dados.periodoMin ? fmtDateTime(dados.periodoMin).slice(0, 10) : "—"}
              </p>
              <p className="text-xs text-gray-500">→ {dados.periodoMax ? fmtDateTime(dados.periodoMax).slice(0, 10) : "—"}</p>
            </div>

            {/* Categorias */}
            {porCategoria.map(cat => {
              const ativo = filtroCategoria === cat.categoria;
              const sla = getSLA(cat.categoria);
              const label = cat.categoria.split(" ").slice(-2).join(" ");
              const colorMap: Record<string, string> = {
                "Erro ou Falha": "border-t-red-500",
                Cadastro:        "border-t-sky-500",
                Orientação:      "border-t-green-500",
                Migração:        "border-t-orange-500",
              };
              const numColor: Record<string, string> = {
                "Erro ou Falha": "text-red-400",
                Cadastro:        "text-sky-400",
                Orientação:      "text-green-400",
                Migração:        "text-orange-400",
              };
              const accent = Object.keys(colorMap).find(k => cat.categoria.includes(k)) ?? "";
              return (
                <button
                  key={cat.categoria}
                  onClick={() => toggleCategoria(cat.categoria)}
                  title={cat.categoria}
                  className={`rounded-xl px-4 py-4 border text-left transition min-w-[150px] border-t-2 ${
                    colorMap[accent] ?? "border-t-gray-500"
                  } ${
                    ativo
                      ? "bg-gray-700 border-gray-500 ring-2 ring-white/20"
                      : "bg-gray-900 border-gray-800 hover:bg-gray-800"
                  }`}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                  <p className={`text-3xl font-bold tabular-nums ${numColor[accent] ?? "text-white"}`}>
                    {cat.total.toLocaleString("pt-BR")}
                  </p>
                  {sla !== null && <p className="text-xs text-gray-500 mt-1">≥{sla} dias</p>}
                  {ativo && <p className="text-xs text-white/60 mt-1">✓ filtrado</p>}
                </button>
              );
            })}
          </div>

          {/* Indicador de filtro ativo */}
          {temFiltro && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-yellow-400">
                {`Filtrando: ${filtroCategoria}`}
                {" "}— {total.toLocaleString("pt-BR")} resultado(s)
              </span>
              <button onClick={clearFiltros} className="text-xs text-gray-500 hover:text-white underline">
                Limpar filtro
              </button>
            </div>
          )}
        </>
      )}

      {/* Pesquisa */}
      {totalValidos > 0 && (
        <div className="mb-4">
          <div className="relative w-fit">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar Chamado..."
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Nº Chamado (Assyst)</th>
              <th className="text-left px-4 py-3">Abertura</th>
              <th className="text-left px-4 py-3">Equipe Atribuída</th>
              <th className="text-left px-4 py-3">Usuário Atribuído</th>
              <th className="text-left px-4 py-3">Movimentação</th>
              <th className="text-left px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>
            )}
            {!loading && chamados.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                {totalValidos === 0 ? "Nenhum chamado importado" : "Nenhum chamado encontrado"}
              </td></tr>
            )}
            {chamados.map(c => {
              const dias = diasDesde(c.dataAbertura);
              const sla = getSLA(c.equipeAtribuida);
              const atrasado = sla !== null && dias >= sla;
              return (
                <tr key={c.id}
                  className={`border-b border-gray-800 last:border-0 transition ${atrasado ? "bg-red-950/30 hover:bg-red-950/50 border-l-2 border-l-red-600" : "hover:bg-gray-800/50"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://cati.tjce.jus.br/assystnet/#events/${c.numero}?eventType=1&currentIndex=0`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-mono font-medium hover:underline transition">
                        {c.numero}
                      </a>
                      <DiasBadge dias={dias} equipeAtribuida={c.equipeAtribuida} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">{fmtDateTime(c.dataAbertura)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 whitespace-nowrap">
                      {c.equipeAtribuida ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                    {c.usuarioAtribuido ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">{fmtDateTime(c.dataMovimentacao)}</td>
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

      {/* Paginação */}
      {totalPages > 1 && total > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-gray-500">
            Exibindo <span className="text-gray-300">{(page - 1) * 100 + 1}–{Math.min(page * 100, total)}</span> de <span className="text-gray-300">{total.toLocaleString("pt-BR")}</span> registros
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => load(page - 1, busca, filtroAtraso, filtroCategoria)} disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
              ← Anterior
            </button>
            <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
            <button onClick={() => load(page + 1, busca, filtroAtraso, filtroCategoria)} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Modal Importar */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Importar Chamados Power BI</h3>
            <p className="text-xs text-gray-400 mb-4">Selecione o arquivo exportado do Power BI (.ods ou .xlsx). A coluna G deve conter o Usuário Atribuído.</p>
            <div className="border-2 border-dashed border-gray-700 hover:border-blue-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {selectedFiles.length === 0
                  ? "Clique para selecionar arquivo(s) (.ods / .xlsx)"
                  : selectedFiles.length === 1
                    ? selectedFiles[0].name
                    : `${selectedFiles.length} arquivos selecionados`}
              </p>
              {importResult?.error && (
                <p className="text-red-400 text-xs mt-2">{importResult.error}</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".ods,.xlsx,.xls" multiple className="hidden"
              onChange={e => { setSelectedFiles(Array.from(e.target.files ?? [])); setImportResult(null); }} />
            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo-powerbi" checked={substituir} onChange={() => setSubstituir(true)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Substituir todos os dados</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo-powerbi" checked={!substituir} onChange={() => setSubstituir(false)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Adicionar aos existentes</span>
              </label>
            </div>
            {substituir && <p className="text-xs text-amber-500/80 mt-1.5">Os dados anteriores serão apagados antes de importar.</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImportModal(false); setSelectedFiles([]); setImportResult(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
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
