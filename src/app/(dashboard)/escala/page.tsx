"use client";

import { useEffect, useState } from "react";
import { sinalConfig, type Sinal } from "@/lib/eligibility";

type Equipe = { id: number; nome: string };
type ColaboradorEscala = {
  id: number; nome: string; cargo: string | null;
  equipe: Equipe; semanasPresencial: number; sinal: Sinal; escalaSemana: string | null;
};

function getMondayISO(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function EscalaPage() {
  const [semana, setSemana] = useState(getMondayISO());
  const [equipeId, setEquipeId] = useState("");
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorEscala[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/equipes").then(r => r.json()).then(setEquipes); }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ semana });
    if (equipeId) params.set("equipeId", equipeId);
    fetch(`/api/escalas?${params}`)
      .then(r => r.json())
      .then(setColaboradores)
      .finally(() => setLoading(false));
  }, [semana, equipeId]);

  async function handleLancar(colaboradorId: number, tipo: "PRESENCIAL" | "REMOTO") {
    await fetch("/api/escalas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colaboradorId, semana, tipo }),
    });
    const params = new URLSearchParams({ semana });
    if (equipeId) params.set("equipeId", equipeId);
    const data = await fetch(`/api/escalas?${params}`).then(r => r.json());
    setColaboradores(data);
  }

  async function handleLimpar(colaboradorId: number) {
    await fetch(`/api/escalas?colaboradorId=${colaboradorId}&semana=${semana}`, { method: "DELETE" });
    const params = new URLSearchParams({ semana });
    if (equipeId) params.set("equipeId", equipeId);
    const data = await fetch(`/api/escalas?${params}`).then(r => r.json());
    setColaboradores(data);
  }

  const EQUIPES_EXCLUIDAS = ["Supervisão", "Coordenação"];

  const equipesEscala = equipes.filter(eq => !EQUIPES_EXCLUIDAS.includes(eq.nome));

  const grupos = equipesEscala.length > 0
    ? equipesEscala.filter(eq => !equipeId || String(eq.id) === equipeId).map(eq => ({
        equipe: eq,
        membros: colaboradores.filter(c => c.equipe.id === eq.id),
      })).filter(g => g.membros.length > 0)
    : [{ equipe: null, membros: colaboradores.filter(c => !EQUIPES_EXCLUIDAS.includes(c.equipe.nome)) }];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Escala Semanal</h2>
        <div className="flex gap-3">
          <input type="date" value={semana} onChange={e => setSemana(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={equipeId} onChange={e => setEquipeId(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas as equipes</option>
            {equipesEscala.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-4 mb-6 text-xs">
        {(["VERDE", "AMARELO", "VERMELHO"] as Sinal[]).map(s => {
          const cfg = sinalConfig[s];
          return (
            <span key={s} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ equipe, membros }) => (
            <div key={equipe?.id ?? "all"}>
              {equipe && (
                <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
                  {equipe.nome}
                </h3>
              )}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Colaborador</th>
                      <th className="text-left px-4 py-3">Semanas presencial</th>
                      <th className="text-left px-4 py-3">Elegibilidade</th>
                      <th className="text-left px-4 py-3">Esta semana</th>
                      <th className="px-4 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membros.map(c => {
                      const cfg = sinalConfig[c.sinal];
                      return (
                        <tr key={c.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                          <td className="px-4 py-3">
                            <p className="text-white font-medium">{c.nome}</p>
                            {c.cargo && <p className="text-xs text-gray-500">{c.cargo}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-300">{c.semanasPresencial}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${cfg.bg} ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {c.escalaSemana ? (
                              <span className={`text-xs font-medium ${c.escalaSemana === "REMOTO" ? "text-blue-400" : "text-gray-300"}`}>
                                {c.escalaSemana === "REMOTO" ? "Remoto" : "Presencial"}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-600">Não lançado</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleLancar(c.id, "PRESENCIAL")}
                                className="text-xs px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition">
                                Presencial
                              </button>
                              <button onClick={() => handleLancar(c.id, "REMOTO")}
                                className="text-xs px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition">
                                Remoto
                              </button>
                              {c.escalaSemana && (
                                <button onClick={() => handleLimpar(c.id)}
                                  title="Limpar lançamento desta semana"
                                  className="text-xs px-2 py-1 rounded bg-red-900/40 hover:bg-red-800/60 text-red-400 hover:text-red-300 transition">
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
