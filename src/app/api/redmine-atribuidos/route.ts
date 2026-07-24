import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.substring(0, clean.indexOf("\n") < 0 ? clean.length : clean.indexOf("\n"));
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delim = semiCount >= commaCount ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      if (inQ && clean[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      row.push(cur.trim()); cur = "";
    } else if (ch === "\r" && clean[i + 1] === "\n" && !inQ) {
      i++; row.push(cur.trim()); rows.push(row); row = []; cur = "";
    } else if ((ch === "\n" || ch === "\r") && !inQ) {
      row.push(cur.trim()); rows.push(row); row = []; cur = "";
    } else {
      cur += ch;
    }
  }
  if (row.length > 0 || cur.trim()) { row.push(cur.trim()); if (row.some(c => c)) rows.push(row); }
  return rows;
}

function norm(h: string) {
  return h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

function splitAssyst(raw: string): string[] {
  return raw.split(/[;/,|\\]|\s+e\s+/i).map(s => s.trim().toUpperCase()).filter(Boolean);
}

// Parseia "DD/MM/YYYY ..." ou ISO para timestamp
function parseAlteradoEmMs(text: string | null): number | null {
  if (!text) return null;
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const d = new Date(text.trim());
  return isNaN(d.getTime()) ? null : d.getTime();
}

const PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const busca = searchParams.get("busca")?.trim() || null;
  const pessoa = searchParams.get("pessoa")?.trim() || null;
  const acomp = searchParams.get("acomp") === "1";
  const filtroAtraso = searchParams.get("filtroAtraso") || null; // "atraso" | "atencao"
  const devolver = searchParams.get("devolver") === "1";
  const exportAll = searchParams.get("export") === "1";

  // Dados auxiliares leves — sempre retornados em full
  const [chamadosRedmine, chamadosEmFila, todosLeve] = await Promise.all([
    prisma.chamadoRedmine.findMany({ select: { numero: true } }),
    prisma.chamado.findMany({ select: { referencia: true } }),
    // Consulta leve: campos suficientes para calcular todos os stats sem carregar texto grande
    prisma.redmineAtribuido.findMany({
      select: { id: true, numerosAssyst: true, numeroRedmine: true, alteradoEm: true, atribuidoPara: true, solicitadoEm: true },
    }),
  ]);

  const assystAtivos = new Set(chamadosRedmine.map(c => c.numero.trim().toUpperCase()));
  const chamadosEmFilaSet = new Set(chamadosEmFila.map(c => c.referencia.trim().toUpperCase()));

  const agora = Date.now();
  const ms5 = agora - 5 * 86400000;
  const ms3 = agora - 3 * 86400000;

  // Classifica cada registro por atraso e devolver (via texto, sem SQL raw)
  const idsAtraso: number[] = [];
  const idsAtencao: number[] = [];
  const idsDevolver: number[] = [];
  const devolverInfo: { assyst: string; redmine: string }[] = [];

  for (const r of todosLeve) {
    const ts = parseAlteradoEmMs(r.alteradoEm);
    if (ts !== null && ts < ms5) idsAtraso.push(r.id);
    else if (ts !== null && ts >= ms3 && ts < ms5) idsAtencao.push(r.id);

    const nums = splitAssyst(r.numerosAssyst);
    if (nums.length > 0 && nums.every(n => !assystAtivos.has(n))) {
      idsDevolver.push(r.id);
      for (const n of nums) devolverInfo.push({ assyst: n, redmine: r.numeroRedmine });
    }
  }

  // Stats server-side
  const emAcompanhamento = todosLeve.filter(r => r.solicitadoEm).length;
  const contagemPorPessoa = Object.values(
    todosLeve.reduce<Record<string, { nome: string; total: number; emAtraso: number }>>((acc, r) => {
      const nome = r.atribuidoPara ?? "";
      if (!nome) return acc;
      if (!acc[nome]) acc[nome] = { nome, total: 0, emAtraso: 0 };
      acc[nome].total++;
      const ts = parseAlteradoEmMs(r.alteradoEm);
      if (ts !== null && ts < ms5) acc[nome].emAtraso++;
      return acc;
    }, {})
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  const stats = {
    totalGeral: todosLeve.length,
    emAcompanhamento,
    emAtrasoTotal: idsAtraso.length,
    emAtencaoTotal: idsAtencao.length,
    paraDevolver: idsDevolver.length,
    assystAtivos: [...assystAtivos],
    chamadosEmFila: [...chamadosEmFilaSet],
    contagemPorPessoa,
    idsDevolver,
    devolverInfo,
  };

  // Monta where para listagem paginada
  const conditions: Record<string, unknown>[] = [];
  if (pessoa) conditions.push({ atribuidoPara: pessoa });
  if (acomp) conditions.push({ solicitadoEm: { not: null } });
  if (filtroAtraso === "atraso" && idsAtraso.length > 0) conditions.push({ id: { in: idsAtraso } });
  if (filtroAtraso === "atencao" && idsAtencao.length > 0) conditions.push({ id: { in: idsAtencao } });
  if (devolver && idsDevolver.length > 0) conditions.push({ id: { in: idsDevolver } });
  if (busca) {
    conditions.push({
      OR: [
        { numeroRedmine: { contains: busca, mode: "insensitive" } },
        { numerosAssyst: { contains: busca, mode: "insensitive" } },
        { titulo: { contains: busca, mode: "insensitive" } },
        { atribuidoPara: { contains: busca, mode: "insensitive" } },
      ],
    });
  }
  const where = conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { AND: conditions };

  if (exportAll) {
    const registros = await prisma.redmineAtribuido.findMany({ where, orderBy: { id: "asc" } });
    return NextResponse.json({ registros, total: registros.length, page: 1, totalPages: 1, ...stats });
  }

  const [total, registros] = await Promise.all([
    prisma.redmineAtribuido.count({ where }),
    prisma.redmineAtribuido.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);

  return NextResponse.json({ registros, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), ...stats });
}

export async function POST(request: NextRequest) {
  const text = await request.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });

  const headers = rows[0].map(norm);
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = n === "" ? headers.findIndex(h => h === "") : headers.findIndex(h => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };

  const iId      = idx(["chamadoredmine", "redmine", "", "numero", "id"]);
  const iAssyst  = idx(["assyst", "nchamado", "chamado"]);
  const iCriado  = idx(["criadoem", "criado", "datacriacao"]);
  const iAlter   = idx(["alteradoem", "alterado", "atualizadoem", "atualizado", "updated"]);
  const iTipo    = idx(["tipo"]);
  const iSit     = idx(["situacao", "situac"]);
  const iTitulo  = idx(["titulo", "title"]);
  const iAtrib   = idx(["atribuidopara", "atribuido", "responsavel"]);
  const iDesc    = idx(["descricao", "descri", "description"]);
  const iNota    = idx(["ultimasnota", "notas", "nota"]);

  const expectedCols = rows[0].length;
  const registros = [];

  for (let i = 1; i < rows.length; i++) {
    let r = rows[i];
    if (r.every(c => !c)) continue;
    if (r.length > expectedCols && iAssyst >= 0) {
      const extra = r.length - expectedCols;
      const assystMerged = r.slice(iAssyst, iAssyst + extra + 1).join(";");
      r = [...r.slice(0, iAssyst), assystMerged, ...r.slice(iAssyst + extra + 1)];
    }
    const numeroRedmine = r[iId] ?? "";
    const numerosAssyst = r[iAssyst] ?? "";
    if (!numeroRedmine && !numerosAssyst) continue;
    registros.push({
      numeroRedmine: numeroRedmine.trim(),
      numerosAssyst: numerosAssyst.trim(),
      criadoEm:     r[iCriado]?.trim() || null,
      alteradoEm:   r[iAlter]?.trim()  || null,
      tipo:         r[iTipo]?.trim()   || null,
      situacao:     r[iSit]?.trim()    || null,
      titulo:       r[iTitulo]?.trim() || null,
      atribuidoPara: r[iAtrib]?.trim() || null,
      descricao:    r[iDesc]?.trim()   || null,
      ultimasNotas: r[iNota]?.trim()   || null,
    });
  }

  const { searchParams } = new URL(request.url);
  const substituir = searchParams.get("substituir") !== "0";

  const existing = await prisma.redmineAtribuido.findMany({
    select: { id: true, numeroRedmine: true, solicitadoEm: true, solicitadoObs: true },
  });
  const existingMap = new Map(existing.map(e => [e.numeroRedmine, e]));
  const numerosImportados = new Set(registros.map(r => r.numeroRedmine));

  const paraAtualizar = registros.filter(r => existingMap.has(r.numeroRedmine));
  const paraInserir   = registros.filter(r => !existingMap.has(r.numeroRedmine));

  await Promise.all(paraAtualizar.map(r => {
    const ex = existingMap.get(r.numeroRedmine)!;
    return prisma.redmineAtribuido.update({
      where: { id: ex.id },
      data: { numerosAssyst: r.numerosAssyst, criadoEm: r.criadoEm, alteradoEm: r.alteradoEm, tipo: r.tipo, situacao: r.situacao, titulo: r.titulo, atribuidoPara: r.atribuidoPara, descricao: r.descricao, ultimasNotas: r.ultimasNotas },
    });
  }));

  if (paraInserir.length > 0) await prisma.redmineAtribuido.createMany({ data: paraInserir });

  if (substituir) {
    const idsParaRemover = existing.filter(e => !numerosImportados.has(e.numeroRedmine) && !e.solicitadoEm).map(e => e.id);
    if (idsParaRemover.length > 0) await prisma.redmineAtribuido.deleteMany({ where: { id: { in: idsParaRemover } } });
  }

  return NextResponse.json({ count: paraInserir.length, updated: paraAtualizar.length });
}

export async function PATCH(request: NextRequest) {
  const { id, ultimasNotas, solicitadoEm, solicitadoObs, solicitadoOperador, limparSolicitado } = await request.json();
  if (limparSolicitado) {
    await prisma.redmineAtribuido.update({ where: { id }, data: { solicitadoEm: null, solicitadoObs: null } });
  } else if (solicitadoEm !== undefined) {
    await prisma.redmineAtribuido.update({ where: { id }, data: { solicitadoEm: new Date(solicitadoEm), solicitadoObs: solicitadoObs ?? null, solicitadoOperador: solicitadoOperador ?? null } });
  } else {
    await prisma.redmineAtribuido.update({ where: { id }, data: { ultimasNotas } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await prisma.redmineAtribuido.deleteMany();
  return NextResponse.json({ ok: true });
}
