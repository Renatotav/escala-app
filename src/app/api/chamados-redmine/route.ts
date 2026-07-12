import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const chamados = await prisma.chamadoRedmine.findMany({
    orderBy: { dataAbertura: "asc" },
  });
  return NextResponse.json(chamados);
}

export async function POST(request: NextRequest) {
  const rows: {
    numero: string;
    dataAbertura: string | null;
    equipeAtribuida: string | null;
    dataMovimentacao: string | null;
    situacaoRegra: string | null;
  }[] = await request.json();

  await prisma.chamadoRedmine.createMany({
    data: rows.map(r => ({
      numero: r.numero,
      dataAbertura: r.dataAbertura ? new Date(r.dataAbertura) : null,
      equipeAtribuida: r.equipeAtribuida || null,
      dataMovimentacao: r.dataMovimentacao ? new Date(r.dataMovimentacao) : null,
      situacaoRegra: r.situacaoRegra || null,
    })),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await prisma.chamadoRedmine.deleteMany({});
  return NextResponse.json({ ok: true });
}
