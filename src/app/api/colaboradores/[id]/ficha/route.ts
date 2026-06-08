import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const colaborador = await prisma.colaborador.findUnique({
    where: { id: Number(id) },
    include: {
      equipe: true,
      plantoes: { orderBy: { data: "desc" } },
      atestados: { orderBy: { dataInicio: "desc" } },
      feedbacks: { orderBy: { data: "desc" } },
      ocorrencias: { orderBy: { data: "desc" } },
    },
  });
  if (!colaborador) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...colaborador,
    dataNascimento: colaborador.dataNascimento?.toISOString().slice(0, 10) ?? null,
    plantoes: colaborador.plantoes.map(p => ({
      ...p,
      data: p.data.toISOString().slice(0, 10),
      folga1: p.folga1?.toISOString().slice(0, 10) ?? null,
      folga2: p.folga2?.toISOString().slice(0, 10) ?? null,
    })),
    atestados: colaborador.atestados.map(a => ({
      ...a,
      dataInicio: a.dataInicio.toISOString().slice(0, 10),
      dataFim: a.dataFim.toISOString().slice(0, 10),
      dias: Math.round((a.dataFim.getTime() - a.dataInicio.getTime()) / 86400000) + 1,
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const colaborador = await prisma.colaborador.update({
    where: { id: Number(id) },
    data: {
      dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : null,
      cpf: body.cpf || null,
      email: body.email || null,
      telefone: body.telefone || null,
      telefoneEmerg: body.telefoneEmerg || null,
      nomeEmerg: body.nomeEmerg || null,
      endereco: body.endereco || null,
    },
    include: { equipe: true },
  });
  return NextResponse.json(colaborador);
}
