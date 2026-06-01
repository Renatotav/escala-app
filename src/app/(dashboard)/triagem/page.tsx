"use client";

import { useEffect, useState } from "react";

type Registro = {
  id: number; colaboradorId: number; motivo: string; dataInicio: string; dataFim: string | null;
  observacao: string | null; atestadoId: number | null;
  colaborador: { id: number; nome: string; equipe: { nome: string } };
};
type Colaborador = { id: number; nome: string };
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

const MOTIVOS = ["ATESTADO", "DECLARACAO", "ATENDIMENTO_PRESENCIAL", "QUANTIDADE_CHAMADOS"];

function fmt(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10).split("-").reverse().join("/");
}

function diasFora(dataInicio: string) {
  const inicio = new Date(dataInicio + "T12:00:00");
  const hoje = new Date();
  const diff = Math.floor((hoje.getTime() - inicio.getTime()) / 86400000);
  return diff <= 0 ? "Hoje" : `${diff} dia${diff !== 1 ? "s" : ""}`;
}

function isAtivo(r: Registro) {
  const hoje = new Date().toISOString().slice(0, 10);
  return !r.dataFim || r.dataFim >= hoje;
}

export default function TriagemPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("");
  const [apenasAtivos, setApenasAtivos] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ colaboradorId: "", motivo: "DECLARACAO", dataInicio: "", dataFim: "", observacao: "" });
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
    setSaving(true);
    await fetch("/api/controle-triagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, colaboradorId: Number(form.colaboradorId), dataFim: form.dataFim || null }),
    });
    setSaving(false);
    setModal(false);
    setForm({ colaboradorId: "", motivo: "DECLARACAO", dataInicio: "", dataFim: "", observacao: "" });
    load();
  }

  async function encerrar(id: number) {
    setEncerrando(id);
    const hoje = new Date().toISOString().slice(0, 10);
    await fetch("/api/controle-triagem", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dataFim: hoje }),
    });
    setEncerrando(null);
    load();
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este registro?")) return;
    await fetch(`/api/controle-triagem?id=${id}`, { method: "DELETE" });
    load();
  }

  const lista = registros.filter(r => {
    if (apenasAtivos && !isAtivo(r)) return false;
    if (filtroEquipe && r.colaborador.equipe.nome !== filtroEquipe) return false;
    if (filtroMotivo && r.motivo !== filtroMotivo) return false;
    return true;
  });

  const totalAtivos = registros.filter(isAtivo).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Controle de Triagem</h2>
          <p className="text-sm text-gray-400 mt-0.5">Operadores fora da listagem de chamados</p>
        </div>
        <button onClick={() => setModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          + Registrar saída
        </button>
      </div>

      {totalAtivos > 0 && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠</span>
          <p className="text-sm text-red-300">
            <strong>{totalAtivos}</strong> operador{totalAtivos !== 1 ? "es" : ""} fora da lista agora
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button onClick={() => setApenasAtivos(!apenasAtivos)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${apenasAtivos ? "bg-red-600 text-white" : "bg-gray-800 text-gray-300"}`}>
          {apenasAtivos ? "Fora da lista agora" : "Todos os registros"}
        </button>
        <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)}
          className="flex-1 min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as equipes</option>
          {equipes.map(eq => <option key={eq.id} value={eq.nome}>{eq.nome}</option>)}
        </select>
        <select value={filtroMotivo} onChange={e => setFiltroMotivo(e.target.value)}
          className="flex-1 min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os motivos</option>
          {MOTIVOS.map(m => <option key={m} value={m}>{motivoLabel[m]}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Colaborador</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="text-left px-4 py-3">Motivo</th>
              <th className="text-center px-4 py-3">Desde</th>
              <th className="text-center px-4 py-3">Retorno</th>
              <th className="text-center px-4 py-3">Tempo fora</th>
              <th className="text-left px-4 py-3">Observação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                {apenasAtivos ? "Nenhum operador fora da lista no momento." : "Nenhum registro encontrado."}
              </td></tr>
            )}
            {lista.map(r => {
              const ativo = isAtivo(r);
              return (
                <tr key={r.id} className={`border-b border-gray-800 last:border-0 transition ${ativo ? "hover:bg-red-900/5 bg-red-900/5" : "hover:bg-gray-800/50"}`}>
                  <td className="px-4 py-3">
                    <a href={`/colaboradores/${r.colaboradorId}?tab=triagem`} className="text-white font-medium hover:text-blue-400 transition">{r.colaborador.nome}</a>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{r.colaborador.equipe.nome}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${motivoBadge[r.motivo] ?? "bg-gray-700 text-gray-300"}`}>
                      {motivoLabel[r.motivo] ?? r.motivo}
                    </span>
                    {r.atestadoId && <span className="ml-1 text-xs text-gray-600">↗ Atestado</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{fmt(r.dataInicio)}</td>
                  <td className="px-4 py-3 text-center">
                    {ativo
                      ? <span className="text-xs text-red-400 font-medium">Ainda fora</span>
                      : <span className="text-xs text-green-400 font-mono">{fmt(r.dataFim)}</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">{ativo ? diasFora(r.dataInicio) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 italic">{r.observacao ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {ativo && (
                        <button onClick={() => encerrar(r.id)} disabled={encerrando === r.id}
                          className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-2 py-1 rounded transition">
                          {encerrando === r.id ? "..." : "Retornou"}
                        </button>
                      )}
                      <button onClick={() => excluir(r.id)} className="text-xs text-red-400 hover:text-red-300 transition">Excluir</button>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setModal(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-4">Registrar saída da lista</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                <select value={form.colaboradorId} onChange={e => setForm(f => ({ ...f, colaboradorId: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Motivo</label>
                <select value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {MOTIVOS.filter(m => m !== "ATESTADO").map(m => <option key={m} value={m}>{motivoLabel[m]}</option>)}
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
                  placeholder="Ex: Consulta médica, audiência..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {saving ? "Salvando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
