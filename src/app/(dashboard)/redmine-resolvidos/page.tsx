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
  totalRedmine: number;
  chamadosMap: Record<string, string | null>;
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
      className="text-left text-xs text-gray-300 hover:text-blue-400 transition max-w-[220px] truncate block underline-offset-2 hover:underline cursor-pointer">
      {texto}
    </button>
  );
}

function splitAssyst(raw: string): string[] {
  return raw.split(/[;/]/).map(s => s.trim()).filter(Boolean);
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ count?: number; error?: string } | null>(null);
  const [aba, setAba] = useState<"esquecidos" | "resolvidos">("esquecidos");
  const [textoModal, setTextoModal] = useState<{ titulo: string; corpo: string; assystNums?: string[]; resolvidoId?: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch("/api/redmine-resolvidos")
      .then(r => r.json())
      .then((d: Dados) => { setDados(d); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    setImportResult(null);
    const text = await selectedFile.text();
    const res = await fetch("/api/redmine-resolvidos", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: text,
    });
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
    if (!confirm("Limpar todos os Resolvidos importados?")) return;
    await fetch("/api/redmine-resolvidos", { method: "DELETE" });
    load();
  }

  function exportXLS() {
    if (!dados) return;
    setXlsExporting(true);
    try {
      function esc(s: string) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      }

      const rows = resolvidosNaRedmine.map(r => {
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

  const semResolvido = dados?.esquecidos ?? [];
  const comResolvido = dados?.encontrados ?? [];
  const resolvidos = dados?.resolvidos ?? [];
  const chamadosMap = dados?.chamadosMap ?? {};

  // Mapa Assyst# → Resolvido para lookup na aba Encontrados
  const resolvidoMap = new Map<string, Resolvido>();
  for (const r of resolvidos) {
    for (const p of splitAssyst(r.numerosAssyst)) resolvidoMap.set(p.toUpperCase(), r);
  }

  // Conta quantas vezes cada Redmine# aparece nos Encontrados (para badge de repetição)
  const redmineCountMap = new Map<string, number>();
  for (const num of comResolvido) {
    const r = resolvidoMap.get(num.toUpperCase());
    if (r?.numeroRedmine) {
      const key = r.numeroRedmine.trim().toUpperCase();
      redmineCountMap.set(key, (redmineCountMap.get(key) ?? 0) + 1);
    }
  }

  // "✓ Encontrados" só mostra os que têm ao menos um Assyst presente nos Chamados Redmine
  const encontradosSet = new Set(comResolvido.map(n => n.toUpperCase()));
  const resolvidosNaRedmine = resolvidos.filter(r =>
    splitAssyst(r.numerosAssyst).some(n => encontradosSet.has(n.toUpperCase()))
  );

  // Set de Redmine# encontrados — usado para badge "✓ Resolvido" nas notas
  const resolvidosRedmineSet = new Set(resolvidosNaRedmine.map(r => r.numeroRedmine.trim()));

  // Mapa Redmine# → Set<Assyst#> — para detectar chamado não incluído no Redmine da nota
  const redmineToAssystMap = new Map<string, Set<string>>();
  for (const r of resolvidosNaRedmine) {
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
          <button onClick={() => { setImportModal(true); setSelectedFile(null); setImportResult(null); }}
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Resolvidos importados</p>
            <p className="text-3xl font-bold text-green-400">{resolvidos.length}</p>
          </div>
          <button
            onClick={() => setAba("esquecidos")}
            className={`rounded-xl p-4 border text-left transition ${aba === "esquecidos" ? "bg-red-900/40 border-red-500 ring-2 ring-red-400" : semResolvido.length > 0 ? "bg-red-950/30 border-red-700 hover:bg-red-900/20" : "bg-gray-900 border-gray-800"}`}>
            <p className="text-xs text-gray-400 mb-1">Não resolvidos</p>
            <p className={`text-3xl font-bold ${semResolvido.length > 0 ? "text-red-400" : "text-white"}`}>{semResolvido.length}</p>
            {semResolvido.length > 0 && <p className="text-xs text-red-400 mt-1">⚠ Clique para ver</p>}
          </button>
          <button
            onClick={() => setAba("resolvidos")}
            className={`rounded-xl p-4 border text-left transition ${aba === "resolvidos" ? "bg-green-900/40 border-green-500 ring-2 ring-green-400" : "bg-gray-900 border-gray-800 hover:bg-gray-800"}`}>
            <p className="text-xs text-gray-400 mb-1">Encontrados nos Resolvidos</p>
            <p className="text-3xl font-bold text-green-400">{comResolvido.length}</p>
            <p className="text-xs text-green-600 mt-1">Clique para ver</p>
          </button>
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
                <th className="text-left px-4 py-3 w-1/2">Nº Chamado (Assyst)</th>
                <th className="text-left px-4 py-3 w-1/2">Status</th>
              </tr>
            </thead>
            <tbody>
              {semResolvido.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-green-400 text-sm">Todos os chamados foram resolvidos!</td></tr>
              ) : semResolvido.map(num => (
                <tr key={num} className="border-b border-gray-800 last:border-0 bg-red-950/20 hover:bg-red-950/30 transition border-l-2 border-l-red-600">
                  <td className="px-4 py-3">
                    <a href={assystUrl(num)} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline transition">
                      {num}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      ⚠ Ainda não resolvido
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
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
              {resolvidosNaRedmine.map(r => {
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
                        <div className="flex flex-col gap-1">
                          {nums.map(n => {
                            const dias = diasAberto(chamadosMap[n.toUpperCase()]);
                            return (
                              <div key={n} className="flex items-center gap-1.5">
                                <a href={assystUrl(n)} target="_blank" rel="noopener noreferrer"
                                  className="font-mono text-blue-400 hover:text-blue-300 hover:underline transition">
                                  {n}
                                </a>
                                {dias !== null && (
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap animate-pulse">
                                    ⚠ {dias}d
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{r.tipo ?? "—"}</td>
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
              })}
            </tbody>
          </table>
        )}
      </div>

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
            <p className="text-xs text-gray-400 mb-4">Selecione o arquivo CSV exportado do Redmine com os chamados resolvidos.</p>
            <div className="border-2 border-dashed border-gray-700 hover:border-green-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {selectedFile ? selectedFile.name : "Clique para selecionar o arquivo (.csv)"}
              </p>
              {importResult?.error && <p className="text-red-400 text-xs mt-2">{importResult.error}</p>}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { setSelectedFile(e.target.files?.[0] ?? null); setImportResult(null); }} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImportModal(false); setSelectedFile(null); setImportResult(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
              <button onClick={handleImport} disabled={!selectedFile || importing}
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
