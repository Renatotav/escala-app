import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 /]/g, "")
    .trim();
}

const HEADER_MAP: Record<string, string> = {
  "numero do chamado":          "numeroChamado",
  "data/hora da abertura":      "dataAbertura",
  "equipe atribuida":           "equipeAtribuida",
  "usuario atribuido":          "usuarioAtribuido",
  "usuario fechamento":         "usuarioFechamento",
  "data/hora da resolucao":     "dataResolucao",
  "pausa":                      "pausa",
  "situacao regra":             "situacaoRegra",
};

function toIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) {
      const dt = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S));
      return dt.toISOString();
    }
  }
  if (typeof value === "string") {
    const d = new Date(value.trim());
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const substituirParam = searchParams.get("substituir");

    const arrayBuf = await request.arrayBuffer();
    if (!arrayBuf || arrayBuf.byteLength === 0)
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

    const buffer = Buffer.from(arrayBuf);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return NextResponse.json({ error: "Planilha vazia" }, { status: 400 });

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

    if (rawRows.length < 2) return NextResponse.json({ error: "Nenhuma linha encontrada" }, { status: 400 });

    const headerRow = rawRows[0] as unknown[];
    const fieldMap: (string | null)[] = headerRow.map(h =>
      HEADER_MAP[normalize(String(h ?? ""))] ?? null
    );

    const rows: {
      numeroChamado: string;
      dataAbertura: string | null;
      equipeAtribuida: string | null;
      usuarioAtribuido: string | null;
      usuarioFechamento: string | null;
      dataResolucao: string | null;
      pausa: string | null;
      situacaoRegra: string | null;
    }[] = [];

    for (let i = 1; i < rawRows.length; i++) {
      const cols = rawRows[i] as unknown[];
      const obj: Record<string, unknown> = {};
      for (let j = 0; j < fieldMap.length; j++) {
        const field = fieldMap[j];
        if (!field) continue;
        obj[field] = cols[j] ?? null;
      }
      const numeroChamado = String(obj.numeroChamado ?? "").trim();
      if (!numeroChamado || numeroChamado.includes(" ")) continue;
      rows.push({
        numeroChamado,
        dataAbertura: toIso(obj.dataAbertura),
        equipeAtribuida: obj.equipeAtribuida ? String(obj.equipeAtribuida).trim() : null,
        usuarioAtribuido: obj.usuarioAtribuido ? String(obj.usuarioAtribuido).trim() : null,
        usuarioFechamento: obj.usuarioFechamento ? String(obj.usuarioFechamento).trim() : null,
        dataResolucao: toIso(obj.dataResolucao),
        pausa: obj.pausa ? String(obj.pausa).trim() : null,
        situacaoRegra: obj.situacaoRegra ? String(obj.situacaoRegra).trim() : null,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({
        error: "Nenhum registro encontrado. Verifique se os cabeçalhos do arquivo correspondem aos esperados.",
      }, { status: 400 });
    }

    const substituir = substituirParam !== "0";

    // Deduplica por numeroChamado — mantém a última ocorrência de cada número
    const deduped = new Map<string, typeof rows[0]>();
    for (const r of rows) deduped.set(r.numeroChamado, r);
    const uniqueRows = [...deduped.values()];
    const duplicatesRemoved = rows.length - uniqueRows.length;

    let insertRows = uniqueRows;
    let skipped = duplicatesRemoved;

    if (substituir) {
      await prisma.produtividade.deleteMany({});
    } else {
      const existing = await prisma.produtividade.findMany({ select: { numeroChamado: true } });
      const existingSet = new Set(existing.map(e => e.numeroChamado));
      insertRows = uniqueRows.filter(r => !existingSet.has(r.numeroChamado));
      skipped = duplicatesRemoved + (uniqueRows.length - insertRows.length);
    }

    await prisma.produtividade.createMany({
      data: insertRows.map(r => ({
        numeroChamado: r.numeroChamado,
        dataAbertura: r.dataAbertura ? new Date(r.dataAbertura) : null,
        equipeAtribuida: r.equipeAtribuida || null,
        usuarioAtribuido: r.usuarioAtribuido || null,
        usuarioFechamento: r.usuarioFechamento || null,
        dataResolucao: r.dataResolucao ? new Date(r.dataResolucao) : null,
        pausa: r.pausa || null,
        situacaoRegra: r.situacaoRegra || null,
      })),
    });

    return NextResponse.json({ ok: true, count: insertRows.length, skipped });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Import produtividade error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
