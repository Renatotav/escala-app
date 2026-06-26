import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

async function handleStats() {
  const [total, rows, range, colaboradores] = await Promise.all([
    prisma.chamado.count(),
    prisma.chamado.groupBy({
      by: ["nomeUsuarioAtribuido"],
      _count: { id: true },
    }),
    prisma.chamado.aggregate({
      _min: { dataRegistro: true },
      _max: { dataRegistro: true },
    }),
    prisma.colaborador.findMany({
      select: { nome: true, equipe: { select: { nome: true } } },
    }),
  ]);

  // nome (lowercase) → equipe
  const equipeMap = new Map<string, string>();
  for (const c of colaboradores) {
    if (c.equipe) equipeMap.set(c.nome.toLowerCase().trim(), c.equipe.nome);
  }

  // agrupa por equipe → usuários
  const byEquipe = new Map<string, { nome: string; total: number }[]>();
  for (const row of rows) {
    const nome = row.nomeUsuarioAtribuido ?? "(Triagem)";
    const equipe = equipeMap.get(nome.toLowerCase().trim()) ?? "Sem equipe";
    if (!byEquipe.has(equipe)) byEquipe.set(equipe, []);
    byEquipe.get(equipe)!.push({ nome, total: row._count.id });
  }

  const porEquipe = Array.from(byEquipe.entries())
    .map(([equipe, usuarios]) => ({
      equipe,
      total: usuarios.reduce((s, u) => s + u.total, 0),
      usuarios: usuarios.sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    total,
    porEquipe,
    dataMin: range._min.dataRegistro?.toISOString() ?? null,
    dataMax: range._max.dataRegistro?.toISOString() ?? null,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("stats") === "1") {
    return handleStats();
  }

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const usuario = searchParams.get("usuario") || null;
  const ultimaAcao = searchParams.get("ultimaAcao") || null;
  const apenasUrgentes = searchParams.get("urgentes") === "1";

  const where: Record<string, unknown> = {};
  if (usuario) where.nomeUsuarioAtribuido = usuario;
  if (apenasUrgentes) {
    where.ultimaAcao = "Solicitação de Urgência";
  } else if (ultimaAcao) {
    where.ultimaAcao = ultimaAcao;
  }

  const [total, chamados, range, usuariosRaw, acoesRaw] = await Promise.all([
    prisma.chamado.count({ where }),
    prisma.chamado.findMany({
      where,
      orderBy: { dataRegistro: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        referencia: true,
        dataRegistro: true,
        nomeDpsAtribuido: true,
        nomeUsuarioAtribuido: true,
        ultimaAcao: true,
        alerta: true,
        nivelEscalacao: true,
      },
    }),
    prisma.chamado.aggregate({
      _min: { dataRegistro: true },
      _max: { dataRegistro: true },
    }),
    prisma.chamado.findMany({
      select: { nomeUsuarioAtribuido: true },
      distinct: ["nomeUsuarioAtribuido"],
      orderBy: { nomeUsuarioAtribuido: "asc" },
    }),
    prisma.chamado.findMany({
      select: { ultimaAcao: true },
      distinct: ["ultimaAcao"],
      orderBy: { ultimaAcao: "asc" },
    }),
  ]);

  const totalUrgentes = await prisma.chamado.count({ where: { ultimaAcao: "Solicitação de Urgência" } });

  return NextResponse.json({
    total,
    chamados,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    dataMin: range._min.dataRegistro?.toISOString() ?? null,
    dataMax: range._max.dataRegistro?.toISOString() ?? null,
    usuarios: usuariosRaw.map((u) => u.nomeUsuarioAtribuido).filter(Boolean) as string[],
    ultimaAcoes: acoesRaw.map((a) => a.ultimaAcao).filter(Boolean) as string[],
    totalUrgentes,
  });
}

export async function DELETE() {
  await prisma.chamado.deleteMany();
  return NextResponse.json({ ok: true });
}
