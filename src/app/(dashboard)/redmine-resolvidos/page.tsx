"use client";

import { useEffect, useRef, useState } from "react";

type Resolvido = {
  id: number;
  numeroRedmine: string;
  numerosAssyst: string;
  tipo: string | null;
  situacao: string | null;
  ultimasNotas: string | null;
};

type Dados = {
  resolvidos: Resolvido[];
  esquecidos: string[];
  encontrados: string[];
  totalRedmine: number;
};

export default function RedmineResolvidosPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ count?: number; error?: string } | null>(null);
  const [aba, setAba] = useState<"esquecidos" | "encontrados" | "resolvidos">("esquecidos");
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

  // Para a aba "esquecidos", busca os detalhes do Redmine para mostrar info adicional
  const semResolvido = dados?.esquecidos ?? [];
  const comResolvido = dados?.encontrados ?? [];
  const resolvidos = dados?.resolvidos ?? [];

  // Monta mapa numero→resolvido para lookup rápido
  const resolvidoMap = new Map<string, Resolvido>();
  for (const r of resolvidos) {
    const partes = r.numerosAssyst.split(/[;/]/).map(s => s.trim().toUpperCase()).filter(Boolean);
    for (const p of partes) resolvidoMap.set(p, r);
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
            <button onClick={handleLimpar}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
              Limpar resolvidos
            </button>
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
            <p className="text-xs text-gray-400 mb-1">Esquecidos de devolver</p>
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
          {([["esquecidos", "⚠ Esquecidos"], ["encontrados", "✓ Encontrados"], ["resolvidos", "Todos Resolvidos"]] as const).map(([k, label]) => (
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nº Chamado (Redmine)</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {semResolvido.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-green-400 text-sm">Todos os chamados foram encontrados nos Resolvidos!</td></tr>
              ) : semResolvido.map(num => (
                <tr key={num} className="border-b border-gray-800 last:border-0 bg-red-950/20 hover:bg-red-950/30 transition border-l-2 border-l-red-600">
                  <td className="px-4 py-3">
                    <a href={`https://cati.tjce.jus.br/assystnet/#events/${num}?eventType=1&currentIndex=0`}
                      target="_blank" rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline transition">
                      {num}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      ⚠ Não encontrado nos Resolvidos
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
                <th className="text-left px-4 py-3">Nº Chamado (Assyst)</th>
                <th className="text-left px-4 py-3">Redmine #</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Situação</th>
                <th className="text-left px-4 py-3">Últimas notas</th>
              </tr>
            </thead>
            <tbody>
              {comResolvido.map(num => {
                const r = resolvidoMap.get(num);
                return (
                  <tr key={num} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <a href={`https://cati.tjce.jus.br/assystnet/#events/${num}?eventType=1&currentIndex=0`}
                        target="_blank" rel="noopener noreferrer"
                        className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline transition">
                        {num}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {r?.numeroRedmine ? (
                        <a href={`https://redmine.tjce.jus.br/issues/${r.numeroRedmine}`}
                          target="_blank" rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition">
                          {r.numeroRedmine}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{r?.tipo ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r?.situacao ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">{r.situacao}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-sm truncate" title={r?.ultimasNotas ?? ""}>
                      {r?.ultimasNotas ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Redmine #</th>
                <th className="text-left px-4 py-3">Nº Assyst</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Situação</th>
                <th className="text-left px-4 py-3">Últimas notas</th>
              </tr>
            </thead>
            <tbody>
              {resolvidos.map(r => (
                <tr key={r.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3">
                    <a href={`https://redmine.tjce.jus.br/issues/${r.numeroRedmine}`}
                      target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition">
                      {r.numeroRedmine}
                    </a>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300 max-w-[200px] truncate" title={r.numerosAssyst}>{r.numerosAssyst}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{r.tipo ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.situacao ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{r.situacao}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-sm truncate" title={r.ultimasNotas ?? ""}>{r.ultimasNotas ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
