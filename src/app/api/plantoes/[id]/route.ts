import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { folga1, folga2 } = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).plantao.update({
    where: { id: Number(id) },
    data: {
      folga1: folga1 ? new Date(folga1) : null,
      folga2: folga2 ? new Date(folga2) : null,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).plantao.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
