"use client";

import { useEffect, useState, useCallback, use } from "react";

type Chamado = {
  id: number;
  referencia: string;
  dataRegistro: string | null;
  nomeDpsAtribuido: string | null;
  nomeSecao: string | null;
  ultimaAcao: string | null;
};

type Dados = {
  nome: string;
  total: number;
  totalUrgentes: number;
  chamados: Chamado[];
  page: number;
  pageSize: number;
  totalPages: number;
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function urgenciaCfg(ultimaAcao: string | null) {
  if (ultimaAcao === "Solicitação de Urgência") {
    return { rowClass: "bg-red-950/30 border-l-2 border-red-500/60", badge: true, acaoClass: "text-red-400 font-medium" };
  }
  return { rowClass: "", badge: false, acaoClass: "text-gray-400" };
}

const SLA_REGRAS: { match: string; dias: number }[] = [
  { match: "cadastro", dias: 2 },
  { match: "migracao", dias: 15 },
  { match: "orientacao", dias: 5 },
  { match: "erro", dias: 5 },
  { match: "falha", dias: 5 },
];

function normSimples(s: string): string {
  return s
    .toLowerCase()
    .replace(/[àáâãä]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9 ]/g, "");
}

function getSLADias(nomeDps: string | null): number | null {
  if (!nomeDps) return null;
  const norm = normSimples(nomeDps);
  for (const r of SLA_REGRAS) {
    if (norm.includes(r.match)) return r.dias;
  }
  return null;
}

function diasDesde(dataRegistro: string | null): number | null {
  if (!dataRegistro) return null;
  return Math.floor((Date.now() - new Date(dataRegistro).getTime()) / 86_400_000);
}

function catiUrl(ref: string) {
  return `https://cati.tjce.jus.br/assystnet/#events/${ref}?eventType=1&currentIndex=0`;
}

export default function MeusChamadosPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [urgentes, setUrgentes] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resolvidosTI, setResolvidosTI] = useState<Set<string>>(new Set());
  const [aguardandoCount, setAguardandoCount] = useState(0);
  const [filtroResolvido, setFiltroResolvido] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page) });
    if (urgentes) p.set("urgentes", "1");
    fetch(`/api/meus-chamados/${token}?${p}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? "Erro ao carregar");
        }
        return r.json();
      })
      .then((data) => { setDados(data); setErro(""); })
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, [token, page, urgentes]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/redmine-resolvidos")
      .then(r => r.json())
      .then(({ encontrados, aguardandoEmChamados }: { encontrados: string[]; aguardandoEmChamados: string[] }) => {
        setResolvidosTI(new Set(encontrados.map(n => n.toUpperCase())));
        setAguardandoCount((aguardandoEmChamados ?? []).length);
      })
      .catch(() => {});
  }, []);

  function toggleUrgentes() {
    setUrgentes((v) => !v);
    setPage(1);
  }

  async function exportarCSV() {
    setExporting(true);
    try {
      const p = new URLSearchParams({ all: "1" });
      if (urgentes) p.set("urgentes", "1");
      const data: Dados = await fetch(`/api/meus-chamados/${token}?${p}`).then((r) => r.json());
      const rows = [["Nº Chamado (Assyst)", "Data/hora", "Categoria", "Seção", "Última ação", "Redmine Resolvido"]];
      for (const c of data.chamados) {
        const rmResolvido = resolvidosTI.has(c.referencia.toUpperCase()) ? "⚡ Redmine resolvido — encerre" : "";
        rows.push([c.referencia, fmtDateTime(c.dataRegistro), c.nomeDpsAtribuido ?? "", c.nomeSecao ?? "", c.ultimaAcao ?? "", rmResolvido]);
      }
      const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-chamados-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (loading && !dados) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center max-w-sm">
          <p className="text-red-400 font-medium mb-1">Link indisponível</p>
          <p className="text-sm text-gray-500">{erro}</p>
        </div>
      </div>
    );
  }

  if (!dados) return null;

  const chamadosFiltrados = dados.chamados.filter(c =>
    !filtroResolvido || resolvidosTI.has(c.referencia.toUpperCase())
  );

  return (
    <div className="min-h-dvh bg-gray-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">Meus chamados</h1>
            <p className="text-sm text-gray-400 mt-0.5">{dados.nome}</p>
          </div>
          {dados.total > 0 && (
            <button
              onClick={exportarCSV}
              disabled={exporting}
              className="text-xs px-3 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-medium transition">
              {exporting ? "Exportando..." : "↓ Exportar CSV"}
            </button>
          )}
        </div>

        {(dados.total > 0 || urgentes) && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 max-w-2xl">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <p className="text-xs text-gray-500 mb-1">Total de chamados</p>
              <p className="text-3xl font-bold text-white tabular-nums">{dados.total.toLocaleString("pt-BR")}</p>
            </div>
            <div
              onClick={toggleUrgentes}
              className={`rounded-xl border p-4 cursor-pointer transition ${urgentes ? "bg-red-900/30 border-red-500/50" : "bg-gray-900 border-gray-800 hover:border-red-500/30"}`}>
              <p className="text-xs text-gray-500 mb-1">Solicitação de Urgência</p>
              <p className={`text-3xl font-bold tabular-nums ${dados.totalUrgentes > 0 ? "text-red-400" : "text-gray-600"}`}>
                {dados.totalUrgentes.toLocaleString("pt-BR")}
              </p>
              {urgentes && <p className="text-xs text-red-400 mt-1">Filtro ativo</p>}
            </div>
            <div
              onClick={() => setFiltroResolvido(f => !f)}
              className={`rounded-xl border p-4 cursor-pointer transition ${filtroResolvido ? "bg-orange-900/30 border-orange-500/50 animate-pulse" : aguardandoCount > 0 ? "bg-orange-950/20 border-orange-800 hover:border-orange-600" : "bg-gray-900 border-gray-800"}`}>
              <p className="text-xs text-gray-500 mb-1">Redmine resolvido</p>
              <p className={`text-3xl font-bold tabular-nums ${aguardandoCount > 0 ? "text-orange-400" : "text-gray-600"}`}>
                {aguardandoCount}
              </p>
              <p className="text-xs mt-1 text-gray-500">{filtroResolvido ? "✓ Filtro ativo" : "⚡ Clique para filtrar"}</p>
            </div>
          </div>
        )}

        {dados.total === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
            <p className="text-gray-500 text-sm">
              {urgentes ? "Nenhum chamado urgente no momento." : "Nenhum chamado atribuído a você no momento."}
            </p>
          </div>
        ) : (
          <>
            {filtroResolvido && (
              <div className="mb-3 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-orange-500/15 text-orange-300 border border-orange-500/30">
                  ⚡ Redmine resolvido
                  <button onClick={() => setFiltroResolvido(false)} className="hover:text-white transition">✕</button>
                </span>
              </div>
            )}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 w-44">Nº Chamado (Assyst)</th>
                    <th className="text-left px-4 py-3 w-36">Data/hora</th>
                    <th className="text-left px-4 py-3 w-64">Categoria</th>
                    <th className="text-left px-4 py-3">Última ação</th>
                  </tr>
                </thead>
                <tbody>
                  {chamadosFiltrados.map((c) => {
                    const urg = urgenciaCfg(c.ultimaAcao);
                    const sla = getSLADias(c.nomeDpsAtribuido);
                    const dias = diasDesde(c.dataRegistro);
                    const atrasado = sla !== null && dias !== null && dias >= sla;
                    const rmResolvido = resolvidosTI.has(c.referencia.toUpperCase());
                    const rowExtra = !urg.badge && atrasado ? "bg-orange-950/20 border-l-2 border-orange-500/50" : "";
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40 transition ${urg.rowClass} ${rowExtra}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={catiUrl(c.referencia)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition">
                                {c.referencia}
                              </a>
                              {urg.badge && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 leading-none">
                                  URGENTE
                                </span>
                              )}
                              {atrasado && dias !== null && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 leading-none">
                                  {dias}d
                                </span>
                              )}
                            </div>
                            {rmResolvido && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 animate-pulse w-fit whitespace-nowrap">
                                ⚡ Redmine resolvido — encerre
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">{fmtDateTime(c.dataRegistro)}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-300">{c.nomeDpsAtribuido ?? "—"}</span>
                          {c.nomeSecao && (
                            <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[240px]">{c.nomeSecao}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs ${urg.acaoClass}`}>{c.ultimaAcao ?? "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {dados.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500">Página {dados.page} de {dados.totalPages}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                    ‹ Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === dados.totalPages}
                    className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                    Próximo ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
