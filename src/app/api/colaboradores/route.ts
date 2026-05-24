import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const equipeId = searchParams.get("equipeId");
  const page = Number(searchParams.get("page") ?? 1);
  const limit = 20;

  const where = {
    ativo: true,
    ...(q && { nome: { contains: q, mode: "insensitive" as const } }),
    ...(equipeId && { equipeId: Number(equipeId) }),
  };

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

export async function POST(request: NextRequest) {
  const { nome, cargo, matricula, equipeId } = await request.json();
  const colaborador = await prisma.colaborador.create({
    data: { nome, cargo, matricula, equipeId },
    include: { equipe: true },
  });
  return NextResponse.json(colaborador, { status: 201 });
}
