"use client";

import { useState } from "react";

type Item = { id: number; colaboradorId: number; data: string; tipo: string; colaborador: { nome: string; equipe: { nome: string } } };
type FichaPlantao = { id: number; data: string; tipo: string; folga1: string | null; folga2: string | null; descricao: string | null };

const tipoLabel: Record<string, string> = { SABADO: "Sábado", DOMINGO: "Domingo", FERIADO: "Feriado", PONTO_FACULTATIVO: "Pto. Facultativo" };

function fmt(iso: string | null) {
  if (!iso) return "—";
  const date = iso.slice(0, 10);
  if (date <= "1970-01-01") return "Banco";
  return date.split("-").reverse().join("/");
}

function brazilDateStr(offsetDays = 0): string {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000 + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function fmtRelativo(iso: string | null) {
  if (!iso) return "—";
  const date = iso.slice(0, 10);
  if (date === brazilDateStr(0)) return "Hoje";
  if (date === brazilDateStr(-1)) return "Ontem";
  return date.split("-").reverse().join("/");
}

function tipoBadge(tipo: string) {
  if (tipo === "SABADO")            return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Sábado</span>;
  if (tipo === "DOMINGO")           return <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Domingo</span>;
  if (tipo === "PONTO_FACULTATIVO") return <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">Pto. Facultativo</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">Feriado</span>;
}

export default function PlantaoRecentesCard({ items }: { items: Item[] }) {
  const [fichaModal, setFichaModal] = useState<{ id: number; nome: string; equipe: string } | null>(null);
  const [fichaPlantoes, setFichaPlantoes] = useState<FichaPlantao[]>([]);
  const [fichaLoading, setFichaLoading] = useState(false);

  async function openFicha(id: number, nome: string, equipe: string) {
    setFichaModal({ id, nome, equipe });
    setFichaLoading(true);
    const data = await fetch(`/api/colaboradores/${id}/ficha`).then(r => r.json());
    setFichaPlantoes(data.plantoes ?? []);
    setFichaLoading(false);
  }

  return (
    <>
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Plantões recentes</h3>
        {items.length === 0 ? (
          <p className="text-gray-600 text-sm">Nenhum plantão registrado.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {items.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <div>
                  <button onClick={() => openFicha(p.colaboradorId, p.colaborador.nome, p.colaborador.equipe.nome)}
                    className="text-white text-sm font-medium hover:text-blue-400 transition text-left">
                    {p.colaborador.nome}
                  </button>
                  <p className="text-xs text-gray-500">{p.colaborador.equipe.nome}</p>
                </div>
                <div className="text-right">
                  {(() => {
                    const label = fmtRelativo(p.data);
                    const color = label === "Hoje" ? "text-blue-400" : "text-gray-300";
                    return <p className={`text-sm font-medium ${color}`}>{label}</p>;
                  })()}
                  <p className="text-xs text-gray-500">{tipoLabel[p.tipo] ?? p.tipo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {fichaModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setFichaModal(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">{fichaModal.nome}</h3>
                <p className="text-xs text-gray-500">{fichaModal.equipe}</p>
              </div>
              <button onClick={() => setFichaModal(null)} className="text-gray-600 hover:text-gray-400 text-lg leading-none ml-4">✕</button>
            </div>
            {fichaLoading ? (
              <p className="text-gray-500 text-sm py-6 text-center">Carregando...</p>
            ) : (
              <>
                {fichaPlantoes.length > 0 && (() => {
                  const creditos = fichaPlantoes.reduce((acc, p) => acc + (p.tipo === "SABADO" || p.tipo === "PONTO_FACULTATIVO" ? 1 : 2), 0);
                  const agendadas = fichaPlantoes.reduce((acc, p) => acc + (p.folga1 ? 1 : 0) + (p.folga2 ? 1 : 0), 0);
                  const pendentes = Math.max(0, creditos - agendadas);
                  return (
                    <div className="flex gap-4 mb-4 text-sm flex-wrap">
                      <span className="text-gray-400">Plantões: <strong className="text-white">{fichaPlantoes.length}</strong></span>
                      <span className="text-gray-400">Folgas devidas: <strong className="text-white">{creditos}</strong></span>
                      <span className="text-gray-400">Agendadas: <strong className="text-green-400">{agendadas}</strong></span>
                      <span className="text-gray-400">Pendentes: <strong className={pendentes > 0 ? "text-yellow-400" : "text-gray-500"}>{pendentes}</strong></span>
                    </div>
                  );
                })()}
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                        <th className="text-left py-2 pr-4">Data</th>
                        <th className="text-left py-2 pr-4">Tipo</th>
                        <th className="text-left py-2 pr-4">Folga</th>
                        <th className="text-left py-2 pr-4">2ª Folga</th>
                        <th className="text-left py-2">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fichaPlantoes.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-gray-500 py-6">Nenhum plantão registrado</td></tr>
                      )}
                      {fichaPlantoes.map(p => (
                        <tr key={p.id} className="border-b border-gray-800 last:border-0">
                          <td className="py-2.5 pr-4 text-gray-300 font-mono text-xs">{fmt(p.data)}</td>
                          <td className="py-2.5 pr-4">{tipoBadge(p.tipo)}</td>
                          <td className="py-2.5 pr-4 text-xs text-green-400">{fmt(p.folga1)}</td>
                          <td className="py-2.5 pr-4 text-xs text-green-400">{fmt(p.folga2)}</td>
                          <td className="py-2.5 text-xs text-gray-400 italic">{p.descricao ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
