import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes"); // YYYY-MM
  const colaboradorId = searchParams.get("colaboradorId");

  const where: Record<string, unknown> = {};
  if (mes) {
    const [year, month] = mes.split("-").map(Number);
    const inicio = new Date(year, month - 1, 1);
    const fim = new Date(year, month, 0);
    where.data = { gte: inicio, lte: fim };
  }
  if (colaboradorId) where.colaboradorId = Number(colaboradorId);

  const folgas = await prisma.folga.findMany({
    where,
    include: { colaborador: { include: { equipe: true } } },
    orderBy: { data: "asc" },
  });

  return NextResponse.json(folgas);
}

export async function POST(request: NextRequest) {
  const { colaboradorId, data, tipo, descricao } = await request.json();

  const folga = await prisma.folga.upsert({
    where: { colaboradorId_data: { colaboradorId, data: new Date(data) } },
    create: { colaboradorId, data: new Date(data), tipo, descricao },
    update: { tipo, descricao },
  });

  return NextResponse.json(folga, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id, data, tipo, descricao } = await request.json();
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const folga = await prisma.folga.update({
    where: { id: Number(id) },
    data: { data: new Date(data), tipo, descricao: descricao || null },
  });

  return NextResponse.json(folga);
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.folga.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
