import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getRanking() {
  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true },
    include: { equipe: { select: { nome: true } }, plantoes: true },
    orderBy: { nome: "asc" },
  });

  const ranking = colaboradores.map((c) => {
    const sabados = c.plantoes.filter((p) => p.tipo === "SABADO" || p.tipo === "PONTO_FACULTATIVO").length;
    const domFer = c.plantoes.filter((p) => p.tipo === "DOMINGO" || p.tipo === "FERIADO").length;
    const score = sabados + domFer * 2;

    const ultimoPlantao = [...c.plantoes].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )[0];
    const ultimoTipo = ultimoPlantao?.tipo ?? null;
    const proximoDeve: "DUPLO" | "SIMPLES" | null =
      ultimoTipo === "SABADO" || ultimoTipo === "PONTO_FACULTATIVO" ? "DUPLO" :
      ultimoTipo === "DOMINGO" || ultimoTipo === "FERIADO" ? "SIMPLES" : null;

    return { id: c.id, nome: c.nome, equipe: c.equipe.nome, sabados, domFer, total: sabados + domFer, score, proximoDeve };
  });

  ranking.sort((a, b) => a.score - b.score || a.total - b.total || a.nome.localeCompare(b.nome));
  return ranking;
}

export async function GET(request: NextRequest) {
  const view = new URL(request.url).searchParams.get("view");

  if (view === "historico") {
    const colaboradorId = new URL(request.url).searchParams.get("colaboradorId");
    const plantoes = await prisma.plantao.findMany({
      where: { ...(colaboradorId && { colaboradorId: Number(colaboradorId) }) },
      include: { colaborador: { select: { nome: true, equipe: { select: { nome: true } } } } },
      orderBy: { data: "desc" },
    });
    return NextResponse.json(plantoes);
  }

  if (view === "folgas-agendadas") {
    const mes = new URL(request.url).searchParams.get("mes");
    const colaboradorId = new URL(request.url).searchParams.get("colaboradorId");

    const plantoes = await prisma.plantao.findMany({
      where: {
        ...(colaboradorId && { colaboradorId: Number(colaboradorId) }),
        OR: [{ folga1: { not: null } }, { folga2: { not: null } }],
      },
      include: { colaborador: { select: { nome: true, equipe: { select: { nome: true } } } } },
      orderBy: { folga1: "asc" },
    });

    const entries: { id: string; data: string; dataPlantao: string; colaborador: { nome: string; equipe: { nome: string } }; tipoPlantao: string }[] = [];
    for (const p of plantoes) {
      const dataPlantao = p.data.toISOString().slice(0, 10);
      if (p.folga1) entries.push({ id: `${p.id}-1`, data: p.folga1.toISOString().slice(0, 10), dataPlantao, colaborador: p.colaborador, tipoPlantao: p.tipo });
      if (p.folga2) entries.push({ id: `${p.id}-2`, data: p.folga2.toISOString().slice(0, 10), dataPlantao, colaborador: p.colaborador, tipoPlantao: p.tipo });
    }

    const filtered = mes
      ? entries.filter(e => e.data.slice(0, 7) === mes)
      : entries;

    filtered.sort((a, b) => a.data.localeCompare(b.data));
    return NextResponse.json(filtered);
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
      const creditos = ps.reduce((acc: number, p: any) => acc + (p.tipo === "SABADO" || p.tipo === "PONTO_FACULTATIVO" ? 1 : 2), 0);
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
