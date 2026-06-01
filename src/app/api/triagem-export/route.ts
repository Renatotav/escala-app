export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Fill = {
  type: "pattern";
  pattern: "solid";
  fgColor: { argb: string };
};

const AMARELO: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
const LARANJA_CELULA: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFBF86" } };
const AZUL_CELULA: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB8D0E8" } };
const VERDE_CELULA: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
const ROXO_CELULA: Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2CFED" } };

function equipeFill(nome: string): Fill | undefined {
  const n = nome.toUpperCase();
  if (n.includes("ERRO") || n.includes("FALHA") || n.includes("ORIENTA")) return LARANJA_CELULA;
  if (n.includes("CADASTRO")) return AZUL_CELULA;
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
  try {
    const ExcelJS = (await import("exceljs")).default;

    const colaboradores = await prisma.colaborador.findMany({
      where: { ativo: true },
      include: {
        equipe: true,
        ControleTriagem: { orderBy: { dataInicio: "desc" } },
      },
      orderBy: { nome: "asc" },
    });

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

    const thinBorder = { style: "thin" as const };
    const border = {
      top: thinBorder, bottom: thinBorder,
      left: thinBorder, right: thinBorder,
    };

    function addSection(titulo: string, pessoas: typeof colaboradores) {
      if (pessoas.length === 0) return;

      const hRow = ws.addRow([titulo, "Período", "Equipe 1", "Equipe 2", "Equipe 3"]);
      hRow.height = 18;
      hRow.eachCell(cell => {
        cell.fill = AMARELO;
        cell.font = { bold: true, size: 10, color: { argb: "FF000000" } };
        cell.border = border;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      hRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

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

        const fill = equipeFill(equipeNome);
        if (fill) {
          dRow.getCell(3).fill = fill;
          dRow.getCell(3).font = { bold: true, size: 10 };
        }
      }

      ws.addRow([]);
    }

    addSection("Assistentes fora da listagem de distribuição de chamados - Balcão Virtual", foraBalcao);
    addSection("Assistentes fora da listagem de distribuição de chamados", foraDemais);
    addSection("Assistentes com distribuição específica de chamados", distribuicaoEspecifica);

    const buffer = await wb.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer as Buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="triagem_${date}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[triagem-export]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
