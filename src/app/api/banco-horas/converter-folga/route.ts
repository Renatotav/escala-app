import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPO_LABEL: Record<string, string> = {
  SABADO: "Sabado",
  DOMINGO: "Domingo",
  FERIADO: "Feriado",
  PONTO_FACULTATIVO: "Pto. Facultativo",
};

export async function POST(request: NextRequest) {
  const { plantaoId, colaboradorId, hPorDia = 8 } = await request.json();

  const plantao = await prisma.plantao.findUnique({ where: { id: Number(plantaoId) } });
  if (!plantao) return NextResponse.json({ ok: false, error: "Plantão não encontrado" }, { status: 404 });

  const duplo = plantao.tipo === "DOMINGO" || plantao.tipo === "FERIADO";
  const hoje = new Date();
  let slot: 1 | 2;

  if (!plantao.folga1) {
    slot = 1;
    await prisma.plantao.update({ where: { id: Number(plantaoId) }, data: { folga1: hoje } });
  } else if (duplo && !plantao.folga2) {
    slot = 2;
    await prisma.plantao.update({ where: { id: Number(plantaoId) }, data: { folga2: hoje } });
  } else {
    return NextResponse.json({ ok: false, error: "Nenhum slot disponível" }, { status: 400 });
  }

  const dataPlantao = plantao.data.toISOString().slice(0, 10);
  const h = Number(hPorDia);
  const tipoLabel = TIPO_LABEL[plantao.tipo] ?? plantao.tipo;

  const lancamentos: { colaboradorId: number; data: Date; horas: number; descricao: string }[] = [];

  // Slot 1: registra o crédito total do plantão (horas trabalhadas no dia)
  if (slot === 1) {
    const creditoTotal = duplo ? h * 2 : h;
    lancamentos.push({
      colaboradorId: Number(colaboradorId),
      data: hoje,
      horas: creditoTotal,
      descricao: `Crédito por plantão ${tipoLabel} — ${dataPlantao}`,
    });
  }

  // Toda folga usada: débito correspondente (folga consumida do banco)
  lancamentos.push({
    colaboradorId: Number(colaboradorId),
    data: hoje,
    horas: -h,
    descricao: `Abatimento de folga — plantão ${dataPlantao}`,
  });

  await prisma.lancamentoBancoHoras.createMany({ data: lancamentos });

  return NextResponse.json({ ok: true, slot, horas: h });
}
