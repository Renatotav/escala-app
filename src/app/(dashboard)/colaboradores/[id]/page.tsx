"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { buscarCid } from "@/lib/cid";

type Equipe = { id: number; nome: string };
type Plantao = { id: number; data: string; tipo: string; folga1: string | null; folga2: string | null; descricao: string | null };
type Atestado = { id: number; dataInicio: string; dataFim: string; dias: number; cid: string | null; descricao: string | null };
type Feedback = { id: number; data: string; descricao: string; assinatura: string | null };
type Ocorrencia = { id: number; data: string; tipo: string | null; descricao: string; assinatura: string | null };

type Colaborador = {
  id: number; nome: string; cargo: string | null; matricula: string | null; ativo: boolean;
  equipe: Equipe;
  dataNascimento: string | null; cpf: string | null; email: string | null;
  telefone: string | null; telefoneEmerg: string | null; nomeEmerg: string | null; endereco: string | null;
  plantoes: Plantao[]; atestados: Atestado[]; feedbacks: Feedback[]; ocorrencias: Ocorrencia[];
};

const tipoLabel: Record<string, string> = { SABADO: "Sábado", DOMINGO: "Domingo", FERIADO: "Feriado", PONTO_FACULTATIVO: "Pto. Facultativo" };

function fmt(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10).split("-").reverse().join("/");
}

const emptyFeedback = { data: new Date().toISOString().slice(0, 10), descricao: "", assinatura: "" };
const emptyOcorrencia = { data: new Date().toISOString().slice(0, 10), tipo: "", descricao: "", assinatura: "" };

export default function FichaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [colab, setColab] = useState<Colaborador | null>(null);
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") ?? "dados") as "dados" | "plantoes" | "feedbacks" | "ocorrencias" | "atestados" | "triagem";
  const [tab, setTab] = useState<"dados" | "plantoes" | "feedbacks" | "ocorrencias" | "atestados" | "triagem">(initialTab);
  const [editando, setEditando] = useState(false);
  const [dadosForm, setDadosForm] = useState({ dataNascimento: "", cpf: "", email: "", telefone: "", telefoneEmerg: "", nomeEmerg: "", endereco: "" });
  const [saving, setSaving] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(false);
  const [formFeedback, setFormFeedback] = useState(emptyFeedback);
  const [modalOcorrencia, setModalOcorrencia] = useState(false);
  const [formOcorrencia, setFormOcorrencia] = useState(emptyOcorrencia);
  const [triagem, setTriagem] = useState<{ id: number; motivo: string; dataInicio: string; dataFim: string | null; observacao: string | null; atestadoId: number | null }[]>([]);
  const [modalTriagem, setModalTriagem] = useState(false);
  const [formTriagem, setFormTriagem] = useState({ motivo: "DECLARACAO", dataInicio: "", dataFim: "", observacao: "" });
  const [savingTriagem, setSavingTriagem] = useState(false);

  function load() {
    fetch(`/api/colaboradores/${id}/ficha`).then(r => r.json()).then((data: Colaborador) => {
      setColab(data);
      setDadosForm({
        dataNascimento: data.dataNascimento ? data.dataNascimento.slice(0, 10) : "",
        cpf: data.cpf ?? "", email: data.email ?? "",
        telefone: data.telefone ?? "", telefoneEmerg: data.telefoneEmerg ?? "",
        nomeEmerg: data.nomeEmerg ?? "", endereco: data.endereco ?? "",
      });
    });
  }

  function loadTriagem() {
    fetch(`/api/controle-triagem?colaboradorId=${id}`).then(r => r.json()).then(setTriagem);
  }

  useEffect(() => { load(); loadTriagem(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function salvarDados() {
    setSaving(true);
    await fetch(`/api/colaboradores/${id}/ficha`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosForm),
    });
    setSaving(false);
    setEditando(false);
    load();
  }

  async function addFeedback(e: { preventDefault(): void }) {
    e.preventDefault();
    await fetch("/api/feedbacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colaboradorId: id, ...formFeedback }),
    });
    setModalFeedback(false);
    setFormFeedback(emptyFeedback);
    load();
  }

  async function deleteFeedback(fid: number) {
    if (!confirm("Excluir feedback?")) return;
    await fetch(`/api/feedbacks?id=${fid}`, { method: "DELETE" });
    load();
  }

  async function addOcorrencia(e: { preventDefault(): void }) {
    e.preventDefault();
    await fetch("/api/ocorrencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colaboradorId: id, ...formOcorrencia }),
    });
    setModalOcorrencia(false);
    setFormOcorrencia(emptyOcorrencia);
    load();
  }

  async function deleteOcorrencia(oid: number) {
    if (!confirm("Excluir ocorrência?")) return;
    await fetch(`/api/ocorrencias?id=${oid}`, { method: "DELETE" });
    load();
  }

  if (!colab) return <div className="text-gray-500 text-sm p-6">Carregando...</div>;

  const inputCls = "w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50";

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white mt-1 text-sm">← Voltar</button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-white">{colab.nome}</h2>
          <p className="text-sm text-gray-400">{colab.cargo ?? "—"} · {colab.equipe.nome} {colab.matricula && `· Mat. ${colab.matricula}`}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 overflow-x-auto w-full md:w-fit">
        {(["dados", "plantoes", "feedbacks", "ocorrencias", "atestados", "triagem"] as const).map(t => {
          const triAtivos = triagem.filter(r => { const h = new Date().toISOString().slice(0,10); return !r.dataFim || r.dataFim >= h; }).length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${tab === t ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {t === "dados" ? "Dados pessoais"
                : t === "plantoes" ? `Plantões (${colab.plantoes.length})`
                : t === "feedbacks" ? `Feedbacks (${colab.feedbacks.length})`
                : t === "ocorrencias" ? `Ocorrências (${colab.ocorrencias.length})`
                : t === "atestados" ? `Atestados (${colab.atestados.length})`
                : <span className="flex items-center gap-1">Triagem{triAtivos > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5">{triAtivos}</span>}</span>}
            </button>
          );
        })}
      </div>

      {/* DADOS PESSOAIS */}
      {tab === "dados" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">Dados pessoais e de contato</h3>
            {!editando
              ? <button onClick={() => setEditando(true)} className="text-xs text-blue-400 hover:text-blue-300 transition">✎ Editar</button>
              : <div className="flex gap-2">
                  <button onClick={() => setEditando(false)} className="text-xs text-gray-400 hover:text-gray-300 transition">Cancelar</button>
                  <button onClick={salvarDados} disabled={saving} className="text-xs text-green-400 hover:text-green-300 transition disabled:opacity-50">{saving ? "Salvando..." : "✓ Salvar"}</button>
                </div>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Data de nascimento", key: "dataNascimento", type: "date" },
              { label: "CPF", key: "cpf", type: "text", placeholder: "000.000.000-00" },
              { label: "E-mail", key: "email", type: "email", placeholder: "email@exemplo.com" },
              { label: "Telefone", key: "telefone", type: "text", placeholder: "(00) 00000-0000" },
              { label: "Contato de emergência", key: "nomeEmerg", type: "text", placeholder: "Nome do contato" },
              { label: "Telefone de emergência", key: "telefoneEmerg", type: "text", placeholder: "(00) 00000-0000" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                {editando
                  ? <input type={type} value={dadosForm[key as keyof typeof dadosForm]} placeholder={placeholder}
                      onChange={e => setDadosForm(f => ({ ...f, [key]: e.target.value }))}
                      className={inputCls} />
                  : <p className="text-sm text-gray-300">{dadosForm[key as keyof typeof dadosForm] || "—"}</p>}
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Endereço</label>
              {editando
                ? <input value={dadosForm.endereco} placeholder="Rua, número, bairro, cidade"
                    onChange={e => setDadosForm(f => ({ ...f, endereco: e.target.value }))}
                    className={inputCls} />
                : <p className="text-sm text-gray-300">{dadosForm.endereco || "—"}</p>}
            </div>
          </div>
        </div>
      )}

      {/* PLANTÕES */}
      {tab === "plantoes" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-center px-4 py-3">Folga</th>
              <th className="text-center px-4 py-3">2ª Folga</th>
              <th className="text-left px-4 py-3">Observação</th>
            </tr></thead>
            <tbody>
              {colab.plantoes.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum plantão registrado</td></tr>}
              {colab.plantoes.map(p => (
                <tr key={p.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{fmt(p.data)}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{tipoLabel[p.tipo] ?? p.tipo}</td>
                  <td className="px-4 py-3 text-center text-green-400 text-xs font-mono">{fmt(p.folga1)}</td>
                  <td className="px-4 py-3 text-center text-green-400 text-xs font-mono">{fmt(p.folga2)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs italic">{p.descricao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FEEDBACKS */}
      {tab === "feedbacks" && (
        <>
          <div className="flex justify-end mb-3">
            <button onClick={() => setModalFeedback(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition">+ Registrar feedback</button>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3">Assinatura</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody>
                {colab.feedbacks.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nenhum feedback registrado</td></tr>}
                {colab.feedbacks.map(f => (
                  <tr key={f.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">{fmt(f.data)}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{f.descricao}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{f.assinatura ?? "—"}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => deleteFeedback(f.id)} className="text-xs text-red-400 hover:text-red-300">Excluir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* OCORRÊNCIAS */}
      {tab === "ocorrencias" && (
        <>
          <div className="flex justify-end mb-3">
            <button onClick={() => setModalOcorrencia(true)} className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-4 py-2 rounded-lg transition">+ Registrar ocorrência</button>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3">Assinatura</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody>
                {colab.ocorrencias.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhuma ocorrência registrada</td></tr>}
                {colab.ocorrencias.map(o => (
                  <tr key={o.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">{fmt(o.data)}</td>
                    <td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300">{o.tipo ?? "—"}</span></td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{o.descricao}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{o.assinatura ?? "—"}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => deleteOcorrencia(o.id)} className="text-xs text-red-400 hover:text-red-300">Excluir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ATESTADOS */}
      {tab === "atestados" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Início</th>
              <th className="text-left px-4 py-3">Fim</th>
              <th className="text-center px-4 py-3">Dias</th>
              <th className="text-left px-4 py-3">CID</th>
              <th className="text-left px-4 py-3">Observação</th>
            </tr></thead>
            <tbody>
              {colab.atestados.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum atestado registrado</td></tr>}
              {colab.atestados.map(a => (
                <tr key={a.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{fmt(a.dataInicio)}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{fmt(a.dataFim)}</td>
                  <td className="px-4 py-3 text-center text-orange-400 font-bold">{a.dias}</td>
                  <td className="px-4 py-3">
                    {a.cid ? <div><p className="text-blue-400 font-mono text-xs">{a.cid}</p><p className="text-gray-500 text-xs">{buscarCid(a.cid)}</p></div> : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{a.descricao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TRIAGEM */}
      {tab === "triagem" && (() => {
        const hoje = new Date().toISOString().slice(0, 10);
        const motivoLabel: Record<string, string> = { ATESTADO: "Atestado", DECLARACAO: "Declaração", ATENDIMENTO_PRESENCIAL: "Atendimento Presencial", QUANTIDADE_CHAMADOS: "Qtd. Chamados" };
        const motivoBadge: Record<string, string> = { ATESTADO: "bg-orange-500/20 text-orange-400 border-orange-500/30", DECLARACAO: "bg-blue-500/20 text-blue-400 border-blue-500/30", ATENDIMENTO_PRESENCIAL: "bg-purple-500/20 text-purple-400 border-purple-500/30", QUANTIDADE_CHAMADOS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
        return (
          <div>
            <div className="flex justify-end mb-3">
              <button onClick={() => setModalTriagem(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">+ Registrar saída</button>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Motivo</th>
                  <th className="text-center px-4 py-3">Desde</th>
                  <th className="text-center px-4 py-3">Retorno</th>
                  <th className="text-left px-4 py-3">Observação</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr></thead>
                <tbody>
                  {triagem.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nenhum registro de triagem</td></tr>}
                  {triagem.map(r => {
                    const ativo = !r.dataFim || r.dataFim >= hoje;
                    return (
                      <tr key={r.id} className={`border-b border-gray-800 last:border-0 ${ativo ? "bg-red-900/5" : ""}`}>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${motivoBadge[r.motivo] ?? "bg-gray-700 text-gray-300"}`}>{motivoLabel[r.motivo] ?? r.motivo}</span>
                          {r.atestadoId && <span className="ml-1 text-xs text-gray-600">↗ Atestado</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-300 font-mono text-xs">{r.dataInicio.slice(0,10).split("-").reverse().join("/")}</td>
                        <td className="px-4 py-3 text-center">
                          {r.dataFim ? <span className="text-xs text-green-400 font-mono">{r.dataFim.slice(0,10).split("-").reverse().join("/")}</span> : <span className="text-xs text-red-400">Ainda fora</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 italic">{r.observacao ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          {ativo ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Fora da lista</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Retornou</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            {ativo && <button onClick={async () => { await fetch("/api/controle-triagem", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, dataFim: hoje }) }); loadTriagem(); }} className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded transition">Retornou</button>}
                            <button onClick={async () => { if (!confirm("Excluir?")) return; await fetch(`/api/controle-triagem?id=${r.id}`, { method: "DELETE" }); loadTriagem(); }} className="text-xs text-red-400 hover:text-red-300 transition">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {modalTriagem && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setModalTriagem(false)}>
                <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-base font-semibold text-white mb-4">Registrar saída da lista</h3>
                  <form onSubmit={async e => { e.preventDefault(); setSavingTriagem(true); await fetch("/api/controle-triagem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ colaboradorId: id, ...formTriagem, dataFim: formTriagem.dataFim || null }) }); setSavingTriagem(false); setModalTriagem(false); setFormTriagem({ motivo: "DECLARACAO", dataInicio: "", dataFim: "", observacao: "" }); loadTriagem(); }} className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Motivo</label>
                      <select value={formTriagem.motivo} onChange={e => setFormTriagem(f => ({ ...f, motivo: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="DECLARACAO">Declaração (consulta médica)</option>
                        <option value="ATENDIMENTO_PRESENCIAL">Atendimento Presencial</option>
                        <option value="QUANTIDADE_CHAMADOS">Quantidade de Chamados</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-gray-400 mb-1">Data início</label><input type="date" value={formTriagem.dataInicio} onChange={e => setFormTriagem(f => ({ ...f, dataInicio: e.target.value }))} required className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
                      <div><label className="block text-xs text-gray-400 mb-1">Retorno <span className="text-gray-600">(opcional)</span></label><input type="date" value={formTriagem.dataFim} onChange={e => setFormTriagem(f => ({ ...f, dataFim: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
                    </div>
                    <div><label className="block text-xs text-gray-400 mb-1">Observação</label><input value={formTriagem.observacao} onChange={e => setFormTriagem(f => ({ ...f, observacao: e.target.value }))} placeholder="Ex: Consulta cardiologista..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" /></div>
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => setModalTriagem(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                      <button type="submit" disabled={savingTriagem} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">{savingTriagem ? "Salvando..." : "Registrar"}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* MODAL — Feedback */}
      {modalFeedback && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-4">Registrar feedback</h3>
            <form onSubmit={addFeedback} className="space-y-3">
              <div><label className="block text-xs text-gray-400 mb-1">Data</label>
                <input type="date" value={formFeedback.data} onChange={e => setFormFeedback(f => ({ ...f, data: e.target.value }))} required className={inputCls} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <textarea value={formFeedback.descricao} onChange={e => setFormFeedback(f => ({ ...f, descricao: e.target.value }))} required rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Assinatura <span className="text-gray-600">(responsável)</span></label>
                <input value={formFeedback.assinatura} onChange={e => setFormFeedback(f => ({ ...f, assinatura: e.target.value }))} placeholder="Nome do responsável" className={inputCls} /></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalFeedback(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg py-2 transition">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL — Ocorrência */}
      {modalOcorrencia && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-4">Registrar ocorrência</h3>
            <form onSubmit={addOcorrencia} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-400 mb-1">Data</label>
                  <input type="date" value={formOcorrencia.data} onChange={e => setFormOcorrencia(f => ({ ...f, data: e.target.value }))} required className={inputCls} /></div>
                <div><label className="block text-xs text-gray-400 mb-1">Tipo</label>
                  <input value={formOcorrencia.tipo} onChange={e => setFormOcorrencia(f => ({ ...f, tipo: e.target.value }))} placeholder="Ex: Atraso, Falta..." className={inputCls} /></div>
              </div>
              <div><label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <textarea value={formOcorrencia.descricao} onChange={e => setFormOcorrencia(f => ({ ...f, descricao: e.target.value }))} required rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Assinatura <span className="text-gray-600">(responsável)</span></label>
                <input value={formOcorrencia.assinatura} onChange={e => setFormOcorrencia(f => ({ ...f, assinatura: e.target.value }))} placeholder="Nome do responsável" className={inputCls} /></div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalOcorrencia(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
                <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg py-2 transition">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
