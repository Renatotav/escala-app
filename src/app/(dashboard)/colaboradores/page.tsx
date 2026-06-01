"use client";

import { useEffect, useState } from "react";

type Equipe = { id: number; nome: string; thresholdAmarelo: number; thresholdVerde: number };
type Colaborador = { id: number; nome: string; cargo: string | null; matricula: string | null; ativo: boolean; equipe: Equipe; dataNascimento: string | null; cpf: string | null; email: string | null; telefone: string | null; telefoneEmerg: string | null; nomeEmerg: string | null; endereco: string | null };

const empty = { nome: "", cargo: "", matricula: "", equipeId: "" };

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [equipeId, setEquipeId] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Colaborador | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load(pageOverride?: number) {
    const params = new URLSearchParams({ page: String(pageOverride ?? page), status: filtroStatus });
    if (q) params.set("q", q);
    if (equipeId) params.set("equipeId", equipeId);
    const res = await fetch(`/api/colaboradores?${params}`);
    const data = await res.json();
    setColaboradores(data.colaboradores);
    setTotal(data.total);
    setPages(data.pages);
  }

  async function toggleAtivo(c: Colaborador) {
    await fetch(`/api/colaboradores/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !c.ativo }),
    });
    load();
  }

  useEffect(() => { fetch("/api/equipes").then(r => r.json()).then(setEquipes); }, []);
  useEffect(() => { load(); }, [page, q, equipeId, filtroStatus]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setSaving(false);
      setModal(false);
      load();
    } else {
      await fetch("/api/colaboradores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setSaving(false);
      setModal(false);
      setPage(1);
      load(1);
    }
  }

  async function exportCSV() {
    const params = new URLSearchParams({ all: "true" });
    if (q) params.set("q", q);
    if (equipeId) params.set("equipeId", equipeId);
    const data = await fetch(`/api/colaboradores?${params}`).then(r => r.json());
    const rows = [["Nome", "Matrícula", "Cargo", "Equipe", "CPF", "Email", "Telefone", "Telefone Emergência", "Contato Emergência", "Endereço", "Data Nascimento"]];
    for (const c of data.colaboradores as Colaborador[]) {
      const nascimento = c.dataNascimento ? new Date(c.dataNascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "";
      rows.push([c.nome, c.matricula ?? "", c.cargo ?? "", c.equipe.nome, c.cpf ?? "", c.email ?? "", c.telefone ?? "", c.telefoneEmerg ?? "", c.nomeEmerg ?? "", c.endereco ?? "", nascimento]);
    }
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "colaboradores.csv";
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Exportar CSV
          </button>
          <button onClick={openNew} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            + Novo colaborador
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {(["ativos", "inativos", "todos"] as const).map(s => (
            <button key={s} onClick={() => { setFiltroStatus(s); setPage(1); }}
              className={`px-3 py-1.5 text-sm transition capitalize ${filtroStatus === s
                ? (s === "inativos" ? "bg-red-700 text-white" : s === "todos" ? "bg-gray-600 text-white" : "bg-green-700 text-white")
                : "bg-gray-900 text-gray-400 hover:text-white"}`}>
              {s === "ativos" ? "Ativos" : s === "inativos" ? "Inativos" : "Todos"}
            </button>
          ))}
        </div>
        <input
          value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="Buscar por nome..."
          className="flex-1 min-w-[160px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={equipeId} onChange={e => { setEquipeId(e.target.value); setPage(1); }}
          className="min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as equipes</option>
          {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
        </select>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 w-10" title="Ativo">✓</th>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Matrícula</th>
              <th className="text-left px-4 py-3">Cargo</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {colaboradores.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nenhum colaborador encontrado</td></tr>
            )}
            {colaboradores.map(c => (
              <tr key={c.id} className={`border-b border-gray-800 last:border-0 transition ${c.ativo ? "hover:bg-gray-800/50" : "opacity-50 hover:opacity-70"}`}>
                <td className="px-4 py-3">
                  <label className="flex items-center cursor-pointer" title={c.ativo ? "Clique para inativar" : "Clique para ativar"}>
                    <input
                      type="checkbox"
                      checked={c.ativo}
                      onChange={() => toggleAtivo(c)}
                      className="w-4 h-4 accent-green-500 cursor-pointer"
                    />
                  </label>
                </td>
                <td className="px-4 py-3">
                  <a href={`/colaboradores/${c.id}`} className={`font-medium hover:text-blue-400 transition ${c.ativo ? "text-white" : "text-gray-500"}`}>{c.nome}</a>
                </td>
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
