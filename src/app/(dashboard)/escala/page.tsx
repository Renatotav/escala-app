"use client";

import { useEffect, useState } from "react";
import { sinalConfig, type Sinal } from "@/lib/eligibility";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ICONE_ESCALA_B64 } from "@/lib/icone-escala-b64";

type Equipe = { id: number; nome: string; thresholdAmarelo: number; thresholdVerde: number };
type ColaboradorEscala = {
  id: number; nome: string; cargo: string | null;
  equipe: Equipe; semanasPresencial: number; ajusteSemanasPresencial: number; contadoRaw: number;
  sinal: Sinal; escalaSemana: string | null; unidadePresencial: string | null; semRemoto: boolean;
  whatsapp: boolean;
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

const UNIDADES_PADRAO = [
  "Fórum Clóvis Beviláqua",
  "Núcleo de Custódia e das Garantias da Comarca de Fortaleza",
  "Tribunal de Justiça",
];
const EQUIPES_EXCLUIDAS_PADRAO = ["Supervisão", "Coordenação"];
const NUCLEO_HORARIO_PADRAO_DEFAULT = "Seg. a Quinta: 08:00 às 12:00 e Sexta: 08:00 às 14:00.";

export default function EscalaPage() {
  const [semana, setSemana] = useState(getInitialISO());
  const [equipeId, setEquipeId] = useState("");
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorEscala[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalPresencial, setModalPresencial] = useState<{ colaboradorId: number; nome: string } | null>(null);
  const [unidadeInput, setUnidadeInput] = useState("");
  const [outroInput, setOutroInput] = useState("");
  const [horarioInput, setHorarioInput] = useState("");
  const [modalRemoto, setModalRemoto] = useState<{ colaboradorId: number; nome: string } | null>(null);
  const [unidadeRemotoInput, setUnidadeRemotoInput] = useState("");
  const [outroRemotoInput, setOutroRemotoInput] = useState("");

  // Configurações dinâmicas
  const [unidadesPresencial, setUnidadesPresencial] = useState<string[]>(UNIDADES_PADRAO);
  const [equipesExcluidas, setEquipesExcluidas] = useState<string[]>(EQUIPES_EXCLUIDAS_PADRAO);
  const [nucleoHorario, setNucleoHorario] = useState(NUCLEO_HORARIO_PADRAO_DEFAULT);

  // Modal de configurações
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"locais" | "equipes" | "horarios">("locais");
  const [savingConfig, setSavingConfig] = useState(false);

  // Edição local dentro do modal
  const [editUnidades, setEditUnidades] = useState<string[]>([]);
  const [editEquipesExcluidas, setEditEquipesExcluidas] = useState<string[]>([]);
  const [editNucleoHorario, setEditNucleoHorario] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("");
  const [novaEquipe, setNovaEquipe] = useState("");

  useEffect(() => { fetch("/api/equipes").then(r => r.json()).then(setEquipes); }, []);

  useEffect(() => {
    fetch("/api/configuracoes?prefixo=escala.").then(r => r.json()).then((cfg: Record<string, unknown>) => {
      if (Array.isArray(cfg["escala.unidades"])) setUnidadesPresencial(cfg["escala.unidades"] as string[]);
      if (Array.isArray(cfg["escala.equipes_excluidas"])) setEquipesExcluidas(cfg["escala.equipes_excluidas"] as string[]);
      if (typeof cfg["escala.nucleo_horario"] === "string") setNucleoHorario(cfg["escala.nucleo_horario"] as string);
    }).catch(() => {});
  }, []);

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

  const NUCLEO_HORARIO_PADRAO = nucleoHorario;

  function abrirSettings() {
    setEditUnidades([...unidadesPresencial]);
    setEditEquipesExcluidas([...equipesExcluidas]);
    setEditNucleoHorario(nucleoHorario);
    setNovaUnidade("");
    setNovaEquipe("");
    setSettingsTab("locais");
    setSettingsOpen(true);
  }

  async function salvarConfig() {
    setSavingConfig(true);
    await Promise.all([
      fetch("/api/configuracoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave: "escala.unidades", valor: editUnidades }) }),
      fetch("/api/configuracoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave: "escala.equipes_excluidas", valor: editEquipesExcluidas }) }),
      fetch("/api/configuracoes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chave: "escala.nucleo_horario", valor: editNucleoHorario }) }),
    ]);
    setUnidadesPresencial([...editUnidades]);
    setEquipesExcluidas([...editEquipesExcluidas]);
    setNucleoHorario(editNucleoHorario);
    setSavingConfig(false);
    setSettingsOpen(false);
  }

  function unidadeRequerHorario(u: string) {
    return /cust[oó]dia/i.test(u) || u === "__outro__";
  }

  async function confirmarRemoto() {
    if (!modalRemoto) return;
    const unidade = unidadeRemotoInput === "__outro__"
      ? outroRemotoInput.trim() || undefined
      : unidadeRemotoInput || undefined;
    await handleLancar(modalRemoto.colaboradorId, "REMOTO", unidade);
    setModalRemoto(null);
    setUnidadeRemotoInput("");
    setOutroRemotoInput("");
  }

  async function confirmarPresencial() {
    if (!modalPresencial) return;
    const unidadeBase = unidadeInput === "__outro__"
      ? outroInput.trim()
      : unidadeInput.trim();
    const horario = horarioInput.trim();
    const unidade = horario ? `${unidadeBase}||${horario}` : unidadeBase;
    await handleLancar(modalPresencial.colaboradorId, "PRESENCIAL", unidade);
    setModalPresencial(null);
    setUnidadeInput("");
    setOutroInput("");
    setHorarioInput("");
  }

  function exportCSV() {
    const rows = [["Colaborador", "Cargo", "Equipe", "Semanas Presencial", "Elegibilidade", "Esta Semana", "Operador WhatsApp"]];
    const membros = colaboradores.filter(c => !equipesExcluidas.includes(c.equipe.nome));
    for (const c of membros) {
      rows.push([
        c.nome,
        c.cargo ?? "",
        c.equipe.nome,
        String(c.semanasPresencial),
        sinalConfig[c.sinal].label,
        c.escalaSemana === "REMOTO" ? "Remoto" : c.escalaSemana === "PRESENCIAL" ? (c.unidadePresencial ? `Presencial - ${c.unidadePresencial.split("||")[0]}` : "Presencial") : "Não lançado",
        c.whatsapp ? "Sim" : "",
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
    const GREEN: [number, number, number] = [27, 75, 75];
    const BLACK: [number, number, number] = [10, 10, 10];
    const LILAC: [number, number, number] = [180, 160, 210];

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Fundo creme para combinar com o fundo da imagem do ícone
    const CREAM: [number, number, number] = [245, 240, 228];
    doc.setFillColor(...CREAM);
    doc.rect(0, 0, 210, 297, "F");

    const [sy, sm, sd] = semana.split("-").map(Number);
    const seg = new Date(sy, sm - 1, sd);
    const sex = new Date(sy, sm - 1, sd + 4);
    const fmt = (dt: Date) =>
      `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const mesNome = seg.toLocaleString("pt-BR", { month: "long" });
    const mesCapital = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
    const dataRange = `${fmt(seg)} à ${fmt(sex)}/${sex.getFullYear()}`;

    // === CABEÇALHO ===
    // Linha de topo verde
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(1.2);
    doc.line(12, 7, 198, 7);

    // Título principal — DIREITA, negrito, VERDE
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...GREEN);
    doc.text(`Escala - ${mesCapital} de ${sex.getFullYear()}`, 198, 17, { align: "right" });

    // Ícone embutido (base64) — relógio+calendário, fundo creme combina com PDF
    doc.addImage(ICONE_ESCALA_B64, "PNG", 12, 8, 22, 19.6);

    // Data do período — verde, negrito, sublinhado (abaixo do relógio)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...GREEN);
    doc.text(dataRange, 12, 30);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.35);
    doc.line(12, 31.5, 12 + doc.getTextWidth(dataRange), 31.5);

    let y = 36;

    const membros = colaboradores.filter(c => !equipesExcluidas.includes(c.equipe.nome));

    const forum: string[] = [];
    const custodia: string[] = [];
    const tj: string[] = [];
    const remotos: string[] = [];
    const remotosPorUnidade: Map<string, string[]> = new Map();

    for (const c of [...membros].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))) {
      if (c.escalaSemana === "PRESENCIAL") {
        const u = (c.unidadePresencial?.split("||")[0] ?? "").trim();
        if (/cust[oó]dia/i.test(u)) custodia.push(c.nome.toUpperCase());
        else if (/tribunal|^tj$/i.test(u)) tj.push(c.nome.toUpperCase());
        else forum.push(c.nome.toUpperCase());
      } else if (c.escalaSemana === "REMOTO") {
        const u = (c.unidadePresencial?.split("||")[0] ?? "").trim();
        if (u) {
          if (!remotosPorUnidade.has(u)) remotosPorUnidade.set(u, []);
          remotosPorUnidade.get(u)!.push(c.nome.toUpperCase());
        } else {
          remotos.push(c.nome.toUpperCase());
        }
      }
    }

    function renderSecao(titulo: string, nomes: string[], opcoes?: { duasColunas?: boolean; horario?: string }) {
      if (nomes.length === 0) return;

      // Título — verde, negrito, sublinhado
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...GREEN);
      doc.text(titulo, 12, y);
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.3);
      doc.line(12, y + 1, 12 + doc.getTextWidth(titulo), y + 1);
      y += 5;

      // Horário como faixa azul com texto branco
      if (opcoes?.horario) {
        doc.setFillColor(37, 99, 235);
        doc.rect(12, y - 3.5, 185, 6, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(opcoes.horario, 104.5, y + 0.5, { align: "center" });
        y += 4;
      }

      // Tabela: 2 colunas ou 1 coluna
      const duas = !!opcoes?.duasColunas;
      let rows: string[][];
      if (duas) {
        const metade = Math.ceil(nomes.length / 2);
        rows = Array.from({ length: metade }, (_, i) => [nomes[i] ?? "", nomes[i + metade] ?? ""]);
      } else {
        rows = nomes.map(n => [n]);
      }

      autoTable(doc, {
        startY: y,
        body: rows,
        theme: "grid",
        columnStyles: duas
          ? { 0: { cellWidth: 92 }, 1: { cellWidth: 93 } }
          : { 0: { cellWidth: 185 } },
        bodyStyles: {
          fontSize: 7,
          fontStyle: "bold",
          textColor: BLACK,
          lineColor: LILAC,
          lineWidth: 0.2,
          cellPadding: 1.2,
          fillColor: CREAM,
        },
        margin: { left: 12, right: 12 },
        didDrawPage: () => { y = 12; },
      });
      y = (doc as DocWithTable).lastAutoTable.finalY + 10;
    }

    // Horário do Núcleo: usa o personalizado salvo (se houver) ou o padrão
    const custodiaHorario = membros
      .filter(c => c.escalaSemana === "PRESENCIAL" && /cust[oó]dia/i.test(c.unidadePresencial?.split("||")[0] ?? ""))
      .map(c => c.unidadePresencial?.split("||")[1])
      .find(h => h) ?? "Seg. a Quinta: 08:00 às 12:00 e Sexta: 08:00 às 14:00.";

    // Ordem: Fórum → Núcleo → WhatsApp → TJ → Remoto
    renderSecao("Presencial - Fórum Clóvis Beviláqua", forum, { duasColunas: true });
    renderSecao("Presencial - Núcleo de Custódia e das Garantias da Comarca de Fortaleza", custodia, {
      horario: custodiaHorario,
    });

    // Responsável WhatsApp — logo após o Núcleo
    const whatsappOp = membros.find(c => c.whatsapp);
    if (whatsappOp) {
      renderSecao("Operador - WhatsApp", [whatsappOp.nome.toUpperCase()]);
    }

    renderSecao("Presencial - Tribunal de Justiça", tj);
    remotosPorUnidade.forEach((nomes, unidade) => {
      const horario = /cust[oó]dia/i.test(unidade) ? custodiaHorario : undefined;
      renderSecao(`Online - ${unidade}`, nomes, { horario });
    });
    renderSecao("Remoto", remotos);

    doc.save(`escala-${semana}.pdf`);
  }

  async function handleToggleWhatsapp(colaboradorId: number) {
    await fetch("/api/escalas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colaboradorId, semana }),
    });
    const params = new URLSearchParams({ semana });
    if (equipeId) params.set("equipeId", equipeId);
    const data = await fetch(`/api/escalas?${params}`).then(r => r.json());
    setColaboradores(data);
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


  const equipesEscala = equipes.filter(eq => !equipesExcluidas.includes(eq.nome));

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
    : [{ equipe: null, membros: sortMembros(colaboradores.filter(c => !equipesExcluidas.includes(c.equipe.nome))) }];

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
          <button onClick={abrirSettings}
            title="Configurações da Escala"
            className="text-sm px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition">
            ⚙
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
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className={`font-medium truncate ${isPriority ? "text-amber-200" : "text-white"}`}>{c.nome}</p>
                                    {c.whatsapp && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                                        💬 WhatsApp
                                      </span>
                                    )}
                                  </div>
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
                            <td className="px-4 py-3 max-w-[160px]">
                              {c.escalaSemana ? (
                                <div className="min-w-0">
                                  <span className={`text-xs font-medium ${c.escalaSemana === "REMOTO" ? "text-blue-400" : "text-gray-300"}`}>
                                    {c.escalaSemana === "REMOTO" ? (c.unidadePresencial ? "Online" : "Remoto") : "Presencial"}
                                  </span>
                                  {c.unidadePresencial && (
                                    <p className={`text-xs mt-0.5 truncate ${c.escalaSemana === "REMOTO" ? "text-blue-300/70" : "text-amber-400"}`}
                                      title={c.unidadePresencial.split("||")[0]}>
                                      {c.unidadePresencial.split("||")[0]}
                                    </p>
                                  )}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {!c.semRemoto && (
                                  <>
                                    <button onClick={() => {
                                        const isTJ = /\b2g\b/i.test(c.equipe.nome);
                                        setUnidadeInput(isTJ ? "Tribunal de Justiça" : "Fórum Clóvis Beviláqua");
                                        setModalPresencial({ colaboradorId: c.id, nome: c.nome });
                                      }}
                                      className="text-xs px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition">
                                      Presencial
                                    </button>
                                    <button onClick={() => { setModalRemoto({ colaboradorId: c.id, nome: c.nome }); setUnidadeRemotoInput(""); setOutroRemotoInput(""); }}
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
                                  onClick={() => handleToggleWhatsapp(c.id)}
                                  title={c.whatsapp ? "Remover responsável WhatsApp" : "Designar como responsável WhatsApp"}
                                  className={`text-xs px-2 py-1 rounded transition ${c.whatsapp ? "bg-green-700 hover:bg-green-600 text-white" : "bg-gray-800 hover:bg-green-900/40 text-gray-500 hover:text-green-400 border border-gray-700"}`}>
                                  💬
                                </button>
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

      {/* Modal Configurações da Escala */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSettingsOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-800">
              <h3 className="text-white font-semibold flex items-center gap-2">⚙ Configurações da Escala</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-gray-500 hover:text-white transition text-lg leading-none">✕</button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-gray-800 px-6">
              {([["locais", "📍 Locais"], ["equipes", "👥 Equipes"], ["horarios", "🕐 Horários"]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setSettingsTab(tab)}
                  className={`text-xs py-3 px-3 border-b-2 transition ${settingsTab === tab ? "border-blue-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {settingsTab === "locais" && (
                <>
                  <p className="text-xs text-gray-400 mb-3">Locais disponíveis para lançamento presencial.</p>
                  <div className="space-y-2">
                    {editUnidades.map((u, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={u}
                          onChange={e => setEditUnidades(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                          className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={() => setEditUnidades(prev => prev.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-300 text-lg px-1 transition">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <input
                      value={novaUnidade}
                      onChange={e => setNovaUnidade(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && novaUnidade.trim()) { setEditUnidades(p => [...p, novaUnidade.trim()]); setNovaUnidade(""); } }}
                      placeholder="Novo local..."
                      className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => { if (novaUnidade.trim()) { setEditUnidades(p => [...p, novaUnidade.trim()]); setNovaUnidade(""); } }}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition">
                      + Adicionar
                    </button>
                  </div>
                </>
              )}

              {settingsTab === "equipes" && (
                <>
                  <p className="text-xs text-gray-400 mb-3">Equipes que <strong className="text-white">não aparecem</strong> na escala semanal.</p>
                  <div className="space-y-2">
                    {editEquipesExcluidas.map((eq, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={eq}
                          onChange={e => setEditEquipesExcluidas(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                          className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={() => setEditEquipesExcluidas(prev => prev.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-300 text-lg px-1 transition">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <input
                      value={novaEquipe}
                      onChange={e => setNovaEquipe(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && novaEquipe.trim()) { setEditEquipesExcluidas(p => [...p, novaEquipe.trim()]); setNovaEquipe(""); } }}
                      placeholder="Nome da equipe a excluir..."
                      className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => { if (novaEquipe.trim()) { setEditEquipesExcluidas(p => [...p, novaEquipe.trim()]); setNovaEquipe(""); } }}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition">
                      + Adicionar
                    </button>
                  </div>
                </>
              )}

              {settingsTab === "horarios" && (
                <>
                  <p className="text-xs text-gray-400 mb-3">Horário padrão exibido no PDF para as Unidades de Atendimento.</p>
                  <textarea
                    value={editNucleoHorario}
                    onChange={e => setEditNucleoHorario(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-800">
              <button onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
                Cancelar
              </button>
              <button onClick={salvarConfig} disabled={savingConfig}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50">
                {savingConfig ? "Salvando..." : "Salvar configurações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal unidade presencial */}
      {modalPresencial && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalPresencial(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-1">Lançar como Presencial</h3>
            <p className="text-gray-400 text-sm mb-4">{modalPresencial.nome}</p>
            <label className="block text-xs text-gray-400 mb-1">Local</label>
            <select
              value={unidadeInput}
              onChange={e => {
                const val = e.target.value;
                setUnidadeInput(val);
                setOutroInput("");
                setHorarioInput(/cust[oó]dia/i.test(val) ? NUCLEO_HORARIO_PADRAO : "");
              }}
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {unidadesPresencial.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
              <option value="__outro__">Outros (digitar)</option>
            </select>
            {unidadeInput === "__outro__" && (
              <input
                type="text"
                value={outroInput}
                onChange={e => setOutroInput(e.target.value)}
                placeholder="Digite a unidade..."
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {unidadeRequerHorario(unidadeInput) && (
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Horário</label>
                <input
                  type="text"
                  value={horarioInput}
                  onChange={e => setHorarioInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && confirmarPresencial()}
                  placeholder="Ex: Seg. a Sexta: 08:00 às 14:00"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
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
      {/* Modal unidade remoto */}
      {modalRemoto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalRemoto(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-1">Lançar como Remoto</h3>
            <p className="text-gray-400 text-sm mb-4">{modalRemoto.nome}</p>
            <label className="block text-xs text-gray-400 mb-1">Local dedicado <span className="text-gray-600">(opcional)</span></label>
            <select
              value={unidadeRemotoInput}
              onChange={e => { setUnidadeRemotoInput(e.target.value); setOutroRemotoInput(""); }}
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sem local específico</option>
              {unidadesPresencial.filter(u => !/f[oó]rum/i.test(u)).map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
              <option value="__outro__">Outros (digitar)</option>
            </select>
            {unidadeRemotoInput === "__outro__" && (
              <input
                type="text"
                value={outroRemotoInput}
                onChange={e => setOutroRemotoInput(e.target.value)}
                placeholder="Digite a unidade..."
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalRemoto(null)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
                Cancelar
              </button>
              <button onClick={confirmarRemoto}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition">
                Confirmar Remoto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
