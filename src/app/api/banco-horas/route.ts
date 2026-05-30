import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const equipeId = searchParams.get("equipeId");
  const colaboradorId = searchParams.get("colaboradorId");

  const colaboradores = await prisma.colaborador.findMany({
    where: {
      ativo: true,
      ...(equipeId && { equipeId: Number(equipeId) }),
    },
    include: {
      equipe: true,
      bancoHoras: {
        ...(colaboradorId ? { where: { colaboradorId: Number(colaboradorId) } } : {}),
        orderBy: { data: "desc" },
      },
    },
    orderBy: { nome: "asc" },
  });

  const result = colaboradores.map((c) => {
    const saldoMinutos = c.bancoHoras.reduce((acc, l) => acc + l.horas * 60, 0);
    const saldoH = Math.floor(Math.abs(saldoMinutos) / 60);
    const saldoM = Math.round(Math.abs(saldoMinutos) % 60);
    const sinal = saldoMinutos >= 0 ? "+" : "-";

    return {
      id: c.id,
      nome: c.nome,
      equipe: c.equipe,
      lancamentos: c.bancoHoras.length,
      saldo: `${sinal}${saldoH}h${String(saldoM).padStart(2, "0")}m`,
      saldoMinutos,
      historico: c.bancoHoras.map((l) => ({
        id: l.id,
        data: l.data.toISOString().slice(0, 10),
        horas: l.horas,
        descricao: l.descricao,
      })),
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { colaboradorId, data, horas, descricao } = await request.json();

  const lancamento = await prisma.lancamentoBancoHoras.create({
    data: {
      colaboradorId: Number(colaboradorId),
      data: new Date(data),
      horas: Number(horas),
      descricao: descricao || null,
    },
  });

  return NextResponse.json(lancamento, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.lancamentoBancoHoras.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
