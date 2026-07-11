"use client";

import { useEffect, useMemo, useState } from "react";

type Compromisso = {
  id: number;
  titulo: string;
  data: string;
  horaInicio: string | null;
  horaFim: string | null;
  local: string | null;
  participantes: string | null;
  observacao: string | null;
};

const emptyForm = {
  titulo: "",
  data: "",
  horaInicio: "",
  horaFim: "",
  local: "",
  participantes: "",
  observacao: "",
};

function brazilDateStr(offsetDays = 0) {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000 + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function fmtRelativo(iso: string) {
  if (iso === brazilDateStr(0)) return "Hoje";
  if (iso === brazilDateStr(-1)) return "Ontem";
  if (iso === brazilDateStr(1)) return "Amanhã";
  return iso.split("-").reverse().join("/");
}

function fmtDiaSemana(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" });
}

export default function AgendaPage() {
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mostrarPassados, setMostrarPassados] = useState(false);

  function load() {
    fetch("/api/agenda").then((r) => r.json()).then(setCompromissos);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditingId(null); setForm(emptyForm); setModal(true); }
  function openEdit(c: Compromisso) {
    setForm({
      titulo: c.titulo,
      data: c.data,
      horaInicio: c.horaInicio ?? "",
      horaFim: c.horaFim ?? "",
      local: c.local ?? "",
      participantes: c.participantes ?? "",
      observacao: c.observacao ?? "",
    });
    setEditingId(c.id);
    setModal(true);
  }
  function closeModal() { setModal(false); setEditingId(null); setForm(emptyForm); }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    if (editingId !== null) {
      await fetch("/api/agenda", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...form }),
      });
    } else {
      await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este compromisso?")) return;
    await fetch(`/api/agenda?id=${id}`, { method: "DELETE" });
    load();
  }

  const hoje = brazilDateStr(0);
  const grupos = useMemo(() => {
    const visiveis = compromissos.filter((c) => mostrarPassados || c.data >= hoje);
    const map = new Map<string, Compromisso[]>();
    for (const c of visiveis) {
      if (!map.has(c.data)) map.set(c.data, []);
      map.get(c.data)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [compromissos, mostrarPassados, hoje]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Agenda</h2>
          <p className="text-sm text-gray-400 mt-0.5">Compromissos e reuniões da equipe</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setMostrarPassados((v) => !v)}
            className={`text-xs px-3 py-2 rounded-lg border transition ${mostrarPassados ? "bg-gray-700 text-white border-gray-600" : "bg-gray-900 text-gray-400 border-gray-700 hover:text-white"}`}>
            {mostrarPassados ? "Ocultar passados" : "Mostrar passados"}
          </button>
          <button onClick={openNew}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            + Novo compromisso
          </button>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum compromisso {mostrarPassados ? "" : "futuro "}registrado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([data, itens]) => {
            const label = fmtRelativo(data);
            const isHoje = label === "Hoje";
            const isPassado = data < hoje;
            return (
              <div key={data}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-sm font-semibold ${isHoje ? "text-blue-400" : isPassado ? "text-gray-500" : "text-white"}`}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{fmtDiaSemana(data)}</span>
                </div>
                <div className="space-y-2">
                  {itens.map((c) => (
                    <div key={c.id}
                      className={`bg-gray-900 rounded-xl border p-4 transition ${isHoje ? "border-blue-500/40" : "border-gray-800"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-medium">{c.titulo}</p>
                            {(c.horaInicio || c.horaFim) && (
                              <span className="text-xs font-mono text-gray-400 whitespace-nowrap">
                                {c.horaInicio ?? "—"}{c.horaFim ? ` – ${c.horaFim}` : ""}
                              </span>
                            )}
                          </div>
                          {c.local && <p className="text-xs text-gray-500 mt-1">📍 {c.local}</p>}
                          {c.participantes && <p className="text-xs text-gray-400 mt-1">👥 {c.participantes}</p>}
                          {c.observacao && <p className="text-xs text-gray-500 mt-1">{c.observacao}</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button onClick={() => openEdit(c)} className="text-xs text-blue-400 hover:text-blue-300 transition">Editar</button>
                          <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:text-red-300 transition">Excluir</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-4">
              {editingId ? "Editar compromisso" : "Novo compromisso"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título</label>
                <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} required
                  placeholder="Ex: Reunião de equipe"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data</label>
                <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hora início <span className="text-gray-600">(opcional)</span></label>
                  <input type="time" value={form.horaInicio} onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hora fim <span className="text-gray-600">(opcional)</span></label>
                  <input type="time" value={form.horaFim} onChange={(e) => setForm((f) => ({ ...f, horaFim: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Local <span className="text-gray-600">(opcional)</span></label>
                <input value={form.local} onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))}
                  placeholder="Ex: Sala de reuniões, videochamada..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Participantes <span className="text-gray-600">(opcional)</span></label>
                <input value={form.participantes} onChange={(e) => setForm((f) => ({ ...f, participantes: e.target.value }))}
                  placeholder="Ex: Ana, Bruno, equipe toda..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação <span className="text-gray-600">(opcional)</span></label>
                <input value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
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
