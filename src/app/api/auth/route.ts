import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

function hashPwd(p: string) {
  return createHash("sha256").update(p).digest("hex");
}

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  // Check if a custom password is stored in DB (overrides env var)
  let valid = false;
  try {
    const rows = await prisma.$queryRaw<{ valor: string }[]>`
      SELECT valor FROM "ConfiguracaoSistema" WHERE chave = 'senha_admin' LIMIT 1
    `;
    if (rows.length > 0) {
      valid = hashPwd(password) === rows[0].valor;
    } else {
      valid = password === process.env.ADMIN_PASSWORD;
    }
  } catch {
    // Table may not exist yet on first deploy — fall back to env var
    valid = password === process.env.ADMIN_PASSWORD;
  }

  if (!valid) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}
