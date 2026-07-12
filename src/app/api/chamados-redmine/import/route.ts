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
  "numero do chamado":          "numero",
  "data/hora da abertura":      "dataAbertura",
  "equipe atribuida":           "equipeAtribuida",
  "data/hora da movimentacao":  "dataMovimentacao",
  "situacao regra":             "situacaoRegra",
};

function toIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  // Excel serial date (number)
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) {
      const dt = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, d.S));
      return dt.toISOString();
    }
  }
  // String date e.g. "8/12/2024 3:51:56 PM"
  if (typeof value === "string") {
    const d = new Date(value.trim());
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
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
    // header:1 → array de arrays; primeira linha é o cabeçalho
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

    if (rawRows.length < 2) return NextResponse.json({ error: "Nenhuma linha encontrada" }, { status: 400 });

    const headerRow = rawRows[0] as unknown[];
    const fieldMap: (string | null)[] = headerRow.map(h =>
      HEADER_MAP[normalize(String(h ?? ""))] ?? null
    );

    const rows: {
      numero: string;
      dataAbertura: string | null;
      equipeAtribuida: string | null;
      dataMovimentacao: string | null;
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
      const numero = String(obj.numero ?? "").trim();
      // Ignora linhas de metadados do Power BI: número não pode ter espaços
      if (!numero || numero.includes(" ")) continue;
      rows.push({
        numero,
        dataAbertura: toIso(obj.dataAbertura),
        equipeAtribuida: obj.equipeAtribuida ? String(obj.equipeAtribuida).trim() : null,
        dataMovimentacao: toIso(obj.dataMovimentacao),
        situacaoRegra: obj.situacaoRegra ? String(obj.situacaoRegra).trim() : null,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({
        error: "Nenhum chamado encontrado. Verifique se os cabeçalhos do arquivo correspondem aos esperados.",
      }, { status: 400 });
    }

    await prisma.chamadoRedmine.deleteMany({});
    await prisma.chamadoRedmine.createMany({
      data: rows.map(r => ({
        numero: r.numero,
        dataAbertura: r.dataAbertura ? new Date(r.dataAbertura) : null,
        equipeAtribuida: r.equipeAtribuida || null,
        dataMovimentacao: r.dataMovimentacao ? new Date(r.dataMovimentacao) : null,
        situacaoRegra: r.situacaoRegra || null,
      })),
    });

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Import error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
