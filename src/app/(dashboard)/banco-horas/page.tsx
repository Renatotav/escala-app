"use client";

import { useEffect, useState } from "react";

type Equipe = { id: number; nome: string };
type BancoItem = { id: number; nome: string; equipe: Equipe; lancamentos: number; saldo: string; saldoMinutos: number };

export default function BancoHorasPage() {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Banco de Horas</h2>
        <div className="flex gap-3">
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={equipeId} onChange={e => setEquipeId(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas as equipes</option>
            {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
          </select>
        </div>
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
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nenhum dado encontrado</td></tr>
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
