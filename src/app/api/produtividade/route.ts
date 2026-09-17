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

  const [totalRegistros, todosAtendentes, periodo] = await Promise.all([
    prisma.produtividade.count(),
    prisma.produtividade.findMany({ select: { usuarioFechamento: true }, distinct: ["usuarioFechamento"] }),
    prisma.produtividade.aggregate({ _min: { dataAbertura: true }, _max: { dataAbertura: true } }),
  ]);

  // Atendentes filtrados pela equipe selecionada (se houver)
  let atendentes = todosAtendentes.map(r => r.usuarioFechamento).filter((v): v is string => !!v).sort();
  if (equipe) {
    const nomes = nomesDeEquipe(equipe);
    atendentes = atendentes.filter(a => nomes.includes(a.toUpperCase().trim()));
  }

  const atendentesCount = todosAtendentes.map(r => r.usuarioFechamento).filter(Boolean).length;
  const periodoInicio = periodo._min.dataAbertura?.toISOString() ?? null;
  const periodoFim    = periodo._max.dataAbertura?.toISOString() ?? null;

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

    // Chamados (Assyst): Em Aberto e Pausados por nomeUsuarioAtribuido
    const chamados = await prisma.chamado.findMany({
      select: { nomeUsuarioAtribuido: true, estado: true },
    });

    const chamadosAberto  = new Map<string, number>();
    const chamadosPausado = new Map<string, number>();
    for (const c of chamados) {
      const nome = c.nomeUsuarioAtribuido;
      if (!nome) continue;
      const est = (c.estado || "").toLowerCase();
      const isResolvido = est.includes("resolvid") || est.includes("fechad") || est.includes("cancela");
      const isPausado   = est.includes("parar") || est.includes("paus") || est.includes("suspen") || est.includes("aguard") || est.includes("espera");
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
        const total = resolvidos + emAberto + pausados;
        return {
          usuario,
          equipe: resolveEquipe(usuario),
          recebidos: g.recebidos,
          emAberto,
          pausados,
          resolvidos,
          taxaResolucao: total > 0 ? (resolvidos / total) * 100 : 0,
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

    const totalDenominador = totais.resolvidos + totais.emAberto + totais.pausados;
    return NextResponse.json({
      stats,
      totais: { ...totais, taxaResolucao: totalDenominador > 0 ? (totais.resolvidos / totalDenominador) * 100 : 0, tmrHoras: Math.round(tmrGeralH), tmrDias: Math.round(tmrGeralH / 24) },
      equipes, atendentes, atendentesCount, periodoInicio, periodoFim, totalRegistros,
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

  const meta = { equipes, atendentes, atendentesCount, periodoInicio, periodoFim, totalRegistros };

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
