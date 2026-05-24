import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const equipes = await prisma.equipe.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(equipes);
}

export async function POST(request: NextRequest) {
  const { nome, thresholdAmarelo, thresholdVerde } = await request.json();
  const equipe = await prisma.equipe.create({
    data: { nome, thresholdAmarelo, thresholdVerde },
  });
  return NextResponse.json(equipe, { status: 201 });
}
