"use client";

import { useEffect, useState } from "react";

type Entry = { id: number; nome: string; equipe: string; sabados: number; domFer: number; total: number; score: number };
type Historico = { id: number; data: string; tipo: string; folga1: string | null; folga2: string | null; descricao: string | null; colaborador: { nome: string; equipe: { nome: string } } };
type Saldo = { id: number; nome: string; equipe: string; totalPlantoes: number; creditos: number; agendadas: number; pendentes: number };
type Equipe = { id: number; nome: string };
type FolgaReg = { id: number; data: string; tipo: string; descricao: string | null; colaborador: { nome: string; equipe: { nome: string } } };

const tipoLabel: Record<string, string> = { SABADO: "Sábado", DOMINGO: "Domingo", FERIADO: "Feriado" };
const tipoBadgeFolga: Record<string, string> = {
  SABADO:  "bg-purple-500/10 text-purple-400",
  DOMINGO: "bg-orange-500/10 text-orange-400",
  FERIADO: "bg-blue-500/10 text-blue-400",
};

const TIPOS = [
  { value: "SABADO",  label: "Sábado",  pts: 1, folgas: 1 },
  { value: "DOMINGO", label: "Domingo", pts: 2, folgas: 2 },
  { value: "FERIADO", label: "Feriado", pts: 2, folgas: 2 },
];

const emptyForm = { colaboradorId: "", data: "", tipo: "SABADO", folga1: "", folga2: "", descricao: "" };

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function tipoBadge(tipo: string) {
  if (tipo === "SABADO")  return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Sábado</span>;
  if (tipo === "DOMINGO") return <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Domingo</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">Feriado</span>;
}

export default function PlantoesPage() {
  const [tab, setTab] = useState<"ranking" | "historico" | "saldo" | "folgas">("ranking");
  const [ranking, setRanking] = useState<Entry[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [saldo, setSaldo] = useState<Saldo[]>([]);
  const [folgas, setFolgas] = useState<FolgaReg[]>([]);
  const [mesFolga, setMesFolga] = useState(new Date().toISOString().slice(0, 7));
  const [colaboradorFolga, setColaboradorFolga] = useState("");
  const [modalFolga, setModalFolga] = useState(false);
  const [formFolga, setFormFolga] = useState({ colaboradorId: "", data: "", tipo: "SABADO", descricao: "" });
  const [savingFolga, setSavingFolga] = useState(false);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [modal, setModal] = useState<"novo" | "folga" | null>(null);
  const [selected, setSelected] = useState<Historico | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [folgaForm, setFolgaForm] = useState({ folga1: "", folga2: "" });
  const [saving, setSaving] = useState(false);

  async function loadRanking() {
    const data = await fetch("/api/plantoes").then((r) => r.json());
    setRanking(data);
  }

  async function loadHistorico() {
    const data = await fetch("/api/plantoes?view=historico").then((r) => r.json());
    setHistorico(data);
  }

  async function loadSaldo() {
    const data = await fetch("/api/plantoes?view=saldo").then((r) => r.json());
    setSaldo(data);
  }

  async function loadFolgas() {
    const params = new URLSearchParams({ mes: mesFolga });
    if (colaboradorFolga) params.set("colaboradorId", colaboradorFolga);
    const data = await fetch(`/api/folgas?${params}`).then((r) => r.json());
    setFolgas(data);
  }

  useEffect(() => {
    loadRanking();
    fetch("/api/equipes").then((r) => r.json()).then(setEquipes);
  }, []);

  useEffect(() => {
    if (tab === "historico") loadHistorico();
    if (tab === "saldo") loadSaldo();
    if (tab === "folgas") loadFolgas();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "folgas") loadFolgas();
  }, [mesFolga, colaboradorFolga]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmitFolga(e: { preventDefault(): void }) {
    e.preventDefault();
    setSavingFolga(true);
    await fetch("/api/folgas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formFolga, colaboradorId: Number(formFolga.colaboradorId) }),
    });
    setSavingFolga(false);
    setModalFolga(false);
    setFormFolga({ colaboradorId: "", data: "", tipo: "SABADO", descricao: "" });
    loadFolgas();
    loadSaldo();
  }

  const lista = filtroEquipe ? ranking.filter((e) => e.equipe === filtroEquipe) : ranking;
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
    setSelected(null);
    loadHistorico();
  }

  function openFolga(h: Historico) {
    setSelected(h);
    setFolgaForm({ folga1: h.folga1 ? h.folga1.slice(0, 10) : "", folga2: h.folga2 ? h.folga2.slice(0, 10) : "" });
    setModal("folga");
  }

  const pendentes = historico.filter((h) => {
    if (h.tipo === "SABADO") return !h.folga1;
    return !h.folga1 || !h.folga2;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Plantões & Folgas</h2>
          <p className="text-sm text-gray-400 mt-0.5">Sábado = 1 pt · Domingo / Feriado = 2 pts</p>
        </div>
        {tab === "folgas"
          ? <button onClick={() => setModalFolga(true)} className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">+ Registrar folga</button>
          : <button onClick={() => { setForm(emptyForm); setModal("novo"); }} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">+ Registrar plantão</button>
        }
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {(["ranking", "historico", "saldo", "folgas"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            {t === "ranking" ? "Ranking"
              : t === "historico" ? `Histórico${pendentes.length ? ` (${pendentes.length} pendente${pendentes.length > 1 ? "s" : ""})` : ""}`
              : t === "saldo" ? "Saldo"
              : "Folgas"}
          </button>
        ))}
      </div>

      {/* RANKING */}
      {tab === "ranking" && (
        <>
          <div className="mb-4">
            <select
              value={filtroEquipe}
              onChange={(e) => setFiltroEquipe(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as equipes</option>
              {equipes.map((eq) => <option key={eq.id} value={eq.nome}>{eq.nome}</option>)}
            </select>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-center px-4 py-3 w-10">#</th>
                  <th className="text-left px-4 py-3">Colaborador</th>
                  <th className="text-left px-4 py-3">Equipe</th>
                  <th className="text-center px-4 py-3">Sáb</th>
                  <th className="text-center px-4 py-3">Dom/Fer</th>
                  <th className="text-center px-4 py-3">Score</th>
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
                      <td className="px-4 py-3 text-white font-medium">{entry.nome}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{entry.equipe}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">{entry.sabados}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{entry.domFer}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-base ${scoreCls(entry.score)}`}>{entry.score}</span>
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
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Colaborador</th>
                <th className="text-left px-4 py-3">Equipe</th>
                <th className="text-center px-4 py-3">Data Plantão</th>
                <th className="text-center px-4 py-3">Tipo</th>
                <th className="text-center px-4 py-3">Folga 1</th>
                <th className="text-center px-4 py-3">Folga 2</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {historico.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum plantão registrado</td></tr>
              )}
              {historico.map((h) => {
                const needsFolga2 = h.tipo !== "SABADO";
                const pendente = !h.folga1 || (needsFolga2 && !h.folga2);
                return (
                  <tr key={h.id} className={`border-b border-gray-800 last:border-0 transition hover:bg-gray-800/50 ${pendente ? "bg-yellow-900/5" : ""}`}>
                    <td className="px-4 py-3 text-white font-medium">{h.colaborador.nome}</td>
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
                      {pendente
                        ? <button onClick={() => openFolga(h)} className="text-xs text-yellow-400 hover:text-yellow-300 transition font-medium">Agendar folga</button>
                        : <span className="text-xs text-green-500">✓</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SALDO */}
      {tab === "saldo" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Colaborador</th>
                <th className="text-left px-4 py-3">Equipe</th>
                <th className="text-center px-4 py-3">Plantões</th>
                <th className="text-center px-4 py-3">Folgas devidas</th>
                <th className="text-center px-4 py-3">Agendadas</th>
                <th className="text-center px-4 py-3">Pendentes</th>
              </tr>
            </thead>
            <tbody>
              {saldo.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nenhum registro encontrado</td></tr>
              )}
              {saldo.map((s) => (
                <tr key={s.id} className={`border-b border-gray-800 last:border-0 transition hover:bg-gray-800/50 ${s.pendentes > 0 ? "bg-yellow-900/5" : ""}`}>
                  <td className="px-4 py-3 text-white font-medium">{s.nome}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{s.equipe}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{s.totalPlantoes}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{s.creditos}</td>
                  <td className="px-4 py-3 text-center text-green-400">{s.agendadas}</td>
                  <td className="px-4 py-3 text-center">
                    {s.pendentes > 0
                      ? <span className="font-bold text-yellow-400">{s.pendentes}</span>
                      : <span className="text-gray-600">0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FOLGAS */}
      {tab === "folgas" && (
        <>
          <div className="flex gap-3 mb-4">
            <input type="month" value={mesFolga} onChange={e => setMesFolga(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={colaboradorFolga} onChange={e => setColaboradorFolga(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os colaboradores</option>
              {ranking.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Colaborador</th>
                  <th className="text-left px-4 py-3">Equipe</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Observação</th>
                </tr>
              </thead>
              <tbody>
                {folgas.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhuma folga registrada neste mês</td></tr>
                )}
                {folgas.map(f => (
                  <tr key={f.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3 text-gray-300 font-mono">{fmt(f.data)}</td>
                    <td className="px-4 py-3 text-white font-medium">{f.colaborador.nome}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{f.colaborador.equipe.nome}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${tipoBadgeFolga[f.tipo] ?? "bg-gray-700 text-gray-300"}`}>
                        {tipoLabel[f.tipo] ?? f.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{f.descricao ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL — Registrar folga */}
      {modalFolga && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-4">Registrar folga</h3>
            <form onSubmit={handleSubmitFolga} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                <select value={formFolga.colaboradorId} onChange={e => setFormFolga(f => ({ ...f, colaboradorId: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {ranking.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
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
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação <span className="text-gray-600">(opcional)</span></label>
                <input value={formFolga.descricao} onChange={e => setFormFolga(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalFolga(false)}
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
                  {ranking.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data do plantão</label>
                  <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} required
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
              <div className={`grid gap-3 ${tipoSelecionado.folgas === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Folga 1 <span className="text-gray-600">(opcional)</span></label>
                  <input type="date" value={form.folga1} onChange={(e) => setForm((f) => ({ ...f, folga1: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {tipoSelecionado.folgas === 2 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Folga 2 <span className="text-gray-600">(opcional)</span></label>
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

      {/* MODAL — Agendar folga */}
      {modal === "folga" && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-1">Agendar folga</h3>
            <p className="text-xs text-gray-400 mb-4">{selected.colaborador.nome} · plantão {fmt(selected.data)}</p>
            <form onSubmit={handleFolga} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Folga 1</label>
                <input type="date" value={folgaForm.folga1} onChange={(e) => setFolgaForm((f) => ({ ...f, folga1: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {selected.tipo !== "SABADO" && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Folga 2</label>
                  <input type="date" value={folgaForm.folga2} onChange={(e) => setFolgaForm((f) => ({ ...f, folga2: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
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
