import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prefixo = searchParams.get("prefixo") || "";
  const registros = await prisma.configuracaoSistema.findMany({
    where: prefixo ? { chave: { startsWith: prefixo } } : undefined,
  });
  const result: Record<string, unknown> = {};
  for (const r of registros) {
    if (r.chave === "senha_admin") continue;
    try { result[r.chave] = JSON.parse(r.valor); } catch { result[r.chave] = r.valor; }
  }
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const { chave, valor } = await request.json();
  if (!chave || chave === "senha_admin") {
    return NextResponse.json({ error: "Chave inválida" }, { status: 400 });
  }
  const valorStr = typeof valor === "string" ? valor : JSON.stringify(valor);
  await prisma.configuracaoSistema.upsert({
    where: { chave },
    create: { chave, valor: valorStr, updatedAt: new Date() },
    update: { valor: valorStr, updatedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
