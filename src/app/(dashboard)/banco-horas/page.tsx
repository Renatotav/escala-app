"use client";

import { useEffect, useState } from "react";

type Equipe = { id: number; nome: string };
type Historico = { id: number; data: string; horas: number; descricao: string | null };
type PendentePlantao = { id: number; data: string; tipo: string; folga1: string | null; folga2: string | null };
type BancoItem = {
  id: number; nome: string; equipe: Equipe;
  lancamentos: number; saldo: string; saldoMinutos: number;
  historico: Historico[];
};

const emptyForm = { colaboradorId: "", data: new Date().toISOString().slice(0, 10), sinal: "+" as "+" | "-", horas: "0", minutos: "0", descricao: "", porDias: false, dias: "1", hPorDia: "8" };
type EditingLancamento = { id: number; data: string; horas: number; descricao: string };
type ModalMode = "lancar" | "compensar" | "devedor" | "editar";
const tipoLabel: Record<string, string> = { SABADO: "Sábado", DOMINGO: "Domingo", FERIADO: "Feriado", PONTO_FACULTATIVO: "Pto. Facultativo" };

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
  const [modalMode, setModalMode] = useState<ModalMode>("lancar");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingLancamento, setEditingLancamento] = useState<EditingLancamento | null>(null);
  const [compensandoColab, setCompensandoColab] = useState<BancoItem | null>(null);
  const [verHistorico, setVerHistorico] = useState<BancoItem | null>(null);
  const [plantoesPendentes, setPlantoesPendentes] = useState<Record<number, PendentePlantao[]>>({});
  const [abatendoPlantao, setAbatendoPlantao] = useState<number | null>(null);
  const [hPorDiaAbate, setHPorDiaAbate] = useState(9);

  function load() {
    const params = new URLSearchParams();
    if (equipeId) params.set("equipeId", equipeId);
    fetch(`/api/banco-horas?${params}`).then(r => r.json()).then(setDados);
  }

  useEffect(() => { fetch("/api/equipes").then(r => r.json()).then(setEquipes); }, []);
  useEffect(() => { load(); }, [equipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeModal() {
    setModal(false);
    setModalMode("lancar");
    setEditingLancamento(null);
    setCompensandoColab(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const sinal = modalMode === "compensar" ? -1 : modalMode === "devedor" ? 1 : (form.sinal === "+" ? 1 : -1);
    const horasFloat = form.porDias && form.sinal === "-"
      ? -1 * Number(form.dias) * Number(form.hPorDia)
      : sinal * (Number(form.horas) + Number(form.minutos) / 60);
    if (horasFloat === 0) return;
    setSaving(true);
    if (modalMode === "editar" && editingLancamento) {
      const editSinal = form.sinal === "+" ? 1 : -1;
      const editHoras = editSinal * (Number(form.horas) + Number(form.minutos) / 60);
      await fetch("/api/banco-horas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingLancamento.id, data: form.data, horas: editHoras, descricao: form.descricao }),
      });
    } else {
      const colabId = (modalMode === "compensar" || modalMode === "devedor") ? compensandoColab!.id : Number(form.colaboradorId);
      await fetch("/api/banco-horas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colaboradorId: colabId, data: form.data, horas: horasFloat, descricao: form.descricao }),
      });
    }
    setSaving(false);
    closeModal();
    load();
  }

  function openEdit(h: EditingLancamento) {
    const mins = Math.round(Math.abs(h.horas) * 60);
    setEditingLancamento(h);
    setModalMode("editar");
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

  function openCompensar(d: BancoItem) {
    setCompensandoColab(d);
    setModalMode("compensar");
    setForm({ ...emptyForm, colaboradorId: String(d.id), sinal: "-", descricao: "Compensação de horas" });
    setModal(true);
  }

  function openLancarParaDevedor(d: BancoItem) {
    setCompensandoColab(d);
    setModalMode("devedor");
    setForm({ ...emptyForm, colaboradorId: String(d.id), sinal: "+", descricao: "" });
    setModal(true);
  }

  async function loadPendentes(colabId: number) {
    if (plantoesPendentes[colabId] !== undefined) return;
    setPlantoesPendentes(prev => ({ ...prev, [colabId]: [] }));
    const data = await fetch(`/api/plantoes?view=historico&colaboradorId=${colabId}`).then(r => r.json());
    const hoje = new Date().toISOString().slice(0, 10);
    const pendentes = data.filter((h: PendentePlantao) => {
      const duplo = h.tipo === "DOMINGO" || h.tipo === "FERIADO";
      return h.data <= hoje && (!h.folga1 || (duplo && !h.folga2));
    });
    setPlantoesPendentes(prev => ({ ...prev, [colabId]: pendentes }));
  }

  async function usarFolga(plantaoId: number, colaboradorId: number) {
    setAbatendoPlantao(plantaoId);
    await fetch("/api/banco-horas/converter-folga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plantaoId, colaboradorId, hPorDia: hPorDiaAbate }),
    });
    setAbatendoPlantao(null);
    setPlantoesPendentes(prev => { const c = { ...prev }; delete c[colaboradorId]; return c; });
    load();
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
        <div className="flex flex-wrap gap-2">
          <select value={equipeId} onChange={e => setEquipeId(e.target.value)}
            className="min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Colaborador</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="text-center px-4 py-3">Lançamentos</th>
              <th className="text-right px-4 py-3">Saldo</th>
              <th className="px-4 py-3" />
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {dados.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nenhum colaborador encontrado</td></tr>
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
                  <td className="px-4 py-3 text-right">
                    {d.saldoMinutos > 0 && (
                      <button onClick={() => openCompensar(d)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition font-medium">
                        Compensar
                      </button>
                    )}
                    {d.saldoMinutos < 0 && (
                      <button onClick={() => openLancarParaDevedor(d)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition font-medium">
                        Lançar horas
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.lancamentos === 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit({ id: d.historico[0].id, data: d.historico[0].data, horas: d.historico[0].horas, descricao: d.historico[0].descricao ?? "" })}
                          title="Editar lançamento"
                          className="text-blue-500/60 hover:text-blue-400 transition text-xs px-1">
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(d.historico[0].id)}
                          disabled={deletingId === d.historico[0].id}
                          title="Excluir lançamento"
                          className="text-red-500/60 hover:text-red-400 transition disabled:opacity-40 text-xs">
                          ✕
                        </button>
                      </div>
                    )}
                    {d.lancamentos > 1 && (
                      <button
                        onClick={() => {
                          const newId = expandido === d.id ? null : d.id;
                          setExpandido(newId);
                          if (newId !== null && d.saldoMinutos < 0) loadPendentes(d.id);
                        }}
                        title="Ver / editar / excluir lançamentos"
                        className="text-gray-500 hover:text-gray-300 transition text-xs">
                        {expandido === d.id ? "▲" : "▼"}
                      </button>
                    )}
                  </td>
                </tr>

                {/* Linha expandida com histórico */}
                {expandido === d.id && d.historico.length > 0 && (
                  <tr key={`hist-${d.id}`} className="border-b border-gray-800 bg-gray-800/30">
                    <td colSpan={6} className="px-6 py-3">
                      {/* Barra de progresso de quitação — só para devedores */}
                      {d.saldoMinutos < 0 && (() => {
                        const totalDevido = d.historico.filter(h => h.horas < 0).reduce((acc, h) => acc + Math.abs(h.horas * 60), 0);
                        const totalPago = d.historico.filter(h => h.horas > 0).reduce((acc, h) => acc + h.horas * 60, 0);
                        const pct = totalDevido > 0 ? Math.min(100, Math.round((totalPago / totalDevido) * 100)) : 0;
                        return (
                          <div className="mb-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/15">
                            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                              <span>Progresso de quitação</span>
                              <span className="font-mono">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between text-xs mt-1.5">
                              <span className="text-gray-500">Pago: <span className="text-blue-400 font-mono">+{Math.floor(totalPago/60)}h{String(Math.round(totalPago%60)).padStart(2,"0")}m</span></span>
                              <span className="text-gray-500">Dívida: <span className="text-red-400 font-mono">-{Math.floor(totalDevido/60)}h{String(Math.round(totalDevido%60)).padStart(2,"0")}m</span></span>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Folgas disponíveis para abate */}
                      {d.saldoMinutos < 0 && plantoesPendentes[d.id] !== undefined && (() => {
                        const lista = plantoesPendentes[d.id];
                        if (lista.length === 0) return null;
                        return (
                          <div className="mb-3 p-2.5 rounded-lg bg-green-500/5 border border-green-500/15">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-gray-400 font-medium">Folgas disponíveis para abater dívida</p>
                              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                                h/dia
                                <input type="number" min="1" max="24" value={hPorDiaAbate}
                                  onChange={e => setHPorDiaAbate(Number(e.target.value))}
                                  className="w-12 bg-gray-700 border border-gray-600 text-white rounded px-1.5 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              </label>
                            </div>
                            <div className="space-y-1.5">
                              {lista.map(p => {
                                const duplo = p.tipo === "DOMINGO" || p.tipo === "FERIADO";
                                return (
                                  <div key={p.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-400 font-mono">{fmt(p.data)}</span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${duplo ? "bg-orange-500/15 text-orange-400" : "bg-blue-500/15 text-blue-400"}`}>
                                        {tipoLabel[p.tipo]}
                                      </span>
                                    </div>
                                    <button
                                      disabled={abatendoPlantao === p.id}
                                      onClick={() => usarFolga(p.id, d.id)}
                                      className="text-xs px-2 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 disabled:opacity-40 transition font-medium">
                                      {abatendoPlantao === p.id ? "..." : `Usar folga +${hPorDiaAbate}h`}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
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
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono font-medium ${h.horas >= 0 ? "text-green-400" : "text-amber-400"}`}>
                                    {horasFmt(h.horas)}
                                  </span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded border ${h.horas >= 0 ? "bg-green-500/10 text-green-400 border-green-500/20" : d.saldoMinutos < 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                    {h.horas >= 0 ? (d.saldoMinutos < 0 ? "Quitação" : "Extra") : "Débito"}
                                  </span>
                                </div>
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
            <h3 className="text-base font-semibold text-white mb-1">
              {modalMode === "compensar" ? "Registrar compensação"
                : modalMode === "devedor" ? "Lançar horas trabalhadas"
                : modalMode === "editar" ? "Editar lançamento"
                : "Lançar horas"}
            </h3>

            {/* Contexto de compensação ou devedor */}
            {(modalMode === "compensar" || modalMode === "devedor") && compensandoColab && (
              <div className={`mb-4 p-3 rounded-lg border ${modalMode === "compensar" ? "bg-amber-500/10 border-amber-500/20" : "bg-blue-500/10 border-blue-500/20"}`}>
                <p className="text-sm text-white font-medium">{compensandoColab.nome}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">{modalMode === "devedor" ? "Débito atual" : "Saldo disponível"}</p>
                  <p className={`text-sm font-mono font-bold ${modalMode === "devedor" ? "text-red-400" : "text-green-400"}`}>{compensandoColab.saldo}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {modalMode === "lancar" && (
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
                <label className="block text-xs text-gray-400 mb-1">
                  {modalMode === "compensar" ? "Data da compensação" : modalMode === "devedor" ? "Data de registro" : "Data"}
                </label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400">
                    {modalMode === "compensar" ? "Horas a compensar" : modalMode === "devedor" ? "Horas trabalhadas" : "Tempo"}
                  </label>
                  {/* Toggle "por dias" — só aparece no modo lançar com sinal negativo */}
                  {modalMode === "lancar" && form.sinal === "-" && (
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, porDias: !f.porDias }))}
                      className={`text-xs px-2 py-0.5 rounded border transition ${form.porDias ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-gray-700 text-gray-400 border-gray-600 hover:text-gray-300"}`}>
                      Calcular por dias
                    </button>
                  )}
                </div>

                {/* Modo "por dias" */}
                {form.porDias && modalMode === "lancar" && form.sinal === "-" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Nº de dias</label>
                        <input type="number" min="1" max="365" value={form.dias}
                          onChange={e => setForm(f => ({ ...f, dias: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <span className="text-gray-500 text-sm mt-4">×</span>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">h/dia</label>
                        <input type="number" min="1" max="24" value={form.hPorDia}
                          onChange={e => setForm(f => ({ ...f, hPorDia: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <span className="text-gray-500 text-sm mt-4">=</span>
                      <div className="flex-1 mt-4">
                        <p className="text-center text-red-400 font-mono font-bold text-sm">
                          -{Number(form.dias) * Number(form.hPorDia)}h
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      A dívida será lançada como um único débito de <span className="text-red-400 font-mono">-{Number(form.dias) * Number(form.hPorDia)}h00m</span>. O colaborador quita com lançamentos positivos fracionados.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {modalMode !== "compensar" && modalMode !== "devedor" && (
                      <div className="flex rounded-lg overflow-hidden border border-gray-700 shrink-0">
                        <button type="button" onClick={() => setForm(f => ({ ...f, sinal: "+", porDias: false }))}
                          className={`px-3 py-2 text-sm font-bold transition ${form.sinal === "+" ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                          +
                        </button>
                        <button type="button" onClick={() => setForm(f => ({ ...f, sinal: "-" }))}
                          className={`px-3 py-2 text-sm font-bold transition ${form.sinal === "-" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                          −
                        </button>
                      </div>
                    )}
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
                )}
                {/* Preview do saldo após compensação ou lançamento de devedor */}
                {(modalMode === "compensar" || modalMode === "devedor") && compensandoColab && (Number(form.horas) > 0 || Number(form.minutos) > 0) && (() => {
                  const deltaMin = Number(form.horas) * 60 + Number(form.minutos);
                  const novoSaldo = modalMode === "compensar"
                    ? compensandoColab.saldoMinutos - deltaMin
                    : compensandoColab.saldoMinutos + deltaMin;
                  const novoH = Math.floor(Math.abs(novoSaldo) / 60);
                  const novoM = Math.abs(novoSaldo) % 60;
                  const sinal = novoSaldo >= 0 ? "+" : "-";
                  const quitado = modalMode === "devedor" && novoSaldo >= 0;
                  return (
                    <p className={`text-xs mt-2 font-mono ${novoSaldo < 0 && modalMode === "compensar" ? "text-red-400" : quitado ? "text-green-400" : "text-gray-400"}`}>
                      Saldo após: {sinal}{novoH}h{String(novoM).padStart(2, "0")}m
                      {novoSaldo < 0 && modalMode === "compensar" && " ⚠ excede o saldo disponível"}
                      {quitado && " ✓ débito quitado"}
                    </p>
                  );
                })()}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição <span className="text-gray-600">(opcional)</span></label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder={modalMode === "compensar" ? "Ex: Saída antecipada, folga compensada..." : modalMode === "devedor" ? "Ex: Horas extras segunda-feira..." : "Ex: Horas extras segunda-feira"}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className={`flex-1 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition ${modalMode === "compensar" ? "bg-amber-600 hover:bg-amber-500" : "bg-blue-600 hover:bg-blue-500"}`}>
                  {saving ? "Salvando..."
                    : modalMode === "compensar" ? "Registrar compensação"
                    : modalMode === "devedor" ? "Registrar horas"
                    : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
