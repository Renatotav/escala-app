export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { calcularSinal } from "@/lib/eligibility";
import PlantaoRecentesCard from "@/app/(dashboard)/components/PlantaoRecentesCard";

function fmt(iso: string) {
  return iso.split("-").reverse().join("/");
}

function brazilDateStr(offsetDays = 0): string {
  // UTC-3 (Brasília) — avoids server UTC shifting the label
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000 + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

function fmtRelativo(iso: string) {
  if (iso === brazilDateStr(0))  return "Hoje";
  if (iso === brazilDateStr(-1)) return "Ontem";
  if (iso === brazilDateStr(1))  return "Amanhã";
  return iso.split("-").reverse().join("/");
}

export default async function DashboardPage() {
  const hoje = new Date();

  // Compute dates using Brazil time (UTC-3) so server UTC doesn't shift the day
  const brazilNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const [by, bm, bd] = brazilNow.toISOString().slice(0, 10).split("-").map(Number);
  const hojeUTC  = new Date(Date.UTC(by, bm - 1, bd));       // today 00:00 UTC
  const em14dias = new Date(Date.UTC(by, bm - 1, bd + 14));  // +14 days  00:00 UTC

  const [colaboradores, plantoesPendentes, plantoesRecentes] = await Promise.all([
    prisma.colaborador.findMany({
      where: { ativo: true },
      include: { equipe: true, escalas: { where: { semana: { lte: hoje } }, orderBy: { semana: "desc" }, take: 10 }, plantoes: true },
    }),
    prisma.plantao.findMany({
      where: { OR: [{ folga1: { gte: hojeUTC, lte: em14dias } }, { folga2: { gte: hojeUTC, lte: em14dias } }] },
      include: { colaborador: { select: { nome: true, equipe: { select: { nome: true } } } } },
    }),
    prisma.plantao.findMany({
      orderBy: { data: "desc" },
      take: 12,
      include: { colaborador: { select: { nome: true, equipe: { select: { nome: true } } } } },
    }),
  ]);

  let verdes = 0, amarelos = 0, folgasPendentes = 0;
  for (const c of colaboradores) {
    let semanasPresencial = 0;
    for (const e of c.escalas) {
      if (e.tipo === "REMOTO") break;
      semanasPresencial++;
    }
    const ultimaFoiRemoto = c.escalas[0]?.tipo === "REMOTO";
    const sinal = ultimaFoiRemoto
      ? ("VERDE" as const)
      : calcularSinal(semanasPresencial, c.equipe.thresholdAmarelo, c.equipe.thresholdVerde);
    if (sinal === "VERDE") verdes++;
    else if (sinal === "AMARELO") amarelos++;

    const ps = c.plantoes ?? [];
    const creditos = ps.reduce((acc, p) => acc + (p.tipo === "SABADO" || p.tipo === "PONTO_FACULTATIVO" ? 1 : 2), 0);
    const agendadas = ps.reduce((acc, p) => acc + (p.folga1 ? 1 : 0) + (p.folga2 ? 1 : 0), 0);
    folgasPendentes += Math.max(0, creditos - agendadas);
  }

  const hojeStr    = brazilDateStr(0);
  const em14diasStr = brazilDateStr(14);

  const proximasEntries: { data: string; nome: string; equipe: string; tipo: string }[] = [];
  for (const p of plantoesPendentes) {
    const d1 = p.folga1 ? p.folga1.toISOString().slice(0, 10) : null;
    const d2 = p.folga2 ? p.folga2.toISOString().slice(0, 10) : null;
    // só adiciona a data que realmente cai dentro do período — evita mostrar folgas passadas
    if (d1 && d1 >= hojeStr && d1 <= em14diasStr)
      proximasEntries.push({ data: d1, nome: p.colaborador.nome, equipe: p.colaborador.equipe.nome, tipo: p.tipo });
    if (d2 && d2 >= hojeStr && d2 <= em14diasStr)
      proximasEntries.push({ data: d2, nome: p.colaborador.nome, equipe: p.colaborador.equipe.nome, tipo: p.tipo });
  }
  proximasEntries.sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome, "pt-BR"));

  const tipoLabel: Record<string, string> = { SABADO: "Sábado", DOMINGO: "Domingo", FERIADO: "Feriado", PONTO_FACULTATIVO: "Pto. Facultativo" };

  const cards = [
    { label: "Colaboradores ativos", value: colaboradores.length, color: "text-white", icon: "👥" },
    { label: "Elegíveis para remoto", value: verdes, color: "text-green-400", icon: "🟢" },
    { label: "Quase elegíveis", value: amarelos, color: "text-yellow-400", icon: "🟡" },
    { label: "Folgas a agendar", value: folgasPendentes, color: folgasPendentes > 0 ? "text-orange-400" : "text-gray-500", icon: "⏳" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Dashboard</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-gray-900 rounded-xl border border-gray-800 p-5 flex flex-col gap-2">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className={`text-4xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plantões recentes */}
        <PlantaoRecentesCard items={plantoesRecentes.map(p => ({
          id: p.id,
          colaboradorId: p.colaboradorId,
          data: p.data.toISOString().slice(0, 10),
          tipo: p.tipo,
          colaborador: { nome: p.colaborador.nome, equipe: { nome: p.colaborador.equipe.nome } },
        }))} />

        {/* Próximas folgas */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-4">
            Próximas folgas
            <span className="ml-2 text-xs text-gray-500 font-normal">próximos 14 dias</span>
          </h3>
          {proximasEntries.length === 0 ? (
            <p className="text-gray-600 text-sm">Nenhuma folga agendada nos próximos 14 dias.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {proximasEntries.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-white text-sm font-medium">{f.nome}</p>
                    <p className="text-xs text-gray-500">{f.equipe}</p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const label = fmtRelativo(f.data);
                      const color = label === "Hoje" ? "text-green-400" : label === "Amanhã" ? "text-blue-400" : "text-gray-300";
                      return <p className={`text-sm font-medium ${color}`}>{label}</p>;
                    })()}
                    <p className="text-xs text-gray-500">
                      {new Date(f.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" })}
                    </p>
                    <p className="text-xs text-gray-600">Plantão: {tipoLabel[f.tipo] ?? f.tipo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
