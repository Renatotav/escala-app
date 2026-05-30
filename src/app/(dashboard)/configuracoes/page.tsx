"use client";

import { useEffect, useState } from "react";

type Equipe = { id: number; nome: string; thresholdAmarelo: number; thresholdVerde: number };
type Feriado = { id: number; data: string; descricao: string };

export default function ConfiguracoesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [novaEquipe, setNovaEquipe] = useState({ nome: "", thresholdAmarelo: 3, thresholdVerde: 4 });
  const [novoFeriado, setNovoFeriado] = useState({ data: "", descricao: "" });
  const [saving, setSaving] = useState(false);

  const EQUIPES_OCULTAS = ["Supervisão", "Coordenação"];

  function loadEquipes() {
    fetch("/api/equipes").then(r => r.json()).then((data: Equipe[]) =>
      setEquipes(data.filter(eq => !EQUIPES_OCULTAS.includes(eq.nome)))
    );
  }
  function loadFeriados() { fetch("/api/feriados").then(r => r.json()).then(setFeriados); }

  useEffect(() => { loadEquipes(); loadFeriados(); }, []);

  async function handleAddEquipe(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/equipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novaEquipe),
    });
    setSaving(false);
    setNovaEquipe({ nome: "", thresholdAmarelo: 3, thresholdVerde: 4 });
    loadEquipes();
  }

  async function handleAddFeriado(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/feriados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novoFeriado),
    });
    setSaving(false);
    setNovoFeriado({ data: "", descricao: "" });
    loadFeriados();
  }

  async function handleDeleteFeriado(id: number) {
    await fetch("/api/feriados", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadFeriados();
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h2 className="text-xl font-semibold text-white">Configurações</h2>

      {/* Equipes */}
      <section>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Equipes e limiares de elegibilidade</h3>
        <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
          {equipes.map(eq => (
            <div key={eq.id} className="px-4 py-3 flex items-center justify-between">
              <span className="text-white text-sm font-medium">{eq.nome}</span>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>🟡 Amarelo: <strong className="text-yellow-400">{eq.thresholdAmarelo} sem.</strong></span>
                <span>🟢 Verde: <strong className="text-green-400">{eq.thresholdVerde} sem.</strong></span>
              </div>
            </div>
          ))}
          <form onSubmit={handleAddEquipe} className="px-4 py-3 grid grid-cols-3 gap-3 items-end">
            <div className="col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Nova equipe</label>
              <input value={novaEquipe.nome} onChange={e => setNovaEquipe(f => ({ ...f, nome: e.target.value }))} required
                placeholder="Nome da equipe"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Limiar amarelo</label>
              <input type="number" min={1} max={20}
                value={novaEquipe.thresholdAmarelo}
                onChange={e => setNovaEquipe(f => ({ ...f, thresholdAmarelo: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Limiar verde</label>
              <input type="number" min={1} max={20}
                value={novaEquipe.thresholdVerde}
                onChange={e => setNovaEquipe(f => ({ ...f, thresholdVerde: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-3">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                {saving ? "Salvando..." : "+ Adicionar equipe"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Feriados */}
      <section>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Feriados customizados</h3>
        <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
          {feriados.length === 0 && (
            <div className="px-4 py-4 text-sm text-gray-500">Nenhum feriado cadastrado</div>
          )}
          {feriados.map(f => (
            <div key={f.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-white text-sm font-medium">{f.descricao}</span>
                <span className="text-xs text-gray-400 ml-2 font-mono">
                  {new Date(f.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </span>
              </div>
              <button onClick={() => handleDeleteFeriado(f.id)}
                className="text-xs text-red-400 hover:text-red-300 transition">Remover</button>
            </div>
          ))}
          <form onSubmit={handleAddFeriado} className="px-4 py-3 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Descrição</label>
              <input value={novoFeriado.descricao} onChange={e => setNovoFeriado(f => ({ ...f, descricao: e.target.value }))} required
                placeholder="Ex: Dia do Trabalho"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data</label>
              <input type="date" value={novoFeriado.data} onChange={e => setNovoFeriado(f => ({ ...f, data: e.target.value }))} required
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              + Adicionar
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
