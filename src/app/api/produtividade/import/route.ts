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
  "numero de chamado":          "numeroChamado",
  "numero chamado":             "numeroChamado",
  "chamado":                    "numeroChamado",
  "data/hora da abertura":      "dataAbertura",
  "data hora da abertura":      "dataAbertura",
  "data abertura":              "dataAbertura",
  "data/hora da movimentacao":  "dataMovimentacao",
  "data hora da movimentacao":  "dataMovimentacao",
  "ultima movimentacao":        "dataMovimentacao",
  "data movimentacao":          "dataMovimentacao",
  "equipe atribuida":           "equipeAtribuida",
  "equipe":                     "equipeAtribuida",
  "usuario atribuido":          "usuarioAtribuido",
  "usuario fechamento":         "usuarioFechamento",
  "data/hora da resolucao":     "dataResolucao",
  "data hora da resolucao":     "dataResolucao",
  "data resolucao":             "dataResolucao",
  "pausa":                      "pausa",
  "situacao regra":             "situacaoRegra",
  "situacao":                   "situacaoRegra",
};

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
  numeroChamado: string;
  dataAbertura: string | null;
  dataMovimentacao: string | null;
  equipeAtribuida: string | null;
  usuarioAtribuido: string | null;
  usuarioFechamento: string | null;
  dataResolucao: string | null;
  pausa: string | null;
  situacaoRegra: string | null;
};

function buildFinalRows(rawRows: RawRow[]) {
  // Agrupa todas as movimentações por número de chamado
  const grouped = new Map<string, RawRow[]>();
  for (const row of rawRows) {
    if (!grouped.has(row.numeroChamado)) grouped.set(row.numeroChamado, []);
    grouped.get(row.numeroChamado)!.push(row);
  }

  const result: RawRow[] = [];
  for (const [numeroChamado, movs] of grouped) {
    // Ordena por dataMovimentacao crescente (mais antiga primeiro)
    movs.sort((a, b) => {
      const da = a.dataMovimentacao ? new Date(a.dataMovimentacao).getTime() : 0;
      const db = b.dataMovimentacao ? new Date(b.dataMovimentacao).getTime() : 0;
      return da - db;
    });

    const lastMov = movs[movs.length - 1];

    // Resolver = usuarioFechamento de qualquer linha que tenha
    const resolver = movs.find(m => m.usuarioFechamento)?.usuarioFechamento?.trim().toUpperCase() ?? null;

    // Primeira vez que o resolver foi atribuído (usuarioAtribuido) a este chamado
    let dataMovimentacao: string | null = null;
    if (resolver) {
      const firstMatch = movs.find(m => m.usuarioAtribuido?.trim().toUpperCase() === resolver);
      dataMovimentacao = firstMatch?.dataMovimentacao ?? null;
    }
    // Fallback: última movimentação (casos onde resolver nunca foi formalmente atribuído)
    if (!dataMovimentacao) dataMovimentacao = lastMov.dataMovimentacao ?? movs[0].dataMovimentacao;

    result.push({
      numeroChamado,
      dataAbertura: movs[0].dataAbertura,
      dataMovimentacao,
      equipeAtribuida: lastMov.equipeAtribuida,
      usuarioAtribuido: lastMov.usuarioAtribuido,
      usuarioFechamento: lastMov.usuarioFechamento || movs.find(m => m.usuarioFechamento)?.usuarioFechamento || null,
      dataResolucao: lastMov.dataResolucao,
      pausa: lastMov.pausa,
      situacaoRegra: lastMov.situacaoRegra,
    });
  }
  return result;
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

    // Detecta automaticamente a linha de cabeçalho
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const row = rawRows[i] as unknown[];
      const matches = row.filter(h => HEADER_MAP[normalize(String(h ?? ""))]).length;
      if (matches >= 1) { headerRowIndex = i; break; }
    }

    const headerRow = rawRows[headerRowIndex] as unknown[];
    const fieldMap: (string | null)[] = headerRow.map(h => HEADER_MAP[normalize(String(h ?? ""))] ?? null);

    const parsed: RawRow[] = [];
    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const cols = rawRows[i] as unknown[];
      const obj: Record<string, unknown> = {};
      for (let j = 0; j < fieldMap.length; j++) {
        const field = fieldMap[j];
        if (!field) continue;
        obj[field] = cols[j] ?? null;
      }
      const numeroChamado = String(obj.numeroChamado ?? "").trim();
      if (!numeroChamado || numeroChamado.includes(" ")) continue;
      parsed.push({
        numeroChamado,
        dataAbertura: toIso(obj.dataAbertura),
        dataMovimentacao: toIso(obj.dataMovimentacao),
        equipeAtribuida: obj.equipeAtribuida ? String(obj.equipeAtribuida).trim() : null,
        usuarioAtribuido: obj.usuarioAtribuido ? String(obj.usuarioAtribuido).trim() : null,
        usuarioFechamento: obj.usuarioFechamento ? String(obj.usuarioFechamento).trim() : null,
        dataResolucao: toIso(obj.dataResolucao),
        pausa: obj.pausa ? String(obj.pausa).trim() : null,
        situacaoRegra: obj.situacaoRegra ? String(obj.situacaoRegra).trim() : null,
      });
    }

    if (parsed.length === 0) {
      return NextResponse.json({
        error: "Nenhum registro encontrado. Verifique se os cabeçalhos do arquivo correspondem aos esperados.",
      }, { status: 400 });
    }

    // Agrupa movimentações → 1 linha por chamado com primeira atribuição correta
    const finalRows = buildFinalRows(parsed);
    const substituir = substituirParam !== "0";

    let insertRows = finalRows;
    let skipped = 0;

    if (substituir) {
      await prisma.produtividade.deleteMany({});
    } else {
      const existing = await prisma.produtividade.findMany({ select: { numeroChamado: true } });
      const existingSet = new Set(existing.map(e => e.numeroChamado));
      insertRows = finalRows.filter(r => !existingSet.has(r.numeroChamado));
      skipped = finalRows.length - insertRows.length;
    }

    await prisma.produtividade.createMany({
      data: insertRows.map(r => ({
        numeroChamado: r.numeroChamado,
        dataAbertura: r.dataAbertura ? new Date(r.dataAbertura) : null,
        dataMovimentacao: r.dataMovimentacao ? new Date(r.dataMovimentacao) : null,
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
