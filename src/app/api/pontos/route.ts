import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { colaboradorId, data, entrada, saida } = await request.json();

  const registro = await prisma.registroPonto.upsert({
    where: { colaboradorId_data: { colaboradorId, data: new Date(data) } },
    create: { colaboradorId, data: new Date(data), entrada: new Date(entrada), saida: new Date(saida) },
    update: { entrada: new Date(entrada), saida: new Date(saida) },
  });

  return NextResponse.json(registro, { status: 201 });
}
