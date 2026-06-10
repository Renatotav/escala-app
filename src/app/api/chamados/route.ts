import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const where =
    dataInicio || dataFim
      ? {
          dataRegistro: {
            ...(dataInicio && { gte: new Date(dataInicio + "T00:00:00.000Z") }),
            ...(dataFim && { lte: new Date(dataFim + "T23:59:59.999Z") }),
          },
        }
      : {};

  const [total, agrupado, range] = await Promise.all([
    prisma.chamado.count({ where }),
    prisma.chamado.groupBy({
      by: ["nomeDpsAtribuido", "nomeUsuarioAtribuido"],
      where,
      _count: { id: true },
    }),
    prisma.chamado.aggregate({
      _min: { dataRegistro: true },
      _max: { dataRegistro: true },
    }),
  ]);

  // Build equipes → membros map
  const map: Record<string, Record<string, number>> = {};
  for (const row of agrupado) {
    const equipe = row.nomeDpsAtribuido ?? "(sem equipe)";
    const membro = row.nomeUsuarioAtribuido ?? "(sem nome)";
    if (!map[equipe]) map[equipe] = {};
    map[equipe][membro] = (map[equipe][membro] ?? 0) + row._count.id;
  }

  const porEquipe = Object.entries(map)
    .map(([equipe, membros]) => ({
      equipe,
      total: Object.values(membros).reduce((a, b) => a + b, 0),
      membros: Object.entries(membros)
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    total,
    porEquipe,
    dataMin: range._min.dataRegistro?.toISOString() ?? null,
    dataMax: range._max.dataRegistro?.toISOString() ?? null,
  });
}

export async function DELETE() {
  await prisma.chamado.deleteMany();
  return NextResponse.json({ ok: true });
}
