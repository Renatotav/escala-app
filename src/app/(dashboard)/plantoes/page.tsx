"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: number;
  nome: string;
  equipe: string;
  sabados: number;
  domFer: number;
  total: number;
  score: number;
};

type Equipe = { id: number; nome: string };

const TIPOS = [
  { value: "SABADO",   label: "Sábado",         peso: 1 },
  { value: "DOMINGO",  label: "Domingo",         peso: 2 },
  { value: "FERIADO",  label: "Feriado",         peso: 2 },
];

const empty = { colaboradorId: "", data: "", tipo: "SABADO", descricao: "" };

export default function PlantoesPage() {
  const [ranking, setRanking] = useState<Entry[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await fetch("/api/plantoes").then((r) => r.json());
    setRanking(data);
  }

  useEffect(() => {
    load();
    fetch("/api/equipes").then((r) => r.json()).then(setEquipes);
  }, []);

  const lista = filtroEquipe
    ? ranking.filter((e) => e.equipe === filtroEquipe)
    : ranking;

  const minScore = lista.length ? lista[0].score : 0;

  function badge(entry: Entry, idx: number) {
    if (idx === 0) return { label: "Próximo", cls: "bg-green-500/20 text-green-400 border border-green-500/40" };
    if (entry.score === minScore) return { label: "Próximo", cls: "bg-green-500/20 text-green-400 border border-green-500/40" };
    return null;
  }

  function scoreCls(entry: Entry) {
    const max = lista.length ? lista[lista.length - 1].score : 0;
    const range = max - minScore || 1;
    const pct = (entry.score - minScore) / range;
    if (pct < 0.33) return "text-green-400";
    if (pct < 0.66) return "text-yellow-400";
    return "text-red-400";
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/plantoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, colaboradorId: Number(form.colaboradorId) }),
    });
    setSaving(false);
    setModal(false);
    setForm(empty);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Plantões</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Ranking de rodízio — menor score = próximo a ser escalado
          </p>
        </div>
        <button
          onClick={() => { setForm(empty); setModal(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Registrar plantão
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-4 text-xs text-gray-400 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2">
          <span>Sábado <span className="text-white font-medium">= 1 pt</span></span>
          <span className="text-gray-700">|</span>
          <span>Domingo / Feriado <span className="text-white font-medium">= 2 pts</span></span>
        </div>
        <select
          value={filtroEquipe}
          onChange={(e) => setFiltroEquipe(e.target.value)}
          className="ml-auto bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as equipes</option>
          {equipes.map((eq) => (
            <option key={eq.id} value={eq.nome}>{eq.nome}</option>
          ))}
        </select>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-center px-4 py-3 w-12">#</th>
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
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Nenhum colaborador encontrado
                </td>
              </tr>
            )}
            {lista.map((entry, idx) => {
              const b = badge(entry, idx);
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-gray-800 last:border-0 transition ${
                    idx === 0 ? "bg-green-900/10" : "hover:bg-gray-800/50"
                  }`}
                >
                  <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{entry.nome}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                      {entry.equipe}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{entry.sabados}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{entry.domFer}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold text-base ${scoreCls(entry)}`}>
                      {entry.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.cls}`}>
                        {b.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-4">Registrar plantão</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                <select
                  value={form.colaboradorId}
                  onChange={(e) => setForm((f) => ({ ...f, colaboradorId: e.target.value }))}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {ranking.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data do plantão</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo: t.value }))}
                      className={`py-2 rounded-lg text-sm font-medium border transition ${
                        form.tipo === t.value
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {t.label}
                      <span className="block text-xs opacity-60">{t.peso} pt{t.peso > 1 ? "s" : ""}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação (opcional)</label>
                <input
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: cobriu ausência de colega"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition"
                >
                  {saving ? "Salvando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
