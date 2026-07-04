"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import pjeBanner from "@/lib/pje-banner";

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
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Fundo — banner PJe */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pjeBanner}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      {/* Overlay escuro para legibilidade */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Formulário centralizado */}
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow">
            Gestão de Escalas
          </h1>
          <p className="mt-2 text-base text-gray-300">Acesso restrito</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700 p-10 space-y-6"
        >
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-400 mb-2"
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
              className="w-full bg-gray-800 text-white rounded-xl border border-gray-700 px-4 py-3.5 text-base placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 text-base transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
