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
  return NextResponse.json(colaborador);
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
