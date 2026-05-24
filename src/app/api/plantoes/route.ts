import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true },
    include: {
      equipe: { select: { nome: true } },
      plantoes: true,
    },
    orderBy: { nome: "asc" },
  });

  const ranking = colaboradores.map((c) => {
    const sabados = c.plantoes.filter((p) => p.tipo === "SABADO").length;
    const domFer = c.plantoes.filter((p) => p.tipo === "DOMINGO" || p.tipo === "FERIADO").length;
    const score = sabados * 1 + domFer * 2;
    return {
      id: c.id,
      nome: c.nome,
      equipe: c.equipe.nome,
      sabados,
      domFer,
      total: sabados + domFer,
      score,
    };
  });

  ranking.sort((a, b) => a.score - b.score || a.total - b.total || a.nome.localeCompare(b.nome));

  return NextResponse.json(ranking);
}

export async function POST(request: NextRequest) {
  const { colaboradorId, data, tipo, descricao } = await request.json();
  await prisma.plantao.create({
    data: {
      colaboradorId: Number(colaboradorId),
      data: new Date(data),
      tipo,
      descricao: descricao || null,
    },
  });
  return GET();
}
