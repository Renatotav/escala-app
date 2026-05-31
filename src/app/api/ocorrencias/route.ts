import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { colaboradorId, data, tipo, descricao, assinatura } = await request.json();
  const ocorrencia = await prisma.ocorrencia.create({
    data: { colaboradorId: Number(colaboradorId), data: new Date(data), tipo: tipo || null, descricao, assinatura: assinatura || null },
  });
  return NextResponse.json(ocorrencia, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.ocorrencia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
