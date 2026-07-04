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

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const apenasUrgentes = searchParams.get("urgentes") === "1";
  const all = searchParams.get("all") === "1";

  const colaborador = await prisma.colaborador.findUnique({
    where: { tokenAtendimento: token },
    select: { id: true, nome: true, ativo: true },
  });

  if (!colaborador || !colaborador.ativo) {
    return NextResponse.json({ error: "Link inválido ou revogado" }, { status: 404 });
  }

  const norm = normName(colaborador.nome);
  const distintos = await prisma.chamado.findMany({
    select: { nomeUsuarioAtribuido: true },
    distinct: ["nomeUsuarioAtribuido"],
  });
  const matching = distintos
    .map((d) => d.nomeUsuarioAtribuido)
    .filter((n): n is string => !!n && normName(n) === norm);

  const baseWhere = { nomeUsuarioAtribuido: { in: matching } };
  const where = apenasUrgentes ? { ...baseWhere, ultimaAcao: "Solicitação de Urgência" } : baseWhere;

  const [total, chamados, totalUrgentes] = await Promise.all([
    prisma.chamado.count({ where }),
    prisma.chamado.findMany({
      where,
      orderBy: { dataRegistro: "asc" },
      ...(all ? {} : { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      select: {
        id: true,
        referencia: true,
        dataRegistro: true,
        nomeDpsAtribuido: true,
        nomeSecao: true,
        ultimaAcao: true,
      },
    }),
    prisma.chamado.count({ where: { ...baseWhere, ultimaAcao: "Solicitação de Urgência" } }),
  ]);

  if (page === 1 && !apenasUrgentes && !all) {
    await prisma.colaborador.update({
      where: { id: colaborador.id },
      data: { ultimoAcessoAtendimento: new Date(), acessosAtendimento: { increment: 1 } },
    });
  }

  return NextResponse.json({
    nome: colaborador.nome,
    total,
    totalUrgentes,
    chamados,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}