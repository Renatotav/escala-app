import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = randomBytes(24).toString("base64url");
  const colaborador = await prisma.colaborador.update({
    where: { id: Number(id) },
    data: { tokenAtendimento: token },
  });
  return NextResponse.json({ token: colaborador.tokenAtendimento });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.colaborador.update({
    where: { id: Number(id) },
    data: { tokenAtendimento: null },
  });
  return NextResponse.json({ ok: true });
}