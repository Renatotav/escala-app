"use client";

import { useEffect, useState } from "react";

type Registro = {
  id: number; colaboradorId: number; motivo: string;
  dataInicio: string; horaInicio: string | null;
  dataFim: string | null; horaFim: string | null;
  observacao: string | null; atestadoId: number | null;
};
type Colaborador = { id: number; nome: string; equipe: { id: number; nome: string }; grupoListagem: string };
type Equipe = { id: number; nome: string };

const motivoLabel: Record<string, string> = {
  ATESTADO: "Atestado",
  DECLARACAO: "Declaração",
  ATENDIMENTO_PRESENCIAL: "Atendimento Presencial",
  QUANTIDADE_CHAMADOS: "Qtd. Chamados",
  OUTRAS_ATIVIDADES: "Outras atividades",
};

const motivoBadge: Record<string, string> = {
  ATESTADO: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DECLARACAO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ATENDIMENTO_PRESENCIAL: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  QUANTIDADE_CHAMADOS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  OUTRAS_ATIVIDADES: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const MOTIVOS_MANUAL = ["DECLARACAO", "ATENDIMENTO_PRESENCIAL", "QUANTIDADE_CHAMADOS", "OUTRAS_ATIVIDADES"];

function fmt(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10).split("-").reverse().join("/");
}

function diasFora(dataInicio: string, feriadosSet: Set<string>) {
  const startStr = dataInicio.slice(0, 10);
  const hojeStr = new Date().toISOString().slice(0, 10);
  if (startStr > hojeStr) {
    const diffMs = new Date(startStr + "T00:00:00").getTime() - new Date(hojeStr + "T00:00:00").getTime();
    const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return `em ${dias}d`;
  }
  const start = new Date(startStr + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  let count = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1); // começa a contar a partir do dia seguinte à saída

  while (d <= hoje) {
    const dow = d.getDay(); // 0=Dom, 6=Sáb
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dow !== 0 && dow !== 6 && !feriadosSet.has(dateStr)) {
      count++;
    }
    d.setDate(d.getDate() + 1);
  }

  return count <= 0 ? "Hoje" : `${count}d`;
}

function calcHoras(
  dataInicio: string, horaInicio: string | null,
  dataFim: string | null, horaFim: string | null
): string | null {
  if (!dataFim || !horaInicio || !horaFim) return null;
  const start = new Date(`${dataInicio.slice(0, 10)}T${horaInicio}:00`);
  const end = new Date(`${dataFim.slice(0, 10)}T${horaFim}:00`);
  const totalMin = Math.round((end.getTime() - start.getTime()) / 60000);
  if (totalMin <= 0) return null;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function registroAtivo(registros: Registro[], colaboradorId: number): Registro | null {
  const hoje = new Date().toISOString().slice(0, 10);
  return registros.find(r =>
    r.colaboradorId === colaboradorId &&
    !r.horaFim &&
    r.dataInicio <= hoje &&
    (!r.dataFim || r.dataFim >= hoje)
  ) ?? null;
}

function registrosAgendados(registros: Registro[], colaboradorId: number): Registro[] {
  const hoje = new Date().toISOString().slice(0, 10);
  return registros
    .filter(r => r.colaboradorId === colaboradorId && !r.horaFim && r.dataInicio > hoje)
    .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
}

// Em fins de semana/feriados, Atendimento Presencial em aberto não conta como fora da lista
function registroEfetivo(registros: Registro[], colaboradorId: number, isNonWorking: boolean): Registro | null {
  const reg = registroAtivo(registros, colaboradorId);
  if (reg && isNonWorking && reg.motivo === "ATENDIMENTO_PRESENCIAL" && !reg.dataFim) return null;
  return reg;
}

// Último registro concluído (horaFim set) nos últimos 7 dias — para exibir histórico em cinza
function ultimoRetornado(registros: Registro[], colaboradorId: number): Registro | null {
  const limite = new Date();
  limite.setDate(limite.getDate() - 7);
  const limiteStr = limite.toISOString().slice(0, 10);
  return (
    registros
      .filter(r => r.colaboradorId === colaboradorId && !!r.horaFim && !!r.dataFim && r.dataFim >= limiteStr)
      .sort((a, b) => (b.dataFim ?? "").localeCompare(a.dataFim ?? "") || (b.horaFim ?? "").localeCompare(a.horaFim ?? ""))
      [0] ?? null
  );
}

function horaAgora() {
  return new Date().toTimeString().slice(0, 5);
}

export default function TriagemPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "fora" | "lista">("todos");

  // Modal registrar saída
  const [modal, setModal] = useState<{ colaboradorId: number; nome: string } | null>(null);
  const [form, setForm] = useState({ motivo: "DECLARACAO", dataInicio: "", horaInicio: "", dataFim: "", observacao: "" });
  const [saving, setSaving] = useState(false);

  // Modal registrar retorno (com hora)
  const [retornoModal, setRetornoModal] = useState<{ id: number; nome: string } | null>(null);
  const [retornoForm, setRetornoForm] = useState({ dataFim: "", horaFim: "" });
  const [savingRetorno, setSavingRetorno] = useState(false);

  // Modal editar registro
  const [editModal, setEditModal] = useState<Registro | null>(null);
  const [editForm, setEditForm] = useState({ motivo: "", dataInicio: "", horaInicio: "", observacao: "" });
  const [savingEdit, setSavingEdit] = useState(false);


  // Popup colaborador
  const [popup, setPopup] = useState<Colaborador | null>(null);

  // Feriados e pontos facultativos (para contagem de dias úteis)
  const [feriados, setFeriados] = useState<Set<string>>(new Set());

  // Colaboradores com folga hoje (exibidos automaticamente como fora da lista)
  const [folgasHoje, setFolgasHoje] = useState<Set<number>>(new Set());

  // Colaboradores de plantão hoje
  const [plantaoHoje, setPlantaoHoje] = useState<Set<number>>(new Set());

  function load() {
    fetch("/api/controle-triagem").then(r => r.json()).then(setRegistros);
  }

  useEffect(() => {
    load();
    fetch("/api/colaboradores?all=true").then(r => r.json()).then((d: { colaboradores: Colaborador[] }) =>
      setColaboradores([...d.colaboradores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")))
    );
    fetch("/api/equipes").then(r => r.json()).then(setEquipes);
    fetch("/api/feriados").then(r => r.json()).then((data: { data: string }[]) =>
      setFeriados(new Set(data.map(f => f.data.slice(0, 10))))
    );
    const hoje = new Date().toISOString().slice(0, 10);
    const mes = hoje.slice(0, 7);
    
    Promise.all([
      fetch(`/api/folgas?mes=${mes}`).then(r => r.json()),
      fetch(`/api/plantoes?view=folgas-agendadas&mes=${mes}`).then(r => r.json())
    ]).then(([folgas, plantoesFolgas]) => {
      const ids = new Set<number>();
      folgas.forEach((f: { colaboradorId: number; data: string }) => {
        if (f.data.slice(0, 10) === hoje) ids.add(f.colaboradorId);
      });
      plantoesFolgas.forEach((f: { colaboradorId: number; data: string }) => {
        if (f.data.slice(0, 10) === hoje) ids.add(f.colaboradorId);
      });
      setFolgasHoje(ids);
    });

    fetch(`/api/escala-plantao?mes=${mes}`).then(r => r.json()).then((data: { data: string; colaborador: { id: number } }[]) =>
      setPlantaoHoje(new Set(data.filter(p => p.data === hoje).map(p => p.colaborador.id)))
    );
  }, []);


  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    await fetch("/api/controle-triagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        colaboradorId: modal.colaboradorId,
        ...form,
        horaInicio: form.horaInicio || null,
        dataFim: form.dataFim || null,
      }),
    });
    setSaving(false);
    setModal(null);
    setForm({ motivo: "DECLARACAO", dataInicio: "", horaInicio: "", dataFim: "", observacao: "" });
    load();
  }

  function abrirRetorno(id: number, nome: string) {
    setRetornoModal({ id, nome });
    setRetornoForm({ dataFim: new Date().toISOString().slice(0, 10), horaFim: horaAgora() });
    setPopup(null);
  }

  async function handleRetorno(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!retornoModal) return;
    setSavingRetorno(true);
    await fetch("/api/controle-triagem", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: retornoModal.id, dataFim: retornoForm.dataFim, horaFim: retornoForm.horaFim }),
    });
    setSavingRetorno(false);
    setRetornoModal(null);
    load();
  }

  async function excluirRegistro(id: number) {
    if (!confirm("Excluir este registro?")) return;
    await fetch(`/api/controle-triagem?id=${id}`, { method: "DELETE" });
    load();
  }

  function abrirEditar(r: Registro) {
    setEditModal(r);
    setEditForm({
      motivo: r.motivo,
      dataInicio: r.dataInicio.slice(0, 10),
      horaInicio: r.horaInicio ?? "",
      observacao: r.observacao ?? "",
    });
  }

  async function handleEditar(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!editModal) return;
    setSavingEdit(true);
    await fetch("/api/controle-triagem", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editModal.id,
        motivo: editForm.motivo,
        dataInicio: editForm.dataInicio,
        horaInicio: editForm.horaInicio || null,
        observacao: editForm.observacao || null,
      }),
    });
    setSavingEdit(false);
    setEditModal(null);
    load();
  }

  function isEquipeExcluida(nome: string) {
    const n = nome.toUpperCase();
    return n.includes("COORDENA") || n.includes("SUPERVIS");
  }

  async function alterarGrupo(id: number, grupoListagem: string) {
    await fetch("/api/colaboradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, grupoListagem }),
    });
    setColaboradores(prev => prev.map(c => c.id === id ? { ...c, grupoListagem } : c));
  }

  const hojeStr = new Date().toISOString().slice(0, 10);
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const isFeriadoHoje = feriados.has(hojeStr);
  const isNonWorking = isWeekend || isFeriadoHoje;

  const lista = colaboradores
    .filter(c => {
      if (isEquipeExcluida(c.equipe.nome)) return false;
      if (filtroEquipe && c.equipe.nome !== filtroEquipe) return false;
      const reg = registroEfetivo(registros, c.id, isNonWorking);
      const folga = !reg && folgasHoje.has(c.id);
      const plantao = !reg && !folga && plantaoHoje.has(c.id);
      if (filtroStatus === "fora" && !reg && !folga && !plantao) return false;
      if (filtroStatus === "lista" && (reg || folga || plantao)) return false;
      return true;
    })
    .sort((a, b) => {
      const eq = a.equipe.nome.localeCompare(b.equipe.nome, "pt-BR");
      return eq !== 0 ? eq : a.nome.localeCompare(b.nome, "pt-BR");
    });

  const totalFora = colaboradores.filter(c =>
    !isEquipeExcluida(c.equipe.nome) &&
    (registroEfetivo(registros, c.id, isNonWorking) || folgasHoje.has(c.id) || plantaoHoje.has(c.id))
  ).length;

  const popupRegistros = popup
    ? [...registros.filter(r => r.colaboradorId === popup.id)].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))
    : [];
  const popupAtivo = popup ? registroAtivo(registros, popup.id) : null;

  function exportarCSV() {
    const hoje = new Date().toISOString().slice(0, 10);

    function getAtivo(cid: number): Registro | null {
      return registros.find(r => r.colaboradorId === cid && (!r.dataFim || r.dataFim >= hoje)) ?? null;
    }

    function periodoStr(r: Registro | null): string {
      if (!r) return "";
      return r.dataFim ? `${fmt(r.dataInicio)} - ${fmt(r.dataFim)}` : "Tempo indeterminado";
    }

    function normEq(nome: string): string {
      return nome
        .toUpperCase()
        .replace(/ERRO\s+E\s+FALHA/g, "ERRO/FALHA")
        .replace(/^CADASTRO$/, "CADASTRO GERAL");
    }

    function eq2(nome: string): string {
      const n = normEq(nome);
      if (n.includes("ERRO/FALHA")) {
        if (n.includes("2G")) return "ORIENTAÇÃO TÉCNICA 2G";
        if (n.includes("1G")) return "ORIENTAÇÃO TÉCNICA 1G";
      }
      return "-";
    }

    const colabAtivos = colaboradores.filter(c => !isEquipeExcluida(c.equipe.nome) && c.equipe.nome.toUpperCase() !== "TRIAGEM");

    // Seção 1 — Balcão Virtual fora da lista (apenas quem está com triagem ativa, exceto presencial)
    const balcao = colabAtivos
      .filter(c => {
        if (!c.equipe.nome.toUpperCase().includes("BALC")) return false;
        const r = getAtivo(c.id);
        return r !== null && r.motivo !== "ATENDIMENTO_PRESENCIAL";
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    // Seção 2 — Apenas quem está FORA agora (atendimento presencial de qualquer equipe
    //            + não-Balcão com outros motivos, exceto distribuição específica)
    const demais = colabAtivos
      .filter(c => {
        const r = getAtivo(c.id);
        if (!r) return false; // sem triagem ativa = na lista = não aparece
        const isBalcao = c.equipe.nome.toUpperCase().includes("BALC");
        if (isBalcao && r.motivo === "ATENDIMENTO_PRESENCIAL") return true;
        if (isBalcao) return false;
        return c.grupoListagem !== "ESPECIFICA";
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    // Seção 3a — grupoListagem="ESPECIFICA" + equipe Migração (lista completa)
    const especificaMigr = colabAtivos
      .filter(c => c.grupoListagem === "ESPECIFICA" && c.equipe.nome.toUpperCase().includes("MIGRA"))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    // Seção 3b — grupoListagem="ESPECIFICA" + outras equipes (lista completa)
    const especificaOutros = colabAtivos
      .filter(c => c.grupoListagem === "ESPECIFICA" && !c.equipe.nome.toUpperCase().includes("MIGRA"))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const linhas: string[] = [];

    function addSection(titulo: string, pessoas: Colaborador[]) {
      if (pessoas.length === 0) return;
      linhas.push([titulo, "Período", "Equipe 1", "Equipe 2", "Equipe 3"].join(";"));
      for (const c of pessoas) {
        const r = getAtivo(c.id);
        const e1 = normEq(c.equipe.nome);
        const e2 = eq2(c.equipe.nome);
        linhas.push([c.nome.toUpperCase(), periodoStr(r), e1, e2, "-"].join(";"));
      }
      linhas.push("");
    }

    addSection("Assistentes fora da listagem de distribuição de chamados - Balcão Virtual", balcao);
    addSection("Assistentes fora da listagem de distribuição de chamados", demais);
    if (especificaMigr.length > 0) addSection("Assistentes com distribuição específica de chamados", especificaMigr);
    if (especificaOutros.length > 0) addSection("Assistentes com distribuição específica de chamados", especificaOutros);

    // TextEncoder garante UTF-8 puro sem dupla codificação
    const encoder = new TextEncoder();
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const content = encoder.encode(linhas.join("\r\n"));
    const combined = new Uint8Array(bom.length + content.length);
    combined.set(bom);
    combined.set(content, bom.length);
    const blob = new Blob([combined], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `triagem_${hoje}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Controle de Triagem</h2>
          <p className="text-sm text-gray-400 mt-0.5">{colaboradores.length} colaboradores · {totalFora} fora da lista</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarCSV}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            ↓ Exportar CSV
          </button>
        </div>
      </div>

      {totalFora > 0 && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠</span>
          <p className="text-sm text-red-300">
            <strong>{totalFora}</strong> operador{totalFora !== 1 ? "es" : ""} fora da lista de chamados agora
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          {(["todos", "fora", "lista"] as const).map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 text-sm transition ${filtroStatus === s
                ? (s === "fora" ? "bg-red-600 text-white" : s === "lista" ? "bg-green-700 text-white" : "bg-blue-600 text-white")
                : "bg-gray-900 text-gray-400 hover:text-white"}`}>
              {s === "todos" ? "Todos" : s === "fora" ? `Fora (${totalFora})` : `Na lista (${colaboradores.length - totalFora})`}
            </button>
          ))}
        </div>
        <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)}
          className="flex-1 min-w-[130px] bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as equipes</option>
          {equipes.filter(eq => !isEquipeExcluida(eq.nome)).map(eq => <option key={eq.id} value={eq.nome}>{eq.nome}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Colaborador</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-center px-4 py-3">Saída</th>
              <th className="text-center px-4 py-3">Retorno</th>
              <th className="text-center px-4 py-3">Horas</th>
              <th className="text-left px-4 py-3">Observação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Nenhum colaborador encontrado</td></tr>
            )}
            {lista.map((c, i) => {
              const reg = registroEfetivo(registros, c.id, isNonWorking);
              const horas = reg ? calcHoras(reg.dataInicio, reg.horaInicio, reg.dataFim, reg.horaFim) : null;
              const regRecente = !reg ? ultimoRetornado(registros, c.id) : null;
              const regsAgendados = !reg ? registrosAgendados(registros, c.id) : [];
              const regAgendado = regsAgendados[0] ?? null;
              const horasRecente = regRecente ? calcHoras(regRecente.dataInicio, regRecente.horaInicio, regRecente.dataFim, regRecente.horaFim) : null;
              const novoGrupo = !filtroEquipe && (i === 0 || lista[i - 1].equipe.nome !== c.equipe.nome);
              return (
                <tr key={c.id} className={`border-b border-gray-800 last:border-0 transition ${reg ? "bg-red-900/5 hover:bg-red-900/10" : folgasHoje.has(c.id) ? "bg-amber-900/5 hover:bg-amber-900/10" : plantaoHoje.has(c.id) ? "bg-teal-900/5 hover:bg-teal-900/10" : "hover:bg-gray-800/50"}`}
                  style={novoGrupo ? { boxShadow: "inset 0 3px 0 0 rgb(55 65 81)" } : undefined}>
                  <td className="px-4 py-3" style={novoGrupo ? { paddingTop: "1.25rem" } : undefined}>
                    {novoGrupo && (
                      <span className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{c.equipe.nome}</span>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setPopup(c)} className="text-white font-medium hover:text-blue-400 transition text-left">
                        {c.nome}
                      </button>
                      <input
                        type="checkbox"
                        checked={c.grupoListagem === "ESPECIFICA"}
                        onChange={() => alterarGrupo(c.id, c.grupoListagem === "ESPECIFICA" ? "FORA" : "ESPECIFICA")}
                        title={c.grupoListagem === "ESPECIFICA" ? "Distribuição específica — clique para remover" : "Clique para marcar como Distribuição específica"}
                        className="w-4 h-4 accent-teal-500 cursor-pointer shrink-0"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 whitespace-nowrap">{c.equipe.nome}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {reg ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${motivoBadge[reg.motivo] ?? "bg-gray-700 text-gray-300"}`}>
                        {motivoLabel[reg.motivo] ?? reg.motivo}
                      </span>
                    ) : folgasHoje.has(c.id) ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-400 border-amber-500/30 whitespace-nowrap">Folga</span>
                    ) : plantaoHoje.has(c.id) ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-teal-500/20 text-teal-400 border-teal-500/30 whitespace-nowrap">Plantão</span>
                    ) : isWeekend ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-700/50 text-slate-400 border-slate-600/50 whitespace-nowrap">Fim de semana</span>
                    ) : isFeriadoHoje ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30 whitespace-nowrap">Feriado</span>
                    ) : regRecente ? (
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">Na lista</span>
                        <span className="block text-xs text-gray-600 mt-0.5">↩ retornou</span>
                        {regsAgendados.length > 0 && (
                          <span className="flex flex-wrap gap-1 mt-0.5 items-center">
                            <span className="text-blue-400/70 text-xs">📅</span>
                            {regsAgendados.map((r, i) => (
                              <span key={r.id} className="relative group inline-block">
                                {i > 0 && <span className="text-blue-400/40 mr-1">·</span>}
                                <span className="text-xs text-blue-400/70 underline decoration-dotted cursor-help hover:text-blue-300 transition">
                                  {fmt(r.dataInicio)}
                                  <span className="absolute bottom-full left-0 mb-1 z-20 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 shadow-lg text-left min-w-max">
                                    <span className="block text-gray-200 font-medium">{motivoLabel[r.motivo] ?? r.motivo}</span>
                                    {r.observacao && <span className="block text-gray-400 mt-0.5">{r.observacao}</span>}
                                  </span>
                                </span>
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    ) : regAgendado ? (
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">Na lista</span>
                        <span className="flex flex-wrap gap-1 mt-0.5 items-center">
                          <span className="text-blue-400/70 text-xs">📅</span>
                          {regsAgendados.map((r, i) => (
                            <span key={r.id} className="relative group inline-block">
                              {i > 0 && <span className="text-blue-400/40 mr-1">·</span>}
                              <span className="text-xs text-blue-400/70 underline decoration-dotted cursor-help hover:text-blue-300 transition">
                                {fmt(r.dataInicio)}
                                <span className="absolute bottom-full left-0 mb-1 z-20 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 shadow-lg text-left min-w-max">
                                  <span className="block text-gray-200 font-medium">{motivoLabel[r.motivo] ?? r.motivo}</span>
                                  {r.observacao && <span className="block text-gray-400 mt-0.5">{r.observacao}</span>}
                                </span>
                              </span>
                            </span>
                          ))}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">Na lista</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">
                    {reg ? (
                      <span className="font-mono">
                        {fmt(reg.dataInicio)}{reg.horaInicio ? ` ${reg.horaInicio}` : ""}
                        <span className="text-gray-600 ml-1">({diasFora(reg.dataInicio, feriados)})</span>
                      </span>
                    ) : regRecente ? (
                      <span className="font-mono text-gray-600">{fmt(regRecente.dataInicio)}{regRecente.horaInicio ? ` ${regRecente.horaInicio}` : ""}</span>
                    ) : folgasHoje.has(c.id) ? (
                      <span className="font-mono text-amber-400/70">{fmt(hojeStr)}</span>
                    ) : plantaoHoje.has(c.id) ? (
                      <span className="font-mono text-teal-400/70">{fmt(hojeStr)}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {reg ? (
                      reg.dataFim
                        ? <span className="text-green-400 font-mono">{fmt(reg.dataFim)}{reg.horaFim ? ` ${reg.horaFim}` : ""}</span>
                        : <span className="text-gray-500">Em aberto</span>
                    ) : regRecente ? (
                      <span className="text-gray-600 font-mono">{fmt(regRecente.dataFim)}{regRecente.horaFim ? ` ${regRecente.horaFim}` : ""}</span>
                    ) : folgasHoje.has(c.id) ? (
                      <span className="text-amber-400/70">Hoje</span>
                    ) : plantaoHoje.has(c.id) ? (
                      <span className="text-teal-400/70">Hoje</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {horas
                      ? <span className="font-semibold text-blue-400">{horas}</span>
                      : horasRecente
                        ? <span className="text-gray-600">{horasRecente}</span>
                        : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs italic">
                    {reg?.observacao
                      ? <span className="text-gray-400">{reg.observacao}</span>
                      : regRecente?.observacao
                        ? <span className="text-gray-600">{regRecente.observacao}</span>
                        : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {reg ? (
                        <>
                          <button onClick={() => abrirEditar(reg)}
                            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded transition">
                            ✎ Editar
                          </button>
                          <button onClick={() => abrirRetorno(reg.id, c.nome)}
                            className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded transition">
                            Retornou
                          </button>
                        </>
                      ) : folgasHoje.has(c.id) ? (
                        <span className="text-xs text-amber-500/50 px-2 py-1">Folga automática</span>
                      ) : plantaoHoje.has(c.id) ? (
                        <span className="text-xs text-teal-500/50 px-2 py-1">Plantão</span>
                      ) : (
                        <button onClick={() => {
                          setModal({ colaboradorId: c.id, nome: c.nome });
                          setForm({ motivo: "DECLARACAO", dataInicio: new Date().toISOString().slice(0, 10), horaInicio: horaAgora(), dataFim: "", observacao: "" });
                        }} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition">
                          Registrar saída
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Popup colaborador ── */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setPopup(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">{popup.nome}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{popup.equipe.nome}</p>
              </div>
              <div className="flex items-center gap-2">
                {popupAtivo ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${motivoBadge[popupAtivo.motivo]}`}>
                    {motivoLabel[popupAtivo.motivo]}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">Na lista</span>
                )}
                <button onClick={() => setPopup(null)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
              </div>
            </div>

            <div className="flex gap-2 mb-5">
              {popupAtivo ? (
                <button onClick={() => abrirRetorno(popupAtivo.id, popup.nome)}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm font-medium py-2 rounded-lg transition">
                  ✓ Registrar retorno
                </button>
              ) : (
                <button onClick={() => {
                  setPopup(null);
                  setModal({ colaboradorId: popup.id, nome: popup.nome });
                  setForm({ motivo: "DECLARACAO", dataInicio: new Date().toISOString().slice(0, 10), horaInicio: horaAgora(), dataFim: "", observacao: "" });
                }} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium py-2 rounded-lg transition">
                  Registrar saída
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Histórico</p>
            {popupRegistros.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">Nenhum registro</p>
            ) : (
              <div className="space-y-2">
                {popupRegistros.map(r => {
                  const hoje = new Date().toISOString().slice(0, 10);
                  const ativo = !r.dataFim || r.dataFim >= hoje;
                  const horas = calcHoras(r.dataInicio, r.horaInicio, r.dataFim, r.horaFim);
                  return (
                    <div key={r.id} className={`rounded-lg px-3 py-2.5 border flex items-start justify-between gap-3 ${ativo ? "bg-red-900/10 border-red-800/50" : "bg-gray-800/50 border-gray-700/50"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${motivoBadge[r.motivo] ?? "bg-gray-700 text-gray-300"}`}>
                            {motivoLabel[r.motivo] ?? r.motivo}
                          </span>
                          {ativo && <span className="text-xs text-red-400 font-medium">Ativo</span>}
                          {horas && <span className="text-xs text-blue-400 font-semibold">{horas}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-mono">
                          {fmt(r.dataInicio)}{r.horaInicio ? ` ${r.horaInicio}` : ""}
                          {" → "}
                          {r.dataFim
                            ? <span>{fmt(r.dataFim)}{r.horaFim ? ` ${r.horaFim}` : ""}</span>
                            : <span className="text-red-400">em aberto</span>}
                        </p>
                        {r.observacao && <p className="text-xs text-gray-500 italic mt-0.5">{r.observacao}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setPopup(null); abrirEditar(r); }} className="text-xs text-blue-400 hover:text-blue-300">Editar</button>
                        <button onClick={() => excluirRegistro(r.id)} className="text-xs text-red-500 hover:text-red-400">Excluir</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal editar registro ── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setEditModal(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-4">Editar registro</h3>
            <form onSubmit={handleEditar} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Motivo</label>
                <select value={editForm.motivo} onChange={e => setEditForm(f => ({ ...f, motivo: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {MOTIVOS_MANUAL.map(m => <option key={m} value={m}>{motivoLabel[m]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data de saída</label>
                  <input type="date" value={editForm.dataInicio} onChange={e => setEditForm(f => ({ ...f, dataInicio: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hora de saída</label>
                  <input type="time" value={editForm.horaInicio} onChange={e => setEditForm(f => ({ ...f, horaInicio: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação</label>
                <input value={editForm.observacao} onChange={e => setEditForm(f => ({ ...f, observacao: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={savingEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {savingEdit ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal registrar retorno ── */}
      {retornoModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setRetornoModal(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-1">Registrar retorno</h3>
            <p className="text-xs text-gray-400 mb-4">{retornoModal.nome}</p>
            <form onSubmit={handleRetorno} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data de retorno</label>
                  <input type="date" value={retornoForm.dataFim}
                    onChange={e => setRetornoForm(f => ({ ...f, dataFim: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hora de retorno</label>
                  <input type="time" value={retornoForm.horaFim}
                    onChange={e => setRetornoForm(f => ({ ...f, horaFim: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setRetornoModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={savingRetorno}
                  className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {savingRetorno ? "Salvando..." : "Confirmar retorno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal registrar saída ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setModal(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-1">Registrar saída da lista</h3>
            <p className="text-xs text-gray-400 mb-4">{modal.nome}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Motivo</label>
                <select value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {MOTIVOS_MANUAL.map(m => <option key={m} value={m}>{motivoLabel[m]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data de saída</label>
                  <input type="date" value={form.dataInicio}
                    onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hora de saída</label>
                  <input type="time" value={form.horaInicio}
                    onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação <span className="text-gray-600">(opcional)</span></label>
                <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Ex: Consulta cardiologista..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                  {saving ? "Salvando..." : "Registrar saída"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
