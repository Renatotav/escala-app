import { NextRequest, NextResponse } from "next/server";

type CidEntry = { codigo: string; descricao: string };

let cidCache: CidEntry[] | null = null;
let loadingPromise: Promise<CidEntry[]> | null = null;

const BASE_URL = "https://raw.githubusercontent.com/cleytonferrari/CidDataSus/master/CIDImport/Repositorio/Resources";

async function fetchCsv(filename: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/${filename}`, { cache: "force-cache" });
  const buf = await res.arrayBuffer();
  return new TextDecoder("iso-8859-1").decode(buf);
}

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

// Cada arquivo: [nome, coluna do código, coluna da descrição]
const ARQUIVOS: [string, number, number][] = [
  ["CID-10-CATEGORIAS.CSV",    0, 2], // CAT ; CLASSIF ; DESCRICAO
  ["CID-10-SUBCATEGORIAS.CSV", 0, 4], // SUBCAT ; CLASSIF ; RESTRSEXO ; CAUSAOBITO ; DESCRICAO
  ["CID-O-CATEGORIAS.CSV",     0, 2], // CAT ; CLASSIF ; DESCRICAO (mesmo padrão)
  ["CID-O-GRUPOS.CSV",         0, 2], // CATINIC/GRUPO ; ... ; DESCRICAO
];

async function loadCids(): Promise<CidEntry[]> {
  if (cidCache) return cidCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = Promise.allSettled(
    ARQUIVOS.map(([nome, colCod, colDesc]) =>
      fetchCsv(nome).then(text => parseCsv(text, colCod, colDesc))
    )
  )
    .then(results => {
      const entries: CidEntry[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") entries.push(...r.value);
      }
      // Remove duplicatas pelo código
      const seen = new Set<string>();
      const unique = entries.filter(e => {
        if (seen.has(e.codigo)) return false;
        seen.add(e.codigo);
        return true;
      });
      cidCache = unique;
      loadingPromise = null;
      return unique;
    })
    .catch(() => {
      loadingPromise = null;
      return cidCache ?? [];
    });

  return loadingPromise;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toUpperCase();
  const codes = searchParams.get("codes");

  const cids = await loadCids();

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
