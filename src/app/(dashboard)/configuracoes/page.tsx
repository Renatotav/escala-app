"use client";

import { useEffect, useState } from "react";

type Equipe = { id: number; nome: string; thresholdAmarelo: number; thresholdVerde: number };
type Feriado = { id: number; data: string; descricao: string };

function EquipeRow({ equipe, onSaved }: { equipe: Equipe; onSaved: () => void }) {
  const [amarelo, setAmarelo] = useState(equipe.thresholdAmarelo);
  const [verde, setVerde] = useState(equipe.thresholdVerde);
  const [saving, setSaving] = useState(false);

  const dirty = amarelo !== equipe.thresholdAmarelo || verde !== equipe.thresholdVerde;

  async function salvar() {
    setSaving(true);
    await fetch("/api/equipes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: equipe.id, thresholdAmarelo: amarelo, thresholdVerde: verde }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="px-4 py-3 flex items-center justify-between gap-4">
      <span className="text-white text-sm font-medium flex-1">{equipe.nome}</span>
      <div className="flex items-center gap-3 text-xs">
        <label className="text-yellow-400 flex items-center gap-1.5">
          Amarelo
          <input type="number" min={1} max={20} value={amarelo}
            onChange={e => setAmarelo(Number(e.target.value))}
            className="w-14 bg-gray-800 border border-gray-700 text-white rounded px-2 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-yellow-500" />
          sem.
        </label>
        <label className="text-green-400 flex items-center gap-1.5">
          Verde
          <input type="number" min={1} max={20} value={verde}
            onChange={e => setVerde(Number(e.target.value))}
            className="w-14 bg-gray-800 border border-gray-700 text-white rounded px-2 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-green-500" />
          sem.
        </label>
        {dirty && (
          <button onClick={salvar} disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-0.5 rounded transition text-xs">
            {saving ? "..." : "Salvar"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [novaEquipe, setNovaEquipe] = useState({ nome: "", thresholdAmarelo: 3, thresholdVerde: 4 });
  const [novoFeriado, setNovoFeriado] = useState({ data: "", descricao: "" });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [senha, setSenha] = useState({ atual: "", nova: "", confirma: "" });
  const [senhaStatus, setSenhaStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  async function downloadBackup() {
    setDownloading(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Erro ao gerar backup");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

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

  async function handleAlterarSenha(e: { preventDefault(): void }) {
    e.preventDefault();
    if (senha.nova !== senha.confirma) {
      setSenhaStatus({ ok: false, msg: "Nova senha e confirmação não coincidem" });
      return;
    }
    setSalvandoSenha(true);
    setSenhaStatus(null);
    const res = await fetch("/api/auth/senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senhaAtual: senha.atual, novaSenha: senha.nova }),
    });
    const data = await res.json();
    if (res.ok) {
      setSenhaStatus({ ok: true, msg: "Senha alterada com sucesso!" });
      setSenha({ atual: "", nova: "", confirma: "" });
    } else {
      setSenhaStatus({ ok: false, msg: data.error ?? "Erro ao alterar senha" });
    }
    setSalvandoSenha(false);
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
            <EquipeRow key={eq.id} equipe={eq} onSaved={loadEquipes} />
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

      {/* Feriados extras */}
      <section>
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-300">Feriados e Pontos Facultativos extras</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Os feriados nacionais, estaduais (Ceará) e municipais (Fortaleza) já aparecem automaticamente na Escala do Mês.
            Cadastre aqui apenas <strong className="text-gray-400">pontos facultativos</strong> ou feriados adicionais não previstos.
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
          {feriados.length === 0 && (
            <div className="px-4 py-4 text-sm text-gray-500">Nenhum feriado extra cadastrado</div>
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
          <form onSubmit={handleAddFeriado} className="px-4 py-3 flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-400 mb-1">Descrição</label>
              <input value={novoFeriado.descricao} onChange={e => setNovoFeriado(f => ({ ...f, descricao: e.target.value }))} required
                placeholder="Ex: Ponto Facultativo"
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
      {/* Alterar senha */}
      <section>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Alterar senha de acesso</h3>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <form onSubmit={handleAlterarSenha} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Senha atual</label>
              <input type="password" value={senha.atual} onChange={e => setSenha(s => ({ ...s, atual: e.target.value }))} required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nova senha</label>
              <input type="password" value={senha.nova} onChange={e => setSenha(s => ({ ...s, nova: e.target.value }))} required minLength={4}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Confirmar nova senha</label>
              <input type="password" value={senha.confirma} onChange={e => setSenha(s => ({ ...s, confirma: e.target.value }))} required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {senhaStatus && (
              <p className={`text-xs px-3 py-2 rounded-lg ${senhaStatus.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {senhaStatus.msg}
              </p>
            )}
            <button type="submit" disabled={salvandoSenha}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {salvandoSenha ? "Salvando..." : "Alterar senha"}
            </button>
          </form>
        </div>
      </section>

      {/* Backup */}
      <section>
        <h3 className="text-sm font-medium text-gray-300 mb-3">Backup do banco de dados</h3>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white font-medium">Download completo</p>
            <p className="text-xs text-gray-400 mt-0.5">Gera um arquivo .sql com todos os dados — colaboradores, plantões, folgas, escala e banco de horas.</p>
          </div>
          <button onClick={downloadBackup} disabled={downloading}
            className="shrink-0 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            {downloading ? "Gerando..." : "Download Backup"}
          </button>
        </div>
      </section>
    </div>
  );
}
