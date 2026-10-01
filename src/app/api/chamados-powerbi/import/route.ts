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
  "numero do chamado":             "numero",
  "data/hora da abertura":         "dataAbertura",
  "equipe atribuida":              "equipeAtribuida",
  "nome do usuario atribuido":     "usuarioAtribuido",
  "usuario atribuido":             "usuarioAtribuido",
  "atribuido a":                   "usuarioAtribuido",
  "data/hora da movimentacao":     "dataMovimentacao",
  "situacao regra":                "situacaoRegra",
};

const COL_G = 6;

function toIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S)).toISOString();
  }
  if (typeof value === "string") {
    const d = new Date(value.trim());
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

type RawRow = {
  numero: string;
  dataAbertura: string | null;
  equipeAtribuida: string | null;
  usuarioAtribuido: string | null;
  dataMovimentacao: string | null;
  situacaoRegra: string | null;
};

function buildFinalRows(rawRows: RawRow[]) {
  // Agrupa todas as movimentações por número de chamado
  const grouped = new Map<string, RawRow[]>();
  for (const row of rawRows) {
    if (!grouped.has(row.numero)) grouped.set(row.numero, []);
    grouped.get(row.numero)!.push(row);
  }

  const result: RawRow[] = [];
  for (const [numero, movs] of grouped) {
    // Ordena por dataMovimentacao crescente (mais antiga primeiro)
    movs.sort((a, b) => {
      const da = a.dataMovimentacao ? new Date(a.dataMovimentacao).getTime() : 0;
      const db = b.dataMovimentacao ? new Date(b.dataMovimentacao).getTime() : 0;
      return da - db;
    });

    const lastMov = movs[movs.length - 1];
    const currentUser = lastMov.usuarioAtribuido?.trim().toUpperCase() ?? null;
    const currentStatus = lastMov.situacaoRegra;
    const currentEquipe = lastMov.equipeAtribuida;
    const dataAbertura = movs[0].dataAbertura;

    // Primeira vez que o usuário atual foi atribuído ao chamado
    let dataMovimentacao: string | null = null;
    if (currentUser) {
      const firstMatch = movs.find(m => m.usuarioAtribuido?.trim().toUpperCase() === currentUser);
      dataMovimentacao = firstMatch?.dataMovimentacao ?? null;
    }
    if (!dataMovimentacao) dataMovimentacao = movs[0].dataMovimentacao;

    result.push({ numero, dataAbertura, equipeAtribuida: currentEquipe, usuarioAtribuido: lastMov.usuarioAtribuido, dataMovimentacao, situacaoRegra: currentStatus });
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return NextResponse.json({ error: "Planilha vazia" }, { status: 400 });

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
    if (rawRows.length < 2) return NextResponse.json({ error: "Nenhuma linha encontrada" }, { status: 400 });

    const headerRow = rawRows[0] as unknown[];
    const fieldMap: (string | null)[] = headerRow.map(h => HEADER_MAP[normalize(String(h ?? ""))] ?? null);
    const hasUserCol = fieldMap.includes("usuarioAtribuido");

    const parsed: RawRow[] = [];
    for (let i = 1; i < rawRows.length; i++) {
      const cols = rawRows[i] as unknown[];
      const obj: Record<string, unknown> = {};
      for (let j = 0; j < fieldMap.length; j++) {
        const field = fieldMap[j];
        if (!field) continue;
        obj[field] = cols[j] ?? null;
      }
      if (!hasUserCol && cols.length > COL_G) obj.usuarioAtribuido = cols[COL_G] ?? null;

      const numero = String(obj.numero ?? "").trim();
      if (!numero || numero.includes(" ")) continue;

      parsed.push({
        numero,
        dataAbertura: toIso(obj.dataAbertura),
        equipeAtribuida: obj.equipeAtribuida ? String(obj.equipeAtribuida).trim() : null,
        usuarioAtribuido: obj.usuarioAtribuido ? String(obj.usuarioAtribuido).trim() : null,
        dataMovimentacao: toIso(obj.dataMovimentacao),
        situacaoRegra: obj.situacaoRegra ? String(obj.situacaoRegra).trim() : null,
      });
    }

    if (parsed.length === 0) {
      return NextResponse.json({ error: "Nenhum chamado encontrado. Verifique os cabeçalhos do arquivo." }, { status: 400 });
    }

    // Agrupa movimentações → 1 linha por chamado com primeira atribuição
    const finalRows = buildFinalRows(parsed);
    const substituir = formData.get("substituir") !== "0";

    let insertRows = finalRows;
    let skipped = 0;

    if (substituir) {
      await prisma.chamadoPowerbi.deleteMany({});
    } else {
      const existing = await prisma.chamadoPowerbi.findMany({ select: { numero: true } });
      const existingSet = new Set(existing.map(e => e.numero));
      insertRows = finalRows.filter(r => !existingSet.has(r.numero));
      skipped = finalRows.length - insertRows.length;
    }

    await prisma.chamadoPowerbi.createMany({
      data: insertRows.map(r => ({
        numero: r.numero,
        dataAbertura: r.dataAbertura ? new Date(r.dataAbertura) : null,
        equipeAtribuida: r.equipeAtribuida || null,
        usuarioAtribuido: r.usuarioAtribuido || null,
        dataMovimentacao: r.dataMovimentacao ? new Date(r.dataMovimentacao) : null,
        situacaoRegra: r.situacaoRegra || null,
      })),
    });

    return NextResponse.json({ ok: true, count: insertRows.length, skipped });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Import error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
