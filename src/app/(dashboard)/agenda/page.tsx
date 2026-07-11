"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const listaVisivel = useMemo(() => grupos.flatMap(([, itens]) => itens), [grupos]);

  function horarioStr(c: Compromisso) {
    if (!c.horaInicio && !c.horaFim) return "—";
    return `${c.horaInicio ?? "—"}${c.horaFim ? ` – ${c.horaFim}` : ""}`;
  }

  function exportarCSV() {
    const rows = [["Data", "Dia da semana", "Título", "Horário", "Local", "Participantes", "Observação"]];
    for (const c of listaVisivel) {
      rows.push([
        c.data.split("-").reverse().join("/"),
        fmtDiaSemana(c.data),
        c.titulo,
        horarioStr(c),
        c.local ?? "",
        c.participantes ?? "",
        c.observacao ?? "",
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agenda-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const geradoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Agenda de Compromissos", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${geradoEm}`, 14, 25);

    autoTable(doc, {
      startY: 31,
      head: [["Data", "Dia", "Horário", "Título", "Local", "Participantes", "Observação"]],
      body: listaVisivel.map(c => [
        c.data.split("-").reverse().join("/"),
        fmtDiaSemana(c.data),
        horarioStr(c),
        c.titulo,
        c.local ?? "—",
        c.participantes ?? "—",
        c.observacao ?? "—",
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: [200, 200, 220], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    doc.save(`agenda-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function baixarJPEG() {
    const W = 900;
    const PAD = 24;
    const ROW_H = 34;
    const HEADER_H = 60;
    const totalH = HEADER_H + listaVisivel.length * ROW_H + PAD;

    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = totalH * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, totalH);

    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText("Agenda de Compromissos", PAD, 30);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui, sans-serif";
    const geradoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    ctx.fillText(`Gerado em: ${geradoEm}`, PAD, 48);

    let y = HEADER_H;
    for (let i = 0; i < listaVisivel.length; i++) {
      const c = listaVisivel[i];
      ctx.fillStyle = i % 2 === 0 ? "#1e2d3d" : "#0f172a";
      ctx.fillRect(PAD, y, W - PAD * 2, ROW_H);

      ctx.fillStyle = "#93c5fd";
      ctx.font = "bold 12px monospace";
      ctx.fillText(c.data.split("-").reverse().join("/"), PAD + 10, y + 15);
      ctx.fillStyle = "#64748b";
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText(horarioStr(c), PAD + 10, y + 28);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(c.titulo, PAD + 100, y + 15);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px system-ui, sans-serif";
      const detalhe = [c.local, c.participantes].filter(Boolean).join("  ·  ");
      if (detalhe) ctx.fillText(detalhe, PAD + 100, y + 28);

      y += ROW_H;
    }

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.95);
    a.download = `agenda-${new Date().toISOString().slice(0, 10)}.jpg`;
    a.click();
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Agenda</h2>
          <p className="text-sm text-gray-400 mt-0.5">Compromissos e reuniões da equipe</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={() => setMostrarPassados((v) => !v)}
            className={`text-xs px-3 py-2 rounded-lg border transition ${mostrarPassados ? "bg-gray-700 text-white border-gray-600" : "bg-gray-900 text-gray-400 border-gray-700 hover:text-white"}`}>
            {mostrarPassados ? "Ocultar passados" : "Mostrar passados"}
          </button>
          {listaVisivel.length > 0 && (
            <>
              <button onClick={exportarCSV}
                className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition">
                ↓ CSV
              </button>
              <button onClick={exportarPDF}
                className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition">
                ↓ PDF
              </button>
              <button onClick={baixarJPEG}
                className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition">
                ↓ JPEG
              </button>
            </>
          )}
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
