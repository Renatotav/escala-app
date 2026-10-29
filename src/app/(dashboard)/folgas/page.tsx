"use client";

import { useEffect, useState } from "react";

type Colaborador = { id: number; nome: string; equipe: { nome: string } };
type Folga = { id: number; data: string; tipo: string; descricao: string | null; colaborador: Colaborador };

const tipoLabel: Record<string, string> = { SABADO: "Sábado", DOMINGO: "Domingo", FERIADO: "Feriado" };
const tipoBadge: Record<string, string> = {
  SABADO:  "bg-purple-500/10 text-purple-400",
  DOMINGO: "bg-orange-500/10 text-orange-400",
  FERIADO: "bg-blue-500/10 text-blue-400",
};

export default function FolgasPage() {
  const [folgas, setFolgas] = useState<Folga[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [colaboradorId, setColaboradorId] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ colaboradorId: "", data: "", tipo: "SABADO", descricao: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    const params = new URLSearchParams({ mes });
    if (colaboradorId) params.set("colaboradorId", colaboradorId);
    fetch(`/api/folgas?${params}`).then(r => r.json()).then(setFolgas);
  }

  useEffect(() => {
    fetch("/api/colaboradores?limit=200").then(r => r.json()).then(d => setColaboradores(d.colaboradores));
  }, []);

  useEffect(() => { load(); }, [mes, colaboradorId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/folgas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, colaboradorId: Number(form.colaboradorId) }),
    });
    setSaving(false);
    setModal(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Folgas</h2>
        <div className="flex gap-3">
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={colaboradorId} onChange={e => setColaboradorId(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button onClick={() => setModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            + Registrar folga
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Colaborador</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Observação</th>
            </tr>
          </thead>
          <tbody>
            {folgas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhuma folga registrada</td></tr>
            )}
            {folgas.map(f => (
              <tr key={f.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                <td className="px-4 py-3 text-gray-300 font-mono">
                  {new Date(f.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </td>
                <td className="px-4 py-3 text-white font-medium">{f.colaborador.nome}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                    {f.colaborador.equipe.nome}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${tipoBadge[f.tipo] ?? "bg-gray-700 text-gray-300"}`}>
                    {tipoLabel[f.tipo] ?? f.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{f.descricao ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-4">Registrar folga</h3>
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
                <label className="block text-xs text-gray-400 mb-1">Data</label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="SABADO">Sábado</option>
                  <option value="DOMINGO">Domingo</option>
                  <option value="FERIADO">Feriado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação</label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
