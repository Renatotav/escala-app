"use client";

import { useEffect, useState } from "react";

type Registro = {
  id: number; colaboradorId: number; motivo: string; dataInicio: string; dataFim: string | null;
  observacao: string | null; atestadoId: number | null;
};
type Colaborador = { id: number; nome: string; equipe: { id: number; nome: string } };
type Equipe = { id: number; nome: string };

const motivoLabel: Record<string, string> = {
  ATESTADO: "Atestado",
  DECLARACAO: "Declaração",
  ATENDIMENTO_PRESENCIAL: "Atendimento Presencial",
  QUANTIDADE_CHAMADOS: "Qtd. Chamados",
};

const motivoBadge: Record<string, string> = {
  ATESTADO: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DECLARACAO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ATENDIMENTO_PRESENCIAL: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  QUANTIDADE_CHAMADOS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const MOTIVOS_MANUAL = ["DECLARACAO", "ATENDIMENTO_PRESENCIAL", "QUANTIDADE_CHAMADOS"];

function fmt(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10).split("-").reverse().join("/");
}

function diasFora(dataInicio: string) {
  const diff = Math.floor((Date.now() - new Date(dataInicio + "T12:00:00").getTime()) / 86400000);
  return diff <= 0 ? "Hoje" : `${diff}d`;
}

function registroAtivo(registros: Registro[], colaboradorId: number): Registro | null {
  const hoje = new Date().toISOString().slice(0, 10);
  return registros.find(r => r.colaboradorId === colaboradorId && (!r.dataFim || r.dataFim >= hoje)) ?? null;
}

export default function TriagemPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "fora" | "lista">("todos");
  const [modal, setModal] = useState<{ colaboradorId: number; nome: string } | null>(null);
  const [form, setForm] = useState({ motivo: "DECLARACAO", dataInicio: "", dataFim: "", observacao: "" });
  const [saving, setSaving] = useState(false);
  const [encerrando, setEncerrando] = useState<number | null>(null);

  function load() {
    fetch("/api/controle-triagem").then(r => r.json()).then(setRegistros);
  }

  useEffect(() => {
    load();
    fetch("/api/colaboradores?all=true").then(r => r.json()).then((d: { colaboradores: Colaborador[] }) =>
      setColaboradores([...d.colaboradores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")))
    );
    fetch("/api/equipes").then(r => r.json()).then(setEquipes);
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    await fetch("/api/controle-triagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colaboradorId: modal.colaboradorId, ...form, dataFim: form.dataFim || null }),
    });
    setSaving(false);
    setModal(null);
    setForm({ motivo: "DECLARACAO", dataInicio: "", dataFim: "", observacao: "" });
    load();
  }

  async function encerrar(id: number) {
    setEncerrando(id);
    await fetch("/api/controle-triagem", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dataFim: new Date().toISOString().slice(0, 10) }),
    });
    setEncerrando(null);
    load();
  }

  const lista = colaboradores.filter(c => {
    if (filtroEquipe && c.equipe.nome !== filtroEquipe) return false;
    const reg = registroAtivo(registros, c.id);
    if (filtroStatus === "fora" && !reg) return false;
    if (filtroStatus === "lista" && reg) return false;
    return true;
  });

  const totalFora = colaboradores.filter(c => registroAtivo(registros, c.id)).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Controle de Triagem</h2>
          <p className="text-sm text-gray-400 mt-0.5">{colaboradores.length} colaboradores · {totalFora} fora da lista</p>
        </div>
      </div>

      {totalFora > 0 && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠</span>
          <p className="text-sm text-red-300">
            <strong>{totalFora}</strong> operador{totalFora !== 1 ? "es" : ""} fora da lista de chamados agora
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {(["todos", "fora", "lista"] as const).map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 text-sm transition ${filtroStatus === s ? (s === "fora" ? "bg-red-600 text-white" : s === "lista" ? "bg-green-700 text-white" : "bg-blue-600 text-white") : "bg-gray-900 text-gray-400 hover:text-white"}`}>
              {s === "todos" ? "Todos" : s === "fora" ? `Fora (${totalFora})` : `Na lista (${colaboradores.length - totalFora})`}
            </button>
          ))}
        </div>
        <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)}
          className="flex-1 min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as equipes</option>
          {equipes.map(eq => <option key={eq.id} value={eq.nome}>{eq.nome}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Colaborador</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-center px-4 py-3">Desde</th>
              <th className="text-center px-4 py-3">Retorno</th>
              <th className="text-left px-4 py-3">Observação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum colaborador encontrado</td></tr>
            )}
            {lista.map(c => {
              const reg = registroAtivo(registros, c.id);
              return (
                <tr key={c.id} className={`border-b border-gray-800 last:border-0 transition ${reg ? "bg-red-900/5 hover:bg-red-900/10" : "hover:bg-gray-800/50"}`}>
                  <td className="px-4 py-3">
                    <a href={`/colaboradores/${c.id}?tab=triagem`} className="text-white font-medium hover:text-blue-400 transition">{c.nome}</a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{c.equipe.nome}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {reg ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${motivoBadge[reg.motivo] ?? "bg-gray-700 text-gray-300"}`}>
                        {motivoLabel[reg.motivo] ?? reg.motivo}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Na lista</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">
                    {reg ? <span className="font-mono">{fmt(reg.dataInicio)} <span className="text-gray-600">({diasFora(reg.dataInicio)})</span></span> : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {reg
                      ? (reg.dataFim ? <span className="text-green-400 font-mono">{fmt(reg.dataFim)}</span> : <span className="text-gray-500">Indeterminado</span>)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 italic">{reg?.observacao ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {reg ? (
                        <button onClick={() => encerrar(reg.id)} disabled={encerrando === reg.id}
                          className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-2 py-1 rounded transition">
                          {encerrando === reg.id ? "..." : "Retornou"}
                        </button>
                      ) : (
                        <button onClick={() => { setModal({ colaboradorId: c.id, nome: c.nome }); setForm({ motivo: "DECLARACAO", dataInicio: new Date().toISOString().slice(0, 10), dataFim: "", observacao: "" }); }}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition">
                          Registrar saída
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

      {/* Modal — Registrar saída */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setModal(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-1">Registrar saída da lista</h3>
            <p className="text-xs text-gray-400 mb-4">{modal.nome}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Motivo</label>
                <select value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {MOTIVOS_MANUAL.map(m => <option key={m} value={m}>{motivoLabel[m]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data início</label>
                  <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Retorno <span className="text-gray-600">(opcional)</span></label>
                  <input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação <span className="text-gray-600">(opcional)</span></label>
                <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Ex: Consulta cardiologista..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {saving ? "Salvando..." : "Registrar saída"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
