import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [chamados, agg] = await Promise.all([
    prisma.chamado.findMany({ select: { referencia: true } }),
    prisma.chamado.aggregate({ _max: { createdAt: true } }),
  ]);

  return NextResponse.json({
    referencias: chamados.map((c) => c.referencia),
    total: chamados.length,
    atualizadoEm: agg._max.createdAt?.toISOString() ?? null,
  });
}
