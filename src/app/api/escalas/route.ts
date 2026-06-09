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
    // considera apenas escalas até a semana visualizada (inclusive)
    const escalasAte = semana
      ? c.escalas.filter(e => new Date(e.semana).toISOString().slice(0, 10) <= semana)
      : c.escalas;

    // conta semanas presenciais consecutivas desde o último REMOTO
    let contadoRaw = 0;
    for (const e of escalasAte) {
      if (e.tipo === "REMOTO") break;
      contadoRaw++;
    }

    const ajuste = (c as unknown as { ajusteSemanasPresencial: number }).ajusteSemanasPresencial ?? 0;
    // Se já há um REMOTO no histórico visível, a contagem do banco é precisa — não aplica ajuste histórico
    const hasRemotoInHistory = escalasAte.some(e => e.tipo === "REMOTO");
    const semanasPresencial = hasRemotoInHistory ? contadoRaw : Math.max(0, contadoRaw + ajuste);

    // se a escala mais recente (até a semana visualizada) é REMOTO, está elegível
    const ultimaFoiRemoto = escalasAte[0]?.tipo === "REMOTO";
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
      ajusteSemanasPresencial: ajuste,
      contadoRaw,
      sinal,
      escalaSemana,
      semRemoto: (c as unknown as { semRemoto: boolean }).semRemoto ?? false,
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
