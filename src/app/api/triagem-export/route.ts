export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function xe(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cell(value: string, styleId: string): string {
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${xe(value)}</Data></Cell>`;
}

function isAtivo(inicio: Date, fim: Date | null): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return !fim || fim >= hoje;
}

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
}

function periodo(inicio: Date, fim: Date | null): string {
  return !fim ? "Tempo indeterminado" : `${fmt(inicio)} - ${fmt(fim)}`;
}

function equipeStyle(nome: string): string {
  const n = nome.toUpperCase();
  if (n.includes("ERRO") || n.includes("FALHA") || n.includes("ORIENTA")) return "sLaranja";
  if (n.includes("CADASTRO")) return "sAzul";
  if (n.includes("MIGRA")) return "sVerde";
  if (n.includes("BALC")) return "sRoxo";
  return "sData";
}

export async function GET() {
  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true },
    include: { equipe: true, ControleTriagem: { orderBy: { dataInicio: "desc" } } },
    orderBy: { nome: "asc" },
  });

  function getAtivo(c: typeof colaboradores[0]) {
    return c.ControleTriagem.find(r => isAtivo(r.dataInicio, r.dataFim)) ?? null;
  }

  const foraBalcao = colaboradores.filter(c => getAtivo(c) && c.equipe.nome.toUpperCase().includes("BALC"));
  const foraDemais = colaboradores.filter(c => {
    const r = getAtivo(c);
    return r && !c.equipe.nome.toUpperCase().includes("BALC") && ["ATESTADO", "DECLARACAO"].includes(r.motivo);
  });
  const distribuicaoEspecifica = colaboradores.filter(c => {
    const r = getAtivo(c);
    return r && ["QUANTIDADE_CHAMADOS", "ATENDIMENTO_PRESENCIAL"].includes(r.motivo);
  });

  const rows: string[] = [];

  function addSection(titulo: string, pessoas: typeof colaboradores) {
    if (pessoas.length === 0) return;
    rows.push(
      `<Row ss:Height="18">${[
        cell(titulo, "sHeader"),
        cell("Período", "sHeader"),
        cell("Equipe 1", "sHeader"),
        cell("Equipe 2", "sHeader"),
        cell("Equipe 3", "sHeader"),
      ].join("")}</Row>`
    );
    for (const c of pessoas) {
      const r = getAtivo(c)!;
      const eq = c.equipe.nome.toUpperCase();
      rows.push(
        `<Row ss:Height="16">${[
          cell(c.nome.toUpperCase(), "sData"),
          cell(periodo(r.dataInicio, r.dataFim), "sCenter"),
          cell(eq, equipeStyle(eq)),
          cell("-", "sCenter"),
          cell("-", "sCenter"),
        ].join("")}</Row>`
      );
    }
    rows.push(`<Row ss:Height="8"><Cell/></Row>`);
  }

  addSection("Assistentes fora da listagem de distribuição de chamados - Balcão Virtual", foraBalcao);
  addSection("Assistentes fora da listagem de distribuição de chamados", foraDemais);
  addSection("Assistentes com distribuição específica de chamados", distribuicaoEspecifica);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Styles>
    <Style ss:ID="sHeader">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:Bold="1" ss:Size="10"/>
      <Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sData">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:Size="10"/>
    </Style>
    <Style ss:ID="sCenter">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:Size="10"/>
    </Style>
    <Style ss:ID="sLaranja">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:Bold="1" ss:Size="10"/>
      <Interior ss:Color="#FFBF86" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sAzul">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:Bold="1" ss:Size="10"/>
      <Interior ss:Color="#B8D0E8" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sVerde">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:Bold="1" ss:Size="10"/>
      <Interior ss:Color="#C6EFCE" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sRoxo">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
      <Font ss:Bold="1" ss:Size="10"/>
      <Interior ss:Color="#E2CFED" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Triagem">
    <Table ss:DefaultColumnWidth="60"
      x:FullColumns="1" x:FullRows="1">
      <Column ss:Width="300"/>
      <Column ss:Width="140"/>
      <Column ss:Width="160"/>
      <Column ss:Width="160"/>
      <Column ss:Width="80"/>
      ${rows.join("\n      ")}
    </Table>
  </Worksheet>
</Workbook>`;

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="triagem_${date}.xls"`,
    },
  });
}
