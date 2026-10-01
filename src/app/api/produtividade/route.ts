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
    if (Object.keys(abRange).length) conds.push({ dataMovimentacao: abRange });

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
    const temFiltroRec = !!(anoRecebimento || dataRecDe || dataRecAte);
    const temFiltroRes = !!(anoResolucao || dataResDe || dataResAte);

    // "mvRange": período para Recebidos/Em Aberto — sempre por dataMovimentacao.
    // Prioridade: Data Recebimento. Se só Data Resolução ativa, usa o mesmo período.
    const mvRange: Record<string, Date> = {};
    if (anoRecebimento) { mvRange.gte = new Date(`${anoRecebimento}-01-01T00:00:00Z`); mvRange.lt = new Date(`${Number(anoRecebimento)+1}-01-01T00:00:00Z`); }
    if (dataRecDe)  mvRange.gte = new Date(`${dataRecDe}T00:00:00Z`);
    if (dataRecAte) mvRange.lte = new Date(`${dataRecAte}T23:59:59Z`);
    if (!Object.keys(mvRange).length && temFiltroRes) {
      if (anoResolucao) { mvRange.gte = new Date(`${anoResolucao}-01-01T00:00:00Z`); mvRange.lt = new Date(`${Number(anoResolucao)+1}-01-01T00:00:00Z`); }
      if (dataResDe)  mvRange.gte = new Date(`${dataResDe}T00:00:00Z`);
      if (dataResAte) mvRange.lte = new Date(`${dataResAte}T23:59:59Z`);
    }

    // Condições da query principal (Produtividade por dataMovimentacao)
    const statsConditions: Record<string, unknown>[] = [];
    if (Object.keys(mvRange).length) statsConditions.push({ dataMovimentacao: mvRange });
    if (equipe) {
      const nomes = nomesDeEquipe(equipe);
      if (nomes.length > 0) statsConditions.push({ OR: nomes.map(n => ({ usuarioFechamento: { contains: n, mode: "insensitive" as const } })) });
    }
    if (atendente) statsConditions.push({ usuarioFechamento: atendente });
    const whereStats = statsConditions.length === 0 ? {} : statsConditions.length === 1 ? statsConditions[0] : { AND: statsConditions };

    // Condições de Produção (Produtividade por dataResolucao) — só quando filtro resolução ativo
    const prodConds: Record<string, unknown>[] = [];
    if (temFiltroRes) {
      const rvRange: Record<string, Date> = {};
      if (anoResolucao) { rvRange.gte = new Date(`${anoResolucao}-01-01T00:00:00Z`); rvRange.lt = new Date(`${Number(anoResolucao)+1}-01-01T00:00:00Z`); }
      if (dataResDe)  rvRange.gte = new Date(`${dataResDe}T00:00:00Z`);
      if (dataResAte) rvRange.lte = new Date(`${dataResAte}T23:59:59Z`);
      if (Object.keys(rvRange).length) prodConds.push({ dataResolucao: rvRange });
      if (equipe) {
        const nomes = nomesDeEquipe(equipe);
        if (nomes.length > 0) prodConds.push({ OR: nomes.map(n => ({ usuarioFechamento: { contains: n, mode: "insensitive" as const } })) });
      }
      if (atendente) prodConds.push({ usuarioFechamento: atendente });
    }
    const whereProducao = prodConds.length === 0 ? {} : prodConds.length === 1 ? prodConds[0] : { AND: prodConds };

    // Queries paralelas
    const [todos, producaoList] = await Promise.all([
      prisma.produtividade.findMany({
        select: { usuarioFechamento: true, dataMovimentacao: true, dataResolucao: true },
        where: whereStats,
      }),
      temFiltroRes
        ? prisma.produtividade.findMany({ select: { usuarioFechamento: true }, where: whereProducao })
        : Promise.resolve([] as { usuarioFechamento: string | null }[]),
    ]);

    // Agrupa Produtividade: chamados recebidos no período que já foram resolvidos
    type Acc = { resolvidos: number; tmrHorasSum: number; tmrCount: number; tmrValores: number[] };
    const grupos = new Map<string, Acc>();
    const tmrTodosValores: number[] = [];

    for (const r of todos) {
      const usuario = r.usuarioFechamento || "(Sem usuário)";
      if (!grupos.has(usuario)) grupos.set(usuario, { resolvidos: 0, tmrHorasSum: 0, tmrCount: 0, tmrValores: [] });
      const g = grupos.get(usuario)!;
      g.resolvidos++;
      if (r.dataMovimentacao && r.dataResolucao) {
        const diffH = (new Date(r.dataResolucao).getTime() - new Date(r.dataMovimentacao).getTime()) / 3_600_000;
        if (diffH >= 0) { g.tmrHorasSum += diffH; g.tmrCount++; g.tmrValores.push(diffH); tmrTodosValores.push(diffH); }
      }
    }

    // Produção por usuário (chamados fechados no período de resolução)
    const chamadosProducao = new Map<string, number>();
    for (const p of producaoList) {
      if (!p.usuarioFechamento) continue;
      const key = normName(p.usuarioFechamento);
      chamadosProducao.set(key, (chamadosProducao.get(key) ?? 0) + 1);
    }

    // ChamadoPowerbi: sempre filtrado pelo mesmo mvRange (dataMovimentacao)
    const chamadoDateWhere: Record<string, unknown> = { NOT: { numero: { contains: " " } } };
    if (Object.keys(mvRange).length) chamadoDateWhere.dataMovimentacao = mvRange;

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
        const sorted = [...g.tmrValores].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const tmrMedianaH = sorted.length === 0 ? 0 : sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        const normUsuario = normName(usuario);
        const emAberto  = chamadosAberto.get(normUsuario)  ?? 0;
        const pausados  = chamadosPausado.get(normUsuario) ?? 0;
        const resolvidos = g.resolvidos;
        const recebidos = emAberto + pausados + resolvidos;
        const producao = temFiltroRes ? (chamadosProducao.get(normUsuario) ?? 0) : null;
        return {
          usuario,
          equipe: resolveEquipe(usuario),
          recebidos,
          emAberto,
          pausados,
          resolvidos,
          taxaResolucao: recebidos > 0 ? (resolvidos / recebidos) * 100 : 0,
          producao,
          vazao: (producao !== null && recebidos > 0) ? (producao / recebidos) * 100 : null,
          tmrHoras: Math.round(tmrH),
          tmrDias: Math.round(tmrH / 24),
          tmrMedianaHoras: Math.round(tmrMedianaH),
          tmrMedianaDias: Math.round(tmrMedianaH / 24),
        };
      })
      .sort((a, b) => a.usuario.localeCompare(b.usuario, "pt-BR"));

    const totais = stats.reduce(
      (acc, s) => {
        acc.recebidos += s.recebidos; acc.emAberto += s.emAberto; acc.pausados += s.pausados; acc.resolvidos += s.resolvidos;
        if (s.producao !== null) acc.producao = (acc.producao ?? 0) + s.producao;
        return acc;
      },
      { recebidos: 0, emAberto: 0, pausados: 0, resolvidos: 0, producao: null as number | null }
    );
    const tmrGeralH = stats.reduce((s, r) => s + r.tmrHoras * (r.resolvidos || 1), 0) / Math.max(1, stats.reduce((s, r) => s + (r.resolvidos || 1), 0));
    const tmrTodosOrdenados = [...tmrTodosValores].sort((a, b) => a - b);
    const tmrTotalMid = Math.floor(tmrTodosOrdenados.length / 2);
    const tmrMedianaGeralH = tmrTodosOrdenados.length === 0 ? 0
      : tmrTodosOrdenados.length % 2 === 1 ? tmrTodosOrdenados[tmrTotalMid]
      : (tmrTodosOrdenados[tmrTotalMid - 1] + tmrTodosOrdenados[tmrTotalMid]) / 2;

    const totalDenominador = totais.recebidos;
    return NextResponse.json({
      stats,
      totais: {
        ...totais,
        taxaResolucao: totalDenominador > 0 ? (totais.resolvidos / totalDenominador) * 100 : 0,
        vazao: (totais.producao !== null && totalDenominador > 0) ? (totais.producao / totalDenominador) * 100 : null,
        tmrHoras: Math.round(tmrGeralH),
        tmrDias: Math.round(tmrGeralH / 24),
        tmrMedianaHoras: Math.round(tmrMedianaGeralH),
        tmrMedianaDias: Math.round(tmrMedianaGeralH / 24),
      },
      temFiltroRes,
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
