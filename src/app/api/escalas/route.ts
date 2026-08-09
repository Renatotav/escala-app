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

export async function PATCH(request: NextRequest) {
  const { colaboradorId, semana } = await request.json();
  const snappedSemana = snapToMonday(semana);
  const semanaDate = new Date(snappedSemana);

  const existing = await prisma.escalaWhatsapp.findUnique({ where: { semana: semanaDate } });

  if (existing?.colaboradorId === colaboradorId) {
    await prisma.escalaWhatsapp.delete({ where: { semana: semanaDate } });
  } else {
    await prisma.escalaWhatsapp.upsert({
      where: { semana: semanaDate },
      create: { semana: semanaDate, colaboradorId },
      update: { colaboradorId },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const semanaRaw = searchParams.get("semana");
  const semana = semanaRaw ? snapToMonday(semanaRaw) : null;
  const equipeId = searchParams.get("equipeId");

  const whatsappRecord = semana
    ? await prisma.escalaWhatsapp.findUnique({ where: { semana: new Date(semana) } })
    : null;
  const whatsappColaboradorId = whatsappRecord?.colaboradorId ?? null;

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
    const semanasContadas = new Set<string>();
    for (const e of escalasAte) {
      if (e.tipo === "REMOTO") break;
      const weekStr = snapToMonday(new Date(e.semana).toISOString().slice(0, 10));
      if (!semanasContadas.has(weekStr)) {
        semanasContadas.add(weekStr);
        contadoRaw++;
      }
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
    const escalaRegistro = semana
      ? c.escalas.find((e) => new Date(e.semana).toISOString().slice(0, 10) === semana) ?? null
      : null;
    const semRemoto = (c as unknown as { semRemoto: boolean }).semRemoto ?? false;
    // Pessoas sem remoto sempre aparecem como Presencial, mesmo sem lançamento manual
    const escalaSemana = escalaRegistro?.tipo ?? (semRemoto ? "PRESENCIAL" : null);
    const unidadePresencial = escalaRegistro?.unidade
      ?? (semRemoto && !escalaRegistro ? (escalasAte.find(e => e.tipo === "PRESENCIAL")?.unidade ?? null) : null);

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
      unidadePresencial,
      semRemoto,
      whatsapp: whatsappColaboradorId === c.id,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { colaboradorId, semana, tipo, unidade } = await request.json();
  const snappedSemana = snapToMonday(semana);

  const registro = await prisma.escalaSemana.upsert({
    where: { colaboradorId_semana: { colaboradorId, semana: new Date(snappedSemana) } },
    create: { colaboradorId, semana: new Date(snappedSemana), tipo, unidade: unidade || null },
    update: { tipo, unidade: unidade || null },
  });

  return NextResponse.json(registro);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const colaboradorId = Number(searchParams.get("colaboradorId"));
  const semana = searchParams.get("semana");
  if (!colaboradorId || !semana) return NextResponse.json({ ok: false }, { status: 400 });

  const snappedSemana = snapToMonday(semana);

  await prisma.escalaSemana.deleteMany({
    where: { colaboradorId, semana: new Date(snappedSemana) },
  });

  return NextResponse.json({ ok: true });
}
