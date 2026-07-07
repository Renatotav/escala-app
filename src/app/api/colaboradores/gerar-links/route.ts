import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const colaboradores = await prisma.colaborador.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, tokenAtendimento: true },
    orderBy: { nome: "asc" },
  });

  const semToken = colaboradores.filter((c) => !c.tokenAtendimento);
  for (const c of semToken) {
    const token = randomBytes(24).toString("base64url");
    await prisma.colaborador.update({ where: { id: c.id }, data: { tokenAtendimento: token } });
    c.tokenAtendimento = token;
  }

  return NextResponse.json({
    gerados: semToken.length,
    colaboradores: colaboradores.map((c) => ({ id: c.id, nome: c.nome, token: c.tokenAtendimento as string })),
  });
}
