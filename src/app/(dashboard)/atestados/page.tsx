"use client";

import { useEffect, useState, useRef } from "react";
import { buscarCid, sugerirCids } from "@/lib/cid";

type Equipe = { id: number; nome: string };
type Colaborador = { id: number; nome: string; equipe: Equipe };
type Atestado = {
  id: number; colaboradorId: number; dataInicio: string; dataFim: string;
  dias: number; cid: string | null; descricao: string | null;
  colaborador: { nome: string; equipe: { nome: string } };
};

const emptyForm = { colaboradorId: "", dataInicio: "", dataFim: "", cid: "", descricao: "" };

function fmt(iso: string) { return iso.split("-").reverse().join("/"); }

export default function AtestadosPage() {
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [verAtestado, setVerAtestado] = useState<Atestado | null>(null);
  const [cidSugestoes, setCidSugestoes] = useState<{ codigo: string; descricao: string }[]>([]);
  const [cidDescricao, setCidDescricao] = useState<string | null>(null);
  const cidRef = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/atestados").then(r => r.json()).then(setAtestados);
  }

  useEffect(() => {
    load();
    fetch("/api/colaboradores?all=true").then(r => r.json()).then((d: { colaboradores: Colaborador[] }) =>
      setColaboradores([...d.colaboradores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")))
    );
  }, []);

  function handleCidChange(valor: string) {
    setForm(f => ({ ...f, cid: valor }));
    setCidSugestoes(sugerirCids(valor));
    setCidDescricao(buscarCid(valor));
  }

  function selecionarCid(codigo: string, descricao: string) {
    setForm(f => ({ ...f, cid: codigo }));
    setCidDescricao(descricao);
    setCidSugestoes([]);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/atestados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, colaboradorId: Number(form.colaboradorId) }),
    });
    setSaving(false);
    setModal(false);
    setForm(emptyForm);
    setCidDescricao(null);
    setCidSugestoes([]);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este atestado?")) return;
    await fetch(`/api/atestados?id=${id}`, { method: "DELETE" });
    load();
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Atestados Médicos</h2>
          <p className="text-sm text-gray-400 mt-0.5">Registro de afastamentos e declarações médicas</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setCidDescricao(null); setCidSugestoes([]); setModal(true); }}
          className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          + Registrar atestado
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Colaborador</th>
              <th className="text-left px-4 py-3">Equipe</th>
              <th className="text-center px-4 py-3">Início</th>
              <th className="text-center px-4 py-3">Fim</th>
              <th className="text-center px-4 py-3">Dias</th>
              <th className="text-left px-4 py-3">CID</th>
              <th className="text-left px-4 py-3">Observação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {atestados.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Nenhum atestado registrado</td></tr>
            )}
            {atestados.map(a => {
              const ativo = a.dataInicio <= hoje && a.dataFim >= hoje;
              const cidLabel = a.cid ? buscarCid(a.cid) : null;
              return (
                <tr key={a.id} className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition ${ativo ? "bg-orange-900/10" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{a.colaborador.nome}</span>
                      {ativo && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">Afastado</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{a.colaborador.equipe.nome}</span></td>
                  <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{fmt(a.dataInicio)}</td>
                  <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{fmt(a.dataFim)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${ativo ? "text-orange-400" : "text-gray-400"}`}>{a.dias}</span>
                  </td>
                  <td className="px-4 py-3">
                    {a.cid ? (
                      <div>
                        <p className="text-xs font-mono text-blue-400">{a.cid}</p>
                        {cidLabel && <p className="text-xs text-gray-500">{cidLabel}</p>}
                      </div>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.descricao ? (
                      <button onClick={() => setVerAtestado(a)}
                        className="text-xs text-gray-400 hover:text-white transition max-w-[160px] truncate block text-left underline underline-offset-2">
                        {a.descricao}
                      </button>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(a.id)} className="text-xs text-red-400 hover:text-red-300 transition">Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal — Ver detalhes */}
      {verAtestado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Detalhes do atestado</h3>
              <button onClick={() => setVerAtestado(null)} className="text-gray-600 hover:text-gray-400">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div><p className="text-xs text-gray-500">Colaborador</p><p className="text-white font-medium">{verAtestado.colaborador.nome}</p></div>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-xs text-gray-500">Início</p><p className="text-gray-300">{fmt(verAtestado.dataInicio)}</p></div>
                <div><p className="text-xs text-gray-500">Fim</p><p className="text-gray-300">{fmt(verAtestado.dataFim)}</p></div>
                <div><p className="text-xs text-gray-500">Dias</p><p className="text-orange-400 font-bold">{verAtestado.dias}</p></div>
              </div>
              {verAtestado.cid && (
                <div>
                  <p className="text-xs text-gray-500">CID</p>
                  <p className="text-blue-400 font-mono text-sm">{verAtestado.cid}</p>
                  {buscarCid(verAtestado.cid) && <p className="text-gray-300 text-xs mt-0.5">{buscarCid(verAtestado.cid)}</p>}
                </div>
              )}
              {verAtestado.descricao && (
                <div><p className="text-xs text-gray-500">Observação</p><p className="text-gray-300">{verAtestado.descricao}</p></div>
              )}
            </div>
            <button onClick={() => setVerAtestado(null)} className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Fechar</button>
          </div>
        </div>
      )}

      {/* Modal — Registrar */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-4">Registrar atestado</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Colaborador</label>
                <select value={form.colaboradorId} onChange={e => setForm(f => ({ ...f, colaboradorId: e.target.value }))} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">Selecione...</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data início</label>
                  <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data fim</label>
                  <input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>

              {/* CID com autocomplete */}
              <div ref={cidRef} className="relative">
                <label className="block text-xs text-gray-400 mb-1">CID <span className="text-gray-600">(opcional)</span></label>
                <input value={form.cid} onChange={e => handleCidChange(e.target.value)}
                  placeholder="Ex: J11, F32, M54..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                {cidDescricao && (
                  <p className="text-xs text-blue-400 mt-1">✓ {cidDescricao}</p>
                )}
                {cidSugestoes.length > 0 && (
                  <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto">
                    {cidSugestoes.map(s => (
                      <button key={s.codigo} type="button" onClick={() => selecionarCid(s.codigo, s.descricao)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 transition">
                        <span className="text-blue-400 font-mono text-xs">{s.codigo}</span>
                        <span className="text-gray-300 text-xs ml-2">{s.descricao}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Observação <span className="text-gray-600">(opcional)</span></label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Declaração médica, cirurgia..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
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
