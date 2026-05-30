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

  if (view === "saldo") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colabs: any[] = await (prisma as any).colaborador.findMany({
      where: { ativo: true },
      include: { plantoes: true, equipe: { select: { nome: true } } },
      orderBy: { nome: "asc" },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saldo = colabs.map((c: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ps: any[] = c.plantoes ?? [];
      const creditos = ps.reduce((acc: number, p: any) => acc + (p.tipo === "SABADO" ? 1 : 2), 0);
      const agendadas = ps.reduce((acc: number, p: any) => acc + (p.folga1 ? 1 : 0) + (p.folga2 ? 1 : 0), 0);
      return {
        id: c.id,
        nome: c.nome,
        equipe: c.equipe.nome,
        totalPlantoes: ps.length,
        creditos,
        agendadas,
        pendentes: creditos - agendadas,
      };
    });

    return NextResponse.json(saldo);
  }

  return NextResponse.json(await getRanking());
}

export async function POST(request: NextRequest) {
  const { colaboradorId, data, tipo, folga1, folga2, descricao } = await request.json();
  const colabId = Number(colaboradorId);
  const dataDate = new Date(data);
  await prisma.plantao.upsert({
    where: { colaboradorId_data: { colaboradorId: colabId, data: dataDate } },
    create: {
      colaboradorId: colabId,
      data: dataDate,
      tipo,
      folga1: folga1 ? new Date(folga1) : null,
      folga2: folga2 ? new Date(folga2) : null,
      descricao: descricao || null,
    },
    update: {
      tipo,
      folga1: folga1 ? new Date(folga1) : null,
      folga2: folga2 ? new Date(folga2) : null,
      descricao: descricao || null,
    },
  });
  return NextResponse.json(await getRanking());
}
