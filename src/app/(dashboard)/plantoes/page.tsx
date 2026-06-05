"use client";

import { useEffect, useState } from "react";

type Entry = { id: number; nome: string; equipe: string; sabados: number; domFer: number; total: number; score: number; proximoDeve: "DUPLO" | "SIMPLES" | null };
type Historico = { id: number; colaboradorId: number; data: string; tipo: string; folga1: string | null; folga2: string | null; descricao: string | null; colaborador: { nome: string; equipe: { nome: string } } };
type Saldo = { id: number; nome: string; equipe: string; totalPlantoes: number; creditos: number; agendadas: number; pendentes: number };
type Equipe = { id: number; nome: string };
type FolgaReg = { id: number; data: string; tipo: string; descricao: string | null; colaborador: { nome: string; equipe: { nome: string } } };
type FolgaAgendada = { id: string; colaboradorId: number; data: string; dataPlantao: string; colaborador: { nome: string; equipe: { nome: string } }; tipoPlantao: string };
type EscalaMensal = { id: number; data: string; tipo: string; colaborador: { id: number; nome: string; equipe: string } };
type Atestado = { id: number; colaboradorId: number; dataInicio: string; dataFim: string; dias: number; descricao: string | null; colaborador: { nome: string; equipe: { nome: string } } };

const tipoLabel: Record<string, string> = { SABADO: "Sábado", DOMINGO: "Domingo", FERIADO: "Feriado", PONTO_FACULTATIVO: "Pto. Facultativo" };
const tipoBadgeFolga: Record<string, string> = {
  SABADO:             "bg-purple-500/10 text-purple-400",
  DOMINGO:            "bg-orange-500/10 text-orange-400",
  FERIADO:            "bg-blue-500/10 text-blue-400",
  PONTO_FACULTATIVO:  "bg-teal-500/10 text-teal-400",
};

const TIPOS = [
  { value: "SABADO",             label: "Sábado",           pts: 1, folgas: 1 },
  { value: "PONTO_FACULTATIVO",  label: "Ponto Facultativo", pts: 1, folgas: 1 },
  { value: "DOMINGO",            label: "Domingo",           pts: 2, folgas: 2 },
  { value: "FERIADO",            label: "Feriado",           pts: 2, folgas: 2 },
];

const emptyForm = { colaboradorId: "", data: "", tipo: "SABADO", folga1: "", folga2: "", descricao: "" };

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function tipoBadge(tipo: string) {
  if (tipo === "SABADO")            return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Sábado</span>;
  if (tipo === "DOMINGO")           return <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Domingo</span>;
  if (tipo === "PONTO_FACULTATIVO") return <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">Pto. Facultativo</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">Feriado</span>;
}

// ── Feriados automáticos ──────────────────────────────────────────────────────
function calcPascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addD(d: Date, n: number): string {
  const r = new Date(d); r.setDate(r.getDate() + n);
  return r.getFullYear() + "-" + String(r.getMonth() + 1).padStart(2, "0") + "-" + String(r.getDate()).padStart(2, "0");
}

function toISO(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function getFeriadosPredefinidos(ano: number): { data: string; descricao: string; tipo: "FERIADO"; predefinido: true }[] {
  const pascoa = calcPascoa(ano);
  const fixos: [string, string][] = [
    [`${ano}-01-01`, "Confraternização Universal"],
    [`${ano}-03-25`, "Data Magna do Ceará"],
    [`${ano}-04-21`, "Tiradentes"],
    [`${ano}-05-01`, "Dia do Trabalho"],
    [`${ano}-08-15`, "N. Sra. da Assunção (Fortaleza)"],
    [`${ano}-09-07`, "Independência do Brasil"],
    [`${ano}-10-12`, "N. Sra. Aparecida"],
    [`${ano}-11-02`, "Finados"],
    [`${ano}-11-15`, "Proclamação da República"],
    [`${ano}-12-25`, "Natal"],
  ];
  const moveis: [string, string][] = [
    [addD(pascoa, -48), "Carnaval (Segunda)"],
    [addD(pascoa, -47), "Carnaval (Terça)"],
    [addD(pascoa, -2),  "Sexta-feira Santa"],
    [toISO(pascoa),     "Páscoa"],
    [addD(pascoa, 60),  "Corpus Christi"],
  ];
  return [...fixos, ...moveis].map(([data, descricao]) => ({ data, descricao, tipo: "FERIADO" as const, predefinido: true as const }));
}
// ─────────────────────────────────────────────────────────────────────────────

// Gera todos os sábados e domingos de um mês
function getDiasFinaisMes(mes: string): { data: string; tipo: "SABADO" | "DOMINGO" }[] {
  const [y, m] = mes.split("-").map(Number);
  const dias: { data: string; tipo: "SABADO" | "DOMINGO" }[] = [];
  const total = new Date(y, m, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const dt = new Date(y, m - 1, d);
    const dow = dt.getDay();
    if (dow === 6) dias.push({ data: dt.toISOString().slice(0, 10), tipo: "SABADO" });
    if (dow === 0) dias.push({ data: dt.toISOString().slice(0, 10), tipo: "DOMINGO" });
  }
  return dias;
}

type FichaPlantao = { id: number; data: string; tipo: string; folga1: string | null; folga2: string | null; descricao: string | null };

export default function PlantoesPage() {
  const [tab, setTab] = useState<"ranking" | "historico" | "saldo" | "folgas" | "escala">("ranking");
  const [ranking, setRanking] = useState<Entry[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [saldo, setSaldo] = useState<Saldo[]>([]);
  const [escalaMensal, setEscalaMensal] = useState<EscalaMensal[]>([]);
  const [feriadosCustom, setFeriadosCustom] = useState<{ id: number; data: string; descricao: string }[]>([]);
  const [mesEscala, setMesEscala] = useState(new Date().toISOString().slice(0, 7));
  const [modalEscala, setModalEscala] = useState<{ data: string; tipo: string } | null>(null);
  const [escalaColabId, setEscalaColabId] = useState("");
  const [savingEscala, setSavingEscala] = useState(false);
  const [mesHistorico, setMesHistorico] = useState(new Date().toISOString().slice(0, 7));
  const [colaboradorHistorico, setColaboradorHistorico] = useState("");
  const [mesFolga, setMesFolga] = useState(new Date().toISOString().slice(0, 7));
  const [colaboradorFolga, setColaboradorFolga] = useState("");
  const [modalFolga, setModalFolga] = useState(false);
  const [formFolga, setFormFolga] = useState({ colaboradorId: "", data: "", tipo: "SABADO", descricao: "" });
  const [savingFolga, setSavingFolga] = useState(false);
  const [editingFolga, setEditingFolga] = useState<FolgaReg | null>(null);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [filtroColab, setFiltroColab] = useState("");
  const [modal, setModal] = useState<"novo" | "folga" | null>(null);
  const [selected, setSelected] = useState<Historico | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [folgaForm, setFolgaForm] = useState({ folga1: "", folga2: "" });
  const [folgasAgendadas, setFolgasAgendadas] = useState<FolgaAgendada[]>([]);
  const [saving, setSaving] = useState(false);
  const [editPlantao, setEditPlantao] = useState<Historico | null>(null);
  const [editForm, setEditForm] = useState({ colaboradorId: "", data: "", tipo: "SABADO" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [saldoPendingColab, setSaldoPendingColab] = useState<{ id: number; nome: string } | null>(null);
  const [saldoPendingPlantoes, setSaldoPendingPlantoes] = useState<Historico[]>([]);
  const [saldoVerColab, setSaldoVerColab] = useState<{ id: number; nome: string } | null>(null);
  const [saldoVerFolgas, setSaldoVerFolgas] = useState<FolgaAgendada[]>([]);
  const [toast, setToast] = useState<{ folga1: string; folga2?: string; plantaoData: string; plantaoTipo: string; nome: string } | null>(null);
  const [fichaModal, setFichaModal] = useState<{ id: number; nome: string; equipe: string } | null>(null);
  const [fichaPlantoes, setFichaPlantoes] = useState<FichaPlantao[]>([]);
  const [fichaLoading, setFichaLoading] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadRanking() {
    const data = await fetch("/api/plantoes").then((r) => r.json());
    setRanking(data);
  }

  async function loadHistorico(mes?: string, colabId?: string) {
    const m = mes ?? mesHistorico;
    const c = colabId ?? colaboradorHistorico;
    const params = new URLSearchParams({ view: "historico", mes: m });
    if (c) params.set("colaboradorId", c);
    const data = await fetch(`/api/plantoes?${params}`).then((r) => r.json());
    setHistorico(data);
  }

  async function loadSaldo() {
    const data = await fetch("/api/plantoes?view=saldo").then((r) => r.json());
    setSaldo(data);
  }


  async function loadFolgasAgendadas() {
    const params = new URLSearchParams({ view: "folgas-agendadas", mes: mesFolga });
    if (colaboradorFolga) params.set("colaboradorId", colaboradorFolga);
    const data = await fetch(`/api/plantoes?${params}`).then((r) => r.json());
    setFolgasAgendadas(data);
  }

  async function loadEscalaMensal() {
    const [escala, feriados] = await Promise.all([
      fetch(`/api/escala-plantao?mes=${mesEscala}`).then((r) => r.json()),
      fetch("/api/feriados").then((r) => r.json()),
    ]);
    setEscalaMensal(escala);
    setFeriadosCustom(feriados.map((f: { id: number; data: string; descricao: string }) => ({
      ...f,
      data: f.data.slice(0, 10),
    })));
  }

  async function openFicha(id: number, nome: string, equipe: string) {
    setFichaModal({ id, nome, equipe });
    setFichaLoading(true);
    const data = await fetch(`/api/colaboradores/${id}/ficha`).then(r => r.json());
    setFichaPlantoes(data.plantoes ?? []);
    setFichaLoading(false);
  }

  const [foraLista, setForaLista] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadRanking();
    loadSaldo();
    fetch("/api/equipes").then((r) => r.json()).then(setEquipes);
    fetch("/api/controle-triagem?ativos=true").then(r => r.json()).then((data: { colaboradorId: number }[]) => {
      setForaLista(new Set(data.map(r => r.colaboradorId)));
    });
  }, []);

  useEffect(() => {
    if (tab === "historico") loadHistorico();
    if (tab === "saldo") loadSaldo();
    if (tab === "folgas") loadFolgasAgendadas();
    if (tab === "escala") loadEscalaMensal();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "folgas") loadFolgasAgendadas();
  }, [mesFolga, colaboradorFolga]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "historico") loadHistorico(mesHistorico, colaboradorHistorico);
  }, [mesHistorico, colaboradorHistorico]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "escala") loadEscalaMensal();
  }, [mesEscala]); // eslint-disable-line react-hooks/exhaustive-deps

  async function exportMarkdown() {
    const todos = await fetch("/api/plantoes?view=historico").then(r => r.json()) as Historico[];
    const porMes: Record<string, Historico[]> = {};
    for (const h of todos) {
      const mes = h.data.slice(0, 7);
      if (!porMes[mes]) porMes[mes] = [];
      porMes[mes].push(h);
    }
    const mesesOrdenados = Object.keys(porMes).sort();
    const nomeMes = (m: string) => {
      const [y, mo] = m.split("-");
      return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    };
    let md = "# Revisão de Plantões e Folgas\n\n";
    for (const mes of mesesOrdenados) {
      md += `## ${nomeMes(mes)}\n\n`;
      md += "| Colaborador | Equipe | Data Plantão | Tipo | Folga Simples | Folga Dupla |\n";
      md += "|-------------|--------|--------------|------|--------------|-------------|\n";
      for (const h of porMes[mes].sort((a, b) => a.data.localeCompare(b.data))) {
        const needsDupla = h.tipo === "DOMINGO" || h.tipo === "FERIADO";
        md += `| ${h.colaborador.nome} | ${h.colaborador.equipe.nome} | ${fmt(h.data)} | ${tipoLabel[h.tipo]} | ${fmt(h.folga1)} | ${needsDupla ? fmt(h.folga2) : "—"} |\n`;
      }
      md += "\n";
    }
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "revisao-plantoes.md"; a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    let csv = "";
    let filename = "";
    if (tab === "ranking") {
      csv = ["Nome,Equipe,Sábados,Dom/Fer,Acumulado", ...lista.map(e => `"${e.nome}","${e.equipe}",${e.sabados},${e.domFer},${e.score}`)].join("\n");
      filename = "sequencia-plantoes.csv";
    } else if (tab === "historico") {
      csv = ["Colaborador,Equipe,Data,Tipo,Folga1,Folga2", ...historico.map(h => `"${h.colaborador.nome}","${h.colaborador.equipe.nome}","${fmt(h.data)}","${tipoLabel[h.tipo]}","${fmt(h.folga1)}","${h.tipo !== "SABADO" ? fmt(h.folga2) : ""}"`  )].join("\n");
      filename = "historico-plantoes.csv";
    } else if (tab === "saldo") {
      csv = ["Nome,Equipe,Plantões,Folgas Devidas,Agendadas,Pendentes", ...saldo.map(s => `"${s.nome}","${s.equipe}",${s.totalPlantoes},${s.creditos},${s.agendadas},${s.pendentes}`)].join("\n");
      filename = "saldo-plantoes.csv";
    } else if (tab === "folgas") {
      csv = ["Data da Folga,Colaborador,Equipe,Data do Plantão,Tipo", ...folgasAgendadas.map(f => `"${fmt(f.data)}","${f.colaborador.nome}","${f.colaborador.equipe.nome}","${fmt(f.dataPlantao)}","${tipoLabel[f.tipoPlantao] ?? f.tipoPlantao}"`)].join("\n");
      filename = `folgas-${mesFolga}.csv`;
    } else if (tab === "escala") {
      const rows = ["Data,Dia da Semana,Tipo,Colaborador,Equipe"];
      for (const { data, tipo } of diasMes) {
        const designados = escalaMensal.filter(e => e.data === data);
        const diaSemana = new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" });
        if (designados.length === 0) {
          rows.push(`"${fmt(data)}","${diaSemana}","${tipoLabel[tipo] ?? tipo}","",""`);
        } else {
          for (const d of designados) {
            rows.push(`"${fmt(data)}","${diaSemana}","${tipoLabel[tipo] ?? tipo}","${d.colaborador.nome}","${d.colaborador.equipe}"`);
          }
        }
      }
      csv = rows.join("\n");
      filename = `escala-${mesEscala}.csv`;
    } else return;
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmitFolga(e: { preventDefault(): void }) {
    e.preventDefault();
    setSavingFolga(true);
    if (editingFolga) {
      await fetch("/api/folgas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingFolga.id, data: formFolga.data, tipo: formFolga.tipo, descricao: formFolga.descricao }),
      });
      setEditingFolga(null);
    } else {
      await fetch("/api/folgas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formFolga, colaboradorId: Number(formFolga.colaboradorId) }),
      });
    }
    setSavingFolga(false);
    setModalFolga(false);
    setFormFolga({ colaboradorId: "", data: "", tipo: "SABADO", descricao: "" });
    loadSaldo();
  }


  async function handleAddEscala(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!modalEscala || !escalaColabId) return;
    setSavingEscala(true);
    await fetch("/api/escala-plantao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colaboradorId: Number(escalaColabId), data: modalEscala.data, tipo: modalEscala.tipo }),
    });
    setSavingEscala(false);
    setModalEscala(null);
    setEscalaColabId("");
    loadEscalaMensal();
  }

  async function handleRemoveEscala(id: number) {
    await fetch(`/api/escala-plantao?id=${id}`, { method: "DELETE" });
    loadEscalaMensal();
  }

  const rankingAlfabetico = [...ranking].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const lista = ranking.filter(e =>
    (!filtroEquipe || e.equipe === filtroEquipe) &&
    (!filtroColab || String(e.id) === filtroColab)
  );
  const minScore = lista.length ? lista[0].score : 0;
  const maxScore = lista.length ? lista[lista.length - 1].score : 0;

  function scoreCls(score: number) {
    const range = maxScore - minScore || 1;
    const pct = (score - minScore) / range;
    if (pct < 0.33) return "text-green-400";
    if (pct < 0.66) return "text-yellow-400";
    return "text-red-400";
  }

  const tipoSelecionado = TIPOS.find((t) => t.value === form.tipo)!;

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/plantoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, colaboradorId: Number(form.colaboradorId) }),
    });
    setSaving(false);
    setModal(null);
    setForm(emptyForm);
    loadRanking();
    if (tab === "historico") loadHistorico();
  }

  async function handleFolga(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/plantoes/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(folgaForm),
    });
    setSaving(false);
    setModal(null);
    if (folgaForm.folga1) {
      setToast({
        folga1: folgaForm.folga1,
        folga2: folgaForm.folga2 || undefined,
        plantaoData: selected.data,
        plantaoTipo: selected.tipo,
        nome: selected.colaborador.nome,
      });
    }
    setSelected(null);
    loadHistorico();
    loadFolgasAgendadas();
    loadSaldo();
  }


  async function openSaldoVerFolgas(s: Saldo) {
    const data = await fetch(`/api/plantoes?view=folgas-agendadas&colaboradorId=${s.id}`).then(r => r.json()) as FolgaAgendada[];
    setSaldoVerColab({ id: s.id, nome: s.nome });
    setSaldoVerFolgas(data);
  }

  function navMes(delta: number) {
    const [y, m] = mesFolga.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMesFolga(d.toISOString().slice(0, 7));
  }

  function navMesHistorico(delta: number) {
    const [y, m] = mesHistorico.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMesHistorico(d.toISOString().slice(0, 7));
  }

  async function openSaldoFolga(s: Saldo) {
    const data = await fetch(`/api/plantoes?view=historico&colaboradorId=${s.id}`).then(r => r.json()) as Historico[];
    const pendentes = data.filter(h => {
      const duplo = h.tipo === "DOMINGO" || h.tipo === "FERIADO";
      return !h.folga1 || (duplo && !h.folga2);
    });
    setSaldoPendingColab({ id: s.id, nome: s.nome });
    setSaldoPendingPlantoes(pendentes);
  }

  function openFolga(h: Historico) {
    setSelected(h);
    setFolgaForm({ folga1: h.folga1 ? h.folga1.slice(0, 10) : "", folga2: h.folga2 ? h.folga2.slice(0, 10) : "" });
    setModal("folga");
  }

  function openEditPlantao(h: Historico) {
    setEditPlantao(h);
    setEditForm({ colaboradorId: String(h.colaboradorId), data: h.data.slice(0, 10), tipo: h.tipo });
  }

  async function handleEditPlantao(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!editPlantao) return;
    setSavingEdit(true);
    await fetch(`/api/plantoes/${editPlantao.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSavingEdit(false);
    setEditPlantao(null);
    loadHistorico();
  }

  const totalFolgasPendentes = saldo.reduce((acc, s) => acc + s.pendentes, 0);

  const anoEscala = Number(mesEscala.slice(0, 4));
  const feriadosPre = getFeriadosPredefinidos(anoEscala).filter(f => f.data.startsWith(mesEscala));
  // IDs dos dias já cobertos pelos feriados pré-definidos
  const datasPre = new Set(feriadosPre.map(f => f.data));

  const diasMes: { data: string; tipo: string; descricao?: string; predefinido?: boolean }[] = [
    ...getDiasFinaisMes(mesEscala).filter(d => !datasPre.has(d.data)), // remove fim-de-semana que cai em feriado predefinido
    ...feriadosPre,
    ...feriadosCustom
      .filter(f => f.data.startsWith(mesEscala) && !datasPre.has(f.data))
      .map(f => ({
        data: f.data,
        tipo: f.descricao?.toLowerCase().includes("ponto facultativo") ? "PONTO_FACULTATIVO" : "FERIADO",
        descricao: f.descricao,
      })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Plantões & Folgas</h2>
          <p className="text-xs text-gray-400 mt-0.5">Sáb / Pto. Fac. = 1 pt · Dom / Feriado = 2 pts</p>
        </div>
        <div className="flex gap-2">
          {(tab === "ranking" || tab === "historico" || tab === "saldo" || tab === "folgas" || tab === "escala") && (
            <button onClick={exportCSV}
              className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              Exportar CSV
            </button>
          )}
          {tab === "folgas"
            ? <button onClick={() => { setEditingFolga(null); setFormFolga({ colaboradorId: "", data: "", tipo: "SABADO", descricao: "" }); setModalFolga(true); }} className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">+ Registrar folga</button>
            : tab === "escala"
            ? null
            : <button onClick={() => { setForm(emptyForm); setModal("novo"); }} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">+ Registrar plantão</button>
          }
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-lg p-1 overflow-x-auto w-full md:w-fit">
        {(["ranking", "historico", "saldo", "folgas", "escala"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap shrink-0 transition ${tab === t ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            {t === "ranking"   ? "Sequência"
              : t === "historico" ? "Histórico"
              : t === "saldo"     ? `Saldo${totalFolgasPendentes > 0 ? ` · ${totalFolgasPendentes} pendentes` : ""}`
              : t === "folgas"    ? "Folgas"
              : "Escala do Mês"}
          </button>
        ))}
      </div>

      {/* SEQUÊNCIA (RANKING) */}
      {tab === "ranking" && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)}
              className="flex-1 min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas as equipes</option>
              {equipes.map((eq) => <option key={eq.id} value={eq.nome}>{eq.nome}</option>)}
            </select>
            <select value={filtroColab} onChange={(e) => setFiltroColab(e.target.value)}
              className="flex-1 min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os colaboradores</option>
              {rankingAlfabetico.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-center px-4 py-3 w-10">#</th>
                  <th className="text-left px-4 py-3">Colaborador</th>
                  <th className="text-left px-4 py-3">Equipe</th>
                  <th className="text-center px-4 py-3">Sáb/Pto</th>
                  <th className="text-center px-4 py-3">Dom/Fer</th>
                  <th className="text-center px-4 py-3">Acumulado</th>
                  <th className="text-center px-4 py-3">Próxima escala</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum colaborador encontrado</td></tr>
                )}
                {lista.map((entry, idx) => {
                  const isNext = entry.score === minScore;
                  return (
                    <tr key={entry.id} className={`border-b border-gray-800 last:border-0 transition ${isNext && idx === 0 ? "bg-green-900/10" : "hover:bg-gray-800/50"}`}>
                      <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openFicha(entry.id, entry.nome, entry.equipe)} className="text-white font-medium hover:text-blue-400 transition text-left">{entry.nome}</button>
                          {foraLista.has(entry.id) && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">Fora da lista</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{entry.equipe}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">{entry.sabados}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{entry.domFer}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-base ${scoreCls(entry.score)}`}>{entry.score}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.proximoDeve === "DUPLO" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-medium">Dom / Feriado</span>
                        )}
                        {entry.proximoDeve === "SIMPLES" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">Sáb / Pto. Fac.</span>
                        )}
                        {entry.proximoDeve === null && (
                          <span className="text-xs text-gray-600">Primeiro plantão</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isNext && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 font-medium">Próximo</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* HISTÓRICO */}
      {tab === "historico" && (
        <>
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <div className="flex gap-1 shrink-0">
            <button onClick={() => navMesHistorico(-1)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm transition">‹</button>
            <input type="month" value={mesHistorico} onChange={e => setMesHistorico(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => navMesHistorico(1)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm transition">›</button>
          </div>
          <select value={colaboradorHistorico} onChange={e => setColaboradorHistorico(e.target.value)}
            className="flex-1 min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos os colaboradores</option>
            {rankingAlfabetico.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Colaborador</th>
                <th className="text-left px-4 py-3">Equipe</th>
                <th className="text-center px-4 py-3">Data Plantão</th>
                <th className="text-center px-4 py-3">Tipo</th>
                <th className="text-center px-4 py-3">Folga simples</th>
                <th className="text-center px-4 py-3">Folga dupla</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {historico.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum plantão registrado</td></tr>
              )}
              {historico.map((h) => {
                const needsFolga2 = h.tipo === "DOMINGO" || h.tipo === "FERIADO";
                const pendente = !h.folga1 || (needsFolga2 && !h.folga2);
                return (
                  <tr key={h.id} className={`border-b border-gray-800 last:border-0 transition hover:bg-gray-800/50 ${pendente ? "bg-yellow-900/5" : ""}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => openFicha(h.colaboradorId, h.colaborador.nome, h.colaborador.equipe.nome)} className="text-white font-medium hover:text-blue-400 transition text-left">{h.colaborador.nome}</button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{h.colaborador.equipe.nome}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">{fmt(h.data)}</td>
                    <td className="px-4 py-3 text-center">{tipoBadge(h.tipo)}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{fmt(h.folga1)}</td>
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">
                      {needsFolga2 ? fmt(h.folga2) : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openFolga(h)}
                          className={`text-xs font-medium transition ${pendente ? "text-yellow-400 hover:text-yellow-300" : "text-gray-500 hover:text-gray-300"}`}>
                          {pendente ? "Agendar folga" : "Folgas"}
                        </button>
                        <button onClick={() => openEditPlantao(h)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition">
                          ✎ Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* SALDO */}
      {tab === "saldo" && (
        <>
        {totalFolgasPendentes > 0 && (
          <div className="mb-3 px-4 py-2.5 rounded-lg bg-yellow-900/20 border border-yellow-700/30 text-sm text-yellow-400">
            Total a agendar: <strong>{totalFolgasPendentes}</strong> folga{totalFolgasPendentes !== 1 ? "s" : ""} pendente{totalFolgasPendentes !== 1 ? "s" : ""}
          </div>
        )}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Colaborador</th>
                <th className="text-left px-4 py-3">Equipe</th>
                <th className="text-center px-4 py-3">Plantões</th>
                <th className="text-center px-4 py-3">Folgas devidas</th>
                <th className="text-center px-4 py-3">Agendadas</th>
                <th className="text-center px-4 py-3">Pendentes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {saldo.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum registro encontrado</td></tr>
              )}
              {saldo.map((s) => (
                <tr key={s.id} className={`border-b border-gray-800 last:border-0 transition hover:bg-gray-800/50 ${s.pendentes > 0 ? "bg-yellow-900/5" : ""}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => openFicha(s.id, s.nome, s.equipe)} className="text-white font-medium hover:text-blue-400 transition text-left">{s.nome}</button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{s.equipe}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{s.totalPlantoes}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{s.creditos}</td>
                  <td className="px-4 py-3 text-center">
                    {s.agendadas > 0
                      ? <button onClick={() => openSaldoVerFolgas(s)} className="font-medium text-green-400 hover:text-green-300 underline underline-offset-2 transition">{s.agendadas}</button>
                      : <span className="text-gray-600">0</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.pendentes > 0
                      ? <span className="font-bold text-yellow-400">{s.pendentes}</span>
                      : <span className="text-gray-600">0</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.pendentes > 0 && (
                      <button onClick={() => openSaldoFolga(s)}
                        className="text-xs font-medium text-yellow-400 hover:text-yellow-300 transition">
                        Agendar folga
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* FOLGAS */}
      {tab === "folgas" && (
        <>
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="flex gap-1 shrink-0">
              <button onClick={() => navMes(-1)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm transition">‹</button>
              <input type="month" value={mesFolga} onChange={e => setMesFolga(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => navMes(1)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm transition">›</button>
            </div>
            <select value={colaboradorFolga} onChange={e => setColaboradorFolga(e.target.value)}
              className="flex-1 min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os colaboradores</option>
              {rankingAlfabetico.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Data da Folga</th>
                  <th className="text-left px-4 py-3">Colaborador</th>
                  <th className="text-left px-4 py-3">Equipe</th>
                  <th className="text-left px-4 py-3">Data do Plantão</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {folgasAgendadas.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nenhuma folga agendada neste mês</td></tr>
                )}
                {folgasAgendadas.map(f => (
                  <tr key={f.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3 text-green-400 font-mono font-medium">{fmt(f.data)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openFicha(f.colaboradorId, f.colaborador.nome, f.colaborador.equipe.nome)} className="text-white font-medium hover:text-blue-400 transition text-left">{f.colaborador.nome}</button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{f.colaborador.equipe.nome}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono">{fmt(f.dataPlantao)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${tipoBadgeFolga[f.tipoPlantao] ?? "bg-gray-700 text-gray-300"}`}>
                        {tipoLabel[f.tipoPlantao] ?? f.tipoPlantao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ESCALA DO MÊS */}
      {tab === "escala" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex gap-1 items-center shrink-0">
              <button onClick={() => { const [y,m] = mesEscala.split("-").map(Number); const d = new Date(y,m-2,1); setMesEscala(d.toISOString().slice(0,7)); }} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm transition">‹</button>
              <input type="month" value={mesEscala} onChange={e => setMesEscala(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => { const [y,m] = mesEscala.split("-").map(Number); const d = new Date(y,m,1); setMesEscala(d.toISOString().slice(0,7)); }} className="bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm transition">›</button>
            </div>
            <p className="text-xs text-gray-500">{diasMes.length} dias de plantão neste mês</p>
          </div>

          <div className="space-y-3">
            {diasMes.map(({ data, tipo, descricao, predefinido }) => {
              const designados = escalaMensal.filter(e => e.data === data);
              const badgeCls =
                tipo === "SABADO"           ? "bg-blue-500/10 text-blue-300 border-blue-500/30" :
                tipo === "DOMINGO"          ? "bg-purple-500/10 text-purple-300 border-purple-500/30" :
                tipo === "FERIADO"          ? "bg-orange-500/10 text-orange-300 border-orange-500/30" :
                                              "bg-teal-500/10 text-teal-300 border-teal-500/30";
              const badgeLabel =
                tipo === "SABADO"           ? "Sábado" :
                tipo === "DOMINGO"          ? "Domingo" :
                tipo === "PONTO_FACULTATIVO"? "Pto. Facultativo" :
                (descricao ?? "Feriado");
              return (
                <div key={data} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-white font-medium text-sm">
                          {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeCls}`}>
                        {badgeLabel}
                      </span>
                      <span className="text-xs text-gray-500">{designados.length} designado{designados.length !== 1 ? "s" : ""}</span>
                    </div>
                    <button
                      onClick={() => { setModalEscala({ data, tipo }); setEscalaColabId(""); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 transition">
                      + Adicionar
                    </button>
                  </div>

                  {designados.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">Nenhum colaborador designado</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {designados.map(d => (
                        <div key={d.id} className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5 text-sm">
                          <span className="text-white">{d.colaborador.nome}</span>
                          <span className="text-gray-500 text-xs">· {d.colaborador.equipe}</span>
                          <button
                            onClick={() => handleRemoveEscala(d.id)}
                            className="ml-1 text-gray-600 hover:text-red-400 transition text-xs leading-none">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL — Registrar folga */}
      {modalFolga && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-4">
              {editingFolga ? "Editar folga" : "Registrar folga"}
            </h3>
            {editingFolga && (
              <p className="text-xs text-gray-400 mb-3">{editingFolga.colaborador.nome}</p>
            )}
            <form onSubmit={handleSubmitFolga} className="space-y-3">
              {!editingFolga && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                  <select value={formFolga.colaboradorId} onChange={e => setFormFolga(f => ({ ...f, colaboradorId: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    {rankingAlfabetico.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data</label>
                <input type="date" value={formFolga.data} onChange={e => setFormFolga(f => ({ ...f, data: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                <select value={formFolga.tipo} onChange={e => setFormFolga(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="SABADO">Sábado</option>
                  <option value="DOMINGO">Domingo</option>
                  <option value="FERIADO">Feriado</option>
                  <option value="PONTO_FACULTATIVO">Ponto Facultativo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação <span className="text-gray-600">(opcional)</span></label>
                <input value={formFolga.descricao} onChange={e => setFormFolga(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModalFolga(false); setEditingFolga(null); setFormFolga({ colaboradorId: "", data: "", tipo: "SABADO", descricao: "" }); }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={savingFolga}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {savingFolga ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL — Adicionar à Escala do Mês */}
      {modalEscala && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-1">Designar para plantão</h3>
            <p className="text-xs text-gray-400 mb-4">
              {new Date(modalEscala.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              {" · "}{tipoLabel[modalEscala.tipo]}
            </p>
            <form onSubmit={handleAddEscala} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                <select value={escalaColabId} onChange={e => setEscalaColabId(e.target.value)} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {rankingAlfabetico.map(e => <option key={e.id} value={e.id}>{e.nome} — {e.equipe}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalEscala(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={savingEscala}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {savingEscala ? "Salvando..." : "Designar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL — Novo plantão */}
      {modal === "novo" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-4">Registrar plantão</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                <select value={form.colaboradorId} onChange={(e) => setForm((f) => ({ ...f, colaboradorId: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {rankingAlfabetico.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data do plantão</label>
                  <input type="date" value={form.data} onChange={(e) => {
                    const data = e.target.value;
                    const day = data ? new Date(data + "T12:00:00").getDay() : -1;
                    const tipo = day === 6 ? "SABADO" : day === 0 ? "DOMINGO" : form.tipo;
                    setForm(f => ({ ...f, data, tipo, folga2: tipo !== "DOMINGO" && tipo !== "FERIADO" ? "" : f.folga2 }));
                  }} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value, folga2: "" }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label} ({t.pts} pt)</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    {tipoSelecionado.folgas === 2 ? "1ª folga" : "Folga"} <span className="text-gray-600">(opcional)</span>
                  </label>
                  <input type="date" value={form.folga1} onChange={(e) => setForm((f) => ({ ...f, folga1: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {tipoSelecionado.folgas === 2 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">2ª folga <span className="text-gray-600">(opcional · pode agendar depois)</span></label>
                    <input type="date" value={form.folga2} onChange={(e) => setForm((f) => ({ ...f, folga2: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação <span className="text-gray-600">(opcional)</span></label>
                <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Plantão excepcional, cobriu colega..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {saving ? "Salvando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL — Ver folgas agendadas de um colaborador (via Saldo) */}
      {saldoVerColab && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Folgas agendadas</h3>
            <p className="text-xs text-gray-400 mb-4">{saldoVerColab.nome}</p>
            {saldoVerFolgas.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Nenhuma folga agendada.</p>
            ) : (
              <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
                {saldoVerFolgas.map(f => (
                  <div key={f.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-green-400 font-medium text-sm">{fmt(f.data)}</p>
                      <p className="text-xs text-gray-500">Plantão: {fmt(f.dataPlantao)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tipoBadgeFolga[f.tipoPlantao] ?? "bg-gray-700 text-gray-300"}`}>
                      {tipoLabel[f.tipoPlantao] ?? f.tipoPlantao}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setSaldoVerColab(null)}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL — Selecionar plantão pendente (via Saldo) */}
      {saldoPendingColab && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-white">Agendar folga</h3>
              {(() => {
                const total = saldoPendingPlantoes.reduce((acc, h) => {
                  const duplo = h.tipo === "DOMINGO" || h.tipo === "FERIADO";
                  if (!h.folga1) return acc + (duplo ? 2 : 1);
                  if (duplo && !h.folga2) return acc + 1;
                  return acc;
                }, 0);
                return total > 0 ? (
                  <span className="text-sm font-bold text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 px-2.5 py-1 rounded-lg">
                    {total} folga{total !== 1 ? "s" : ""} pendente{total !== 1 ? "s" : ""}
                  </span>
                ) : null;
              })()}
            </div>
            <p className="text-xs text-gray-400 mb-4">{saldoPendingColab.nome} · selecione o plantão</p>
            {saldoPendingPlantoes.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">Nenhum plantão pendente encontrado.</p>
            ) : (
              <div className="divide-y divide-gray-800 max-h-72 overflow-y-auto">
                {saldoPendingPlantoes.map(h => {
                  const duplo = h.tipo === "DOMINGO" || h.tipo === "FERIADO";
                  const falta = !h.folga1 ? (duplo ? "Faltam 2 folgas" : "Falta 1ª folga") : "Falta 2ª folga";
                  return (
                    <button key={h.id} onClick={() => { setSaldoPendingColab(null); openFolga(h); }}
                      className="w-full flex items-center justify-between px-2 py-3 hover:bg-gray-800 rounded transition text-left">
                      <div>
                        <p className="text-white text-sm font-medium">{fmt(h.data)}</p>
                        <p className="text-xs text-gray-500">{tipoLabel[h.tipo]}</p>
                      </div>
                      <span className="text-xs text-yellow-400">{falta}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => setSaldoPendingColab(null)}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL — Agendar folga */}
      {/* MODAL — Editar plantão */}
      {editPlantao && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setEditPlantao(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-1">Editar plantão</h3>
            <p className="text-xs text-gray-400 mb-4">Plantão original: {fmt(editPlantao.data)} · {tipoLabel[editPlantao.tipo]} · {editPlantao.colaborador.nome}</p>
            <form onSubmit={handleEditPlantao} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                <select value={editForm.colaboradorId} onChange={e => setEditForm(f => ({ ...f, colaboradorId: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {rankingAlfabetico.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data do plantão</label>
                  <input type="date" value={editForm.data} onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                  <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditPlantao(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={savingEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {savingEdit ? "Salvando..." : "Salvar"}
                </button>
              </div>
              <button type="button"
                onClick={async () => {
                  if (!confirm(`Excluir o plantão de ${fmt(editPlantao.data)} de ${editPlantao.colaborador.nome}?`)) return;
                  await fetch(`/api/plantoes/${editPlantao.id}`, { method: "DELETE" });
                  setEditPlantao(null);
                  loadHistorico();
                }}
                className="w-full mt-1 text-xs text-red-500 hover:text-red-400 transition py-1">
                Excluir este plantão
              </button>
            </form>
          </div>
        </div>
      )}

      {modal === "folga" && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-1">Agendar folga</h3>
            <p className="text-xs text-gray-400 mb-4">{selected.colaborador.nome} · plantão {fmt(selected.data)} · {tipoLabel[selected.tipo]}</p>
            <form onSubmit={handleFolga} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  1ª folga
                  {folgaForm.folga1 && selected.tipo !== "SABADO" && selected.tipo !== "PONTO_FACULTATIVO" && (
                    <span className="ml-1 text-green-500">· já agendada</span>
                  )}
                </label>
                <input type="date" value={folgaForm.folga1} onChange={(e) => setFolgaForm((f) => ({ ...f, folga1: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {(selected.tipo === "DOMINGO" || selected.tipo === "FERIADO") && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    2ª folga
                    <span className="ml-1 text-gray-600">· pode agendar depois</span>
                  </label>
                  <input type="date" value={folgaForm.folga2} onChange={(e) => setFolgaForm((f) => ({ ...f, folga2: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModal(null); setSelected(null); }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL — Plantões do colaborador */}
      {fichaModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setFichaModal(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">{fichaModal.nome}</h3>
                <p className="text-xs text-gray-500">{fichaModal.equipe}</p>
              </div>
              <button onClick={() => setFichaModal(null)} className="text-gray-600 hover:text-gray-400 text-lg leading-none ml-4">✕</button>
            </div>
            {fichaLoading ? (
              <p className="text-gray-500 text-sm py-6 text-center">Carregando...</p>
            ) : (
              <>
                {fichaPlantoes.length > 0 && (() => {
                  const creditos = fichaPlantoes.reduce((acc, p) => acc + (p.tipo === "SABADO" || p.tipo === "PONTO_FACULTATIVO" ? 1 : 2), 0);
                  const agendadas = fichaPlantoes.reduce((acc, p) => acc + (p.folga1 ? 1 : 0) + (p.folga2 ? 1 : 0), 0);
                  const pendentes = Math.max(0, creditos - agendadas);
                  return (
                    <div className="flex gap-4 mb-4 text-sm flex-wrap">
                      <span className="text-gray-400">Plantões: <strong className="text-white">{fichaPlantoes.length}</strong></span>
                      <span className="text-gray-400">Folgas devidas: <strong className="text-white">{creditos}</strong></span>
                      <span className="text-gray-400">Agendadas: <strong className="text-green-400">{agendadas}</strong></span>
                      <span className="text-gray-400">Pendentes: <strong className={pendentes > 0 ? "text-yellow-400" : "text-gray-500"}>{pendentes}</strong></span>
                    </div>
                  );
                })()}
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                        <th className="text-left py-2 pr-4">Data</th>
                        <th className="text-left py-2 pr-4">Tipo</th>
                        <th className="text-left py-2 pr-4">Folga</th>
                        <th className="text-left py-2 pr-4">2ª Folga</th>
                        <th className="text-left py-2">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fichaPlantoes.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-gray-500 py-6">Nenhum plantão registrado</td></tr>
                      )}
                      {fichaPlantoes.map(p => (
                        <tr key={p.id} className="border-b border-gray-800 last:border-0">
                          <td className="py-2.5 pr-4 text-gray-300 font-mono text-xs">{fmt(p.data)}</td>
                          <td className="py-2.5 pr-4">{tipoBadge(p.tipo)}</td>
                          <td className="py-2.5 pr-4 text-xs text-green-400">{fmt(p.folga1)}</td>
                          <td className="py-2.5 pr-4 text-xs text-green-400">{fmt(p.folga2)}</td>
                          <td className="py-2.5 text-xs text-gray-400 italic">{p.descricao ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TOAST — Folga agendada */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 border border-green-600/40 rounded-xl shadow-xl p-4 max-w-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-lg mt-0.5">✓</span>
            <div>
              <p className="text-white text-sm font-semibold mb-1">Folga agendada</p>
              <p className="text-xs text-gray-400">{toast.nome}</p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-300">
                  <span className="text-gray-500">Folga simples:</span>{" "}
                  <span className="text-green-400 font-medium">{fmt(toast.folga1)}</span>
                </p>
                {toast.folga2 && (
                  <p className="text-xs text-gray-300">
                    <span className="text-gray-500">Folga dupla:</span>{" "}
                    <span className="text-green-400 font-medium">{fmt(toast.folga2)}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500 pt-1 border-t border-gray-800">
                  Plantão: {fmt(toast.plantaoData)} · {tipoLabel[toast.plantaoTipo] ?? toast.plantaoTipo}
                </p>
              </div>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-600 hover:text-gray-400 text-xs ml-auto">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
