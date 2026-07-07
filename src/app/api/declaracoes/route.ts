import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const colaboradorId = searchParams.get("colaboradorId");

  const where: Record<string, unknown> = {};
  if (colaboradorId) where.colaboradorId = Number(colaboradorId);

  const declaracoes = await prisma.declaracaoMedica.findMany({
    where,
    include: { colaborador: { select: { nome: true, equipe: { select: { nome: true } } } } },
    orderBy: { data: "desc" },
  });

  return NextResponse.json(
    declaracoes.map(d => ({
      ...d,
      data: d.data.toISOString().slice(0, 10),
    }))
  );
}

export async function POST(request: NextRequest) {
  const { colaboradorId, data, horaEntrada, horaSaida, especialidade, observacao } = await request.json();

  const declaracao = await prisma.declaracaoMedica.create({
    data: {
      colaboradorId: Number(colaboradorId),
      data: new Date(data),
      horaEntrada: horaEntrada || null,
      horaSaida: horaSaida || null,
      especialidade: especialidade || null,
      observacao: observacao || null,
    },
    include: { colaborador: { select: { nome: true, equipe: { select: { nome: true } } } } },
  });

  return NextResponse.json({ ...declaracao, data: declaracao.data.toISOString().slice(0, 10) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id, data, horaEntrada, horaSaida, especialidade, observacao } = await request.json();
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.declaracaoMedica.update({
    where: { id: Number(id) },
    data: {
      data: new Date(data),
      horaEntrada: horaEntrada || null,
      horaSaida: horaSaida || null,
      especialidade: especialidade || null,
      observacao: observacao || null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.declaracaoMedica.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
