import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;
const VALIDO = { NOT: { numero: { contains: " " } } };

const SLA_RULES = [
  { keyword: "Cadastro",      days: 2  },
  { keyword: "Migração",      days: 15 },
  { keyword: "Orientação",    days: 5  },
  { keyword: "Erro ou Falha", days: 5  },
];

function slaWhere() {
  return SLA_RULES.map(({ keyword, days }) => ({
    equipeAtribuida: { contains: keyword, mode: "insensitive" as const },
    dataAbertura:    { lt: new Date(Date.now() - days * 86400000) },
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page      = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const busca     = searchParams.get("busca")?.trim() || null;
  const filtro    = searchParams.get("filtro") || null;
  const categoria = searchParams.get("categoria")?.trim() || null;
  const exportAll = searchParams.get("export") === "1";

  const [totalValidos, totalAtraso, range, porCategoria] = await Promise.all([
    prisma.chamadoPowerbi.count({ where: VALIDO }),
    prisma.chamadoPowerbi.count({ where: { AND: [VALIDO, { OR: slaWhere() }] } }),
    prisma.chamadoPowerbi.aggregate({ where: VALIDO, _min: { dataAbertura: true }, _max: { dataAbertura: true } }),
    prisma.chamadoPowerbi.groupBy({
      by: ["equipeAtribuida"],
      where: VALIDO,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const conditions: Record<string, unknown>[] = [VALIDO];
  if (filtro === "atraso") conditions.push({ OR: slaWhere() });
  if (categoria) conditions.push({ equipeAtribuida: { contains: categoria, mode: "insensitive" } });
  if (busca) conditions.push({ numero: { contains: busca, mode: "insensitive" } });
  const where = conditions.length === 1 ? conditions[0] : { AND: conditions };

  const stats = {
    totalValidos,
    totalAtraso,
    periodoMin: range._min.dataAbertura?.toISOString() ?? null,
    periodoMax: range._max.dataAbertura?.toISOString() ?? null,
    porCategoria: porCategoria.map(g => ({
      categoria: g.equipeAtribuida ?? "—",
      total: g._count.id,
    })),
  };

  if (exportAll) {
    const chamados = await prisma.chamadoPowerbi.findMany({ where, orderBy: { dataAbertura: "asc" } });
    return NextResponse.json({ chamados, ...stats });
  }

  const [total, chamados] = await Promise.all([
    prisma.chamadoPowerbi.count({ where }),
    prisma.chamadoPowerbi.findMany({
      where,
      orderBy: { dataAbertura: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    chamados,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    ...stats,
  });
}

export async function DELETE() {
  await prisma.chamadoPowerbi.deleteMany({});
  return NextResponse.json({ ok: true });
}
