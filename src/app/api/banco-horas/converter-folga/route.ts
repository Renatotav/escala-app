import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { plantaoId, colaboradorId, hPorDia = 8 } = await request.json();

  const plantao = await prisma.plantao.findUnique({ where: { id: Number(plantaoId) } });
  if (!plantao) return NextResponse.json({ ok: false, error: "Plantão não encontrado" }, { status: 404 });

  const duplo = plantao.tipo === "DOMINGO" || plantao.tipo === "FERIADO";
  const hoje = new Date();
  // Epoch (1970-01-01) as sentinel: keeps the slot truthy (prevents double-use)
  // but falls outside the dashboard "próximas folgas" filter (>= hoje).
  const BANCO_MARKER = new Date(0);
  let slot: 1 | 2;

  if (!plantao.folga1) {
    slot = 1;
    await prisma.plantao.update({ where: { id: Number(plantaoId) }, data: { folga1: BANCO_MARKER } });
  } else if (duplo && !plantao.folga2) {
    slot = 2;
    await prisma.plantao.update({ where: { id: Number(plantaoId) }, data: { folga2: BANCO_MARKER } });
  } else {
    return NextResponse.json({ ok: false, error: "Nenhum slot disponível" }, { status: 400 });
  }

  const dataPlantao = plantao.data.toISOString().slice(0, 10);

  // Crédito positivo: a folga é CONVERTIDA em horas de banco (abate dívida)
  await prisma.lancamentoBancoHoras.create({
    data: {
      colaboradorId: Number(colaboradorId),
      data: hoje,
      horas: Number(hPorDia),
      descricao: `Folga de plantão utilizada — ${dataPlantao}`,
    },
  });

  return NextResponse.json({ ok: true, slot, horas: Number(hPorDia) });
}
