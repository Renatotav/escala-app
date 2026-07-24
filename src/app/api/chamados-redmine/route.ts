import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

// Filtra metadados do Power BI: números com espaço não são chamados válidos
const VALIDO = { NOT: { numero: { contains: " " } } };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const busca = searchParams.get("busca")?.trim() || null;
  const filtro = searchParams.get("filtro") || null; // "atraso" | "atencao"
  const exportAll = searchParams.get("export") === "1";

  const d50 = new Date(Date.now() - 50 * 86400000);
  const d30 = new Date(Date.now() - 30 * 86400000);

  // Stats sempre com base nos válidos (sem filtro de data ou busca)
  const [totalValidos, totalAtraso, totalAtencao, range] = await Promise.all([
    prisma.chamadoRedmine.count({ where: VALIDO }),
    prisma.chamadoRedmine.count({ where: { ...VALIDO, dataAbertura: { lt: d50 } } }),
    prisma.chamadoRedmine.count({ where: { ...VALIDO, dataAbertura: { gte: d50, lt: d30 } } }),
    prisma.chamadoRedmine.aggregate({ where: VALIDO, _min: { dataAbertura: true }, _max: { dataAbertura: true } }),
  ]);

  // Monta where para listagem
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
  };

  if (exportAll) {
    const chamados = await prisma.chamadoRedmine.findMany({ where, orderBy: { dataAbertura: "asc" } });
    return NextResponse.json({ chamados, ...stats });
  }

  const [total, chamados] = await Promise.all([
    prisma.chamadoRedmine.count({ where }),
    prisma.chamadoRedmine.findMany({
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

export async function POST(request: NextRequest) {
  const rows: {
    numero: string;
    dataAbertura: string | null;
    equipeAtribuida: string | null;
    dataMovimentacao: string | null;
    situacaoRegra: string | null;
  }[] = await request.json();

  await prisma.chamadoRedmine.createMany({
    data: rows.map(r => ({
      numero: r.numero,
      dataAbertura: r.dataAbertura ? new Date(r.dataAbertura) : null,
      equipeAtribuida: r.equipeAtribuida || null,
      dataMovimentacao: r.dataMovimentacao ? new Date(r.dataMovimentacao) : null,
      situacaoRegra: r.situacaoRegra || null,
    })),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await prisma.chamadoRedmine.deleteMany({});
  return NextResponse.json({ ok: true });
}
