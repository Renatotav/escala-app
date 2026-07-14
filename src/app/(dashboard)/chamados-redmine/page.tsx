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

function diasDesde(dataAbertura: string | null): number {
  if (!dataAbertura) return 0;
  return Math.floor((Date.now() - new Date(dataAbertura).getTime()) / 86400000);
}

function DiasBadge({ dias }: { dias: number }) {
  if (dias >= 50) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
        ⚠ {dias}d
      </span>
    );
  }
  if (dias >= 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold">
        {dias}d
      </span>
    );
  }
  return null;
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ChamadosRedminePage() {
  const [chamados, setChamados] = useState<ChamadoRedmine[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ count?: number; error?: string } | null>(null);
  const [filtroAtraso, setFiltroAtraso] = useState(false);
  const [filtroAtencao, setFiltroAtencao] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch("/api/chamados-redmine")
      .then(r => r.json())
      .then((data: ChamadoRedmine[]) => { setChamados(data); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setImportResult(null);
  }

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", selectedFile);
    const res = await fetch("/api/chamados-redmine/import", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
      setImportResult({ count: data.count });
      setImportModal(false);
      setSelectedFile(null);
      load();
    } else {
      setImportResult({ error: data.error ?? "Erro ao importar" });
    }
    setImporting(false);
  }

  async function handleLimpar() {
    if (!confirm("Limpar todos os chamados Redmine importados?")) return;
    await fetch("/api/chamados-redmine", { method: "DELETE" });
    load();
  }

  // Exclui linhas de metadados do Power BI: número não pode ter espaços
  const validos = chamados.filter(c => /^\S+$/.test(c.numero?.trim() ?? "") && !c.numero?.includes(" "));
  const totalAtraso = validos.filter(c => diasDesde(c.dataAbertura) >= 50).length;
  const totalAtencao = validos.filter(c => { const d = diasDesde(c.dataAbertura); return d >= 30 && d < 50; }).length;
  const filtrados = filtroAtraso
    ? validos.filter(c => diasDesde(c.dataAbertura) >= 50)
    : filtroAtencao
      ? validos.filter(c => { const d = diasDesde(c.dataAbertura); return d >= 30 && d < 50; })
      : validos;

  const datas = validos.map(c => c.dataAbertura).filter(Boolean) as string[];
  const periodoMin = datas.length ? fmtDateTime(datas.reduce((a, b) => a < b ? a : b)) : "—";
  const periodoMax = datas.length ? fmtDateTime(datas.reduce((a, b) => a > b ? a : b)) : "—";

  function exportCSV() {
    function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
    const dataRows = filtrados.map(c => {
      const dias = diasDesde(c.dataAbertura);
      const url = `https://cati.tjce.jus.br/assystnet/#events/${c.numero}?eventType=1&currentIndex=0`;
      return `<tr><td><a href="${esc(url)}">${esc(c.numero)}</a></td><td>${dias ?? ""}</td><td>${esc(fmtDateTime(c.dataAbertura))}</td><td>${esc(c.equipeAtribuida ?? "")}</td><td>${esc(fmtDateTime(c.dataMovimentacao))}</td><td>${esc(c.situacaoRegra ?? "")}</td></tr>`;
    }).join("");
    const html = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}th{background:#f0f0f0}a{color:#1155cc}</style></head><body><table><tr><th>Referência</th><th>Dias em aberto</th><th>Abertura</th><th>Equipe Atribuída</th><th>Movimentação</th><th>Situação</th></tr>${dataRows}</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "chamados_redmine.xls"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Chamados Redmine</h2>
          <p className="text-sm text-gray-400 mt-0.5">Listagem de chamados por equipe</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {validos.length > 0 && (
            <button onClick={exportCSV}
              className="bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              ↓ Exportar XLS
            </button>
          )}
          {chamados.length > 0 && (
            <button onClick={handleLimpar}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
              Limpar dados
            </button>
          )}
          <button onClick={() => { setImportModal(true); setSelectedFile(null); setImportResult(null); }}
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
            <p className="text-3xl font-bold text-white">{validos.length.toLocaleString("pt-BR")}</p>
          </div>

          {/* Card ≥50 dias — filtro clicável */}
          <button
            onClick={() => { setFiltroAtraso(f => !f); setFiltroAtencao(false); }}
            className={`rounded-xl p-4 border text-left transition light-card-red ${
              filtroAtraso
                ? "bg-red-800 border-red-500 ring-2 ring-red-400"
                : totalAtraso > 0
                  ? "bg-red-950 border-red-700 hover:bg-red-900"
                  : "bg-gray-900 border-gray-800 hover:bg-gray-800"
            }`}
          >
            <p className="text-xs text-gray-400 mb-1">Em atraso (≥50 dias)</p>
            <p className={`text-3xl font-bold ${totalAtraso > 0 ? "text-red-400" : "text-white"}`}>{totalAtraso}</p>
            <p className="text-xs text-red-400 mt-1">
              {filtroAtraso ? "✓ Filtro ativo — clique para remover" : "⚠ Clique para filtrar"}
            </p>
          </button>

          {/* Card ≥30 dias — filtro clicável */}
          <button
            onClick={() => { setFiltroAtencao(f => !f); setFiltroAtraso(false); }}
            className={`rounded-xl p-4 border text-left transition light-card-amber ${
              filtroAtencao
                ? "bg-yellow-700 border-yellow-400 ring-2 ring-yellow-300"
                : totalAtencao > 0
                  ? "bg-yellow-950/40 border-yellow-700 hover:bg-yellow-900/30"
                  : "bg-gray-900 border-gray-800 hover:bg-gray-800"
            }`}
          >
            <p className="text-xs text-gray-400 mb-1">Em atenção (≥30 dias)</p>
            <p className={`text-3xl font-bold ${totalAtencao > 0 ? "text-yellow-400" : "text-white"}`}>{totalAtencao}</p>
            <p className="text-xs text-yellow-500 mt-1">
              {filtroAtencao ? "✓ Filtro ativo — clique para remover" : "Clique para filtrar"}
            </p>
          </button>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Período dos dados</p>
            <p className="text-xs font-medium text-gray-300 mt-2">{periodoMin.slice(0, 8)} → {periodoMax.slice(0, 8)}</p>
          </div>
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
                {chamados.length === 0 ? "Nenhum chamado importado" : "Nenhum chamado em atraso"}
              </td></tr>
            )}
            {filtrados.map(c => {
              const dias = diasDesde(c.dataAbertura);
              const atrasado = dias >= 50;
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
                      <DiasBadge dias={dias} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">{fmtDateTime(c.dataAbertura)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 whitespace-nowrap">
                      {c.equipeAtribuida ?? "—"}
                    </span>
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

      {/* Modal Importar */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Importar Chamados Redmine</h3>
            <p className="text-xs text-gray-400 mb-4">Selecione o arquivo exportado do Power BI (.ods ou .xlsx). Os dados anteriores serão substituídos.</p>
            <div className="border-2 border-dashed border-gray-700 hover:border-red-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {selectedFile ? selectedFile.name : "Clique para selecionar o arquivo (.ods / .xlsx)"}
              </p>
              {importResult?.error && (
                <p className="text-red-400 text-xs mt-2">{importResult.error}</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".ods,.xlsx,.xls" className="hidden"
              onChange={handleFileChange} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImportModal(false); setSelectedFile(null); setImportResult(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
              <button onClick={handleImport} disabled={!selectedFile || importing}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                {importing ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
