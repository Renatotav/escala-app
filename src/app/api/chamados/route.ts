import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const where = dataInicio || dataFim
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
      by: ["nomeUsuarioAtribuido"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.chamado.aggregate({
      _min: { dataRegistro: true },
      _max: { dataRegistro: true },
    }),
  ]);

  return NextResponse.json({
    total,
    porUsuario: agrupado.map((g) => ({
      nome: g.nomeUsuarioAtribuido ?? "(sem nome)",
      total: g._count.id,
    })),
    dataMin: range._min.dataRegistro?.toISOString() ?? null,
    dataMax: range._max.dataRegistro?.toISOString() ?? null,
  });
}

export async function DELETE() {
  await prisma.chamado.deleteMany();
  return NextResponse.json({ ok: true });
}
