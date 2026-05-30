import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSinal } from "@/lib/eligibility";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const semana = searchParams.get("semana");
  const equipeId = searchParams.get("equipeId");

  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true, ...(equipeId && { equipeId: Number(equipeId) }) },
    include: {
      equipe: true,
      escalas: { orderBy: { semana: "desc" }, take: 10 },
    },
    orderBy: { nome: "asc" },
  });

  const result = colaboradores.map((c) => {
    // conta semanas presenciais consecutivas desde o último REMOTO
    let semanasPresencial = 0;
    for (const e of c.escalas) {
      if (e.tipo === "REMOTO") break;
      semanasPresencial++;
    }

    // se a escala mais recente é REMOTO, já está elegível para remoto
    const ultimaFoiRemoto = c.escalas[0]?.tipo === "REMOTO";
    const sinal = ultimaFoiRemoto
      ? ("VERDE" as const)
      : calcularSinal(semanasPresencial, c.equipe.thresholdAmarelo, c.equipe.thresholdVerde);
    const escalaSemana = semana
      ? c.escalas.find((e) => new Date(e.semana).toISOString().slice(0, 10) === semana)?.tipo ?? null
      : null;

    return {
      id: c.id,
      nome: c.nome,
      cargo: c.cargo,
      equipe: c.equipe,
      semanasPresencial,
      sinal,
      escalaSemana,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { colaboradorId, semana, tipo } = await request.json();

  const registro = await prisma.escalaSemana.upsert({
    where: { colaboradorId_semana: { colaboradorId, semana: new Date(semana) } },
    create: { colaboradorId, semana: new Date(semana), tipo },
    update: { tipo },
  });

  return NextResponse.json(registro);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const colaboradorId = Number(searchParams.get("colaboradorId"));
  const semana = searchParams.get("semana");
  if (!colaboradorId || !semana) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.escalaSemana.deleteMany({
    where: { colaboradorId, semana: new Date(semana) },
  });

  return NextResponse.json({ ok: true });
}
