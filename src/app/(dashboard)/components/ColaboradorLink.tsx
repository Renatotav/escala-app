"use client";

import { useRouter } from "next/navigation";

export default function ColaboradorLink({ id, nome, className }: { id: number; nome: string; className?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/colaboradores/${id}`)}
      className={className ?? "text-white font-medium hover:text-blue-400 transition text-left"}
    >
      {nome}
    </button>
  );
}
