export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { calcularSinal } from "@/lib/eligibility";

export default async function DashboardPage() {
  const [totalColaboradores, totalFolgas, colaboradores] = await Promise.all([
    prisma.colaborador.count({ where: { ativo: true } }),
    prisma.folga.count({
      where: {
        data: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        },
      },
    }),
    prisma.colaborador.findMany({
      where: { ativo: true },
      include: { equipe: true, escalas: { orderBy: { semana: "desc" }, take: 10 } },
    }),
  ]);

  let verdes = 0, amarelos = 0;
  for (const c of colaboradores) {
    let semanasPresencial = 0;
    for (const e of c.escalas) {
      if (e.tipo === "REMOTO") break;
      semanasPresencial++;
    }
    const sinal = calcularSinal(semanasPresencial, c.equipe.thresholdAmarelo, c.equipe.thresholdVerde);
    if (sinal === "VERDE") verdes++;
    else if (sinal === "AMARELO") amarelos++;
  }

  const cards = [
    { label: "Colaboradores ativos", value: totalColaboradores, color: "text-white" },
    { label: "Elegíveis para remoto", value: verdes, color: "text-green-400" },
    { label: "Quase elegíveis", value: amarelos, color: "text-yellow-400" },
    { label: "Folgas este mês", value: totalFolgas, color: "text-blue-400" },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
