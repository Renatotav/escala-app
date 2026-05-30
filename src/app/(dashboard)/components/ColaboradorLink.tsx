"use client";

import { useState } from "react";

type Plantao = { id: number; data: string; tipo: string; descricao: string | null; folga1: string | null; folga2: string | null };

const tipoLabel: Record<string, string> = {
  SABADO: "Sábado", DOMINGO: "Domingo", FERIADO: "Feriado", PONTO_FACULTATIVO: "Pto. Facultativo",
};

function fmt(iso: string) { return iso.slice(0, 10).split("-").reverse().join("/"); }

function tipoBadge(tipo: string) {
  const cls: Record<string, string> = {
    SABADO: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    DOMINGO: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    FERIADO: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    PONTO_FACULTATIVO: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[tipo] ?? "bg-gray-700 text-gray-300"}`}>{tipoLabel[tipo] ?? tipo}</span>;
}

export default function ColaboradorLink({ id, nome, className }: { id: number; nome: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [plantoes, setPlantoes] = useState<Plantao[]>([]);

  async function handleClick() {
    const data = await fetch(`/api/plantoes?view=historico&colaboradorId=${id}`).then(r => r.json());
    setPlantoes(data);
    setOpen(true);
  }

  return (
    <>
      <button onClick={handleClick} className={className ?? "text-white font-medium hover:text-blue-400 transition text-left"}>
        {nome}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">{nome}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Histórico de plantões e observações</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-400 transition">✕</button>
            </div>
            {plantoes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Nenhum plantão registrado.</p>
            ) : (
              <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                {plantoes.map(h => (
                  <div key={h.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div>
                        <p className="text-sm text-gray-300 font-mono">{fmt(h.data)}</p>
                        <div className="mt-0.5">{tipoBadge(h.tipo)}</div>
                      </div>
                      {h.descricao && <p className="text-xs text-gray-400 italic mt-1">"{h.descricao}"</p>}
                    </div>
                    <div className="text-right text-xs text-gray-600 shrink-0">
                      {h.folga1 && <p>Folga: {fmt(h.folga1)}</p>}
                      {h.folga2 && <p>2ª folga: {fmt(h.folga2)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setOpen(false)}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
