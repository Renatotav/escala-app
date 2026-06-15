import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularSinal } from "@/lib/eligibility";

function snapToMonday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const semanaRaw = searchParams.get("semana");
  const semana = semanaRaw ? snapToMonday(semanaRaw) : null;
  const equipeId = searchParams.get("equipeId");

  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true, ...(equipeId && { equipeId: Number(equipeId) }) },
    include: {
      equipe: true,
      escalas: { orderBy: { semana: "desc" } },
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
    const hasRemotoInHistory = escalasAte.some(e => e.tipo === "REMOTO");

    let semanasPresencial: number;
    if (hasRemotoInHistory || ajuste === 0) {
      semanasPresencial = hasRemotoInHistory ? contadoRaw : Math.max(0, contadoRaw + ajuste);
    } else {
      // ajuste representa semanas virtuais antes do primeiro registro no banco.
      // Âncora = semana imediatamente anterior ao primeiro registro real.
      const oldestEscala = c.escalas[c.escalas.length - 1];
      const oldestWeekStr = oldestEscala
        ? new Date(oldestEscala.semana).toISOString().slice(0, 10)
        : null;

      if (!semana || !oldestWeekStr || semana >= oldestWeekStr) {
        // Semana visualizada é igual ou posterior ao primeiro registro: ajuste completo
        semanasPresencial = Math.max(0, contadoRaw + ajuste);
      } else {
        // Semana visualizada é anterior ao primeiro registro:
        // cada semana a mais para trás consome uma unidade do ajuste.
        const anchorMs = new Date(oldestWeekStr + "T00:00:00Z").getTime() - 7 * 24 * 60 * 60 * 1000;
        const semanaMs = new Date(semana + "T00:00:00Z").getTime();
        const weeksBack = Math.max(0, Math.round((anchorMs - semanaMs) / (7 * 24 * 60 * 60 * 1000)));
        semanasPresencial = Math.max(0, ajuste - weeksBack);
      }
    }

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
