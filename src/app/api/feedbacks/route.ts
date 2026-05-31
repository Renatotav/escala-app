import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { colaboradorId, data, descricao, assinatura } = await request.json();
  const feedback = await prisma.feedback.create({
    data: { colaboradorId: Number(colaboradorId), data: new Date(data), descricao, assinatura: assinatura || null },
  });
  return NextResponse.json(feedback, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.feedback.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
