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
};

function splitAssyst(raw: string): string[] {
  return raw.split(/[;/,]|\s+e\s+/i).map(s => s.trim()).filter(Boolean);
}

function parseDias(criadoEm: string | null): number | null {
  if (!criadoEm) return null;
  // Captura DD/MM/YYYY independente do que vem depois (ex: "10/06/2026 09:48")
  const match = criadoEm.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (!isNaN(d.getTime())) return Math.floor((Date.now() - d.getTime()) / 86400000);
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
  if (s.includes("cancelad"))
    return "bg-gray-600/30 text-gray-400 border border-gray-500/30";
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
  const [registros, setRegistros] = useState<Atribuido[]>([]);
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
  const fileRef = useRef<HTMLInputElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  function load() {
    setLoading(true);
    fetch("/api/redmine-atribuidos")
      .then(r => r.json())
      .then(d => { setRegistros(d.registros ?? []); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

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
    load();
  }

  const pessoas = [...new Set(registros.map(r => r.atribuidoPara).filter(Boolean) as string[])].sort();
  const contagemPorPessoa = pessoas.map(p => ({
    nome: p,
    total: registros.filter(r => r.atribuidoPara === p).length,
    emAtraso: registros.filter(r => r.atribuidoPara === p && (parseDias(r.alteradoEm) ?? 0) >= 5).length,
  }));
  const buscaLow = busca.toLowerCase();
  const registrosFiltrados = registros
    .filter(r => !filtroPessoa || r.atribuidoPara === filtroPessoa)
    .filter(r => {
      if (!filtroAtraso) return true;
      const d = parseDias(r.alteradoEm) ?? 0;
      if (filtroAtraso === "atraso") return d >= 5;
      if (filtroAtraso === "atencao") return d >= 3 && d < 5;
      return true;
    })
    .filter(r => !buscaLow ||
      r.numeroRedmine.toLowerCase().includes(buscaLow) ||
      r.numerosAssyst.toLowerCase().includes(buscaLow) ||
      (r.titulo ?? "").toLowerCase().includes(buscaLow) ||
      (r.atribuidoPara ?? "").toLowerCase().includes(buscaLow)
    );

  function exportXLS() {
    setXlsExporting(true);
    try {
      function esc(s: string) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      }
      const rows = registrosFiltrados.map(r => {
        const redmineCell = `<a href="${esc(redmineUrl(r.numeroRedmine))}">${esc(r.numeroRedmine)}</a>`;
        const nums = splitAssyst(r.numerosAssyst);
        const assystCell = nums.length === 0
          ? esc(r.numerosAssyst)
          : nums.map(n => `<a href="${esc(assystUrl(n))}">${esc(n)}</a>`).join("<br>");
        return `<tr>
          <td>${redmineCell}</td><td>${assystCell}</td>
          <td>${esc(r.criadoEm ?? "")}</td><td>${esc(r.alteradoEm ?? "")}</td>
          <td>${esc(r.tipo ?? "")}</td><td>${esc(r.situacao ?? "")}</td>
          <td>${esc(r.titulo ?? "")}</td><td>${esc(r.atribuidoPara ?? "")}</td>
          <td>${esc(r.descricao ?? "")}</td><td>${esc(r.ultimasNotas ?? "")}</td>
        </tr>`;
      }).join("");
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8">
        <style>td{mso-wrap-text:auto;vertical-align:top;font-size:11pt;}th{background:#1e293b;color:#fff;font-size:11pt;}</style>
        </head><body><table border="1">
          <tr><th>Redmine #</th><th>Nº Assyst</th><th>Criado em</th><th>Alterado em</th><th>Tipo</th><th>Situação</th><th>Título</th><th>Atribuído para</th><th>Descrição</th><th>Últimas notas</th></tr>
          ${rows}
        </table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "redmine-atribuidos.xls"; a.click();
      URL.revokeObjectURL(url);
    } finally { setXlsExporting(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Redmine Atribuídos</h2>
          <p className="text-sm text-gray-400 mt-0.5">Redmines atribuídos à Coordenadoria de Atendimento</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {registros.length > 0 && (
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

      {registros.length > 0 && (() => {
        const emAtraso = registros.filter(r => (parseDias(r.alteradoEm) ?? 0) >= 5).length;
        const emAtencao = registros.filter(r => { const d = parseDias(r.alteradoEm) ?? 0; return d >= 3 && d < 5; }).length;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Total importados</p>
              <p className="text-3xl font-bold text-blue-400">{registros.length}</p>
            </div>
            <button
              onClick={() => setFiltroAtraso(f => f === "atraso" ? null : "atraso")}
              className={`rounded-xl p-4 border text-left transition cursor-pointer ${filtroAtraso === "atraso" ? "ring-2 ring-red-500 animate-pulse" : ""} ${emAtraso > 0 ? "bg-red-950/30 border-red-700 hover:border-red-500" : "bg-gray-900 border-gray-800 hover:border-gray-600"}`}>
              <p className="text-xs text-gray-400 mb-1">Em atraso (≥5 dias)</p>
              <p className={`text-3xl font-bold ${emAtraso > 0 ? "text-red-400" : "text-white"}`}>{emAtraso}</p>
              <p className="text-xs mt-1 text-gray-500">{filtroAtraso === "atraso" ? "✓ Filtro ativo — clique para remover" : "⚠ Clique para filtrar"}</p>
            </button>
            <button
              onClick={() => setFiltroAtraso(f => f === "atencao" ? null : "atencao")}
              className={`rounded-xl p-4 border text-left transition cursor-pointer ${filtroAtraso === "atencao" ? "ring-2 ring-yellow-500 animate-pulse" : ""} ${emAtencao > 0 ? "bg-yellow-950/30 border-yellow-700 hover:border-yellow-500" : "bg-gray-900 border-gray-800 hover:border-gray-600"}`}>
              <p className="text-xs text-gray-400 mb-1">Em atenção (≥3 dias)</p>
              <p className={`text-3xl font-bold ${emAtencao > 0 ? "text-yellow-400" : "text-white"}`}>{emAtencao}</p>
              <p className="text-xs mt-1 text-gray-500">{filtroAtraso === "atencao" ? "✓ Filtro ativo — clique para remover" : "⚠ Clique para filtrar"}</p>
            </button>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Responsáveis</p>
              <p className="text-3xl font-bold text-purple-400">{pessoas.length}</p>
            </div>
          </div>
        );
      })()}

      {pessoas.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Por responsável</p>
          <div className="flex flex-wrap gap-3">
            {contagemPorPessoa.map(p => (
              <button
                key={p.nome}
                onClick={() => setFiltroPessoa(f => f === p.nome ? "" : p.nome)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${
                  filtroPessoa === p.nome
                    ? "bg-blue-600/20 border-blue-500/50 animate-pulse"
                    : "bg-gray-900 border-gray-800 hover:border-gray-600"
                }`}>
                <div>
                  <p className="text-sm font-medium text-white">{p.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-bold text-white tabular-nums">{p.total}</span> redmine{p.total !== 1 ? "s" : ""}
                    {p.emAtraso > 0 && (
                      <span className="ml-2 font-semibold text-red-400">· {p.emAtraso} em atraso</span>
                    )}
                  </p>
                </div>
              </button>
            ))}
            {filtroPessoa && (
              <button
                onClick={() => setFiltroPessoa("")}
                className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition self-center">
                Limpar filtro
              </button>
            )}
          </div>
        </div>
      )}

      {registros.length > 0 && (
        <div className="mb-4">
          <div className="relative w-fit">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
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

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        {loading ? (
          <p className="px-4 py-8 text-center text-gray-500 text-sm">Carregando...</p>
        ) : registros.length === 0 ? (
          <p className="px-4 py-12 text-center text-gray-500 text-sm">
            Nenhum Redmine atribuído importado. Clique em "Importar Atribuídos".
          </p>
        ) : (
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
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
              {registrosFiltrados.map(r => {
                const nums = splitAssyst(r.numerosAssyst);
                return (
                  <tr key={r.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
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
                      {r.situacao ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${corSituacao(r.situacao)}`}>
                          {r.situacao}
                        </span>
                      ) : "—"}
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

      {/* Modal texto */}
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
                <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={10}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 resize-y focus:outline-none focus:border-blue-500" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditMode(false)}
                    className="text-sm px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition">Cancelar</button>
                  <button disabled={saving} onClick={async () => {
                    if (!textoModal.resolvidoId) return;
                    setSaving(true);
                    await fetch("/api/redmine-atribuidos", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: textoModal.resolvidoId, ultimasNotas: editValue }),
                    });
                    setSaving(false);
                    setEditMode(false);
                    setTextoModal({ ...textoModal, corpo: editValue });
                    setRegistros(rs => rs.map(r => r.id === textoModal.resolvidoId ? { ...r, ultimasNotas: editValue } : r));
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

      {/* Modal importar */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Importar Redmine Atribuídos</h3>
            <p className="text-xs text-gray-400 mb-3">Selecione o arquivo CSV exportado do Redmine com os chamados atribuídos.</p>
            <div className="mb-3 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo-atribuidos" checked={substituir} onChange={() => setSubstituir(true)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Substituir todos os dados</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo-atribuidos" checked={!substituir} onChange={() => setSubstituir(false)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Adicionar aos existentes</span>
              </label>
            </div>
            {substituir && <p className="text-xs text-amber-500/80 mb-3">Os dados anteriores serão apagados antes de importar.</p>}
            <div className="border-2 border-dashed border-gray-700 hover:border-blue-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {selectedFiles.length === 0
                  ? "Clique para selecionar arquivo(s) (.csv)"
                  : selectedFiles.length === 1
                    ? selectedFiles[0].name
                    : `${selectedFiles.length} arquivos selecionados`}
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
