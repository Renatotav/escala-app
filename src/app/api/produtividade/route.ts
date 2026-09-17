import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const busca = searchParams.get("busca")?.trim() || null;
  const equipe = searchParams.get("equipe")?.trim() || null;
  const atendente = searchParams.get("atendente")?.trim() || null;
  const exportAll = searchParams.get("export") === "1";

  const totalRegistros = await prisma.produtividade.count();

  // Listas para os selects (sempre completas, independente dos filtros)
  const [todasEquipes, todosAtendentes] = await Promise.all([
    prisma.produtividade.findMany({ select: { equipeAtribuida: true }, distinct: ["equipeAtribuida"] }),
    prisma.produtividade.findMany({ select: { usuarioFechamento: true }, distinct: ["usuarioFechamento"] }),
  ]);

  const equipes = todasEquipes
    .map(r => r.equipeAtribuida)
    .filter((v): v is string => !!v)
    .sort();

  const atendentes = todosAtendentes
    .map(r => r.usuarioFechamento)
    .filter((v): v is string => !!v)
    .sort();

  const conditions: Record<string, unknown>[] = [];
  if (equipe) conditions.push({ equipeAtribuida: equipe });
  if (atendente) conditions.push({ usuarioFechamento: atendente });
  if (busca) {
    conditions.push({
      OR: [
        { numeroChamado: { contains: busca, mode: "insensitive" as const } },
        { usuarioFechamento: { contains: busca, mode: "insensitive" as const } },
        { equipeAtribuida: { contains: busca, mode: "insensitive" as const } },
        { situacaoRegra: { contains: busca, mode: "insensitive" as const } },
      ],
    });
  }
  const where = conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { AND: conditions };

  if (exportAll) {
    const registros = await prisma.produtividade.findMany({ where, orderBy: { id: "asc" } });
    return NextResponse.json({ registros, total: registros.length, page: 1, totalPages: 1, totalRegistros, equipes, atendentes });
  }

  const [total, registros] = await Promise.all([
    prisma.produtividade.count({ where }),
    prisma.produtividade.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return NextResponse.json({ registros, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), totalRegistros, equipes, atendentes });
}

export async function DELETE() {
  await prisma.produtividade.deleteMany();
  return NextResponse.json({ ok: true });
}
