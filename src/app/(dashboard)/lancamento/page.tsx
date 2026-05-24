"use client";

import { useEffect, useState } from "react";

type Colaborador = { id: number; nome: string; equipe: { nome: string } };

export default function LancamentoPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [form, setForm] = useState({ colaboradorId: "", data: "", entrada: "", saida: "" });
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetch("/api/colaboradores?limit=200")
      .then(r => r.json())
      .then(d => setColaboradores(d.colaboradores));
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    setOk(false);

    const entradaDt = new Date(`${form.data}T${form.entrada}`);
    const saidaDt = new Date(`${form.data}T${form.saida}`);

    await fetch("/api/pontos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        colaboradorId: Number(form.colaboradorId),
        data: form.data,
        entrada: entradaDt.toISOString(),
        saida: saidaDt.toISOString(),
      }),
    });

    setSaving(false);
    setOk(true);
    setForm(f => ({ ...f, entrada: "", saida: "" }));
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold text-white mb-6">Lançamento de Ponto</h2>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
            <select value={form.colaboradorId} onChange={e => setForm(f => ({ ...f, colaboradorId: e.target.value }))} required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {colaboradores.map(c => (
                <option key={c.id} value={c.id}>{c.nome} — {c.equipe.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Data</label>
            <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Entrada</label>
              <input type="time" value={form.entrada} onChange={e => setForm(f => ({ ...f, entrada: e.target.value }))} required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Saída</label>
              <input type="time" value={form.saida} onChange={e => setForm(f => ({ ...f, saida: e.target.value }))} required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {ok && <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-3 py-2">Ponto lançado com sucesso!</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition">
            {saving ? "Salvando..." : "Lançar ponto"}
          </button>
        </form>
      </div>
    </div>
  );
}
