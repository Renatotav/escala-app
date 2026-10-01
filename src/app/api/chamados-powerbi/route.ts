import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;
const VALIDO = { NOT: { numero: { contains: " " } } };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const busca = searchParams.get("busca")?.trim() || null;
  const filtro = searchParams.get("filtro") || null; // "atraso" | "atencao"
  const exportAll = searchParams.get("export") === "1";

  const d50 = new Date(Date.now() - 50 * 86400000);
  const d30 = new Date(Date.now() - 30 * 86400000);

  const [totalValidos, totalAtraso, totalAtencao, range, porCategoria] = await Promise.all([
    prisma.chamadoPowerbi.count({ where: VALIDO }),
    prisma.chamadoPowerbi.count({ where: { ...VALIDO, dataAbertura: { lt: d50 } } }),
    prisma.chamadoPowerbi.count({ where: { ...VALIDO, dataAbertura: { gte: d50, lt: d30 } } }),
    prisma.chamadoPowerbi.aggregate({ where: VALIDO, _min: { dataAbertura: true }, _max: { dataAbertura: true } }),
    prisma.chamadoPowerbi.groupBy({
      by: ["equipeAtribuida"],
      where: VALIDO,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const conditions: Record<string, unknown>[] = [VALIDO];
  if (filtro === "atraso") conditions.push({ dataAbertura: { lt: d50 } });
  else if (filtro === "atencao") conditions.push({ dataAbertura: { gte: d50, lt: d30 } });
  if (busca) conditions.push({ numero: { contains: busca, mode: "insensitive" } });
  const where = conditions.length === 1 ? conditions[0] : { AND: conditions };

  const stats = {
    totalValidos,
    totalAtraso,
    totalAtencao,
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
