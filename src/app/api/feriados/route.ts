import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const feriados = await prisma.feriadoCustomizado.findMany({ orderBy: { data: "asc" } });
  return NextResponse.json(feriados);
}

export async function POST(request: NextRequest) {
  const { data, descricao } = await request.json();
  const feriado = await prisma.feriadoCustomizado.upsert({
    where: { data: new Date(data) },
    create: { data: new Date(data), descricao },
    update: { descricao },
  });
  return NextResponse.json(feriado, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.feriadoCustomizado.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
