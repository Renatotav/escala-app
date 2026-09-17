import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

// Converte texto de pausa (ex: "12:30", "1 dia 4:00", "2 dias") para horas
function parsePausaHoras(pausa: string | null): number {
  if (!pausa || pausa.trim() === "" || pausa.trim() === "0") return 0;
  const s = pausa.trim().toLowerCase();
  let total = 0;
  const dias = s.match(/(\d+)\s*dia/i);
  if (dias) total += parseInt(dias[1]) * 24;
  const hhmm = s.match(/(\d+):(\d{2})/);
  if (hhmm) {
    total += parseInt(hhmm[1]) + parseInt(hhmm[2]) / 60;
  } else {
    const h = s.match(/(\d+)\s*h/i);
    if (h) total += parseInt(h[1]);
    const m = s.match(/(\d+)\s*min/i);
    if (m) total += parseInt(m[1]) / 60;
  }
  if (total === 0 && /^\d+(\.\d+)?$/.test(s)) total = parseFloat(s);
  return total;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const busca = searchParams.get("busca")?.trim() || null;
  const equipe = searchParams.get("equipe")?.trim() || null;
  const atendente = searchParams.get("atendente")?.trim() || null;
  const exportAll = searchParams.get("export") === "1";
  const statsOnly = searchParams.get("stats") === "1";

  const totalRegistros = await prisma.produtividade.count();

  // Listas para os selects
  const [todasEquipes, todosAtendentes] = await Promise.all([
    prisma.produtividade.findMany({ select: { equipeAtribuida: true }, distinct: ["equipeAtribuida"] }),
    prisma.produtividade.findMany({ select: { usuarioFechamento: true }, distinct: ["usuarioFechamento"] }),
  ]);

  const equipes = todasEquipes.map(r => r.equipeAtribuida).filter((v): v is string => !!v).sort();
  const atendentes = todosAtendentes.map(r => r.usuarioFechamento).filter((v): v is string => !!v).sort();

  // Stats (quantitativo por usuário)
  if (statsOnly) {
    // Carrega colaboradores para cruzar equipe por nome
    const colaboradores = await prisma.colaborador.findMany({
      select: { nome: true, equipe: { select: { nome: true } } },
    });
    const nomeParaEquipe = new Map<string, string>();
    for (const c of colaboradores) {
      if (c.equipe?.nome) nomeParaEquipe.set(c.nome.toUpperCase().trim(), c.equipe.nome);
    }
    function resolveEquipe(usuario: string): string | null {
      const upper = usuario.toUpperCase().trim();
      if (nomeParaEquipe.has(upper)) return nomeParaEquipe.get(upper)!;
      for (const [nome, eq] of nomeParaEquipe) {
        if (upper.startsWith(nome) || nome.startsWith(upper)) return eq;
      }
      return null;
    }

    const whereStats = equipe
      ? { usuarioFechamento: { in: [...nomeParaEquipe.entries()].filter(([, eq]) => eq === equipe).map(([n]) => n) } }
      : {};
    const todos = await prisma.produtividade.findMany({
      select: {
        usuarioFechamento: true,
        dataAbertura: true,
        dataResolucao: true,
        pausa: true,
        situacaoRegra: true,
      },
      where: whereStats,
    });

    type Acc = {
      recebidos: number;
      emAberto: number;
      pausados: number;
      resolvidos: number;
      tmrHorasSum: number;
      tmrCount: number;
      tmpHorasSum: number;
      tmpCount: number;
    };

    const grupos = new Map<string, Acc>();
    for (const r of todos) {
      const usuario = r.usuarioFechamento || "(Sem usuário)";
      if (!grupos.has(usuario)) {
        grupos.set(usuario, { recebidos: 0, emAberto: 0, pausados: 0, resolvidos: 0, tmrHorasSum: 0, tmrCount: 0, tmpHorasSum: 0, tmpCount: 0 });
      }
      const g = grupos.get(usuario)!;
      g.recebidos++;

      const sit = (r.situacaoRegra || "").toLowerCase();
      const isResolvido = sit.includes("resolvid") || sit.includes("fechad") || r.dataResolucao !== null;
      const pausaH = parsePausaHoras(r.pausa);
      const isPausado = sit.includes("paus") || (pausaH > 0 && !isResolvido);

      if (isResolvido) {
        g.resolvidos++;
        if (r.dataAbertura && r.dataResolucao) {
          const diffH = (new Date(r.dataResolucao).getTime() - new Date(r.dataAbertura).getTime()) / 3_600_000;
          if (diffH >= 0) { g.tmrHorasSum += diffH; g.tmrCount++; }
        }
      } else if (isPausado) {
        g.pausados++;
      } else {
        g.emAberto++;
      }

      if (pausaH > 0) { g.tmpHorasSum += pausaH; g.tmpCount++; }
    }

    const stats = [...grupos.entries()]
      .map(([usuario, g]) => {
        const tmrH = g.tmrCount > 0 ? g.tmrHorasSum / g.tmrCount : 0;
        const tmpH = g.tmpCount > 0 ? g.tmpHorasSum / g.tmpCount : 0;
        return {
          usuario,
          equipe: resolveEquipe(usuario),
          recebidos: g.recebidos,
          emAberto: g.emAberto,
          pausados: g.pausados,
          resolvidos: g.resolvidos,
          taxaResolucao: g.recebidos > 0 ? (g.resolvidos / g.recebidos) * 100 : 0,
          tmrHoras: Math.round(tmrH),
          tmrDias: Math.round(tmrH / 24),
          tmpHoras: Math.round(tmpH),
          tmpDias: Math.round(tmpH / 24),
        };
      })
      .sort((a, b) => a.usuario.localeCompare(b.usuario, "pt-BR"));

    const totais = stats.reduce(
      (acc, s) => {
        acc.recebidos += s.recebidos;
        acc.emAberto += s.emAberto;
        acc.pausados += s.pausados;
        acc.resolvidos += s.resolvidos;
        return acc;
      },
      { recebidos: 0, emAberto: 0, pausados: 0, resolvidos: 0 }
    );

    const tmrGeralH = stats.reduce((s, r) => s + r.tmrHoras * (r.resolvidos || 1), 0) /
      Math.max(1, stats.reduce((s, r) => s + (r.resolvidos || 1), 0));
    const tmpGeralH = stats.reduce((s, r) => s + r.tmpHoras * (r.pausados || 1), 0) /
      Math.max(1, stats.reduce((s, r) => s + (r.pausados || 1), 0));

    const equipesColaboradores = [...new Set([...nomeParaEquipe.values()])].sort();
    return NextResponse.json({
      stats,
      totais: {
        ...totais,
        taxaResolucao: totais.recebidos > 0 ? (totais.resolvidos / totais.recebidos) * 100 : 0,
        tmrHoras: Math.round(tmrGeralH),
        tmrDias: Math.round(tmrGeralH / 24),
        tmpHoras: Math.round(tmpGeralH),
        tmpDias: Math.round(tmpGeralH / 24),
      },
      equipes: equipesColaboradores,
      atendentes,
      totalRegistros,
    });
  }

  const conditions: Record<string, unknown>[] = [];
  if (equipe) conditions.push({ equipeAtribuida: equipe });
  if (atendente) conditions.push({ usuarioFechamento: atendente });
  if (busca) {
    conditions.push({
      OR: [
        { numeroChamado: { contains: busca, mode: "insensitive" as const } },
        { usuarioFechamento: { contains: busca, mode: "insensitive" as const } },
        { equipeAtribuida: { contains: busca, mode: "insensitive" as const } },
        { situacaoRegra: { contains: busca, mode: "insensitive" as const } },
      ],
    });
  }
  const where = conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { AND: conditions };

  if (exportAll) {
    const registros = await prisma.produtividade.findMany({ where, orderBy: { id: "asc" } });
    return NextResponse.json({ registros, total: registros.length, page: 1, totalPages: 1, totalRegistros, equipes, atendentes });
  }

  const [total, registros] = await Promise.all([
    prisma.produtividade.count({ where }),
    prisma.produtividade.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return NextResponse.json({ registros, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), totalRegistros, equipes, atendentes });
}

export async function DELETE() {
  await prisma.produtividade.deleteMany();
  return NextResponse.json({ ok: true });
}
