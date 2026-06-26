import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ChamadoInput = {
  referencia: string;
  alerta?: string | null;
  nivelEscalacao?: number | null;
  estado?: string | null;
  dataRegistro?: string | null;
  nomeAfetado?: string | null;
  nomeSecao?: string | null;
  nomeItem?: string | null;
  nomeCategoria?: string | null;
  nomeDpsAtribuido?: string | null;
  nomeUsuarioAtribuido?: string | null;
  ultimaAcao?: string | null;
};

export async function POST(request: NextRequest) {
  const { chamados, substituir }: { chamados: ChamadoInput[]; substituir: boolean } =
    await request.json();

  if (substituir) {
    await prisma.chamado.deleteMany();
  }

  // 1. Deduplicar dentro do próprio lote por referencia
  const seenRefs = new Set<string>();
  const dedupedInput = chamados.filter((c) => {
    const ref = c.referencia?.trim();
    if (!ref || seenRefs.has(ref)) return false;
    seenRefs.add(ref);
    return true;
  });

  const trim = (s?: string | null) => s?.trim() || null;

  const data = dedupedInput.map((c) => ({
    referencia: c.referencia ?? "",
    alerta: trim(c.alerta),
    nivelEscalacao: c.nivelEscalacao != null ? Number(c.nivelEscalacao) : null,
    estado: trim(c.estado),
    dataRegistro: c.dataRegistro ? new Date(c.dataRegistro) : null,
    nomeAfetado: trim(c.nomeAfetado),
    nomeSecao: trim(c.nomeSecao),
    nomeItem: trim(c.nomeItem),
    nomeCategoria: trim(c.nomeCategoria),
    nomeDpsAtribuido: trim(c.nomeDpsAtribuido),
    nomeUsuarioAtribuido: trim(c.nomeUsuarioAtribuido),
    ultimaAcao: trim(c.ultimaAcao),
  }));

  // 2. Se estiver adicionando (não substituindo), ignorar referências já existentes no banco
  let insertData = data;
  let skipped = chamados.length - dedupedInput.length;

  if (!substituir && data.length > 0) {
    const existingRefs = await prisma.chamado.findMany({
      select: { referencia: true },
    });
    const existingSet = new Set(existingRefs.map((r) => r.referencia));
    const filtered = data.filter((d) => !existingSet.has(d.referencia));
    skipped += data.length - filtered.length;
    insertData = filtered;
  }

  const result = insertData.length > 0
    ? await prisma.chamado.createMany({ data: insertData })
    : { count: 0 };

  return NextResponse.json({ ok: true, count: result.count, skipped });
}
