import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getSession } from "@/lib/auth";

const execAsync = promisify(exec);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return NextResponse.json({ error: "DATABASE_URL não configurada" }, { status: 500 });

  try {
    const { stdout } = await execAsync(`pg_dump "${dbUrl}"`, { maxBuffer: 100 * 1024 * 1024 });
    const date = new Date().toISOString().slice(0, 10);
    return new Response(stdout, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="backup_${date}.sql"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
