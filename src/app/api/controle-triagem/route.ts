import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const colaboradorId = searchParams.get("colaboradorId");
  const ativos = searchParams.get("ativos") === "true";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const where: Record<string, unknown> = {};
  if (colaboradorId) where.colaboradorId = Number(colaboradorId);
  if (ativos) {
    where.dataInicio = { lte: hoje };
    where.horaFim = null;
    where.OR = [{ dataFim: null }, { dataFim: { gte: hoje } }];
  }

  const registros = await prisma.controleTriagem.findMany({
    where,
    include: { colaborador: { include: { equipe: true } } },
    orderBy: { dataInicio: "desc" },
  });

  return NextResponse.json(registros.map(r => ({
    ...r,
    dataInicio: r.dataInicio.toISOString().slice(0, 10),
    dataFim: r.dataFim ? r.dataFim.toISOString().slice(0, 10) : null,
  })));
}

export async function POST(request: NextRequest) {
  const { colaboradorId, motivo, dataInicio, horaInicio, dataFim, observacao, atestadoId } = await request.json();

  const registro = await prisma.controleTriagem.create({
    data: {
      colaboradorId: Number(colaboradorId),
      motivo,
      dataInicio: new Date(dataInicio),
      horaInicio: horaInicio || null,
      dataFim: dataFim ? new Date(dataFim) : null,
      observacao: observacao || null,
      atestadoId: atestadoId ? Number(atestadoId) : null,
    },
  });

  return NextResponse.json({
    ...registro,
    dataInicio: registro.dataInicio.toISOString().slice(0, 10),
    dataFim: registro.dataFim?.toISOString().slice(0, 10) ?? null,
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id, dataFim, horaFim, observacao, motivo, dataInicio, horaInicio } = await request.json();

  const registro = await prisma.controleTriagem.update({
    where: { id: Number(id) },
    data: {
      ...(dataFim !== undefined && { dataFim: dataFim ? new Date(dataFim) : null }),
      ...(horaFim !== undefined && { horaFim: horaFim || null }),
      ...(observacao !== undefined && { observacao }),
      ...(motivo !== undefined && { motivo }),
      ...(dataInicio !== undefined && { dataInicio: new Date(dataInicio) }),
      ...(horaInicio !== undefined && { horaInicio: horaInicio || null }),
    },
  });

  return NextResponse.json({
    ...registro,
    dataInicio: registro.dataInicio.toISOString().slice(0, 10),
    dataFim: registro.dataFim?.toISOString().slice(0, 10) ?? null,
  });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.controleTriagem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
