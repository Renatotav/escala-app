import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Escala do Mês agora usa a tabela Plantao como fonte única de verdade.
// Registrar na Escala = registrar plantão real (aparece no Histórico, conta no Saldo).

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes"); // YYYY-MM

  const where = mes
    ? (() => {
        const [y, m] = mes.split("-").map(Number);
        return { data: { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0) } };
      })()
    : {};

  const registros = await prisma.plantao.findMany({
    where,
    include: { colaborador: { include: { equipe: true } } },
    orderBy: [{ data: "asc" }, { colaborador: { nome: "asc" } }],
  });

  return NextResponse.json(registros.map(r => ({
    id: r.id,
    data: r.data.toISOString().slice(0, 10),
    tipo: r.tipo,
    colaborador: { id: r.colaborador.id, nome: r.colaborador.nome, equipe: r.colaborador.equipe.nome },
  })));
}

export async function POST(request: NextRequest) {
  const { colaboradorId, data, tipo } = await request.json();

  const registro = await prisma.plantao.upsert({
    where: { colaboradorId_data: { colaboradorId: Number(colaboradorId), data: new Date(data) } },
    create: { colaboradorId: Number(colaboradorId), data: new Date(data), tipo },
    update: { tipo },
  });

  return NextResponse.json({
    id: registro.id,
    data: registro.data.toISOString().slice(0, 10),
    tipo: registro.tipo,
  }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.plantao.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
