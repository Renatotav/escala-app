import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function anoMes(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const [resolvidos, emAberto] = await Promise.all([
    prisma.produtividade.findMany({
      select: {
        numeroChamado: true,
        dataAbertura: true,
        dataMovimentacao: true,
        dataResolucao: true,
        equipeAtribuida: true,
        equipeResolucao: true,
        usuarioFechamento: true,
        situacaoRegra: true,
        tmrExclusivoHoras: true,
      },
    }),
    prisma.chamadoPowerbi.findMany({
      select: {
        numero: true,
        dataAbertura: true,
        equipeAtribuida: true,
        situacaoRegra: true,
      },
      where: { NOT: { numero: { contains: " " } } },
    }),
  ]);

  // Todas as equipes distintas
  const equipesSet = new Set<string>();
  for (const r of resolvidos) {
    if (r.equipeAtribuida) equipesSet.add(r.equipeAtribuida);
    if (r.equipeResolucao) equipesSet.add(r.equipeResolucao);
  }
  for (const c of emAberto) {
    if (c.equipeAtribuida) equipesSet.add(c.equipeAtribuida);
  }
  const equipes = [...equipesSet].sort();

  // Agrupa RESOLVIDOS por mês (usando dataResolucao para o mês de encerramento)
  type MesEntry = {
    recebidos: number;         // atribuídos à equipe naquele mês (dataMovimentacao)
    encerrados: number;        // resolvidos naquele mês (dataResolucao)
    encerradosPelaEquipe: number; // equipeResolucao = equipeAtribuida
    encerradosPorOutra: number;   // equipeResolucao ≠ equipeAtribuida
    tmrHorasTotal: number;
    tmrCount: number;
  };

  // mapa: equipe → mês → entry
  const porEquipeMes = new Map<string, Map<string, MesEntry>>();

  function getEntry(equipe: string, mes: string): MesEntry {
    if (!porEquipeMes.has(equipe)) porEquipeMes.set(equipe, new Map());
    const mmap = porEquipeMes.get(equipe)!;
    if (!mmap.has(mes)) {
      mmap.set(mes, { recebidos: 0, encerrados: 0, encerradosPelaEquipe: 0, encerradosPorOutra: 0, tmrHorasTotal: 0, tmrCount: 0 });
    }
    return mmap.get(mes)!;
  }

  for (const r of resolvidos) {
    const equipe = r.equipeAtribuida ?? "Sem equipe";

    // Recebido: mês em que foi atribuído à equipe (dataMovimentacao)
    const mesRecebido = anoMes(r.dataMovimentacao);
    if (mesRecebido) {
      getEntry(equipe, mesRecebido).recebidos++;
    }

    // Encerrado: mês da resolução
    const mesResolvido = anoMes(r.dataResolucao);
    if (mesResolvido) {
      const entry = getEntry(equipe, mesResolvido);
      entry.encerrados++;

      const eqRes = (r.equipeResolucao ?? "").trim().toUpperCase();
      const eqAt  = (r.equipeAtribuida ?? "").trim().toUpperCase();
      if (eqRes && eqRes === eqAt) {
        entry.encerradosPelaEquipe++;
      } else if (eqRes && eqRes !== eqAt) {
        entry.encerradosPorOutra++;
      } else {
        // sem equipeResolucao: considera encerrado pela própria equipe
        entry.encerradosPelaEquipe++;
      }

      if (r.tmrExclusivoHoras && r.tmrExclusivoHoras > 0) {
        entry.tmrHorasTotal += r.tmrExclusivoHoras;
        entry.tmrCount++;
      }
    }
  }

  // Backlog atual (em aberto) por equipe
  const backlogAtual = new Map<string, number>();
  for (const c of emAberto) {
    const eq = c.equipeAtribuida ?? "Sem equipe";
    backlogAtual.set(eq, (backlogAtual.get(eq) ?? 0) + 1);
  }

  // Monta resultado final
  const resultado: {
    equipe: string;
    meses: {
      mes: string;
      mesLabel: string;
      recebidos: number;
      encerrados: number;
      encerradosPelaEquipe: number;
      encerradosPorOutra: number;
      taxaEncerramento: number;
      tmrMedioDias: number | null;
    }[];
    backlogAtual: number;
  }[] = [];

  for (const [equipe, mmap] of porEquipeMes) {
    const meses = [...mmap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, e]) => {
        const [ano, m] = mes.split("-");
        const mesLabel = new Date(Number(ano), Number(m) - 1, 1)
          .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        return {
          mes,
          mesLabel: mesLabel.replace(".", ""),
          recebidos: e.recebidos,
          encerrados: e.encerrados,
          encerradosPelaEquipe: e.encerradosPelaEquipe,
          encerradosPorOutra: e.encerradosPorOutra,
          taxaEncerramento: e.recebidos > 0 ? Math.round((e.encerrados / e.recebidos) * 100) : 0,
          tmrMedioDias: e.tmrCount > 0 ? Math.round((e.tmrHorasTotal / e.tmrCount) / 24 * 10) / 10 : null,
        };
      });

    resultado.push({
      equipe,
      meses,
      backlogAtual: backlogAtual.get(equipe) ?? 0,
    });
  }

  resultado.sort((a, b) => a.equipe.localeCompare(b.equipe));

  return NextResponse.json({ equipes, resultado });
}
