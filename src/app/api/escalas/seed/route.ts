import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint de carga única para corrigir semanasPresencial de todos os colaboradores.
// Chame com POST /api/escalas/seed uma vez após o deploy. Pode ser removido depois.

const DADOS: { nome: string; semanas: number; remoto?: boolean }[] = [
  { nome: "Amanda Braga", semanas: 2 },
  { nome: "Ana Kariny", semanas: 4 },
  { nome: "Ane Karoline Lima", semanas: 2 },
  { nome: "Anne Karoline Oliveira", semanas: 4 },
  { nome: "Antonio Guilherme", semanas: 4 },
  { nome: "Augusto César", semanas: 4 },
  { nome: "Camila Lins", semanas: 0, remoto: true },
  { nome: "Fabrício Lima", semanas: 2 },
  { nome: "Francisca Cristiana", semanas: 5 },
  { nome: "Francisco Bruno Batista", semanas: 7 },
  { nome: "Francisco Bruno de Oliveira", semanas: 3 },
  { nome: "Francisco Joabe", semanas: 2 },
  { nome: "Gabriel Braga", semanas: 4 },
  { nome: "Georgia Nogueira", semanas: 2 },
  { nome: "Jéssica Soares", semanas: 4 },
  { nome: "Joquebede", semanas: 0, remoto: true },
  { nome: "José Araújo", semanas: 7 },
  { nome: "Lorena Maria", semanas: 8 },
  { nome: "Luciana Maria Rocha", semanas: 2 },
  { nome: "Maria Iolanda", semanas: 6 },
  { nome: "Maria Julya", semanas: 3 },
  { nome: "Mariana Cunha", semanas: 5 },
  { nome: "Pedro Fernandes", semanas: 8 },
  { nome: "Raffaela", semanas: 3 },
  { nome: "Ramon Vitor", semanas: 5 },
  { nome: "Roger Araújo", semanas: 2 },
  { nome: "Tacilia", semanas: 6 },
  { nome: "Tatiana da Silva", semanas: 5 },
  { nome: "Thais Angelim", semanas: 4 },
  { nome: "Vitória Lima", semanas: 2 },
  { nome: "Vivian da Silva Duarte", semanas: 5 },
];

function getMondayOfCurrentWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST() {
  const semanaAtual = getMondayOfCurrentWeek();
  const resultados: { nome: string; encontrado: string | null; semanas: number; ajuste: number; tipo: string }[] = [];

  for (const d of DADOS) {
    const colab = await prisma.colaborador.findFirst({
      where: { ativo: true, nome: { contains: d.nome, mode: "insensitive" } },
      include: { escalas: { orderBy: { semana: "desc" }, take: 10 } },
    });

    if (!colab) {
      resultados.push({ nome: d.nome, encontrado: null, semanas: d.semanas, ajuste: 0, tipo: "NÃO ENCONTRADO" });
      continue;
    }

    // Apaga todos os registros de escala existentes
    await prisma.escalaSemana.deleteMany({ where: { colaboradorId: colab.id } });

    const tipo = d.remoto ? "REMOTO" : "PRESENCIAL";

    // Cria registro para a semana atual
    await prisma.escalaSemana.create({
      data: { colaboradorId: colab.id, semana: semanaAtual, tipo: tipo as "PRESENCIAL" | "REMOTO" },
    });

    // Para PRESENCIAL: ajuste = semanas_desejadas - 1 (o 1 vem do registro criado acima)
    // Para REMOTO: ajuste = 0 (o sinal VERDE vem do registro REMOTO acima)
    const ajuste = d.remoto ? 0 : d.semanas - 1;

    await prisma.colaborador.update({
      where: { id: colab.id },
      data: { ajusteSemanasPresencial: ajuste },
    });

    resultados.push({ nome: d.nome, encontrado: colab.nome, semanas: d.semanas, ajuste, tipo });
  }

  return NextResponse.json({ ok: true, resultados });
}
