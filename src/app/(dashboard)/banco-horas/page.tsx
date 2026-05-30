"use client";

import { useEffect, useState } from "react";

type Equipe = { id: number; nome: string };
type Historico = { id: number; data: string; horas: number; descricao: string | null };
type BancoItem = {
  id: number; nome: string; equipe: Equipe;
  lancamentos: number; saldo: string; saldoMinutos: number;
  historico: Historico[];
};

const emptyForm = { colaboradorId: "", data: new Date().toISOString().slice(0, 10), sinal: "+" as "+" | "-", horas: "0", minutos: "0", descricao: "" };
type EditingLancamento = { id: number; data: string; horas: number; descricao: string };

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function horasFmt(h: number) {
  const mins = Math.round(Math.abs(h) * 60);
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${h >= 0 ? "+" : "-"}${hh}h${String(mm).padStart(2, "0")}m`;
}

export default function BancoHorasPage() {
  const [dados, setDados] = useState<BancoItem[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [equipeId, setEquipeId] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingLancamento, setEditingLancamento] = useState<EditingLancamento | null>(null);
  const [verHistorico, setVerHistorico] = useState<BancoItem | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (equipeId) params.set("equipeId", equipeId);
    fetch(`/api/banco-horas?${params}`).then(r => r.json()).then(setDados);
  }

  useEffect(() => { fetch("/api/equipes").then(r => r.json()).then(setEquipes); }, []);
  useEffect(() => { load(); }, [equipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const horasFloat = (form.sinal === "+" ? 1 : -1) * (Number(form.horas) + Number(form.minutos) / 60);
    if (horasFloat === 0) return;
    setSaving(true);
    if (editingLancamento) {
      await fetch("/api/banco-horas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingLancamento.id, data: form.data, horas: horasFloat, descricao: form.descricao }),
      });
      setEditingLancamento(null);
    } else {
      await fetch("/api/banco-horas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colaboradorId: form.colaboradorId, data: form.data, horas: horasFloat, descricao: form.descricao }),
      });
    }
    setSaving(false);
    setModal(false);
    setForm(emptyForm);
    load();
  }

  function openEdit(h: EditingLancamento) {
    const mins = Math.round(Math.abs(h.horas) * 60);
    setEditingLancamento(h);
    setForm(f => ({
      ...f,
      data: h.data,
      sinal: h.horas >= 0 ? "+" : "-",
      horas: String(Math.floor(mins / 60)),
      minutos: String(mins % 60),
      descricao: h.descricao,
    }));
    setModal(true);
  }

  function exportCSV() {
    const mes = new Date().toISOString().slice(0, 7);
    const header = "Nome,Equipe,Lançamentos,Saldo";
    const rows = dados.map(d => `"${d.nome}","${d.equipe.nome}",${d.lancamentos},"${d.saldo}"`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `banco-horas-${mes}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(lancamentoId: number) {
    setDeletingId(lancamentoId);
    await fetch(`/api/banco-horas?id=${lancamentoId}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  const totalDevendo = dados.filter(d => d.saldoMinutos < 0).length;
  const totalCredito = dados.filter(d => d.saldoMinutos > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Banco de Horas</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Horas positivas = crédito &nbsp;·&nbsp; Horas negativas = débito
          </p>
        </div>
        <div className="flex gap-3">
          <select value={equipeId} onChange={e => setEquipeId(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas as equipes</option>
            {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
          </select>
          <button onClick={exportCSV}
            className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Exportar CSV
          </button>
          <button onClick={() => { setForm(emptyForm); setEditingLancamento(null); setModal(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            + Lançar horas
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 mb-1">Total colaboradores</p>
          <p className="text-2xl font-bold text-white">{dados.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 mb-1">Com crédito</p>
          <p className="text-2xl font-bold text-green-400">{totalCredito}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 mb-1">Devendo horas</p>
          <p className="text-2xl font-bold text-red-400">{totalDevendo}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Colaborador</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="text-center px-4 py-3">Lançamentos</th>
              <th className="text-right px-4 py-3">Saldo</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {dados.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum colaborador encontrado</td></tr>
            )}
            {dados.map(d => (
              <>
                <tr key={d.id}
                  className={`border-b border-gray-800 transition ${expandido === d.id ? "bg-gray-800/60" : "hover:bg-gray-800/40"} ${d.saldoMinutos < 0 ? "bg-red-900/5" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setVerHistorico(d)} className="text-white font-medium hover:text-blue-400 transition text-left">{d.nome}</button>
                      {d.saldoMinutos < 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
                          devendo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{d.equipe.nome}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">{d.lancamentos}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono font-semibold text-base ${d.saldoMinutos >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {d.saldo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.lancamentos > 0 && (
                      <button
                        onClick={() => setExpandido(expandido === d.id ? null : d.id)}
                        className="text-gray-500 hover:text-gray-300 transition text-xs">
                        {expandido === d.id ? "▲" : "▼"}
                      </button>
                    )}
                  </td>
                </tr>

                {/* Linha expandida com histórico */}
                {expandido === d.id && d.historico.length > 0 && (
                  <tr key={`hist-${d.id}`} className="border-b border-gray-800 bg-gray-800/30">
                    <td colSpan={5} className="px-6 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-700">
                            <th className="text-left pb-1">Data</th>
                            <th className="text-left pb-1">Horas</th>
                            <th className="text-left pb-1">Descrição</th>
                            <th className="pb-1 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {d.historico.map(h => (
                            <tr key={h.id} className="border-b border-gray-700/50 last:border-0">
                              <td className="py-1.5 text-gray-400 font-mono">{fmt(h.data)}</td>
                              <td className="py-1.5">
                                <span className={`font-mono font-medium ${h.horas >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {horasFmt(h.horas)}
                                </span>
                              </td>
                              <td className="py-1.5 text-gray-400">{h.descricao ?? "—"}</td>
                              <td className="py-1.5 text-right">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => openEdit({ id: h.id, data: h.data, horas: h.horas, descricao: h.descricao ?? "" })}
                                    className="text-blue-500/60 hover:text-blue-400 transition text-xs px-1">
                                    ✎
                                  </button>
                                  <button
                                    onClick={() => handleDelete(h.id)}
                                    disabled={deletingId === h.id}
                                    className="text-red-500/60 hover:text-red-400 transition disabled:opacity-40">
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal — Histórico de lançamentos */}
      {verHistorico && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">{verHistorico.nome}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {verHistorico.equipe.nome} · Saldo: <span className={`font-mono font-medium ${verHistorico.saldoMinutos >= 0 ? "text-green-400" : "text-red-400"}`}>{verHistorico.saldo}</span>
                </p>
              </div>
              <button onClick={() => setVerHistorico(null)} className="text-gray-600 hover:text-gray-400 transition">✕</button>
            </div>
            {verHistorico.historico.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Nenhum lançamento registrado.</p>
            ) : (
              <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                {verHistorico.historico.map(h => (
                  <div key={h.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm text-gray-300 font-mono">{fmt(h.data)}</p>
                      {h.descricao && <p className="text-xs text-gray-500 italic mt-0.5">"{h.descricao}"</p>}
                    </div>
                    <span className={`font-mono font-semibold text-sm ${h.horas >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {horasFmt(h.horas)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setVerHistorico(null)}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-4">{editingLancamento ? "Editar lançamento" : "Lançar horas"}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {!editingLancamento && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                  <select value={form.colaboradorId} onChange={e => setForm(f => ({ ...f, colaboradorId: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    {dados.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data</label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Tempo</label>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg overflow-hidden border border-gray-700 shrink-0">
                    <button type="button" onClick={() => setForm(f => ({ ...f, sinal: "+" }))}
                      className={`px-3 py-2 text-sm font-bold transition ${form.sinal === "+" ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                      +
                    </button>
                    <button type="button" onClick={() => setForm(f => ({ ...f, sinal: "-" }))}
                      className={`px-3 py-2 text-sm font-bold transition ${form.sinal === "-" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                      −
                    </button>
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <input type="number" min="0" max="999" value={form.horas}
                      onChange={e => setForm(f => ({ ...f, horas: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-gray-400 text-sm font-medium">h</span>
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <input type="number" min="0" max="59" value={form.minutos}
                      onChange={e => setForm(f => ({ ...f, minutos: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-gray-400 text-sm font-medium">m</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição <span className="text-gray-600">(opcional)</span></label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Compensação de horas extra"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModal(false); setEditingLancamento(null); setForm(emptyForm); }}
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
