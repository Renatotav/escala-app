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

  const data = chamados.map((c) => ({
    referencia: c.referencia ?? "",
    alerta: c.alerta ?? null,
    nivelEscalacao: c.nivelEscalacao != null ? Number(c.nivelEscalacao) : null,
    estado: c.estado ?? null,
    dataRegistro: c.dataRegistro ? new Date(c.dataRegistro) : null,
    nomeAfetado: c.nomeAfetado ?? null,
    nomeSecao: c.nomeSecao ?? null,
    nomeItem: c.nomeItem ?? null,
    nomeCategoria: c.nomeCategoria ?? null,
    nomeDpsAtribuido: c.nomeDpsAtribuido ?? null,
    nomeUsuarioAtribuido: c.nomeUsuarioAtribuido ?? null,
    ultimaAcao: c.ultimaAcao ?? null,
  }));

  const result = await prisma.chamado.createMany({ data });
  return NextResponse.json({ ok: true, count: result.count });
}
