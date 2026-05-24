import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getRanking() {
  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true },
    include: { equipe: { select: { nome: true } }, plantoes: true },
    orderBy: { nome: "asc" },
  });

  const ranking = colaboradores.map((c) => {
    const sabados = c.plantoes.filter((p) => p.tipo === "SABADO").length;
    const domFer = c.plantoes.filter((p) => p.tipo === "DOMINGO" || p.tipo === "FERIADO").length;
    const score = sabados + domFer * 2;
    return { id: c.id, nome: c.nome, equipe: c.equipe.nome, sabados, domFer, total: sabados + domFer, score };
  });

  ranking.sort((a, b) => a.score - b.score || a.total - b.total || a.nome.localeCompare(b.nome));
  return ranking;
}

export async function GET(request: NextRequest) {
  const view = new URL(request.url).searchParams.get("view");

  if (view === "historico") {
    const plantoes = await prisma.plantao.findMany({
      include: { colaborador: { select: { nome: true, equipe: { select: { nome: true } } } } },
      orderBy: { data: "desc" },
    });
    return NextResponse.json(plantoes);
  }

  return NextResponse.json(await getRanking());
}

export async function POST(request: NextRequest) {
  const { colaboradorId, data, tipo, folga1, folga2, descricao } = await request.json();
  await prisma.plantao.create({
    data: {
      colaboradorId: Number(colaboradorId),
      data: new Date(data),
      tipo,
      folga1: folga1 ? new Date(folga1) : null,
      folga2: folga2 ? new Date(folga2) : null,
      descricao: descricao || null,
    },
  });
  return NextResponse.json(await getRanking());
}
