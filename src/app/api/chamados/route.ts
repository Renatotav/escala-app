import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[àáâãä]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findEquipe(
  csvName: string,
  entries: { key: string; equipe: string }[],
  equipeNomes: string[] = []
): string {
  const norm = normName(csvName);

  // 0. nome do usuário bate diretamente com o nome de uma equipe (ex: "(Triagem)" → "Triagem")
  const directEquipe = equipeNomes.find((e) => normName(e) === norm);
  if (directEquipe) return directEquipe;

  // 1. exact match
  const exact = entries.find((e) => e.key === norm);
  if (exact) return exact.equipe;

  // 2. one name contains the other
  const contains = entries.find((e) => norm.includes(e.key) || e.key.includes(norm));
  if (contains) return contains.equipe;

  // 3. word overlap — at least 2 significant words in common
  const words = norm.split(" ").filter((w) => w.length > 2);
  const best = entries
    .map((e) => {
      const ew = e.key.split(" ").filter((w) => w.length > 2);
      const common = words.filter((w) => ew.includes(w)).length;
      return { equipe: e.equipe, common };
    })
    .filter((x) => x.common >= 2)
    .sort((a, b) => b.common - a.common)[0];

  return best?.equipe ?? "Sem equipe";
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

  // pré-computa chaves normalizadas
  const equipeEntries = colaboradores
    .filter((c) => c.equipe)
    .map((c) => ({ key: normName(c.nome), equipe: c.equipe!.nome }));
  const equipeNomesStats = Array.from(new Set(equipeEntries.map((e) => e.equipe)));

  // agrupa por equipe → usuários
  const byEquipe = new Map<string, { nome: string; total: number }[]>();
  for (const row of rows) {
    const nome = row.nomeUsuarioAtribuido ?? "(Triagem)";
    const equipe = findEquipe(nome, equipeEntries, equipeNomesStats);
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
  const equipeParam = searchParams.get("equipe") || null;

  // Resolve colaboradores first so we can use equipeEntries in the filter
  const colaboradores = await prisma.colaborador.findMany({
    select: { nome: true, equipe: { select: { nome: true } } },
  });
  const equipeEntries = colaboradores
    .filter((c) => c.equipe)
    .map((c) => ({ key: normName(c.nome), equipe: c.equipe!.nome }));
  const equipeNomes = Array.from(new Set(equipeEntries.map((e) => e.equipe)));

  const where: Record<string, unknown> = {};
  if (apenasUrgentes) {
    where.ultimaAcao = "Solicitação de Urgência";
  } else if (ultimaAcao) {
    where.ultimaAcao = ultimaAcao;
  }

  if (usuario) {
    where.nomeUsuarioAtribuido = usuario;
  } else if (equipeParam) {
    const allUsers = await prisma.chamado.findMany({
      select: { nomeUsuarioAtribuido: true },
      distinct: ["nomeUsuarioAtribuido"],
    });
    const matching = allUsers
      .filter((u) => u.nomeUsuarioAtribuido && findEquipe(u.nomeUsuarioAtribuido, equipeEntries, equipeNomes) === equipeParam)
      .map((u) => u.nomeUsuarioAtribuido as string);
    where.nomeUsuarioAtribuido = matching.length > 0 ? { in: matching } : "__NO_MATCH__";
  }

  const [total, chamados, range, usuariosRaw, acoesRaw] = await Promise.all([
    prisma.chamado.count({ where }),
    prisma.chamado.findMany({
      where,
      orderBy: { dataRegistro: "asc" },
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

  const chamadosComEquipe = chamados.map((c) => ({
    ...c,
    equipe: c.nomeUsuarioAtribuido ? findEquipe(c.nomeUsuarioAtribuido, equipeEntries, equipeNomes) : null,
  }));

  // Build equipes list and usuario→equipe map from all users (no filter applied to usuariosRaw)
  const equipesSet = new Set<string>();
  const usuarioEquipeMap: Record<string, string> = {};
  for (const u of usuariosRaw) {
    if (u.nomeUsuarioAtribuido) {
      const eq = findEquipe(u.nomeUsuarioAtribuido, equipeEntries, equipeNomes);
      if (eq !== "Sem equipe") {
        equipesSet.add(eq);
        usuarioEquipeMap[u.nomeUsuarioAtribuido] = eq;
      }
    }
  }
  const equipes = Array.from(equipesSet).sort();

  const totalUrgentes = await prisma.chamado.count({ where: { ultimaAcao: "Solicitação de Urgência" } });

  return NextResponse.json({
    total,
    chamados: chamadosComEquipe,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    dataMin: range._min.dataRegistro?.toISOString() ?? null,
    dataMax: range._max.dataRegistro?.toISOString() ?? null,
    usuarios: usuariosRaw
      .map((u) => u.nomeUsuarioAtribuido)
      .filter((n): n is string => !!n)
      .filter((n) => !equipeParam || findEquipe(n, equipeEntries, equipeNomes) === equipeParam),
    ultimaAcoes: acoesRaw.map((a) => a.ultimaAcao).filter(Boolean) as string[],
    equipes,
    usuarioEquipeMap,
    totalUrgentes,
  });
}

export async function DELETE() {
  await prisma.chamado.deleteMany();
  return NextResponse.json({ ok: true });
}
