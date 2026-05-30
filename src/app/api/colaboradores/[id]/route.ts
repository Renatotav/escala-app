import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { nome, cargo, matricula, equipeId } = await request.json();
  const colaborador = await prisma.colaborador.update({
    where: { id: Number(id) },
    data: { nome, cargo: cargo || null, matricula: matricula || null, equipeId },
    include: { equipe: true },
  });
  return NextResponse.json(colaborador);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.colaborador.update({
    where: { id: Number(id) },
    data: { ativo: false },
  });
  return NextResponse.json({ ok: true });
}
