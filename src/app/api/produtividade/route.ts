import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

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
  const page      = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const busca     = searchParams.get("busca")?.trim()     || null;
  const equipe    = searchParams.get("equipe")?.trim()    || null;
  const atendente = searchParams.get("atendente")?.trim() || null;
  const exportAll = searchParams.get("export") === "1";
  const statsOnly = searchParams.get("stats")  === "1";

  const anoRecebimento = searchParams.get("anoRec")?.trim()    || null;
  const dataRecDe      = searchParams.get("dataRecDe")?.trim() || null;
  const dataRecAte     = searchParams.get("dataRecAte")?.trim()|| null;
  const anoResolucao   = searchParams.get("anoRes")?.trim()    || null;
  const dataResDe      = searchParams.get("dataResDe")?.trim() || null;
  const dataResAte     = searchParams.get("dataResAte")?.trim()|| null;

  // Normaliza nome: maiúsculo + sem acentos
  function normName(s: string): string {
    return s.toUpperCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // Colaboradores → mapa nomeNormalizado→equipe
  const colaboradores = await prisma.colaborador.findMany({
    select: { nome: true, equipe: { select: { nome: true } } },
  });
  const nomeParaEquipe = new Map<string, string>(); // key: nome normalizado, value: equipe
  for (const c of colaboradores) {
    if (c.equipe?.nome) nomeParaEquipe.set(normName(c.nome), c.equipe.nome);
  }

  function resolveEquipe(usuario: string): string | null {
    const norm = normName(usuario);
    if (nomeParaEquipe.has(norm)) return nomeParaEquipe.get(norm)!;
    // fallback: prefixo parcial
    for (const [nome, eq] of nomeParaEquipe) {
      if (norm.startsWith(nome) || nome.startsWith(norm)) return eq;
    }
    return null;
  }

  // Nomes normalizados dos colaboradores de uma equipe (para filtrar usuarioFechamento no DB)
  function nomesDeEquipe(eq: string): string[] {
    return [...nomeParaEquipe.entries()].filter(([, e]) => e === eq).map(([n]) => n);
  }

  const equipes = [...new Set([...nomeParaEquipe.values()])].sort();

  const [totalRegistros, todosAtendentes, periodo, periodoRes] = await Promise.all([
    prisma.produtividade.count(),
    prisma.produtividade.findMany({ select: { usuarioFechamento: true }, distinct: ["usuarioFechamento"] }),
    prisma.produtividade.aggregate({ _min: { dataAbertura: true }, _max: { dataAbertura: true } }),
    prisma.produtividade.aggregate({ _min: { dataResolucao: true }, _max: { dataResolucao: true } }),
  ]);

  // Atendentes filtrados pela equipe selecionada (se houver)
  let atendentes = todosAtendentes.map(r => r.usuarioFechamento).filter((v): v is string => !!v).sort();
  if (equipe) {
    const nomes = nomesDeEquipe(equipe);
    atendentes = atendentes.filter(a => nomes.includes(a.toUpperCase().trim()));
  }

  const atendentesCount = todosAtendentes.map(r => r.usuarioFechamento).filter(Boolean).length;
  const periodoInicio    = periodo._min.dataAbertura?.toISOString()    ?? null;
  const periodoFim       = periodo._max.dataAbertura?.toISOString()    ?? null;
  const periodoResInicio = periodoRes._min.dataResolucao?.toISOString() ?? null;
  const periodoResFim    = periodoRes._max.dataResolucao?.toISOString() ?? null;

  // Monta condições de data reutilizáveis
  function dateConditions(): Record<string, unknown>[] {
    const conds: Record<string, unknown>[] = [];
    const abRange: Record<string, Date> = {};
    if (anoRecebimento) {
      abRange.gte = new Date(`${anoRecebimento}-01-01T00:00:00Z`);
      abRange.lt  = new Date(`${Number(anoRecebimento) + 1}-01-01T00:00:00Z`);
    }
    if (dataRecDe)  abRange.gte = new Date(`${dataRecDe}T00:00:00Z`);
    if (dataRecAte) abRange.lte = new Date(`${dataRecAte}T23:59:59Z`);
    if (Object.keys(abRange).length) conds.push({ dataAbertura: abRange });

    const resRange: Record<string, Date> = {};
    if (anoResolucao) {
      resRange.gte = new Date(`${anoResolucao}-01-01T00:00:00Z`);
      resRange.lt  = new Date(`${Number(anoResolucao) + 1}-01-01T00:00:00Z`);
    }
    if (dataResDe)  resRange.gte = new Date(`${dataResDe}T00:00:00Z`);
    if (dataResAte) resRange.lte = new Date(`${dataResAte}T23:59:59Z`);
    if (Object.keys(resRange).length) conds.push({ dataResolucao: resRange });
    return conds;
  }

  // ── STATS (Quantitativo) ──────────────────────────────────────────────────
  if (statsOnly) {
    const statsConditions: Record<string, unknown>[] = [];
    statsConditions.push(...dateConditions());
    if (equipe) {
      const nomes = nomesDeEquipe(equipe);
      if (nomes.length > 0) {
        statsConditions.push({ OR: nomes.map(n => ({ usuarioFechamento: { contains: n, mode: "insensitive" as const } })) });
      }
    }
    if (atendente) statsConditions.push({ usuarioFechamento: atendente });
    const whereStats = statsConditions.length === 0 ? {} : statsConditions.length === 1 ? statsConditions[0] : { AND: statsConditions };

    // Produtividade: recebidos + resolvidos + TMR
    const todos = await prisma.produtividade.findMany({
      select: { usuarioFechamento: true, dataAbertura: true, dataResolucao: true },
      where: whereStats,
    });

    type Acc = { recebidos: number; resolvidos: number; tmrHorasSum: number; tmrCount: number };
    const grupos = new Map<string, Acc>();

    for (const r of todos) {
      const usuario = r.usuarioFechamento || "(Sem usuário)";
      if (!grupos.has(usuario)) grupos.set(usuario, { recebidos: 0, resolvidos: 0, tmrHorasSum: 0, tmrCount: 0 });
      const g = grupos.get(usuario)!;
      g.recebidos++;
      g.resolvidos++;
      if (r.dataAbertura && r.dataResolucao) {
        const diffH = (new Date(r.dataResolucao).getTime() - new Date(r.dataAbertura).getTime()) / 3_600_000;
        if (diffH >= 0) { g.tmrHorasSum += diffH; g.tmrCount++; }
      }
    }

    // ChamadoPowerbi: Em Aberto e Pausados por usuarioAtribuido
    // Quando filtro é por Data Resolução → não busca ChamadoPowerbi (abertos não têm data resolução)
    // Quando filtro é por Data Recebimento → filtra ChamadoPowerbi por dataAbertura
    const temFiltroRec = !!(anoRecebimento || dataRecDe || dataRecAte);
    const temFiltroRes = !!(anoResolucao || dataResDe || dataResAte);

    const chamadoDateWhere: Record<string, unknown> = {
      NOT: { numero: { contains: " " } },
    };

    if (temFiltroRec) {
      // Data Recebimento controla o Em Aberto (com ou sem filtro de resolução)
      const abRangeCh: Record<string, Date> = {};
      if (anoRecebimento) {
        abRangeCh.gte = new Date(`${anoRecebimento}-01-01T00:00:00Z`);
        abRangeCh.lt  = new Date(`${Number(anoRecebimento) + 1}-01-01T00:00:00Z`);
      }
      if (dataRecDe)  abRangeCh.gte = new Date(`${dataRecDe}T00:00:00Z`);
      if (dataRecAte) abRangeCh.lte = new Date(`${dataRecAte}T23:59:59Z`);
      if (Object.keys(abRangeCh).length) chamadoDateWhere.dataAbertura = abRangeCh;
    } else if (temFiltroRes) {
      // Só filtro de resolução sem recebimento: abertos não têm data resolução → retorna 0
      chamadoDateWhere.id = { lt: 0 };
    }

    const chamadosPbi = await prisma.chamadoPowerbi.findMany({
      select: { usuarioAtribuido: true, situacaoRegra: true },
      where: chamadoDateWhere,
    });

    const chamadosAberto  = new Map<string, number>();
    const chamadosPausado = new Map<string, number>();
    for (const c of chamadosPbi) {
      const nome = c.usuarioAtribuido;
      if (!nome) continue;
      const sit = (c.situacaoRegra || "").toLowerCase();
      const isResolvido = sit.includes("resolvid") || sit.includes("fechad") || sit.includes("cancela");
      const isPausado   = sit === "pausado";
      const key = normName(nome);
      if (isPausado) {
        chamadosPausado.set(key, (chamadosPausado.get(key) ?? 0) + 1);
      } else if (!isResolvido) {
        chamadosAberto.set(key, (chamadosAberto.get(key) ?? 0) + 1);
      }
    }

    const stats = [...grupos.entries()]
      .map(([usuario, g]) => {
        const tmrH = g.tmrCount > 0 ? g.tmrHorasSum / g.tmrCount : 0;
        const normUsuario = normName(usuario);
        const emAberto  = chamadosAberto.get(normUsuario)  ?? 0;
        const pausados  = chamadosPausado.get(normUsuario) ?? 0;
        const resolvidos = g.resolvidos;
        const recebidos = emAberto + pausados + resolvidos;
        return {
          usuario,
          equipe: resolveEquipe(usuario),
          recebidos,
          emAberto,
          pausados,
          resolvidos,
          taxaResolucao: recebidos > 0 ? (resolvidos / recebidos) * 100 : 0,
          tmrHoras: Math.round(tmrH),
          tmrDias: Math.round(tmrH / 24),
        };
      })
      .sort((a, b) => a.usuario.localeCompare(b.usuario, "pt-BR"));

    const totais = stats.reduce(
      (acc, s) => { acc.recebidos += s.recebidos; acc.emAberto += s.emAberto; acc.pausados += s.pausados; acc.resolvidos += s.resolvidos; return acc; },
      { recebidos: 0, emAberto: 0, pausados: 0, resolvidos: 0 }
    );
    const tmrGeralH = stats.reduce((s, r) => s + r.tmrHoras * (r.resolvidos || 1), 0) / Math.max(1, stats.reduce((s, r) => s + (r.resolvidos || 1), 0));

    const totalDenominador = totais.recebidos;
    return NextResponse.json({
      stats,
      totais: { ...totais, taxaResolucao: totalDenominador > 0 ? (totais.resolvidos / totalDenominador) * 100 : 0, tmrHoras: Math.round(tmrGeralH), tmrDias: Math.round(tmrGeralH / 24) },
      equipes, atendentes, atendentesCount, periodoInicio, periodoFim, periodoResInicio, periodoResFim, totalRegistros,
    });
  }

  // ── LISTA ────────────────────────────────────────────────────────────────
  const conditions: Record<string, unknown>[] = [];

  if (equipe) {
    const nomes = nomesDeEquipe(equipe);
    if (nomes.length > 0) {
      conditions.push({
        OR: nomes.map(n => ({ usuarioFechamento: { contains: n, mode: "insensitive" as const } })),
      });
    }
  }
  conditions.push(...dateConditions());
  if (atendente) conditions.push({ usuarioFechamento: atendente });
  if (busca) {
    conditions.push({
      OR: [
        { numeroChamado:    { contains: busca, mode: "insensitive" as const } },
        { usuarioFechamento:{ contains: busca, mode: "insensitive" as const } },
        { situacaoRegra:    { contains: busca, mode: "insensitive" as const } },
      ],
    });
  }
  const where = conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { AND: conditions };

  const meta = { equipes, atendentes, atendentesCount, periodoInicio, periodoFim, periodoResInicio, periodoResFim, totalRegistros };

  if (exportAll) {
    const registros = await prisma.produtividade.findMany({ where, orderBy: { id: "asc" } });
    return NextResponse.json({ registros, total: registros.length, page: 1, totalPages: 1, ...meta });
  }

  const [total, registros] = await Promise.all([
    prisma.produtividade.count({ where }),
    prisma.produtividade.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return NextResponse.json({ registros, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), ...meta });
}

export async function DELETE() {
  await prisma.produtividade.deleteMany();
  return NextResponse.json({ ok: true });
}
