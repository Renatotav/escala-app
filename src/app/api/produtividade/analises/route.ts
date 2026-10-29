import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getSegundaFeira(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const [prodList, chamadosPbi] = await Promise.all([
    prisma.produtividade.findMany({
      select: { dataMovimentacao: true, dataResolucao: true, tmrExclusivoHoras: true },
    }),
    prisma.chamadoPowerbi.findMany({
      select: {
        numero: true,
        dataAbertura: true,
        dataMovimentacao: true,
        usuarioAtribuido: true,
        equipeAtribuida: true,
        situacaoRegra: true,
      },
      where: { NOT: { numero: { contains: " " } } },
    }),
  ]);

  // 1. Evolução temporal por semana
  const recSemana = new Map<string, number>();
  const resSemana = new Map<string, number>();
  for (const p of prodList) {
    if (p.dataMovimentacao) {
      const k = getSegundaFeira(p.dataMovimentacao);
      recSemana.set(k, (recSemana.get(k) ?? 0) + 1);
    }
    if (p.dataResolucao) {
      const k = getSegundaFeira(p.dataResolucao);
      resSemana.set(k, (resSemana.get(k) ?? 0) + 1);
    }
  }
  const todasSemanas = [...new Set([...recSemana.keys(), ...resSemana.keys()])].sort();
  const evolucao = todasSemanas.slice(-52).map(semana => {
    const d = new Date(semana + "T12:00:00Z");
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
    return {
      semana,
      label,
      recebidos: recSemana.get(semana) ?? 0,
      resolvidos: resSemana.get(semana) ?? 0,
    };
  });

  // 2. Distribuição TMR em buckets
  const buckets = [
    { label: "< 1 dia",    count: 0, hMin: 0,   hMax: 24   },
    { label: "1 – 3 dias", count: 0, hMin: 24,  hMax: 72   },
    { label: "4 – 7 dias", count: 0, hMin: 72,  hMax: 168  },
    { label: "8 – 15 dias",count: 0, hMin: 168, hMax: 360  },
    { label: "> 15 dias",  count: 0, hMin: 360, hMax: null },
  ];
  for (const p of prodList) {
    const h = p.tmrExclusivoHoras;
    if (!h || h <= 0) continue;
    const b = buckets.find(b => h >= b.hMin && (b.hMax === null || h < b.hMax));
    if (b) b.count++;
  }
  const distribuicaoTMR = buckets.map(({ label, count }) => ({ label, count }));

  // 3. Top 10 chamados mais antigos (em aberto ou pausados)
  const hoje = new Date();
  const top10Antigos = chamadosPbi
    .filter(c => {
      const sit = (c.situacaoRegra ?? "").toLowerCase();
      return !sit.includes("resolvid") && !sit.includes("fechad") && !sit.includes("cancela");
    })
    .map(c => {
      const dataRef = c.dataAbertura ?? c.dataMovimentacao;
      if (!dataRef) return null;
      const diasAberto = Math.floor((hoje.getTime() - dataRef.getTime()) / 86_400_000);
      return {
        numero: c.numero,
        dataAbertura: dataRef.toISOString(),
        diasAberto,
        usuario: c.usuarioAtribuido ?? null,
        equipe: c.equipeAtribuida ?? null,
        situacao: c.situacaoRegra ?? null,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.diasAberto - a.diasAberto)
    .slice(0, 10);

  // 4. Volume por dia da semana (seg=1...dom=0)
  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const porDia = [0, 0, 0, 0, 0, 0, 0];
  for (const p of prodList) {
    if (p.dataMovimentacao) porDia[p.dataMovimentacao.getDay()]++;
  }
  const porDiaSemana = DIAS.map((label, dia) => ({ dia, label, total: porDia[dia] }));

  return NextResponse.json({
    evolucao,
    distribuicaoTMR,
    top10Antigos,
    porDiaSemana,
    totalRegistros: prodList.length,
  });
}
