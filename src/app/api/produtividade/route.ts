import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const busca = searchParams.get("busca")?.trim() || null;
  const exportAll = searchParams.get("export") === "1";

  const totalRegistros = await prisma.produtividade.count();

  const where = busca
    ? {
        OR: [
          { numeroChamado: { contains: busca, mode: "insensitive" as const } },
          { usuarioFechamento: { contains: busca, mode: "insensitive" as const } },
          { situacaoRegra: { contains: busca, mode: "insensitive" as const } },
          { descricaoResolucao: { contains: busca, mode: "insensitive" as const } },
        ],
      }
    : {};

  if (exportAll) {
    const registros = await prisma.produtividade.findMany({ where, orderBy: { id: "asc" } });
    return NextResponse.json({ registros, total: registros.length, page: 1, totalPages: 1, totalRegistros });
  }

  const [total, registros] = await Promise.all([
    prisma.produtividade.count({ where }),
    prisma.produtividade.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return NextResponse.json({ registros, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), totalRegistros });
}

export async function DELETE() {
  await prisma.produtividade.deleteMany();
  return NextResponse.json({ ok: true });
}
