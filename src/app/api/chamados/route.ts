import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const [total, rows, range, colaboradores] = await Promise.all([
    prisma.chamado.count({ where }),
    prisma.chamado.groupBy({
      by: ["nomeUsuarioAtribuido"],
      where,
      _count: { id: true },
    }),
    prisma.chamado.aggregate({
      where,
      _min: { dataRegistro: true },
      _max: { dataRegistro: true },
    }),
    prisma.colaborador.findMany({
      select: { nome: true, equipe: { select: { nome: true } } },
    }),
  ]);

  // nome colaborador (lowercase) → categoria normalizada
  const equipeMap: Record<string, string> = {};
  for (const c of colaboradores) {
    if (c.equipe) {
      equipeMap[c.nome.toLowerCase().trim()] = normalizeEquipe(c.equipe.nome);
    }
  }

  const porColaborador = rows
    .map((row) => {
      const nome = row.nomeUsuarioAtribuido ?? "(sem atendente)";
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
      outros:
        !["Cadastro", "Erro/Falha 1G", "Erro/Falha 2G", "Migração", "Supervisão"].includes(
          c.categoria,
        )
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

export async function DELETE() {
  await prisma.chamado.deleteMany();
  return NextResponse.json({ ok: true });
}
