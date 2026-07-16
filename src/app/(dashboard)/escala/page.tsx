"use client";

import { useEffect, useState } from "react";
import { sinalConfig, type Sinal } from "@/lib/eligibility";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Equipe = { id: number; nome: string; thresholdAmarelo: number; thresholdVerde: number };
type ColaboradorEscala = {
  id: number; nome: string; cargo: string | null;
  equipe: Equipe; semanasPresencial: number; ajusteSemanasPresencial: number; contadoRaw: number;
  sinal: Sinal; escalaSemana: string | null; unidadePresencial: string | null; semRemoto: boolean;
};

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d); // local constructor — no UTC shift
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return toLocalISO(dt);
}

function getInitialISO(): string {
  const d = new Date();
  const day = d.getDay();
  // Weekend → next Monday; Weekday → today
  if (day === 0 || day === 6) {
    d.setDate(d.getDate() + (day === 0 ? 1 : 2));
  }
  return toLocalISO(d);
}

export default function EscalaPage() {
  const [semana, setSemana] = useState(getInitialISO());
  const [equipeId, setEquipeId] = useState("");
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorEscala[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalPresencial, setModalPresencial] = useState<{ colaboradorId: number; nome: string } | null>(null);
  const [unidadeInput, setUnidadeInput] = useState("");

  useEffect(() => { fetch("/api/equipes").then(r => r.json()).then(setEquipes); }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ semana });
    if (equipeId) params.set("equipeId", equipeId);
    fetch(`/api/escalas?${params}`)
      .then(r => r.json())
      .then(setColaboradores)
      .finally(() => setLoading(false));
  }, [semana, equipeId]);

  async function handleLancar(colaboradorId: number, tipo: "PRESENCIAL" | "REMOTO", unidade?: string) {
    await fetch("/api/escalas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colaboradorId, semana, tipo, unidade: unidade || null }),
    });
    const params = new URLSearchParams({ semana });
    if (equipeId) params.set("equipeId", equipeId);
    const data = await fetch(`/api/escalas?${params}`).then(r => r.json());
    setColaboradores(data);
  }

  async function confirmarPresencial() {
    if (!modalPresencial) return;
    await handleLancar(modalPresencial.colaboradorId, "PRESENCIAL", unidadeInput.trim());
    setModalPresencial(null);
    setUnidadeInput("");
  }

  function exportCSV() {
    const rows = [["Colaborador", "Cargo", "Equipe", "Semanas Presencial", "Elegibilidade", "Esta Semana"]];
    const membros = colaboradores.filter(c => !["Supervisão", "Coordenação"].includes(c.equipe.nome));
    for (const c of membros) {
      rows.push([
        c.nome,
        c.cargo ?? "",
        c.equipe.nome,
        String(c.semanasPresencial),
        sinalConfig[c.sinal].label,
        c.escalaSemana === "REMOTO" ? "Remoto" : c.escalaSemana === "PRESENCIAL" ? (c.unidadePresencial ? `Presencial - ${c.unidadePresencial}` : "Presencial") : "Não lançado",
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escala-${semana}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function gerarPDF() {
    type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } };
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Intervalo da semana (seg → sex)
    const [sy, sm, sd] = semana.split("-").map(Number);
    const seg = new Date(sy, sm - 1, sd);
    const sex = new Date(sy, sm - 1, sd + 4);
    const fmt = (dt: Date) =>
      `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const mesNome = seg.toLocaleString("pt-BR", { month: "long" });
    const mesCapital = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
    const dataRange = `${fmt(seg)} à ${fmt(sex)}/${sex.getFullYear()}`;

    // Título centralizado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(`Escala - ${mesCapital} de ${sex.getFullYear()}`, 105, 16, { align: "center" });

    // Intervalo de datas em laranja sublinhado
    doc.setFontSize(12);
    doc.setTextColor(180, 90, 0);
    doc.text(dataRange, 14, 26);
    doc.setDrawColor(180, 90, 0);
    doc.line(14, 27.5, 14 + doc.getTextWidth(dataRange), 27.5);

    let y = 34;

    const membros = colaboradores.filter(c => !["Supervisão", "Coordenação"].includes(c.equipe.nome));

    // Agrupa presenciais por unidade, remotos separados
    const locaisMap = new Map<string, string[]>();
    const remotos: string[] = [];

    for (const c of [...membros].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))) {
      if (c.escalaSemana === "PRESENCIAL") {
        const local = c.unidadePresencial?.trim() || "Presencial";
        if (!locaisMap.has(local)) locaisMap.set(local, []);
        locaisMap.get(local)!.push(c.nome.toUpperCase());
      } else if (c.escalaSemana === "REMOTO") {
        remotos.push(c.nome.toUpperCase());
      }
    }

    function renderSecao(titulo: string, nomes: string[]) {
      // Verifica espaço na página (pelo menos 20mm)
      if (y > 260) { doc.addPage(); y = 14; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(180, 90, 0);
      doc.text(titulo, 14, y);
      doc.setDrawColor(180, 90, 0);
      doc.line(14, y + 1.5, 14 + doc.getTextWidth(titulo), y + 1.5);
      y += 6;

      // 2 colunas se muitos nomes, 1 coluna se poucos
      const useDuasColunas = nomes.length > 8;
      let rows: string[][];
      if (useDuasColunas) {
        const metade = Math.ceil(nomes.length / 2);
        rows = Array.from({ length: metade }, (_, i) => [nomes[i] ?? "", nomes[i + metade] ?? ""]);
      } else {
        rows = nomes.map(n => [n]);
      }

      autoTable(doc, {
        startY: y,
        body: rows,
        theme: "grid",
        columnStyles: useDuasColunas
          ? { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } }
          : { 0: { cellWidth: 181 } },
        bodyStyles: {
          fontSize: 8,
          fontStyle: "bold",
          textColor: [30, 30, 30],
          lineColor: [180, 180, 180],
          lineWidth: 0.3,
          cellPadding: 2.5,
        },
        margin: { left: 14, right: 14 },
        didDrawPage: () => { y = 14; },
      });
      y = (doc as DocWithTable).lastAutoTable.finalY + 8;
    }

    for (const [local, nomes] of locaisMap) {
      renderSecao(`Presencial - ${local}`, nomes);
    }
    if (remotos.length > 0) renderSecao("Remoto", remotos);

    doc.save(`escala-${semana}.pdf`);
  }

  async function handleLimpar(colaboradorId: number) {
    await fetch(`/api/escalas?colaboradorId=${colaboradorId}&semana=${semana}`, { method: "DELETE" });
    const params = new URLSearchParams({ semana });
    if (equipeId) params.set("equipeId", equipeId);
    const data = await fetch(`/api/escalas?${params}`).then(r => r.json());
    setColaboradores(data);
  }

  async function handleToggleSemRemoto(colaboradorId: number, atual: boolean) {
    await fetch("/api/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: colaboradorId, semRemoto: !atual }),
    });
    const params = new URLSearchParams({ semana });
    if (equipeId) params.set("equipeId", equipeId);
    const data = await fetch(`/api/escalas?${params}`).then(r => r.json());
    setColaboradores(data);
  }


  const EQUIPES_EXCLUIDAS = ["Supervisão", "Coordenação"];

  const equipesEscala = equipes.filter(eq => !EQUIPES_EXCLUIDAS.includes(eq.nome));

  function sortMembros(list: ColaboradorEscala[]) {
    const order: Record<Sinal, number> = { VERDE: 0, AMARELO: 1, VERMELHO: 2 };
    return [...list].sort((a, b) => {
      // 0 semanas sempre vai para o final
      if (a.semanasPresencial === 0 && b.semanasPresencial !== 0) return 1;
      if (b.semanasPresencial === 0 && a.semanasPresencial !== 0) return -1;
      const sOrd = order[a.sinal] - order[b.sinal];
      if (sOrd !== 0) return sOrd;
      return b.semanasPresencial - a.semanasPresencial;
    });
  }

  const grupos = equipesEscala.length > 0
    ? equipesEscala.filter(eq => !equipeId || String(eq.id) === equipeId).map(eq => ({
        equipe: eq,
        membros: sortMembros(colaboradores.filter(c => c.equipe.id === eq.id)),
      })).filter(g => g.membros.length > 0)
    : [{ equipe: null, membros: sortMembros(colaboradores.filter(c => !EQUIPES_EXCLUIDAS.includes(c.equipe.nome))) }];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-white">Escala Semanal</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => {
              const [y, m, d] = mondayOf(semana).split("-").map(Number);
              setSemana(toLocalISO(new Date(y, m - 1, d - 7)));
            }} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm transition">‹</button>
          <input type="date" value={semana} onChange={e => setSemana(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => {
              const [y, m, d] = mondayOf(semana).split("-").map(Number);
              setSemana(toLocalISO(new Date(y, m - 1, d + 7)));
            }} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm transition">›</button>
          <select value={equipeId} onChange={e => setEquipeId(e.target.value)}
            className="min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas as equipes</option>
            {equipesEscala.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
          </select>
          <button onClick={exportCSV}
            className="bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg px-3 py-2 transition">
            Exportar CSV
          </button>
          <button onClick={gerarPDF}
            className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition">
            ↓ PDF
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 text-xs">
        {(["VERDE", "AMARELO", "VERMELHO"] as Sinal[]).map(s => {
          const cfg = sinalConfig[s];
          return (
            <span key={s} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ equipe, membros }) => {
            const verdeMembers = membros.filter(m => m.sinal === "VERDE" && !m.semRemoto);
            const topSemanas = verdeMembers.length > 0 ? Math.max(...verdeMembers.map(m => m.semanasPresencial)) : -1;
            return (
              <div key={equipe?.id ?? "all"}>
                {equipe && (
                  <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
                    {equipe.nome}
                  </h3>
                )}
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                        <th className="text-left px-4 py-3">Colaborador</th>
                        <th className="text-left px-4 py-3">Semanas presencial</th>
                        <th className="text-left px-4 py-3">Elegibilidade</th>
                        <th className="text-left px-4 py-3">Esta semana</th>
                        <th className="px-4 py-3">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membros.map(c => {
                        const cfg = sinalConfig[c.sinal];
                        const isPriority = !c.semRemoto && c.sinal === "VERDE" && topSemanas >= 0 && c.semanasPresencial === topSemanas;
                        const extraSemanas = !c.semRemoto && c.sinal === "VERDE" ? c.semanasPresencial - c.equipe.thresholdVerde : 0;
                        const isMuitoAcima = !isPriority && !c.semRemoto && extraSemanas >= 2;
                        return (
                          <tr key={c.id} className={`border-b border-gray-800 last:border-0 transition ${isPriority ? "bg-amber-950/25 hover:bg-amber-950/40" : "hover:bg-gray-800/50"}`}>
                            <td className="px-4 py-3 max-w-[220px]">
                              <div className="flex items-center gap-1.5">
                                {isPriority && <span className="text-amber-400 text-sm flex-shrink-0">★</span>}
                                <div className="min-w-0">
                                  <p className={`font-medium truncate ${isPriority ? "text-amber-200" : "text-white"}`}>{c.nome}</p>
                                  {c.cargo && <p className="text-xs text-gray-500 truncate">{c.cargo}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-mono ${isPriority ? "text-amber-300 font-semibold" : "text-gray-300"}`}>
                                {c.semRemoto ? "—" : c.semanasPresencial}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {c.semRemoto ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-gray-700/50 text-gray-500 border border-gray-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                  Sem remoto
                                </span>
                              ) : isPriority ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  Prioritário
                                </span>
                              ) : isMuitoAcima ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-red-500/25 text-red-300 border border-red-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  {cfg.label}
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${cfg.bg} ${cfg.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {cfg.label}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {c.escalaSemana ? (
                                <div>
                                  <span className={`text-xs font-medium ${c.escalaSemana === "REMOTO" ? "text-blue-400" : "text-gray-300"}`}>
                                    {c.escalaSemana === "REMOTO" ? "Remoto" : "Presencial"}
                                  </span>
                                  {c.escalaSemana === "PRESENCIAL" && c.unidadePresencial && (
                                    <p className="text-xs text-amber-400 mt-0.5">{c.unidadePresencial}</p>
                                  )}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {!c.semRemoto && (
                                  <>
                                    <button onClick={() => { setUnidadeInput(""); setModalPresencial({ colaboradorId: c.id, nome: c.nome }); }}
                                      className="text-xs px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition">
                                      Presencial
                                    </button>
                                    <button onClick={() => handleLancar(c.id, "REMOTO")}
                                      className="text-xs px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition">
                                      Remoto
                                    </button>
                                    {c.escalaSemana && (
                                      <button onClick={() => handleLimpar(c.id)}
                                        title="Limpar lançamento desta semana"
                                        className="text-xs px-2 py-1 rounded bg-red-900/40 hover:bg-red-800/60 text-red-400 hover:text-red-300 transition">
                                        ✕
                                      </button>
                                    )}
                                  </>
                                )}
                                <button
                                  onClick={() => handleToggleSemRemoto(c.id, c.semRemoto)}
                                  title={c.semRemoto ? "Reativar elegibilidade de remoto" : "Marcar como sem remoto"}
                                  className={`text-xs px-2 py-1 rounded transition ${c.semRemoto ? "bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200" : "bg-gray-800 hover:bg-gray-700 text-gray-600 hover:text-gray-400"}`}>
                                  {c.semRemoto ? "↺ Reativar" : "🚫"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal unidade presencial */}
      {modalPresencial && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalPresencial(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-1">Lançar como Presencial</h3>
            <p className="text-gray-400 text-sm mb-4">{modalPresencial.nome}</p>
            <label className="block text-xs text-gray-400 mb-1">Unidade (opcional)</label>
            <input
              type="text"
              value={unidadeInput}
              onChange={e => setUnidadeInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && confirmarPresencial()}
              placeholder="Ex: Núcleo de Custódia"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalPresencial(null)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
                Cancelar
              </button>
              <button onClick={confirmarPresencial}
                className="px-4 py-2 text-sm rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-medium transition">
                Confirmar Presencial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
