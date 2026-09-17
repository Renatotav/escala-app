"use client";

import { useEffect, useRef, useState } from "react";

type Produtividade = {
  id: number;
  numeroChamado: string;
  dataAbertura: string | null;
  usuarioFechamento: string | null;
  dataResolucao: string | null;
  situacaoRegra: string | null;
};

type Dados = {
  registros: Produtividade[];
  total: number;
  page: number;
  totalPages: number;
  totalRegistros: number;
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function diasResolucao(abertura: string | null, resolucao: string | null): number | null {
  if (!abertura || !resolucao) return null;
  return Math.max(0, Math.floor((new Date(resolucao).getTime() - new Date(abertura).getTime()) / 86400000));
}

function DiasBadge({ dias }: { dias: number }) {
  if (dias > 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
        ⚠ {dias}d
      </span>
    );
  }
  if (dias > 14) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold">
        {dias}d
      </span>
    );
  }
  if (dias > 3) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
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

export default function ProdutividadePage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [xlsExporting, setXlsExporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<{ count?: number; skipped?: number; error?: string } | null>(null);
  const [busca, setBusca] = useState("");
  const [substituir, setSubstituir] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  function load(pg = 1, buscaQ = "") {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (buscaQ) params.set("busca", buscaQ);
    fetch(`/api/produtividade?${params}`)
      .then(r => r.json())
      .then((d: Dados) => { setDados(d); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(1, busca), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

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
      const res = await fetch("/api/produtividade/import", { method: "POST", body: formData });
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
    load(1, busca);
    setImporting(false);
  }

  async function handleLimpar() {
    if (!confirm("Limpar todos os registros de produtividade importados?")) return;
    await fetch("/api/produtividade", { method: "DELETE" });
    load();
  }

  async function exportXLS() {
    setXlsExporting(true);
    try {
      const params = new URLSearchParams({ export: "1" });
      if (busca) params.set("busca", busca);
      const res = await fetch(`/api/produtividade?${params}`);
      const data = await res.json();
      const todos: Produtividade[] = data.registros ?? [];

      function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
      const dataRows = todos.map(r =>
        `<tr><td>${esc(r.numeroChamado)}</td><td>${esc(fmtDateTime(r.dataAbertura))}</td><td>${esc(r.usuarioFechamento ?? "")}</td><td>${esc(fmtDateTime(r.dataResolucao))}</td><td>${esc(r.situacaoRegra ?? "")}</td></tr>`
      ).join("");
      const html = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}th{background:#f0f0f0}</style></head><body><table><tr><th>Nº Chamado</th><th>Data/Hora Abertura</th><th>Usuário Fechamento</th><th>Data/Hora Resolução</th><th>Situação Regra</th></tr>${dataRows}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "produtividade.xls"; a.click();
      URL.revokeObjectURL(url);
    } finally { setXlsExporting(false); }
  }

  const totalRegistros = dados?.totalRegistros ?? 0;
  const registros = dados?.registros ?? [];
  const page = dados?.page ?? 1;
  const totalPages = dados?.totalPages ?? 1;
  const total = dados?.total ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Produtividade</h2>
          <p className="text-sm text-gray-400 mt-0.5">Registros de produtividade por operador</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {totalRegistros > 0 && (
            <button onClick={exportXLS} disabled={xlsExporting}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {xlsExporting ? "Exportando..." : "↓ Exportar XLS"}
            </button>
          )}
          {totalRegistros > 0 && (
            <button onClick={handleLimpar}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
              Limpar dados
            </button>
          )}
          <button onClick={() => { setImportModal(true); setSelectedFiles([]); setImportResult(null); }}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar planilha
          </button>
        </div>
      </div>

      {/* Stats */}
      {dados && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Total de registros</p>
            <p className="text-3xl font-bold text-white">{totalRegistros.toLocaleString("pt-BR")}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Exibindo na pesquisa</p>
            <p className="text-3xl font-bold text-white">{total.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      )}

      {/* Pesquisa */}
      {totalRegistros > 0 && (
        <div className="mb-4">
          <div className="relative w-fit">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar chamado ou usuário..."
              className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg pl-7 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
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
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[18%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Nº Chamado</th>
              <th className="text-left px-4 py-3">Abertura</th>
              <th className="text-left px-4 py-3">Usuário Fechamento</th>
              <th className="text-left px-4 py-3">Resolução</th>
              <th className="text-left px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>
            )}
            {!loading && registros.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                {totalRegistros === 0 ? "Nenhum registro importado" : "Nenhum registro encontrado"}
              </td></tr>
            )}
            {registros.map(r => {
              const dias = diasResolucao(r.dataAbertura, r.dataResolucao);
              return (
              <tr key={r.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`https://cati.tjce.jus.br/assystnet/#events/${r.numeroChamado}?eventType=1&currentIndex=0`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-mono font-medium text-xs hover:underline transition">
                      {r.numeroChamado}
                    </a>
                    {dias !== null && <DiasBadge dias={dias} />}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">{fmtDateTime(r.dataAbertura)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/40 truncate block max-w-full">
                    {r.usuarioFechamento ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">{fmtDateTime(r.dataResolucao)}</td>
                <td className="px-4 py-3">
                  {r.situacaoRegra ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.situacaoRegra.toLowerCase().includes("resolvido") || r.situacaoRegra.toLowerCase().includes("fechado")
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {r.situacaoRegra}
                    </span>
                  ) : <span className="text-gray-600 text-xs">—</span>}
                </td>
              </tr>
            );})}
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
            <button onClick={() => load(page - 1, busca)} disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
              ← Anterior
            </button>
            <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
            <button onClick={() => load(page + 1, busca)} disabled={page === totalPages}
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
            <h3 className="text-base font-semibold text-white mb-1">Importar Produtividade</h3>
            <p className="text-xs text-gray-400 mb-4">Selecione o arquivo exportado do Power BI (.ods ou .xlsx).</p>
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
                <input type="radio" name="modo-prod" checked={substituir} onChange={() => setSubstituir(true)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Substituir todos os dados</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo-prod" checked={!substituir} onChange={() => setSubstituir(false)} className="accent-blue-500" />
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
