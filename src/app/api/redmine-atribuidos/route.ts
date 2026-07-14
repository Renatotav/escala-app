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
  const registros = await prisma.redmineAtribuido.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ registros });
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
  const iCriado  = idx(["criadoem", "criado", "data"]);
  const iTipo    = idx(["tipo"]);
  const iSit     = idx(["situacao", "situac"]);
  const iTitulo  = idx(["titulo", "title"]);
  const iAtrib   = idx(["atribuidopara", "atribuido", "responsavel"]);
  const iPrev    = idx(["dataprevista", "prevista", "prazo"]);
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
      tipo:         r[iTipo]?.trim()   || null,
      situacao:     r[iSit]?.trim()    || null,
      titulo:       r[iTitulo]?.trim() || null,
      atribuidoPara: r[iAtrib]?.trim() || null,
      dataPrevista:  r[iPrev]?.trim()  || null,
      descricao:    r[iDesc]?.trim()   || null,
      ultimasNotas: r[iNota]?.trim()   || null,
    });
  }

  await prisma.redmineAtribuido.deleteMany();
  await prisma.redmineAtribuido.createMany({ data: registros });
  return NextResponse.json({ count: registros.length });
}

export async function PATCH(request: NextRequest) {
  const { id, ultimasNotas } = await request.json();
  await prisma.redmineAtribuido.update({ where: { id }, data: { ultimasNotas } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await prisma.redmineAtribuido.deleteMany();
  return NextResponse.json({ ok: true });
}
