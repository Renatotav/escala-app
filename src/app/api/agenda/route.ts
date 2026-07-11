import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const compromissos = await prisma.compromisso.findMany({
    orderBy: [{ data: "asc" }, { horaInicio: "asc" }],
  });

  return NextResponse.json(
    compromissos.map((c) => ({
      ...c,
      data: c.data.toISOString().slice(0, 10),
    }))
  );
}

export async function POST(request: NextRequest) {
  const { titulo, data, horaInicio, horaFim, local, participantes, observacao } = await request.json();

  const compromisso = await prisma.compromisso.create({
    data: {
      titulo,
      data: new Date(data),
      horaInicio: horaInicio || null,
      horaFim: horaFim || null,
      local: local || null,
      participantes: participantes || null,
      observacao: observacao || null,
    },
  });

  return NextResponse.json({ ...compromisso, data: compromisso.data.toISOString().slice(0, 10) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id, titulo, data, horaInicio, horaFim, local, participantes, observacao } = await request.json();
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.compromisso.update({
    where: { id: Number(id) },
    data: {
      titulo,
      data: new Date(data),
      horaInicio: horaInicio || null,
      horaFim: horaFim || null,
      local: local || null,
      participantes: participantes || null,
      observacao: observacao || null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await prisma.compromisso.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
