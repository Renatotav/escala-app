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
  titulo: "", data: "", horaInicio: "", horaFim: "",
  local: "", participantes: "", observacao: "",
};

function fmtDataNota(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

const EVENT_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500",
  "bg-orange-500", "bg-teal-500", "bg-pink-500",
  "bg-indigo-500", "bg-rose-500", "bg-cyan-500", "bg-amber-500",
];
function eventColor(id: number) { return EVENT_COLORS[id % EVENT_COLORS.length]; }

function brazilDateStr(offsetDays = 0) {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000 + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function buildCalendar(year: number, month: number) {
  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = (firstDow + 6) % 7; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const cells: { date: string; day: number; otherMonth: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--)
    cells.push({ date: toDateStr(prevYear, prevMonth, daysInPrev - i), day: daysInPrev - i, otherMonth: true });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: toDateStr(year, month, d), day: d, otherMonth: false });
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++)
    cells.push({ date: toDateStr(nextYear, nextMonth, d), day: d, otherMonth: true });

  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function AgendaPage() {
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [view, setView] = useState<"mes" | "lista">("mes");
  const [mostrarPassados, setMostrarPassados] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(null);

  const hoje = brazilDateStr(0);
  const todayYear = parseInt(hoje.slice(0, 4));
  const todayMonth = parseInt(hoje.slice(5, 7)) - 1;
  const [calYear, setCalYear] = useState(todayYear);
  const [calMonth, setCalMonth] = useState(todayMonth);

  function load() {
    fetch("/api/agenda").then((r) => r.json()).then(setCompromissos);
  }
  useEffect(() => { load(); }, []);

  function openNew(date?: string) {
    setEditingId(null);
    setForm({ ...emptyForm, data: date ?? "" });
    setModal(true);
  }
  function openEdit(c: Compromisso) {
    setForm({
      titulo: c.titulo, data: c.data,
      horaInicio: c.horaInicio ?? "", horaFim: c.horaFim ?? "",
      local: c.local ?? "", participantes: c.participantes ?? "",
      observacao: c.observacao ?? "",
    });
    setEditingId(c.id);
    setDetalheId(null);
    setModal(true);
  }
  function closeModal() { setModal(false); setEditingId(null); setForm(emptyForm); }

  async function handleSubmit(e?: { preventDefault(): void }) {
    e?.preventDefault();
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
    setDetalheId(null);
    load();
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }

  const weeks = useMemo(() => buildCalendar(calYear, calMonth), [calYear, calMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Compromisso[]>();
    for (const c of compromissos) {
      if (!map.has(c.data)) map.set(c.data, []);
      map.get(c.data)!.push(c);
    }
    return map;
  }, [compromissos]);

  const listaVisivel = useMemo(() =>
    compromissos
      .filter((c) => mostrarPassados || c.data >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data) || (a.horaInicio ?? "").localeCompare(b.horaInicio ?? "")),
    [compromissos, mostrarPassados, hoje]);

  function horarioStr(c: Compromisso) {
    if (!c.horaInicio && !c.horaFim) return null;
    return `${c.horaInicio ?? "—"}${c.horaFim ? ` – ${c.horaFim}` : ""}`;
  }

  function exportarCSV() {
    const rows = [["Data", "Dia da semana", "Título", "Horário", "Local", "Participantes", "Observação"]];
    for (const c of listaVisivel) {
      rows.push([
        c.data.split("-").reverse().join("/"), fmtDiaSemana(c.data),
        c.titulo, horarioStr(c) ?? "—", c.local ?? "", c.participantes ?? "", c.observacao ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `agenda-${hoje}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const geradoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    doc.setFontSize(16); doc.setTextColor(30, 30, 30);
    doc.text("Agenda de Compromissos", 14, 18);
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${geradoEm}`, 14, 25);
    autoTable(doc, {
      startY: 31,
      head: [["Data", "Dia", "Horário", "Título", "Local", "Participantes", "Observação"]],
      body: listaVisivel.map((c) => [
        c.data.split("-").reverse().join("/"), fmtDiaSemana(c.data),
        horarioStr(c) ?? "—", c.titulo, c.local ?? "—", c.participantes ?? "—", c.observacao ?? "—",
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: [200, 200, 220], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    doc.save(`agenda-${hoje}.pdf`);
  }

  const detalhe = detalheId !== null ? (compromissos.find((c) => c.id === detalheId) ?? null) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Agenda</h2>
          <p className="text-sm text-gray-400 mt-0.5">Compromissos e reuniões da equipe</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
            <button
              onClick={() => setView("mes")}
              className={`px-3 py-1.5 transition ${view === "mes" ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-400 hover:text-white"}`}>
              Mês
            </button>
            <button
              onClick={() => setView("lista")}
              className={`px-3 py-1.5 border-l border-gray-700 transition ${view === "lista" ? "bg-gray-700 text-white" : "bg-gray-900 text-gray-400 hover:text-white"}`}>
              Lista
            </button>
          </div>
          {view === "lista" && listaVisivel.length > 0 && (
            <>
              <button onClick={exportarCSV} className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition">↓ CSV</button>
              <button onClick={exportarPDF} className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition">↓ PDF</button>
            </>
          )}
          <button
            onClick={() => openNew(hoje)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            + Nova nota
          </button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {view === "mes" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {/* Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <button
              onClick={prevMonth}
              className="text-gray-400 hover:text-white transition w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 text-lg">
              ‹
            </button>
            <div className="flex items-center gap-3">
              <span className="text-white font-semibold">{MESES[calMonth]} {calYear}</span>
              {(calYear !== todayYear || calMonth !== todayMonth) && (
                <button
                  onClick={() => { setCalYear(todayYear); setCalMonth(todayMonth); }}
                  className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition">
                  Hoje
                </button>
              )}
            </div>
            <button
              onClick={nextMonth}
              className="text-gray-400 hover:text-white transition w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 text-lg">
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-800 bg-gray-800/30">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div>
            {weeks.map((week, wi) => (
              <div key={wi} className={`grid grid-cols-7 ${wi < weeks.length - 1 ? "border-b border-gray-800" : ""}`}>
                {week.map((cell) => {
                  const events = eventsByDate.get(cell.date) ?? [];
                  const isToday = cell.date === hoje;
                  const isPast = !cell.otherMonth && cell.date < hoje;
                  const MAX_VISIBLE = 3;
                  return (
                    <div
                      key={cell.date}
                      onClick={() => openNew(cell.date)}
                      className={`min-h-[100px] p-2 border-l border-gray-800 first:border-l-0 cursor-pointer transition ${
                        cell.otherMonth
                          ? "bg-gray-950/60"
                          : isToday
                            ? "bg-blue-950/20 hover:bg-blue-950/30"
                            : isPast
                              ? "opacity-60 hover:opacity-80 hover:bg-gray-800/20"
                              : "hover:bg-gray-800/30"
                      }`}>
                      {/* Day number */}
                      <div className="mb-1.5">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : cell.otherMonth
                              ? "text-gray-700"
                              : isPast
                                ? "text-gray-600"
                                : "text-gray-300"
                        }`}>
                          {cell.day}
                        </span>
                      </div>

                      {/* Event chips */}
                      <div className="space-y-0.5">
                        {events.slice(0, MAX_VISIBLE).map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); setDetalheId(ev.id); }}
                            className={`${eventColor(ev.id)} rounded px-1.5 py-0.5 text-white text-[10px] font-medium truncate cursor-pointer hover:brightness-125 transition leading-4`}
                            title={ev.titulo}>
                            {ev.horaInicio ? `${ev.horaInicio} ` : ""}{ev.titulo}
                          </div>
                        ))}
                        {events.length > MAX_VISIBLE && (
                          <div
                            onClick={(e) => { e.stopPropagation(); setDetalheId(events[MAX_VISIBLE].id); }}
                            className="text-[10px] text-gray-500 hover:text-gray-300 px-1 cursor-pointer transition">
                            +{events.length - MAX_VISIBLE} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === "lista" && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setMostrarPassados((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${mostrarPassados ? "bg-gray-700 text-white border-gray-600" : "bg-gray-900 text-gray-400 border-gray-700 hover:text-white"}`}>
              {mostrarPassados ? "Ocultar passados" : "Mostrar passados"}
            </button>
          </div>
          {listaVisivel.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
              <p className="text-gray-500 text-sm">Nenhum compromisso {mostrarPassados ? "" : "futuro "}registrado.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {listaVisivel.map((c, i) => {
                const showHeader = i === 0 || listaVisivel[i - 1].data !== c.data;
                const isHoje = c.data === hoje;
                const isPast = c.data < hoje;
                return (
                  <div key={c.id}>
                    {showHeader && (
                      <div className={`flex items-baseline gap-2 ${i === 0 ? "pb-2" : "pt-5 pb-2"}`}>
                        <span className={`text-sm font-semibold ${isHoje ? "text-blue-400" : isPast ? "text-gray-600" : "text-gray-300"}`}>
                          {fmtRelativo(c.data)}
                        </span>
                        <span className="text-xs text-gray-600 capitalize">{fmtDiaSemana(c.data)}</span>
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition cursor-pointer group ${
                        isHoje ? "bg-blue-950/20 border-blue-500/20 hover:border-blue-500/40" : "bg-gray-900 border-gray-800 hover:border-gray-700"
                      }`}
                      onClick={() => setDetalheId(c.id)}>
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${eventColor(c.id)}`} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${isPast && !isHoje ? "text-gray-500" : "text-white"}`}>
                          {c.titulo}
                        </span>
                        {horarioStr(c) && (
                          <span className="text-xs text-gray-500 ml-2 font-mono">{horarioStr(c)}</span>
                        )}
                        {c.local && <span className="text-xs text-gray-600 ml-2">· {c.local}</span>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                        className="text-xs text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                        className="text-xs text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Detalhe do evento — abre direto no modo edição (bloco de notas) */}
      {detalhe && !modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={() => setDetalheId(null)}>
          <div className="bg-[#1c1c1e] border border-gray-700/50 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden"
            style={{ maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-700/40">
              <span className="text-xs text-gray-500 font-medium capitalize">{fmtDataNota(detalhe.data)}</span>
              <button onClick={() => setDetalheId(null)} className="text-gray-600 hover:text-gray-300 text-lg leading-none transition">✕</button>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden px-5 py-4 gap-3">
              <p className="text-white text-xl font-semibold">{detalhe.titulo}</p>
              {detalhe.observacao && (
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{detalhe.observacao}</p>
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700/40">
              <button onClick={() => handleDelete(detalhe.id)} className="text-xs text-red-500 hover:text-red-400 transition">
                Excluir nota
              </button>
              <button onClick={() => openEdit(detalhe)}
                className="text-sm px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition">
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bloco de Notas */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={closeModal}>
          <div
            className="bg-[#1c1c1e] border border-gray-700/50 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden"
            style={{ maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}>

            {/* Topo estilo notas */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-700/40">
              <span className="text-xs text-gray-500 font-medium capitalize">
                {form.data ? fmtDataNota(form.data) : "Nova nota"}
              </span>
              <button onClick={closeModal} className="text-gray-600 hover:text-gray-300 text-lg leading-none transition">✕</button>
            </div>

            {/* Área de escrita */}
            <div className="flex flex-col flex-1 overflow-hidden px-5 py-4 gap-3">
              {/* Título */}
              <input
                autoFocus
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Título"
                className="w-full bg-transparent text-white text-xl font-semibold placeholder-gray-600 focus:outline-none border-none"
              />
              {/* Corpo da nota */}
              <textarea
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Escreva aqui..."
                rows={10}
                className="w-full flex-1 bg-transparent text-gray-300 text-sm placeholder-gray-600 focus:outline-none resize-none leading-relaxed border-none"
              />
            </div>

            {/* Rodapé */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700/40">
              <div>
                {editingId !== null && (
                  <button
                    onClick={() => handleDelete(editingId)}
                    className="text-xs text-red-500 hover:text-red-400 transition">
                    Excluir nota
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="text-sm px-4 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition">
                  Cancelar
                </button>
                <button
                  disabled={saving || !form.titulo.trim()}
                  onClick={() => handleSubmit()}
                  className="text-sm px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium transition">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
