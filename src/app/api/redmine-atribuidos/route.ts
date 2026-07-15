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

export async function GET() {
  const [registros, chamadosRedmine] = await Promise.all([
    prisma.redmineAtribuido.findMany({ orderBy: { id: "asc" } }),
    prisma.chamadoRedmine.findMany({ select: { numero: true } }),
  ]);
  const assystAtivos = new Set(chamadosRedmine.map(c => c.numero.trim().toUpperCase()));
  return NextResponse.json({ registros, assystAtivos: [...assystAtivos] });
}

export async function POST(request: NextRequest) {
  const text = await request.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });

  const headers = rows[0].map(norm);
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = n === ""
        ? headers.findIndex(h => h === "")
        : headers.findIndex(h => h.includes(n));
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

  // Busca todos os existentes para fazer upsert preservando marcações
  const existing = await prisma.redmineAtribuido.findMany({
    select: { id: true, numeroRedmine: true, solicitadoEm: true, solicitadoObs: true },
  });
  const existingMap = new Map(existing.map(e => [e.numeroRedmine, e]));
  const numerosImportados = new Set(registros.map(r => r.numeroRedmine));

  const paraAtualizar = registros.filter(r => existingMap.has(r.numeroRedmine));
  const paraInserir   = registros.filter(r => !existingMap.has(r.numeroRedmine));

  // Atualiza dados Redmine dos existentes, preserva marcações manuais
  await Promise.all(paraAtualizar.map(r => {
    const ex = existingMap.get(r.numeroRedmine)!;
    return prisma.redmineAtribuido.update({
      where: { id: ex.id },
      data: {
        numerosAssyst: r.numerosAssyst,
        criadoEm:      r.criadoEm,
        alteradoEm:    r.alteradoEm,
        tipo:          r.tipo,
        situacao:      r.situacao,
        titulo:        r.titulo,
        atribuidoPara: r.atribuidoPara,
        descricao:     r.descricao,
        ultimasNotas:  r.ultimasNotas,
        // solicitadoEm e solicitadoObs NÃO são tocados
      },
    });
  }));

  // Insere os novos
  if (paraInserir.length > 0) {
    await prisma.redmineAtribuido.createMany({ data: paraInserir });
  }

  // Substituir: remove tickets que não vieram no novo CSV (saíram da fila)
  // MAS preserva tickets com 📌 marcação ativa — podem estar em trânsito com a TI
  if (substituir) {
    const idsParaRemover = existing
      .filter(e => !numerosImportados.has(e.numeroRedmine) && !e.solicitadoEm)
      .map(e => e.id);
    if (idsParaRemover.length > 0) {
      await prisma.redmineAtribuido.deleteMany({ where: { id: { in: idsParaRemover } } });
    }
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
