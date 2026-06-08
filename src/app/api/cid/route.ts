import { NextRequest, NextResponse } from "next/server";

type CidEntry = { codigo: string; descricao: string };

let cidCache: CidEntry[] | null = null;
let loadingPromise: Promise<CidEntry[]> | null = null;

async function loadCids(): Promise<CidEntry[]> {
  if (cidCache) return cidCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch(
    "https://raw.githubusercontent.com/cleytonferrari/CidDataSus/master/CIDImport/Repositorio/Resources/CID-10-CATEGORIAS.CSV",
    { cache: "force-cache" }
  )
    .then(r => r.arrayBuffer())
    .then(buf => {
      const text = new TextDecoder("iso-8859-1").decode(buf);
      const lines = text.split("\n").slice(1); // pula header
      const entries: CidEntry[] = [];
      for (const line of lines) {
        const parts = line.split(";");
        if (parts.length < 3) continue;
        const codigo = parts[0].trim();
        const descricao = parts[2].trim();
        if (codigo && descricao) entries.push({ codigo, descricao });
      }
      cidCache = entries;
      loadingPromise = null;
      return entries;
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
  const codes = searchParams.get("codes"); // ex: "J11,F32,M54"

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

  // Autocomplete por prefixo de código ou palavra na descrição
  if (q.length < 2) return NextResponse.json([]);

  const results = cids
    .filter(c => c.codigo.startsWith(q) || c.descricao.toUpperCase().includes(q))
    .slice(0, 15);

  return NextResponse.json(results);
}
