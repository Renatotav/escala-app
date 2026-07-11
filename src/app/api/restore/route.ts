import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const execAsync = promisify(exec);

function hashPwd(p: string) {
  return createHash("sha256").update(p).digest("hex");
}

async function verificarSenha(senha: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ valor: string }[]>`
      SELECT valor FROM "ConfiguracaoSistema" WHERE chave = 'senha_admin' LIMIT 1
    `;
    if (rows.length > 0) return hashPwd(senha) === rows[0].valor;
    return senha === process.env.ADMIN_PASSWORD;
  } catch {
    return senha === process.env.ADMIN_PASSWORD;
  }
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const senha = String(form.get("senha") ?? "");
  const confirmacao = String(form.get("confirmacao") ?? "");
  const arquivo = form.get("arquivo");

  if (confirmacao !== "RESTAURAR") {
    return NextResponse.json({ error: "Digite RESTAURAR para confirmar" }, { status: 400 });
  }
  if (!(await verificarSenha(senha))) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return NextResponse.json({ error: "DATABASE_URL não configurada" }, { status: 500 });

  const raw = await arquivo.text();
  const conteudo = raw
    .split("\n")
    .filter((l) => !l.startsWith("\\restrict") && !l.startsWith("\\unrestrict"))
    .join("\n");

  const sql = `DROP SCHEMA public CASCADE;\nCREATE SCHEMA public;\n${conteudo}`;

  const tmpPath = path.join(os.tmpdir(), `restore-${randomBytes(8).toString("hex")}.sql`);
  await writeFile(tmpPath, sql, "utf-8");

  try {
    await execAsync(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -f "${tmpPath}"`, { maxBuffer: 100 * 1024 * 1024 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}