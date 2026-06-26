import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

function normalizeEquipe(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("1g")) return "Erro/Falha 1G";
  if (n.includes("2g")) return "Erro/Falha 2G";
  if (n.includes("cadastro")) return "Cadastro";
  if (n.includes("migra")) return "Migração";
  if (n.includes("supervis")) return "Supervisão";
  if (n.includes("coordena")) return "Coordenação";
  if (n.includes("triagem")) return "Triagem";
  if (n.includes("balc")) return "Balcão Virtual";
  return nome;
}

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

  const equipeMap: Record<string, string> = {};
  for (const c of colaboradores) {
    if (c.equipe) {
      equipeMap[c.nome.toLowerCase().trim()] = normalizeEquipe(c.equipe.nome);
    }
  }

  const porColaborador = rows
    .map((row) => {
      const nome = row.nomeUsuarioAtribuido ?? "(Triagem)";
      const cat = equipeMap[nome.toLowerCase().trim()] ?? "Sem equipe";
      return { nome, total: row._count.id, categoria: cat };
    })
    .sort((a, b) => b.total - a.total)
    .map((c) => ({
      nome: c.nome,
      total: c.total,
      categoria: c.categoria,
      cadastro: c.categoria === "Cadastro" ? c.total : 0,
      erroFalha1G: c.categoria === "Erro/Falha 1G" ? c.total : 0,
      erroFalha2G: c.categoria === "Erro/Falha 2G" ? c.total : 0,
      migracao: c.categoria === "Migração" ? c.total : 0,
      supervisao: c.categoria === "Supervisão" ? c.total : 0,
      outros: !["Cadastro", "Erro/Falha 1G", "Erro/Falha 2G", "Migração", "Supervisão"].includes(c.categoria)
        ? c.total
        : 0,
    }));

  return NextResponse.json({
    total,
    porColaborador,
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
