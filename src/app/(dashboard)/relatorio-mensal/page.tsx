"use client";
import { useState, useEffect } from "react";

type MesEntry = {
  mes: string;
  mesLabel: string;
  recebidos: number;
  encerrados: number;
  encerradosPelaEquipe: number;
  encerradosPorOutra: number;
  taxaEncerramento: number;
  tmrMedioDias: number | null;
};

type EquipeData = {
  equipe: string;
  meses: MesEntry[];
  backlogAtual: number;
};

type RelatData = {
  equipes: string[];
  resultado: EquipeData[];
};

function BarraComposta({ recebidos, encerrados, max }: { recebidos: number; encerrados: number; max: number }) {
  if (max === 0) return <div className="h-6 bg-gray-800 rounded" />;
  const pRec = Math.round((recebidos / max) * 100);
  const pEnc = Math.round((encerrados / max) * 100);
  return (
    <div className="flex gap-1 items-end h-6">
      <div className="relative flex items-end">
        <div className="w-4 rounded-sm bg-blue-500/70" style={{ height: `${Math.max(2, pRec * 0.24)}rem` }} title={`Recebidos: ${recebidos}`} />
      </div>
      <div className="relative flex items-end">
        <div className="w-4 rounded-sm bg-emerald-500/70" style={{ height: `${Math.max(2, pEnc * 0.24)}rem` }} title={`Encerrados: ${encerrados}`} />
      </div>
    </div>
  );
}

function TaxaBadge({ taxa }: { taxa: number }) {
  const cor = taxa >= 85 ? "bg-green-900/50 text-green-400 border-green-700/50"
    : taxa >= 80 ? "bg-yellow-900/50 text-yellow-400 border-yellow-700/50"
    : "bg-red-900/50 text-red-400 border-red-700/50";
  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${cor}`}>
      {taxa}%
    </span>
  );
}

export default function RelatorioMensalPage() {
  const [data, setData]         = useState<RelatData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [equipe, setEquipe]     = useState<string>("");
  const [anoFiltro, setAnoFiltro] = useState<string>("");

  useEffect(() => {
    fetch("/api/produtividade/relatorio-mensal")
      .then(r => r.json())
      .then((d: RelatData) => {
        setData(d);
        // Auto-seleciona primeira equipe
        if (d.equipes.length > 0) setEquipe(d.equipes[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const equipeData = data?.resultado.find(r => r.equipe === equipe);

  const anos = equipeData
    ? [...new Set(equipeData.meses.map(m => m.mes.slice(0, 4)))].sort()
    : [];

  const mesesFiltrados = equipeData?.meses.filter(m =>
    !anoFiltro || m.mes.startsWith(anoFiltro)
  ) ?? [];

  const maxVal = Math.max(...mesesFiltrados.map(m => Math.max(m.recebidos, m.encerrados)), 1);

  const totRecebidos  = mesesFiltrados.reduce((s, m) => s + m.recebidos, 0);
  const totEncerrados = mesesFiltrados.reduce((s, m) => s + m.encerrados, 0);
  const totPelaEquipe = mesesFiltrados.reduce((s, m) => s + m.encerradosPelaEquipe, 0);
  const totPorOutra   = mesesFiltrados.reduce((s, m) => s + m.encerradosPorOutra, 0);
  const taxaGeral     = totRecebidos > 0 ? Math.round((totEncerrados / totRecebidos) * 100) : 0;
  const tmrMedioGeral = (() => {
    const validos = mesesFiltrados.filter(m => m.tmrMedioDias !== null);
    if (!validos.length) return null;
    return Math.round(validos.reduce((s, m) => s + (m.tmrMedioDias ?? 0), 0) / validos.length * 10) / 10;
  })();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-sm">Carregando relatório...</p>
    </div>
  );

  if (!data || data.resultado.length === 0) return (
    <div className="p-6">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
        <p className="text-gray-400 text-sm">Nenhum dado de produtividade importado.</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Relatório Mensal de Chamados</h1>
          <p className="text-sm text-gray-400 mt-0.5">Recebidos, encerrados e backlog por equipe</p>
        </div>
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <select
            value={equipe}
            onChange={e => setEquipe(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[280px]"
          >
            {data.equipes.map(eq => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
          <select
            value={anoFiltro}
            onChange={e => setAnoFiltro(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Recebidos",         val: totRecebidos.toLocaleString("pt-BR"),  cor: "text-blue-400" },
          { label: "Encerrados",        val: totEncerrados.toLocaleString("pt-BR"), cor: "text-emerald-400" },
          { label: "Pela equipe",       val: totPelaEquipe.toLocaleString("pt-BR"), cor: "text-teal-400" },
          { label: "Por outra equipe",  val: totPorOutra.toLocaleString("pt-BR"),   cor: "text-orange-400" },
          { label: "Backlog atual",     val: (equipeData?.backlogAtual ?? 0).toLocaleString("pt-BR"), cor: "text-red-400" },
        ].map(k => (
          <div key={k.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className={`text-2xl font-bold tabular-nums ${k.cor}`}>{k.val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* KPI secundário: taxa + TMR */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Taxa de encerramento</p>
            <TaxaBadge taxa={taxaGeral} />
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div>
            <p className="text-xs text-gray-400 mb-1">Meta mínima</p>
            <span className="text-xs font-mono text-gray-500">80%</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-400 mb-1">TMR médio do período</p>
          <p className="text-lg font-bold font-mono text-white tabular-nums">
            {tmrMedioGeral !== null ? `${tmrMedioGeral}d` : "—"}
          </p>
        </div>
      </div>

      {/* Tabela mensal */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-sm font-semibold text-white">Detalhamento por mês</p>
        </div>
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide bg-gray-800/40">
              <th className="text-left px-4 py-2.5">Mês</th>
              <th className="text-center px-4 py-2.5">Visual</th>
              <th className="text-center px-4 py-2.5">Recebidos</th>
              <th className="text-center px-4 py-2.5">Encerrados</th>
              <th className="text-center px-4 py-2.5">Pela equipe</th>
              <th className="text-center px-4 py-2.5">Por outra</th>
              <th className="text-center px-4 py-2.5">Taxa</th>
              <th className="text-center px-4 py-2.5">TMR médio</th>
            </tr>
          </thead>
          <tbody>
            {mesesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500 text-sm">
                  Nenhum dado para o período selecionado.
                </td>
              </tr>
            ) : mesesFiltrados.map(m => (
              <tr key={m.mes} className="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40 transition">
                <td className="px-4 py-2.5 font-mono text-sm text-gray-300 whitespace-nowrap">{m.mesLabel}</td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-center">
                    <BarraComposta recebidos={m.recebidos} encerrados={m.encerrados} max={maxVal} />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center font-mono text-blue-300 tabular-nums">{m.recebidos.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-center font-mono text-emerald-300 tabular-nums">{m.encerrados.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-center font-mono text-teal-300 tabular-nums">{m.encerradosPelaEquipe.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-center font-mono text-orange-300 tabular-nums">{m.encerradosPorOutra.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-center"><TaxaBadge taxa={m.taxaEncerramento} /></td>
                <td className="px-4 py-2.5 text-center font-mono text-gray-300 tabular-nums">
                  {m.tmrMedioDias !== null ? `${m.tmrMedioDias}d` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          {mesesFiltrados.length > 1 && (
            <tfoot>
              <tr className="border-t border-gray-700 bg-gray-800/60 font-semibold">
                <td className="px-4 py-2.5 text-xs text-gray-400 uppercase tracking-wide">Total</td>
                <td />
                <td className="px-4 py-2.5 text-center font-mono text-blue-300 tabular-nums">{totRecebidos.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-center font-mono text-emerald-300 tabular-nums">{totEncerrados.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-center font-mono text-teal-300 tabular-nums">{totPelaEquipe.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-center font-mono text-orange-300 tabular-nums">{totPorOutra.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-center"><TaxaBadge taxa={taxaGeral} /></td>
                <td className="px-4 py-2.5 text-center font-mono text-gray-300 tabular-nums">
                  {tmrMedioGeral !== null ? `${tmrMedioGeral}d` : "—"}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500/70 inline-block" /> Recebidos</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/70 inline-block" /> Encerrados</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-500/70 inline-block" /> Encerrados pela mesma equipe</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500/70 inline-block" /> Encerrados por outra equipe</span>
      </div>
    </div>
  );
}
