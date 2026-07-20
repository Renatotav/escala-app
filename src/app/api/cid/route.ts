import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

type CidEntry = { codigo: string; descricao: string };

let cidCache: CidEntry[] | null = null;

function parseCsv(text: string, colCodigo: number, colDescricao: number): CidEntry[] {
  const entries: CidEntry[] = [];
  for (const line of text.split("\n").slice(1)) {
    const parts = line.split(";");
    if (parts.length <= Math.max(colCodigo, colDescricao)) continue;
    const codigo = parts[colCodigo].trim();
    const descricao = parts[colDescricao].trim();
    if (codigo && descricao) entries.push({ codigo, descricao });
  }
  return entries;
}

// [nome do arquivo, coluna código, coluna descrição]
const ARQUIVOS: [string, number, number][] = [
  ["CID-10-CATEGORIAS.CSV",    0, 2],
  ["CID-10-SUBCATEGORIAS.CSV", 0, 4],
  ["CID-O-CATEGORIAS.CSV",     0, 2],
  ["CID-O-GRUPOS.CSV",         0, 2],
];

function loadCids(): CidEntry[] {
  if (cidCache) return cidCache;

  const dataDir = join(process.cwd(), "src/app/api/cid/data");
  const entries: CidEntry[] = [];

  for (const [nome, colCod, colDesc] of ARQUIVOS) {
    try {
      const buf = readFileSync(join(dataDir, nome));
      const text = new TextDecoder("iso-8859-1").decode(buf);
      entries.push(...parseCsv(text, colCod, colDesc));
    } catch {
      // arquivo ausente — ignora
    }
  }

  // Remove duplicatas pelo código
  const seen = new Set<string>();
  cidCache = entries.filter(e => {
    if (seen.has(e.codigo)) return false;
    seen.add(e.codigo);
    return true;
  });

  return cidCache;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toUpperCase();
  const codes = searchParams.get("codes");

  const cids = loadCids();

  // Busca em lote por códigos exatos (para exibir descrições na tabela)
  if (codes) {
    const lista = codes.split(",").map(c => c.trim().toUpperCase());
    const result: Record<string, string> = {};
    for (const entry of cids) {
      if (lista.includes(entry.codigo)) result[entry.codigo] = entry.descricao;
    }
    return NextResponse.json(result);
  }

  if (q.length < 2) return NextResponse.json([]);

  // Prioriza prefixo de código, depois texto na descrição
  const porCodigo = cids.filter(c => c.codigo.startsWith(q));
  const porDescricao = cids.filter(c => !c.codigo.startsWith(q) && c.descricao.toUpperCase().includes(q));

  return NextResponse.json([...porCodigo, ...porDescricao].slice(0, 15));
}
