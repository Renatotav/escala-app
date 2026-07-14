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
};

// Renderiza texto com #NNN como links clicáveis para o Redmine
function TextoComLinks({ texto }: { texto: string }) {
  const partes = texto.split(/(#\d+)/g);
  return (
    <>
      {partes.map((parte, i) =>
        /^#\d+$/.test(parte) ? (
          <a key={i} href={redmineUrl(parte.slice(1))} target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline font-mono">
            {parte}
          </a>
        ) : (
          <span key={i}>{parte}</span>
        )
      )}
    </>
  );
}

function CelulaTexto({ label, texto, onClick }: { label: string; texto: string | null | undefined; onClick: (t: { titulo: string; corpo: string }) => void }) {
  if (!texto) return <span className="text-gray-600">—</span>;
  return (
    <button onClick={() => onClick({ titulo: label, corpo: texto })}
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
  const [aba, setAba] = useState<"esquecidos" | "encontrados" | "resolvidos">("esquecidos");
  const [textoModal, setTextoModal] = useState<{ titulo: string; corpo: string } | null>(null);
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

      const rows = dados.resolvidos.map(r => {
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

  // "Todos Resolvidos" só mostra os que têm ao menos um Assyst presente nos Chamados Redmine
  const encontradosSet = new Set(comResolvido.map(n => n.toUpperCase()));
  const resolvidosNaRedmine = resolvidos.filter(r =>
    splitAssyst(r.numerosAssyst).some(n => encontradosSet.has(n.toUpperCase()))
  );

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
            onClick={() => setAba("encontrados")}
            className={`rounded-xl p-4 border text-left transition ${aba === "encontrados" ? "bg-green-900/40 border-green-500 ring-2 ring-green-400" : "bg-gray-900 border-gray-800 hover:bg-gray-800"}`}>
            <p className="text-xs text-gray-400 mb-1">Encontrados nos Resolvidos</p>
            <p className="text-3xl font-bold text-green-400">{comResolvido.length}</p>
            <p className="text-xs text-green-600 mt-1">Clique para ver</p>
          </button>
        </div>
      )}

      {/* Abas */}
      {dados && resolvidos.length > 0 && (
        <div className="flex gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
          {([["esquecidos", "⚠ Não Resolvidos"], ["encontrados", "✓ Encontrados"], ["resolvidos", "Todos Resolvidos"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setAba(k)}
              className={`text-sm px-4 py-1.5 rounded-md transition ${aba === k ? "bg-gray-700 text-white font-medium" : "text-gray-500 hover:text-gray-300"}`}>
              {label}
            </button>
          ))}
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
          <table className="text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nº Chamado (Assyst)</th>
                <th className="text-left px-4 py-3">Status</th>
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
        ) : aba === "encontrados" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 whitespace-nowrap">Nº Assyst</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Redmine #</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Tipo</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Situação</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Título</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Descrição</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Últimas notas</th>
              </tr>
            </thead>
            <tbody>
              {comResolvido.map(num => {
                const r = resolvidoMap.get(num.toUpperCase());
                const redmineCount = r?.numeroRedmine
                  ? (redmineCountMap.get(r.numeroRedmine.trim().toUpperCase()) ?? 1)
                  : 1;
                return (
                  <tr key={num} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <a href={assystUrl(num)} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline transition">
                        {num}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {r?.numeroRedmine ? (
                        <div className="flex items-center gap-1.5">
                          <a href={redmineUrl(r.numeroRedmine)} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition">
                            {r.numeroRedmine}
                          </a>
                          {redmineCount > 1 && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 whitespace-nowrap">
                              {redmineCount}x
                            </span>
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{r?.tipo ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r?.situacao ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">{r.situacao}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3"><CelulaTexto label="Título" texto={r?.titulo} onClick={setTextoModal} /></td>
                    <td className="px-4 py-3"><CelulaTexto label="Descrição" texto={r?.descricao} onClick={setTextoModal} /></td>
                    <td className="px-4 py-3"><CelulaTexto label="Últimas notas" texto={r?.ultimasNotas} onClick={setTextoModal} /></td>
                  </tr>
                );
              })}
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
                    <td className="px-4 py-3 text-xs text-gray-400">{r.tipo ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.situacao ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 whitespace-nowrap">{r.situacao}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3"><CelulaTexto label="Título" texto={r.titulo} onClick={setTextoModal} /></td>
                    <td className="px-4 py-3"><CelulaTexto label="Descrição" texto={r.descricao} onClick={setTextoModal} /></td>
                    <td className="px-4 py-3"><CelulaTexto label="Últimas notas" texto={r.ultimasNotas} onClick={setTextoModal} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal leitura de texto */}
      {textoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setTextoModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">{textoModal.titulo}</h3>
              <button onClick={() => setTextoModal(null)} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="px-5 py-4 overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              <TextoComLinks texto={textoModal.corpo} />
            </div>
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
