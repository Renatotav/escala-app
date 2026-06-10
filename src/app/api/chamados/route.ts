import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeCategoria(
  nomeDps: string | null,
  nomeSecao: string | null,
  nomeItem: string | null,
): string {
  const dps = (nomeDps ?? "").toLowerCase();
  if (dps.includes("cadastro")) return "Cadastro";
  if (dps.includes("erro") || dps.includes("falha")) {
    const sec = (nomeSecao ?? "").toLowerCase();
    const item = (nomeItem ?? "").toLowerCase();
    if (sec.includes("1g") || item.includes("1g")) return "Erro/Falha 1G";
    if (sec.includes("2g") || item.includes("2g")) return "Erro/Falha 2G";
    return "Erro/Falha";
  }
  if (dps.includes("migra")) return "Migração";
  if (dps.includes("orienta")) return "Orientação";
  return "Outros";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const where =
    dataInicio || dataFim
      ? {
          dataRegistro: {
            ...(dataInicio && { gte: new Date(dataInicio + "T00:00:00.000Z") }),
            ...(dataFim && { lte: new Date(dataFim + "T23:59:59.999Z") }),
          },
        }
      : {};

  const [total, rows, range] = await Promise.all([
    prisma.chamado.count({ where }),
    prisma.chamado.groupBy({
      by: ["nomeDpsAtribuido", "nomeSecao", "nomeItem", "nomeUsuarioAtribuido"],
      where,
      _count: { id: true },
    }),
    prisma.chamado.aggregate({
      where,
      _min: { dataRegistro: true },
      _max: { dataRegistro: true },
    }),
  ]);

  // colab → category → count
  const map: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const colab = row.nomeUsuarioAtribuido ?? "(sem atendente)";
    const cat = normalizeCategoria(row.nomeDpsAtribuido, row.nomeSecao, row.nomeItem);
    if (!map[colab]) map[colab] = {};
    map[colab][cat] = (map[colab][cat] ?? 0) + row._count.id;
  }

  const porColaborador = Object.entries(map)
    .map(([nome, cats]) => ({
      nome,
      total: Object.values(cats).reduce((a, b) => a + b, 0),
      cadastro: cats["Cadastro"] ?? 0,
      erroFalha1G: cats["Erro/Falha 1G"] ?? 0,
      erroFalha2G: cats["Erro/Falha 2G"] ?? 0,
      migracao: cats["Migração"] ?? 0,
      orientacao: cats["Orientação"] ?? 0,
      outros: (cats["Erro/Falha"] ?? 0) + (cats["Outros"] ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    total,
    porColaborador,
    dataMin: range._min.dataRegistro?.toISOString() ?? null,
    dataMax: range._max.dataRegistro?.toISOString() ?? null,
  });
}

export async function DELETE() {
  await prisma.chamado.deleteMany();
  return NextResponse.json({ ok: true });
}
