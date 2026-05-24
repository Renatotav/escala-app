import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const JORNADA_PADRAO_H = 8;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes"); // YYYY-MM
  const equipeId = searchParams.get("equipeId");

  const where: Record<string, unknown> = {};
  if (mes) {
    const [year, month] = mes.split("-").map(Number);
    where.data = { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0) };
  }

  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true, ...(equipeId && { equipeId: Number(equipeId) }) },
    include: {
      equipe: true,
      pontos: { where },
    },
    orderBy: { nome: "asc" },
  });

  const result = colaboradores.map((c) => {
    let saldoMinutos = 0;
    for (const p of c.pontos) {
      if (!p.entrada || !p.saida) continue;
      const trabalhadoMs = new Date(p.saida).getTime() - new Date(p.entrada).getTime();
      const trabalhadoMin = trabalhadoMs / 60000;
      saldoMinutos += trabalhadoMin - JORNADA_PADRAO_H * 60;
    }
    const saldoH = Math.floor(Math.abs(saldoMinutos) / 60);
    const saldoM = Math.abs(saldoMinutos) % 60;
    const sinal = saldoMinutos >= 0 ? "+" : "-";

    return {
      id: c.id,
      nome: c.nome,
      equipe: c.equipe,
      lancamentos: c.pontos.length,
      saldo: `${sinal}${saldoH}h${String(Math.round(saldoM)).padStart(2, "0")}m`,
      saldoMinutos,
    };
  });

  return NextResponse.json(result);
}
