"use client";

import { useEffect, useState } from "react";

type Equipe = { id: number; nome: string };
type BancoItem = { id: number; nome: string; equipe: Equipe; lancamentos: number; saldo: string; saldoMinutos: number };

export default function RelatorioPage() {
  const [dados, setDados] = useState<BancoItem[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [equipeId, setEquipeId] = useState("");

  useEffect(() => { fetch("/api/equipes").then(r => r.json()).then(setEquipes); }, []);

  useEffect(() => {
    const params = new URLSearchParams({ mes });
    if (equipeId) params.set("equipeId", equipeId);
    fetch(`/api/banco-horas?${params}`).then(r => r.json()).then(setDados);
  }, [mes, equipeId]);

  function exportCSV() {
    const header = "Nome,Equipe,Lançamentos,Saldo";
    const rows = dados.map(d => `"${d.nome}","${d.equipe.nome}",${d.lancamentos},"${d.saldo}"`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-banco-horas-${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPositivo = dados.filter(d => d.saldoMinutos >= 0).length;
  const totalNegativo = dados.filter(d => d.saldoMinutos < 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Relatórios</h2>
        <div className="flex gap-3">
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={equipeId} onChange={e => setEquipeId(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas as equipes</option>
            {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
          </select>
          <button onClick={exportCSV}
            className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total colaboradores", value: dados.length, color: "text-white" },
          { label: "Saldo positivo", value: totalPositivo, color: "text-green-400" },
          { label: "Saldo negativo", value: totalNegativo, color: "text-red-400" },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Colaborador</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="text-left px-4 py-3">Lançamentos</th>
              <th className="text-left px-4 py-3">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {dados.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nenhum dado</td></tr>
            )}
            {dados.map(d => (
              <tr key={d.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                <td className="px-4 py-3 text-white font-medium">{d.nome}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{d.equipe.nome}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{d.lancamentos}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono font-medium ${d.saldoMinutos >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {d.saldo}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
