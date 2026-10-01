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
  "contador acao":              "contadorAcao",
  "contador de acao":           "contadorAcao",
  "contador":                   "contadorAcao",
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
  tmrExclusivoHoras: number | null;
  contadorAcao: number | null;
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
    // Ordena por dataMovimentacao crescente; "Contador Ação" como desempate
    // para linhas com mesma data (a planilha vem ordenada por equipe, não por data)
    movs.sort((a, b) => {
      const da = a.dataMovimentacao ? new Date(a.dataMovimentacao).getTime() : 0;
      const db = b.dataMovimentacao ? new Date(b.dataMovimentacao).getTime() : 0;
      if (da !== db) return da - db;
      return (a.contadorAcao ?? 0) - (b.contadorAcao ?? 0);
    });

    // Remove linhas duplicadas por equipe: Power BI exporta o mesmo movimento
    // uma vez por equipe atribuída, então (dataMovimentacao + usuarioAtribuido) iguais
    // representam o mesmo evento e devem ser contados apenas uma vez.
    const seenMovKey = new Set<string>();
    const deduped = movs.filter(m => {
      const key = `${m.dataMovimentacao ?? ""}|${(m.usuarioAtribuido ?? "").trim().toUpperCase()}`;
      if (seenMovKey.has(key)) return false;
      seenMovKey.add(key);
      return true;
    });

    const lastMov = deduped[deduped.length - 1];

    // Resolver = usuarioFechamento de qualquer linha que tenha
    const resolver = deduped.find(m => m.usuarioFechamento)?.usuarioFechamento?.trim().toUpperCase() ?? null;

    // Primeira vez que o resolver foi atribuído (usuarioAtribuido) a este chamado
    let dataMovimentacao: string | null = null;
    if (resolver) {
      const firstMatch = deduped.find(m => m.usuarioAtribuido?.trim().toUpperCase() === resolver);
      dataMovimentacao = firstMatch?.dataMovimentacao ?? null;
    }
    // Fallback: quando o resolver nunca apareceu em "Usuário Atribuido", usa a data de resolução
    // (chamado foi ao REDMINES ou aberto diretamente pela triagem — ela pegou para fechar)
    if (!dataMovimentacao) dataMovimentacao = lastMov.dataResolucao ?? lastMov.dataMovimentacao ?? deduped[0].dataMovimentacao;

    // Calcula o tempo exclusivo com o resolver (soma dos períodos em que estava com ele)
    let tmrExclusivoHoras: number | null = null;
    const dataResolucaoFinal = deduped.find(m => m.dataResolucao)?.dataResolucao ?? null;
    if (resolver && dataResolucaoFinal) {
      let totalH = 0;
      let periodStart: Date | null = null;
      for (const m of deduped) {
        const isHis = m.usuarioAtribuido?.trim().toUpperCase() === resolver;
        const movDate = m.dataMovimentacao ? new Date(m.dataMovimentacao) : null;
        if (isHis && !periodStart && movDate) {
          periodStart = movDate;
        } else if (!isHis && periodStart && movDate) {
          totalH += (movDate.getTime() - periodStart.getTime()) / 3_600_000;
          periodStart = null;
        }
      }
      // Último período: fecha na data de resolução
      if (periodStart) {
        const diff = (new Date(dataResolucaoFinal).getTime() - periodStart.getTime()) / 3_600_000;
        if (diff > 0) totalH += diff;
      }
      if (totalH > 0) tmrExclusivoHoras = totalH;
    }

    result.push({
      numeroChamado,
      dataAbertura: deduped[0].dataAbertura,
      dataMovimentacao,
      equipeAtribuida: lastMov.equipeAtribuida,
      usuarioAtribuido: lastMov.usuarioAtribuido,
      usuarioFechamento: lastMov.usuarioFechamento || deduped.find(m => m.usuarioFechamento)?.usuarioFechamento || null,
      dataResolucao: deduped.find(m => m.dataResolucao)?.dataResolucao ?? null,
      pausa: lastMov.pausa,
      situacaoRegra: lastMov.situacaoRegra,
      tmrExclusivoHoras,
      contadorAcao: null,
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
      const contadorRaw = obj.contadorAcao;
      const contadorAcao = contadorRaw !== null && contadorRaw !== undefined && contadorRaw !== ""
        ? Number(contadorRaw) || null
        : null;
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
        tmrExclusivoHoras: null,
        contadorAcao,
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
      // Upsert: remove registros existentes que estão na importação, depois re-insere todos.
      // Isso permite acumular meses sem perder dados já importados.
      const incomingNums = finalRows.map(r => r.numeroChamado);
      const existing = await prisma.produtividade.findMany({
        select: { numeroChamado: true },
        where: { numeroChamado: { in: incomingNums } },
      });
      const existingSet = new Set(existing.map(e => e.numeroChamado));
      if (existingSet.size > 0) {
        await prisma.produtividade.deleteMany({ where: { numeroChamado: { in: [...existingSet] } } });
      }
      skipped = existingSet.size; // registros atualizados (já existiam)
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
        tmrExclusivoHoras: r.tmrExclusivoHoras ?? null,
      })),
    });

    return NextResponse.json({ ok: true, count: insertRows.length, skipped });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Import produtividade error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
