"use client";

import { useEffect, useState } from "react";

type Equipe = { id: number; nome: string; thresholdAmarelo: number; thresholdVerde: number };
type Colaborador = { id: number; nome: string; cargo: string | null; matricula: string | null; equipe: Equipe };

const empty = { nome: "", cargo: "", matricula: "", equipeId: "" };

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [equipeId, setEquipeId] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Colaborador | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (equipeId) params.set("equipeId", equipeId);
    const res = await fetch(`/api/colaboradores?${params}`);
    const data = await res.json();
    setColaboradores(data.colaboradores);
    setTotal(data.total);
    setPages(data.pages);
  }

  useEffect(() => { fetch("/api/equipes").then(r => r.json()).then(setEquipes); }, []);
  useEffect(() => { load(); }, [page, q, equipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() { setEditing(null); setForm(empty); setModal(true); }
  function openEdit(c: Colaborador) {
    setEditing(c);
    setForm({ nome: c.nome, cargo: c.cargo ?? "", matricula: c.matricula ?? "", equipeId: String(c.equipe.id) });
    setModal(true);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, equipeId: Number(form.equipeId) };
    if (editing) {
      await fetch(`/api/colaboradores/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/colaboradores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setModal(false);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este colaborador? Ele não aparecerá mais no sistema.")) return;
    await fetch(`/api/colaboradores/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Colaboradores</h2>
          <p className="text-sm text-gray-400 mt-0.5">{total} registros</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          + Novo colaborador
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="Buscar por nome..."
          className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={equipeId} onChange={e => { setEquipeId(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as equipes</option>
          {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Matrícula</th>
              <th className="text-left px-4 py-3">Cargo</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {colaboradores.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum colaborador encontrado</td></tr>
            )}
            {colaboradores.map(c => (
              <tr key={c.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                <td className="px-4 py-3 text-white font-medium">{c.nome}</td>
                <td className="px-4 py-3 text-gray-400">{c.matricula ?? "—"}</td>
                <td className="px-4 py-3 text-gray-400">{c.cargo ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                    {c.equipe.nome}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(c)} className="text-xs text-blue-400 hover:text-blue-300 transition">Editar</button>
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:text-red-300 transition">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm ${p === page ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-4">
              {editing ? "Editar colaborador" : "Novo colaborador"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: "Nome", key: "nome", required: true },
                { label: "Matrícula", key: "matricula" },
                { label: "Cargo", key: "cargo" },
              ].map(({ label, key, required }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={required}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Equipe</label>
                <select
                  value={form.equipeId}
                  onChange={e => setForm(f => ({ ...f, equipeId: e.target.value }))}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma equipe</option>
                  {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                  Cancelar
                </button>
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
