import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");

  // Detecta o delimitador real pela primeira linha (evita tratar ; dentro de célula Assyst como separador de coluna)
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

const PAGE_SIZE_GET = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const busca = searchParams.get("busca")?.trim() || null;
  const exportAll = searchParams.get("export") === "1";

  // Stats leve — só os campos necessários para cruzamento (sem texto grande)
  const [resolvidosLeve, redmine, chamadosAtivos] = await Promise.all([
    prisma.redmineResolvido.findMany({ select: { numeroRedmine: true, numerosAssyst: true } }),
    prisma.chamadoRedmine.findMany({ select: { numero: true, dataAbertura: true } }),
    prisma.chamado.findMany({ select: { referencia: true } }),
  ]);

  // Monta sets para cruzamento
  const resolvidosAssystSet = new Set<string>();
  const assystToRedmineMap = new Map<string, string>(); // Assyst → Redmine#
  for (const r of resolvidosLeve) {
    const partes = r.numerosAssyst.split(/[;/,|\\]|\s+e\s+/i).map(s => s.trim().toUpperCase()).filter(Boolean);
    for (const p of partes) {
      resolvidosAssystSet.add(p);
      assystToRedmineMap.set(p, r.numeroRedmine.trim());
    }
  }

  const redmineNums = redmine.map(r => r.numero.trim().toUpperCase());
  const esquecidos = redmineNums.filter(n => !resolvidosAssystSet.has(n));
  const encontrados = redmineNums.filter(n => resolvidosAssystSet.has(n));
  const chamadosAtivoSet = new Set(chamadosAtivos.map(c => c.referencia.trim().toUpperCase()));
  const aguardandoEmChamados = encontrados.filter(n => chamadosAtivoSet.has(n));

  const chamadosMap: Record<string, string | null> = {};
  for (const r of redmine) chamadosMap[r.numero.trim().toUpperCase()] = r.dataAbertura ? r.dataAbertura.toISOString() : null;

  // Números Redmine dos "encontrados" (para filtro IN — eficiente)
  const resolvidosRedmineNums = [...new Set(encontrados.map(a => assystToRedmineMap.get(a)).filter(Boolean) as string[])];

  // Export mode — retorna todos os registros encontrados para XLS
  if (exportAll) {
    const todos = resolvidosRedmineNums.length > 0
      ? await prisma.redmineResolvido.findMany({ where: { numeroRedmine: { in: resolvidosRedmineNums } }, orderBy: { id: "asc" } })
      : [];
    return NextResponse.json({ resolvidos: todos, esquecidos, encontrados, aguardandoEmChamados, totalRedmine: redmine.length, chamadosMap, resolvidosRedmineNums });
  }

  // Registros paginados — filtrados pelos encontrados + busca opcional
  const baseWhere = resolvidosRedmineNums.length > 0 ? { numeroRedmine: { in: resolvidosRedmineNums } } : {};
  const buscaWhere = busca ? {
    OR: [
      { numeroRedmine: { contains: busca, mode: "insensitive" as const } },
      { numerosAssyst: { contains: busca, mode: "insensitive" as const } },
      { titulo: { contains: busca, mode: "insensitive" as const } },
    ],
  } : null;
  const where = buscaWhere ? { AND: [baseWhere, buscaWhere] } : baseWhere;

  const [totalResolvidos, resolvidos] = await Promise.all([
    prisma.redmineResolvido.count({ where }),
    prisma.redmineResolvido.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * PAGE_SIZE_GET, take: PAGE_SIZE_GET }),
  ]);

  return NextResponse.json({
    resolvidos, esquecidos, encontrados, aguardandoEmChamados,
    totalRedmine: redmine.length, chamadosMap, resolvidosRedmineNums,
    totalResolvidos, page, totalPages: Math.max(1, Math.ceil(totalResolvidos / PAGE_SIZE_GET)),
  });
}

export async function POST(request: NextRequest) {
  const text = await request.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });

  const headers = rows[0].map(norm);
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = n === ""
        ? headers.findIndex(h => h === "")   // exact match para header "#" que vira ""
        : headers.findIndex(h => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };

  const iId = idx(["chamadoredmine", "redmine", "", "numero", "id"]);
  const iAssyst = idx(["assyst", "nchamado", "chamado"]);
  const iTipo = idx(["tipo"]);
  const iSit = idx(["situacao", "situac"]);
  const iTitulo = idx(["titulo", "title"]);
  const iDesc = idx(["descricao", "descri", "description"]);
  const iNota = idx(["ultimasnota", "notas", "nota"]);

  const expectedCols = rows[0].length; // número de colunas do header

  const registros = [];
  for (let i = 1; i < rows.length; i++) {
    let r = rows[i];
    if (r.every(c => !c)) continue;

    // Se a linha tem mais colunas que o header, é porque a célula Assyst (col iAssyst)
    // continha o delimitador sem aspas e foi dividida em vários campos.
    // Remonta: mantém col 0 (Redmine#), junta as extras de volta no campo Assyst com ";",
    // e preserva as últimas (expectedCols - iAssyst - 1) colunas na posição correta.
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
      tipo: r[iTipo]?.trim() || null,
      situacao: r[iSit]?.trim() || null,
      titulo: r[iTitulo]?.trim() || null,
      descricao: r[iDesc]?.trim() || null,
      ultimasNotas: r[iNota]?.trim() || null,
    });
  }

  const { searchParams } = new URL(request.url);
  const substituir = searchParams.get("substituir") !== "0";

  let insertData = registros;
  let skipped = 0;
  let protegidos = 0;

  if (substituir) {
    // Protege registros cujos Assysts ainda estão na fila de Chamados
    const [chamadosAtivos, existingResolvidos] = await Promise.all([
      prisma.chamado.findMany({ select: { referencia: true } }),
      prisma.redmineResolvido.findMany({ select: { id: true, numeroRedmine: true, numerosAssyst: true } }),
    ]);
    const chamadosAtivoSet = new Set(chamadosAtivos.map(c => c.referencia.trim().toUpperCase()));

    const protegidosSet = new Set<string>();
    const idsParaRemover: number[] = [];
    for (const r of existingResolvidos) {
      const assysts = r.numerosAssyst.split(/[;/,|\\]|\s+e\s+/i).map(s => s.trim().toUpperCase()).filter(Boolean);
      if (assysts.some(a => chamadosAtivoSet.has(a))) {
        protegidosSet.add(r.numeroRedmine);
      } else {
        idsParaRemover.push(r.id);
      }
    }
    if (idsParaRemover.length > 0) {
      await prisma.redmineResolvido.deleteMany({ where: { id: { in: idsParaRemover } } });
    }
    // Não insere registros já protegidos (evita duplicata)
    insertData = registros.filter(r => !protegidosSet.has(r.numeroRedmine));
    protegidos = protegidosSet.size;
  } else {
    const existing = await prisma.redmineResolvido.findMany({ select: { numeroRedmine: true } });
    const existingSet = new Set(existing.map(e => e.numeroRedmine));
    insertData = registros.filter(r => !existingSet.has(r.numeroRedmine));
    skipped = registros.length - insertData.length;
  }

  const BATCH = 500;
  for (let i = 0; i < insertData.length; i += BATCH) {
    await prisma.redmineResolvido.createMany({ data: insertData.slice(i, i + BATCH) });
  }
  return NextResponse.json({ count: insertData.length, skipped, protegidos });
}

export async function PATCH(request: NextRequest) {
  const { id, ultimasNotas } = await request.json();
  await prisma.redmineResolvido.update({ where: { id }, data: { ultimasNotas } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await prisma.redmineResolvido.deleteMany();
  return NextResponse.json({ ok: true });
}
