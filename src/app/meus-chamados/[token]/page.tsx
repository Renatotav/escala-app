"use client";

import { useEffect, useState, useCallback, use } from "react";

type Chamado = {
  id: number;
  referencia: string;
  dataRegistro: string | null;
  nomeSecao: string | null;
  ultimaAcao: string | null;
};

type Dados = {
  nome: string;
  total: number;
  chamados: Chamado[];
  page: number;
  pageSize: number;
  totalPages: number;
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MeusChamadosPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/meus-chamados/${token}?page=${page}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? "Erro ao carregar");
        }
        return r.json();
      })
      .then((data) => { setDados(data); setErro(""); })
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  if (loading && !dados) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center max-w-sm">
          <p className="text-red-400 font-medium mb-1">Link indisponível</p>
          <p className="text-sm text-gray-500">{erro}</p>
        </div>
      </div>
    );
  }

  if (!dados) return null;

  return (
    <div className="min-h-dvh bg-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Meus chamados</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dados.nome} · {dados.total.toLocaleString("pt-BR")} chamado{dados.total !== 1 ? "s" : ""}</p>
        </div>

        {dados.total === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
            <p className="text-gray-500 text-sm">Nenhum chamado atribuído a você no momento.</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 w-44">Referência</th>
                    <th className="text-left px-4 py-3 w-36">Data/hora</th>
                    <th className="text-left px-4 py-3">Seção</th>
                    <th className="text-left px-4 py-3">Última ação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.chamados.map((c) => (
                    <tr key={c.id} className="border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40 transition">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-200">{c.referencia}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 tabular-nums whitespace-nowrap">{fmtDateTime(c.dataRegistro)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-300">{c.nomeSecao ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{c.ultimaAcao ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dados.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500">Página {dados.page} de {dados.totalPages}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                    ‹ Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === dados.totalPages}
                    className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                    Próximo ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
