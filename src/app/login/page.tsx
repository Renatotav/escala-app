"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Erro ao autenticar");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Lado esquerdo — banner PJe */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pje-banner.jpg"
          alt="PJe — Processo Judicial Eletrônico"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Lado direito — formulário */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[420px] shrink-0 px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Gestão de Escalas
            </h1>
            <p className="mt-1 text-sm text-gray-400">Acesso restrito</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4"
          >
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-400 mb-1.5"
              >
                Senha do administrador
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full bg-gray-800 text-white rounded-lg border border-gray-700 px-3 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
