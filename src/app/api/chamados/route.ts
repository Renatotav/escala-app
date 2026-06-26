import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const usuario = searchParams.get("usuario") || null;
  const dataInicio = searchParams.get("dataInicio") || null;
  const dataFim = searchParams.get("dataFim") || null;

  const where: Record<string, unknown> = {};
  if (usuario) where.nomeUsuarioAtribuido = usuario;
  if (dataInicio || dataFim) {
    where.dataRegistro = {
      ...(dataInicio && { gte: new Date(dataInicio + "T00:00:00.000Z") }),
      ...(dataFim && { lte: new Date(dataFim + "T23:59:59.999Z") }),
    };
  }

  const [total, chamados, range, usuariosRaw] = await Promise.all([
    prisma.chamado.count({ where }),
    prisma.chamado.findMany({
      where,
      orderBy: { dataRegistro: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        referencia: true,
        dataRegistro: true,
        nomeDpsAtribuido: true,
        nomeUsuarioAtribuido: true,
        ultimaAcao: true,
        alerta: true,
        nivelEscalacao: true,
      },
    }),
    prisma.chamado.aggregate({
      _min: { dataRegistro: true },
      _max: { dataRegistro: true },
    }),
    prisma.chamado.findMany({
      select: { nomeUsuarioAtribuido: true },
      distinct: ["nomeUsuarioAtribuido"],
      orderBy: { nomeUsuarioAtribuido: "asc" },
    }),
  ]);

  return NextResponse.json({
    total,
    chamados,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    dataMin: range._min.dataRegistro?.toISOString() ?? null,
    dataMax: range._max.dataRegistro?.toISOString() ?? null,
    usuarios: usuariosRaw.map((u) => u.nomeUsuarioAtribuido).filter(Boolean) as string[],
  });
}

export async function DELETE() {
  await prisma.chamado.deleteMany();
  return NextResponse.json({ ok: true });
}
