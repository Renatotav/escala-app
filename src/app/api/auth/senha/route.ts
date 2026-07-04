import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

function hashPwd(p: string) {
  return createHash("sha256").update(p).digest("hex");
}

export async function POST(request: NextRequest) {
  const { senhaAtual, novaSenha } = await request.json();

  if (!senhaAtual || !novaSenha || novaSenha.length < 4) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Verify current password (DB first, then env var)
  let valid = false;
  try {
    const rows = await prisma.$queryRaw<{ valor: string }[]>`
      SELECT valor FROM "ConfiguracaoSistema" WHERE chave = 'senha_admin' LIMIT 1
    `;
    if (rows.length > 0) {
      valid = hashPwd(senhaAtual) === rows[0].valor;
    } else {
      valid = senhaAtual === process.env.ADMIN_PASSWORD;
    }
  } catch {
    valid = senhaAtual === process.env.ADMIN_PASSWORD;
  }

  if (!valid) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
  }

  const hash = hashPwd(novaSenha);
  await prisma.$executeRaw`
    INSERT INTO "ConfiguracaoSistema" (chave, valor, "updatedAt")
    VALUES ('senha_admin', ${hash}, NOW())
    ON CONFLICT (chave) DO UPDATE SET valor = ${hash}, "updatedAt" = NOW()
  `;

  return NextResponse.json({ ok: true });
}
