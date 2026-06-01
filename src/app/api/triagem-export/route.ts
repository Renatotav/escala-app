import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const AMARELO: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
const LARANJA: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
const AZUL_CLARO: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB8CCE4" } };
const LARANJA_CELULA: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFBF86" } };
const AZUL_CELULA: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB8D0E8" } };
const VERDE_CELULA: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
const ROXO_CELULA: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2CFED" } };

function equipeFill(nome: string): ExcelJS.Fill | undefined {
  const n = nome.toUpperCase();
  if (n.includes("ERRO") || n.includes("FALHA")) return LARANJA_CELULA;
  if (n.includes("CADASTRO")) return AZUL_CELULA;
  if (n.includes("ORIENTA")) return LARANJA_CELULA;
  if (n.includes("MIGRA")) return VERDE_CELULA;
  if (n.includes("BALC")) return ROXO_CELULA;
  return undefined;
}

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
}

function periodo(inicio: Date, fim: Date | null): string {
  if (!fim) return "Tempo indeterminado";
  return `${fmt(inicio)} - ${fmt(fim)}`;
}

function isAtivo(inicio: Date, fim: Date | null): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return !fim || fim >= hoje;
}

export async function GET() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true },
    include: {
      equipe: true,
      ControleTriagem: { orderBy: { dataInicio: "desc" } },
    },
    orderBy: { nome: "asc" },
  });

  // Separar em seções
  function getAtivo(c: typeof colaboradores[0]) {
    return c.ControleTriagem.find(r => isAtivo(r.dataInicio, r.dataFim)) ?? null;
  }

  const foraBalcao = colaboradores.filter(c => {
    const r = getAtivo(c);
    return r && c.equipe.nome.toUpperCase().includes("BALC");
  });

  const foraDemais = colaboradores.filter(c => {
    const r = getAtivo(c);
    return r && !c.equipe.nome.toUpperCase().includes("BALC") &&
      ["ATESTADO", "DECLARACAO"].includes(r.motivo);
  });

  const distribuicaoEspecifica = colaboradores.filter(c => {
    const r = getAtivo(c);
    return r && ["QUANTIDADE_CHAMADOS", "ATENDIMENTO_PRESENCIAL"].includes(r.motivo);
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Triagem");

  ws.columns = [
    { key: "nome", width: 45 },
    { key: "periodo", width: 22 },
    { key: "eq1", width: 24 },
    { key: "eq2", width: 24 },
    { key: "eq3", width: 12 },
  ];

  const headerBold: Partial<ExcelJS.Font> = { bold: true, size: 10 };
  const border: Partial<ExcelJS.Borders> = {
    top: { style: "thin" }, bottom: { style: "thin" },
    left: { style: "thin" }, right: { style: "thin" },
  };

  function addSection(titulo: string, pessoas: typeof colaboradores) {
    if (pessoas.length === 0) return;

    // Header row (seção + colunas na mesma linha, como na planilha)
    const hRow = ws.addRow([titulo, "Período", "Equipe 1", "Equipe 2", "Equipe 3"]);
    hRow.eachCell(cell => {
      cell.fill = AMARELO;
      cell.font = { ...headerBold, color: { argb: "FF000000" } };
      cell.border = border;
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    });
    hRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    hRow.height = 18;

    // Data rows
    for (const c of pessoas) {
      const r = getAtivo(c)!;
      const equipeNome = c.equipe.nome.toUpperCase();
      const dRow = ws.addRow([
        c.nome.toUpperCase(),
        periodo(r.dataInicio, r.dataFim),
        equipeNome,
        "-",
        "-",
      ]);

      dRow.height = 16;
      dRow.eachCell(cell => {
        cell.border = border;
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { size: 10 };
      });
      dRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

      // Colorir célula de equipe
      const fill = equipeFill(equipeNome);
      if (fill) {
        dRow.getCell(3).fill = fill;
        dRow.getCell(3).font = { bold: true, size: 10 };
      }
    }

    ws.addRow([]); // linha vazia entre seções
  }

  addSection("Assistentes fora da listagem de distribuição de chamados - Balcão Virtual", foraBalcao);
  addSection("Assistentes fora da listagem de distribuição de chamados", foraDemais);
  addSection("Assistentes com distribuição específica de chamados", distribuicaoEspecifica);

  const buffer = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer as Buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="triagem_${date}.xlsx"`,
    },
  });
}
