"use client";

import { useEffect, useState } from "react";

type Equipe = { id: number; nome: string };
type Colaborador = { id: number; nome: string; equipe: Equipe };
type Declaracao = {
  id: number;
  colaboradorId: number;
  data: string;
  horaEntrada: string | null;
  horaSaida: string | null;
  especialidade: string | null;
  observacao: string | null;
  colaborador: { nome: string; equipe: { nome: string } };
};

const emptyForm = {
  colaboradorId: "",
  data: "",
  horaEntrada: "",
  horaSaida: "",
  especialidade: "",
  observacao: "",
};

function fmt(iso: string) { return iso.split("-").reverse().join("/"); }

export default function DeclaracoesPage() {
  const [declaracoes, setDeclaracoes] = useState<Declaracao[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [verDeclaracao, setVerDeclaracao] = useState<Declaracao | null>(null);

  function load() {
    fetch("/api/declaracoes").then(r => r.json()).then(setDeclaracoes);
  }

  useEffect(() => {
    load();
    fetch("/api/colaboradores?all=true").then(r => r.json()).then((d: { colaboradores: Colaborador[] }) =>
      setColaboradores([...d.colaboradores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")))
    );
  }, []);

  function openEdit(d: Declaracao) {
    setForm({
      colaboradorId: String(d.colaboradorId),
      data: d.data,
      horaEntrada: d.horaEntrada ?? "",
      horaSaida: d.horaSaida ?? "",
      especialidade: d.especialidade ?? "",
      observacao: d.observacao ?? "",
    });
    setEditingId(d.id);
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    if (editingId !== null) {
      await fetch("/api/declaracoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          data: form.data,
          horaEntrada: form.horaEntrada,
          horaSaida: form.horaSaida,
          especialidade: form.especialidade,
          observacao: form.observacao,
        }),
      });
    } else {
      await fetch("/api/declaracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, colaboradorId: Number(form.colaboradorId) }),
      });
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir esta declaração?")) return;
    await fetch(`/api/declaracoes?id=${id}`, { method: "DELETE" });
    load();
  }

  function exportCSV() {
    const rows = [["Colaborador", "Equipe", "Data", "Entrada", "Saída", "Especialidade", "Observação"]];
    for (const d of declaracoes) {
      rows.push([
        d.colaborador.nome,
        d.colaborador.equipe.nome,
        fmt(d.data),
        d.horaEntrada ?? "",
        d.horaSaida ?? "",
        d.especialidade ?? "",
        d.observacao ?? "",
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "declaracoes_medicas.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Declarações Médicas</h2>
          <p className="text-sm text-gray-400 mt-0.5">Registro de consultas e atendimentos médicos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Exportar CSV
          </button>
          <button onClick={() => { setEditingId(null); setForm(emptyForm); setModal(true); }}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            + Registrar declaração
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Colaborador</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="text-center px-4 py-3">Data</th>
              <th className="text-center px-4 py-3">Entrada</th>
              <th className="text-center px-4 py-3">Saída</th>
              <th className="text-left px-4 py-3">Especialidade</th>
              <th className="text-left px-4 py-3">Observação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {declaracoes.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Nenhuma declaração registrada</td></tr>
            )}
            {declaracoes.map(d => {
              const isHoje = d.data === hoje;
              return (
                <tr key={d.id} className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition ${isHoje ? "bg-violet-900/10" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{d.colaborador.nome}</span>
                      {isHoje && <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">Hoje</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{d.colaborador.equipe.nome}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{fmt(d.data)}</td>
                  <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{d.horaEntrada ?? <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{d.horaSaida ?? <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3">
                    {d.especialidade
                      ? <span className="text-violet-400 text-xs">{d.especialidade}</span>
                      : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {d.observacao ? (
                      <button onClick={() => setVerDeclaracao(d)}
                        className="text-xs text-gray-400 hover:text-white transition max-w-[160px] truncate block text-left underline underline-offset-2">
                        {d.observacao}
                      </button>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(d)} className="text-xs text-blue-400 hover:text-blue-300 transition">Editar</button>
                      <button onClick={() => handleDelete(d.id)} className="text-xs text-red-400 hover:text-red-300 transition">Excluir</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal — Ver detalhes */}
      {verDeclaracao && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Detalhes da declaração</h3>
              <button onClick={() => setVerDeclaracao(null)} className="text-gray-600 hover:text-gray-400">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div><p className="text-xs text-gray-500">Colaborador</p><p className="text-white font-medium">{verDeclaracao.colaborador.nome}</p></div>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-xs text-gray-500">Data</p><p className="text-gray-300">{fmt(verDeclaracao.data)}</p></div>
                <div><p className="text-xs text-gray-500">Entrada</p><p className="text-gray-300">{verDeclaracao.horaEntrada ?? "—"}</p></div>
                <div><p className="text-xs text-gray-500">Saída</p><p className="text-gray-300">{verDeclaracao.horaSaida ?? "—"}</p></div>
              </div>
              {verDeclaracao.especialidade && (
                <div><p className="text-xs text-gray-500">Especialidade</p><p className="text-violet-400">{verDeclaracao.especialidade}</p></div>
              )}
              {verDeclaracao.observacao && (
                <div><p className="text-xs text-gray-500">Observação</p><p className="text-gray-300">{verDeclaracao.observacao}</p></div>
              )}
            </div>
            <button onClick={() => setVerDeclaracao(null)} className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Fechar</button>
          </div>
        </div>
      )}

      {/* Modal — Registrar / Editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-4">
              {editingId ? "Editar declaração" : "Registrar declaração"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                {editingId ? (
                  <p className="text-sm text-white bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                    {colaboradores.find(c => c.id === Number(form.colaboradorId))?.nome ?? "—"}
                  </p>
                ) : (
                  <select value={form.colaboradorId} onChange={e => setForm(f => ({ ...f, colaboradorId: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">Selecione...</option>
                    {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data da consulta</label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hora entrada <span className="text-gray-600">(opcional)</span></label>
                  <input type="time" value={form.horaEntrada} onChange={e => setForm(f => ({ ...f, horaEntrada: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hora saída <span className="text-gray-600">(opcional)</span></label>
                  <input type="time" value={form.horaSaida} onChange={e => setForm(f => ({ ...f, horaSaida: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Especialidade / Médico <span className="text-gray-600">(opcional)</span></label>
                <input value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
                  placeholder="Ex: Cardiologia, Dr. João Silva..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação <span className="text-gray-600">(opcional)</span></label>
                <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Ex: Retorno, exame de rotina..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {saving ? "Salvando..." : editingId ? "Salvar" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
