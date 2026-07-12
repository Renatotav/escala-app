import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 /]/g, "")
    .trim();
}

const HEADER_MAP: Record<string, string> = {
  "numero do chamado": "numero",
  "data/hora da abertura": "dataAbertura",
  "equipe atribuida": "equipeAtribuida",
  "data/hora da movimentacao": "dataMovimentacao",
  "situacao regra": "situacaoRegra",
};

function cellToString(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "result" in value) return cellToString((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
  if (typeof value === "object" && "text" in value) return (value as ExcelJS.CellRichTextValue).text ?? null;
  return String(value).trim() || null;
}

function parseExcelDate(value: ExcelJS.CellValue): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const s = cellToString(value);
  if (!s) return null;
  // Try M/D/YYYY H:MM:SS AM/PM format
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();

    const name = file.name.toLowerCase();
    if (name.endsWith(".ods")) {
      await workbook.ods.load(buffer);
    } else {
      await workbook.xlsx.load(buffer);
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) return NextResponse.json({ error: "Planilha vazia" }, { status: 400 });

    // Map headers
    const headerRow = sheet.getRow(1);
    const fieldMap: (string | null)[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      const val = cellToString(cell.value) ?? "";
      fieldMap[col - 1] = HEADER_MAP[normalize(val)] ?? null;
    });

    const rows: {
      numero: string;
      dataAbertura: string | null;
      equipeAtribuida: string | null;
      dataMovimentacao: string | null;
      situacaoRegra: string | null;
    }[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, string | null> = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const field = fieldMap[col - 1];
        if (!field) return;
        if (field === "dataAbertura" || field === "dataMovimentacao") {
          obj[field] = parseExcelDate(cell.value);
        } else {
          obj[field] = cellToString(cell.value);
        }
      });
      if (obj.numero?.trim()) {
        rows.push({
          numero: obj.numero,
          dataAbertura: obj.dataAbertura ?? null,
          equipeAtribuida: obj.equipeAtribuida ?? null,
          dataMovimentacao: obj.dataMovimentacao ?? null,
          situacaoRegra: obj.situacaoRegra ?? null,
        });
      }
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nenhum chamado encontrado. Verifique se os cabeçalhos estão corretos." }, { status: 400 });
    }

    await prisma.chamadoRedmine.deleteMany({});
    await prisma.chamadoRedmine.createMany({ data: rows.map(r => ({
      numero: r.numero,
      dataAbertura: r.dataAbertura ? new Date(r.dataAbertura) : null,
      equipeAtribuida: r.equipeAtribuida || null,
      dataMovimentacao: r.dataMovimentacao ? new Date(r.dataMovimentacao) : null,
      situacaoRegra: r.situacaoRegra || null,
    })) });

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Erro ao processar arquivo" }, { status: 500 });
  }
}
