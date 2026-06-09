import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const equipeId = searchParams.get("equipeId");
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 20;

  const status = searchParams.get("status");
  const where = {
    ...(status === "todos" ? {} : status === "inativos" ? { ativo: false } : { ativo: true }),
    ...(q && { nome: { contains: q, mode: "insensitive" as const } }),
    ...(equipeId && { equipeId: Number(equipeId) }),
  };

  if (searchParams.get("all") === "true") {
    const colaboradores = await prisma.colaborador.findMany({
      where,
      include: { equipe: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json({ colaboradores, total: colaboradores.length, page: 1, pages: 1 });
  }

  const [total, colaboradores] = await Promise.all([
    prisma.colaborador.count({ where }),
    prisma.colaborador.findMany({
      where,
      include: { equipe: true },
      orderBy: { nome: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ colaboradores, total, page, pages: Math.ceil(total / limit) });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id } = body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (body.grupoListagem !== undefined) data.grupoListagem = body.grupoListagem;
  if (body.ajusteSemanasPresencial !== undefined) data.ajusteSemanasPresencial = Number(body.ajusteSemanasPresencial);
  if (body.semRemoto !== undefined) data.semRemoto = Boolean(body.semRemoto);
  const colab = await prisma.colaborador.update({
    where: { id: Number(id) },
    data,
    include: { equipe: true },
  });
  return NextResponse.json(colab);
}

export async function POST(request: NextRequest) {
  const { nome, cargo, matricula, equipeId } = await request.json();
  const colaborador = await prisma.colaborador.create({
    data: { nome, cargo: cargo || null, matricula: matricula || null, equipeId },
    include: { equipe: true },
  });
  return NextResponse.json(colaborador, { status: 201 });
}
