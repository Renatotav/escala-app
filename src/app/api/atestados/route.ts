import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const colaboradorId = searchParams.get("colaboradorId");
  const ativos = searchParams.get("ativos"); // retorna só atestados ativos hoje

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const where: Record<string, unknown> = {};
  if (colaboradorId) where.colaboradorId = Number(colaboradorId);
  if (ativos === "true") where.dataFim = { gte: hoje };

  const atestados = await prisma.atestado.findMany({
    where,
    include: { colaborador: { select: { nome: true, equipe: { select: { nome: true } } } } },
    orderBy: { dataInicio: "desc" },
  });

  return NextResponse.json(
    atestados.map(a => ({
      ...a,
      dias: Math.round((a.dataFim.getTime() - a.dataInicio.getTime()) / 86400000) + 1,
      dataInicio: a.dataInicio.toISOString().slice(0, 10),
      dataFim: a.dataFim.toISOString().slice(0, 10),
    }))
  );
}

export async function POST(request: NextRequest) {
  const { colaboradorId, dataInicio, dataFim, descricao } = await request.json();
  const atestado = await prisma.atestado.create({
    data: {
      colaboradorId: Number(colaboradorId),
      dataInicio: new Date(dataInicio),
      dataFim: new Date(dataFim),
      descricao: descricao || null,
    },
    include: { colaborador: { select: { nome: true, equipe: { select: { nome: true } } } } },
  });
  return NextResponse.json({ ...atestado, dias: Math.round((atestado.dataFim.getTime() - atestado.dataInicio.getTime()) / 86400000) + 1 }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.atestado.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
