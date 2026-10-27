"use client";

import { useState } from "react";
import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatsRedmine = {
  totalValidos: number;
  totalAtraso: number;
  totalAtencao: number;
  periodoMin: string | null;
  periodoMax: string | null;
  ultimaImportacao: string | null;
  porEquipe: { equipe: string; total: number }[];
};

type StatsPowerbi = {
  totalValidos: number;
  totalAtraso: number;
  totalAtencao: number;
  periodoMin: string | null;
  periodoMax: string | null;
  ultimaImportacao: string | null;
  porCategoria: { categoria: string; total: number }[];
};

type StatsDnpje = {
  total: number;
  totalAtraso: number;
  totalAtencao: number;
  periodoMin: string | null;
  periodoMax: string | null;
  ultimaImportacao: string | null;
  porEquipe: { equipe: string; total: number }[];
};

// ─── PDF helpers ──────────────────────────────────────────────────────────────

const CORES_PRAZO = ["#ef4444", "#eab308", "#22c55e"];
const CORES_CHART = [
  "#4f8ef7","#34d399","#fb923c","#a78bfa","#f472b6",
  "#38bdf8","#facc15","#4ade80","#e879f9","#2dd4bf",
];

const SLA_RULES = [
  { keyword: "Cadastro", display: "Cadastro",     days: 2  },
  { keyword: "Migra",    display: "Migração",      days: 15 },
  { keyword: "Orienta",  display: "Orientação",    days: 5  },
  { keyword: "Erro",     display: "Erro ou Falha", days: 5  },
];

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function desenharDonut(
  doc: jsPDF,
  dados: { label: string; value: number }[],
  total: number,
  ox: number, oy: number, sz: number,
  cores?: string[]
) {
  const cx = ox+sz/2, cy = oy+sz/2;
  const R = sz/2*0.90, ri = sz/2*0.44;
  const STEPS = 64;
  let ang = -Math.PI/2;
  dados.forEach((d, i) => {
    const frac = d.value/total;
    const sa = ang, ea = ang+frac*2*Math.PI; ang = ea;
    const steps = Math.max(4, Math.ceil(STEPS*frac));
    const pts: [number,number][] = [];
    for (let j=0;j<=steps;j++){const a=sa+(ea-sa)*j/steps;pts.push([cx+R*Math.cos(a),cy+R*Math.sin(a)]);}
    for (let j=steps;j>=0;j--){const a=sa+(ea-sa)*j/steps;pts.push([cx+ri*Math.cos(a),cy+ri*Math.sin(a)]);}
    const palette = cores ?? CORES_CHART;
    const [r,g,b]=hexToRgb(palette[i%palette.length]);
    doc.setFillColor(r,g,b);doc.setDrawColor(255,255,255);doc.setLineWidth(0.35);
    const lines:[number,number][]=pts.slice(1).map((p,k)=>[p[0]-pts[k][0],p[1]-pts[k][1]]);
    doc.lines(lines,pts[0][0],pts[0][1],[1,1],"FD",true);
    if (frac>=0.03){
      const ma=sa+(ea-sa)/2,lr=(R+ri)/2;
      doc.setFontSize(6.5);doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");
      doc.text(`${(frac*100).toFixed(1)}%`,cx+lr*Math.cos(ma),cy+lr*Math.sin(ma),{align:"center",baseline:"middle"});
    }
  });
  doc.setFillColor(255,255,255);doc.setDrawColor(255,255,255);doc.circle(cx,cy,ri,"F");
  doc.setFontSize(9);doc.setTextColor(30,41,59);doc.setFont("helvetica","bold");
  doc.text(total.toLocaleString("pt-BR"),cx,cy-1.5,{align:"center",baseline:"middle"});
  doc.setFontSize(5);doc.setTextColor(148,163,184);doc.setFont("helvetica","normal");
  doc.text("CHAMADOS",cx,cy+3.5,{align:"center",baseline:"middle"});
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtImport(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
}

// ─── Seção Chamados Redmine ───────────────────────────────────────────────────

function secaoRedmine(doc: jsPDF, stats: StatsRedmine, y: number): number {
  const noPrazo = Math.max(0, stats.totalValidos - stats.totalAtraso - stats.totalAtencao);
  const CARD_W=43, CARD_H=18, GAP=2;

  doc.setFontSize(12);doc.setTextColor(30,41,59);doc.setFont("helvetica","bold");
  doc.text("Chamados Redmine", 14, y); y += 4;
  doc.setFontSize(7);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
  doc.text(`Periodo: ${fmtData(stats.periodoMin)} a ${fmtData(stats.periodoMax)}   Atualizado: ${fmtImport(stats.ultimaImportacao)}`, 14, y); y += 6;

  const cards = [
    { label:"Total",              value:stats.totalValidos, cor:[59,130,246]  as [number,number,number] },
    { label:"Em atraso (>=50d)",  value:stats.totalAtraso,  cor:[239,68,68]   as [number,number,number] },
    { label:"Em atencao (30-50d)",value:stats.totalAtencao, cor:[234,179,8]   as [number,number,number] },
    { label:"No prazo",           value:noPrazo,            cor:[34,197,94]   as [number,number,number] },
  ];
  cards.forEach((c,i)=>{
    const cx=14+i*(CARD_W+GAP);
    doc.setFillColor(241,245,249);doc.roundedRect(cx,y,CARD_W,CARD_H,2,2,"F");
    doc.setFontSize(6);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
    doc.text(c.label,cx+3,y+5);
    doc.setFontSize(13);doc.setFont("helvetica","bold");doc.setTextColor(c.cor[0],c.cor[1],c.cor[2]);
    doc.text(c.value.toLocaleString("pt-BR"),cx+3,y+14);
  });
  y += CARD_H + 8;

  const SZ=62, LX=14, RX=100;
  doc.setFontSize(7.5);doc.setTextColor(60,60,60);doc.setFont("helvetica","bold");
  doc.text("Por equipe",LX+SZ/2,y-2,{align:"center"});
  doc.text("Por prazo",RX+SZ/2,y-2,{align:"center"});

  const donutItens = stats.porEquipe.map(e=>({label:e.equipe,value:e.total}));
  const prazoItens = [
    {label:"Em atraso (>=50d)",value:stats.totalAtraso},
    {label:"Em atencao (30-50d)",value:stats.totalAtencao},
    {label:"No prazo",value:noPrazo},
  ].filter(d=>d.value>0);

  if(donutItens.reduce((s,d)=>s+d.value,0)>0) desenharDonut(doc,donutItens,stats.totalValidos,LX,y,SZ);
  if(prazoItens.reduce((s,d)=>s+d.value,0)>0) desenharDonut(doc,prazoItens,stats.totalValidos,RX,y,SZ,CORES_PRAZO);

  return y + SZ + 8;
}

// ─── Seção Dnpje Migração ─────────────────────────────────────────────────────

function secaoDnpje(doc: jsPDF, stats: StatsDnpje, y: number): number {
  const noPrazo = Math.max(0, stats.total - stats.totalAtraso - stats.totalAtencao);
  const CARD_W=43, CARD_H=18, GAP=2;

  doc.setFontSize(12);doc.setTextColor(30,41,59);doc.setFont("helvetica","bold");
  doc.text("Dnpje Migracao", 14, y); y += 4;
  doc.setFontSize(7);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
  doc.text(`Periodo: ${fmtData(stats.periodoMin)} a ${fmtData(stats.periodoMax)}   Atualizado: ${fmtImport(stats.ultimaImportacao)}`, 14, y); y += 6;

  const cards = [
    { label:"Total",              value:stats.total,        cor:[59,130,246]  as [number,number,number] },
    { label:"Em atraso (>=50d)",  value:stats.totalAtraso,  cor:[239,68,68]   as [number,number,number] },
    { label:"Em atencao (30-50d)",value:stats.totalAtencao, cor:[234,179,8]   as [number,number,number] },
    { label:"No prazo",           value:noPrazo,            cor:[34,197,94]   as [number,number,number] },
  ];
  cards.forEach((c,i)=>{
    const cx=14+i*(CARD_W+GAP);
    doc.setFillColor(241,245,249);doc.roundedRect(cx,y,CARD_W,CARD_H,2,2,"F");
    doc.setFontSize(6);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
    doc.text(c.label,cx+3,y+5);
    doc.setFontSize(13);doc.setFont("helvetica","bold");doc.setTextColor(c.cor[0],c.cor[1],c.cor[2]);
    doc.text(c.value.toLocaleString("pt-BR"),cx+3,y+14);
  });
  y += CARD_H + 8;

  const SZ=62, LX=14, RX=100;
  doc.setFontSize(7.5);doc.setTextColor(60,60,60);doc.setFont("helvetica","bold");
  doc.text("Por equipe",LX+SZ/2,y-2,{align:"center"});
  doc.text("Por prazo",RX+SZ/2,y-2,{align:"center"});

  const donutItens = stats.porEquipe.map(e=>({label:e.equipe,value:e.total}));
  const prazoItens = [
    {label:"Em atraso (>=50d)",value:stats.totalAtraso},
    {label:"Em atencao (30-50d)",value:stats.totalAtencao},
    {label:"No prazo",value:noPrazo},
  ].filter(d=>d.value>0);

  if(donutItens.reduce((s,d)=>s+d.value,0)>0) desenharDonut(doc,donutItens,stats.total,LX,y,SZ);
  if(prazoItens.reduce((s,d)=>s+d.value,0)>0) desenharDonut(doc,prazoItens,stats.total,RX,y,SZ,CORES_PRAZO);

  return y + SZ + 8;
}

// ─── Seção Chamados Power BI ──────────────────────────────────────────────────

function secaoPowerbi(doc: jsPDF, stats: StatsPowerbi, y: number): number {
  const CARD_W=43, CARD_H=23, GAP=2, CPR=4;

  doc.setFontSize(12);doc.setTextColor(30,41,59);doc.setFont("helvetica","bold");
  doc.text("Chamados Power BI", 14, y); y += 4;
  doc.setFontSize(7);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
  doc.text(`Periodo: ${fmtData(stats.periodoMin)} a ${fmtData(stats.periodoMax)}   Atualizado: ${fmtImport(stats.ultimaImportacao)}`, 14, y); y += 6;

  function corCard(cat: string): [number,number,number] {
    if (cat.includes("Erro")||cat.includes("Falha")) return [239,68,68];
    if (cat.includes("Cadastro")) return [56,189,248];
    if (cat.includes("Migra"))    return [251,146,60];
    if (cat.includes("Orienta"))  return [34,197,94];
    return [59,130,246];
  }

  const allCards = [
    { label:"Total", value:stats.totalValidos, cor:[59,130,246] as [number,number,number], sla:null as number|null },
    ...stats.porCategoria.map(c => {
      const rule = SLA_RULES.find(r => c.categoria.toLowerCase().includes(r.keyword.toLowerCase()));
      const lbl = rule?.display ?? (c.categoria.length>18?c.categoria.slice(0,17)+"…":c.categoria);
      return { label:lbl, value:c.total, cor:corCard(c.categoria), sla:rule?.days??null };
    }),
  ];

  const rowY = y;
  allCards.forEach((c,i)=>{
    const col=i%CPR, row=Math.floor(i/CPR);
    const cx=14+col*(CARD_W+GAP), cy=rowY+row*(CARD_H+4);
    doc.setFillColor(241,245,249);doc.roundedRect(cx,cy,CARD_W,CARD_H,2,2,"F");
    doc.setFontSize(6);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
    doc.text(c.label,cx+3,cy+5);
    doc.setFontSize(13);doc.setFont("helvetica","bold");doc.setTextColor(c.cor[0],c.cor[1],c.cor[2]);
    doc.text(c.value.toLocaleString("pt-BR"),cx+3,cy+14);
    if(c.sla!==null){
      doc.setFontSize(6);doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);
      doc.text(`>=${c.sla} dias`,cx+3,cy+20);
    }
  });

  const totalRows=Math.ceil(allCards.length/CPR);
  y = rowY + totalRows*(CARD_H+4) + 8;

  const donutItens = stats.porCategoria.map(c=>{
    const rule=SLA_RULES.find(r=>c.categoria.toLowerCase().includes(r.keyword.toLowerCase()));
    return {label:rule?.display??(c.categoria.length>18?c.categoria.slice(0,17)+"…":c.categoria),value:c.total};
  });
  const donutTotal=donutItens.reduce((s,d)=>s+d.value,0);

  if(donutTotal>0){
    const SZ=62;
    doc.setFontSize(7.5);doc.setTextColor(60,60,60);doc.setFont("helvetica","bold");
    doc.text("Por categoria",14+SZ/2,y-2,{align:"center"});
    desenharDonut(doc,donutItens,donutTotal,14,y,SZ);
    y += SZ + 8;
  }

  return y;
}

// ─── Divisor entre seções ─────────────────────────────────────────────────────

function divisor(doc: jsPDF, y: number): number {
  doc.setDrawColor(200,210,220);doc.setLineWidth(0.3);
  doc.line(14,y,196,y);
  return y + 8;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SECOES = [
  { key: "redmine",  label: "Chamados Redmine",   icon: "🔴" },
  { key: "dnpje",    label: "Dnpje Migração",     icon: "🟠" },
  { key: "powerbi",  label: "Chamados Power BI",  icon: "🟡" },
] as const;

type SecaoKey = typeof SECOES[number]["key"];

export default function RelatorioChamadosPage() {
  const [selecionados, setSelecionados] = useState<Set<SecaoKey>>(new Set(["redmine","dnpje","powerbi"]));
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function toggle(key: SecaoKey) {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function gerarPDF() {
    if (selecionados.size === 0) return;
    setGerando(true);
    setErro(null);
    try {
      const fetches: Promise<unknown>[] = [];
      if (selecionados.has("redmine"))  fetches.push(fetch("/api/chamados-redmine?stats=1").then(r=>r.json()));
      else fetches.push(Promise.resolve(null));
      if (selecionados.has("dnpje"))    fetches.push(fetch("/api/dnpje-migracao?stats=1").then(r=>r.json()));
      else fetches.push(Promise.resolve(null));
      if (selecionados.has("powerbi"))  fetches.push(fetch("/api/chamados-powerbi").then(r=>r.json()));
      else fetches.push(Promise.resolve(null));

      const [redmine, dnpje, powerbi] = await Promise.all(fetches) as [StatsRedmine|null, StatsDnpje|null, StatsPowerbi|null];

      const doc = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      const geradoEm = new Date().toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});

      doc.setFontSize(16);doc.setTextColor(30,41,59);doc.setFont("helvetica","bold");
      doc.text("Relatorio de Chamados",14,16);
      doc.setFontSize(8);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
      doc.text(`Gerado em: ${geradoEm}`,14,23);

      let y = 30;
      let primeiro = true;

      if (redmine && selecionados.has("redmine")) {
        if (!primeiro) y = divisor(doc, y);
        y = secaoRedmine(doc, redmine, y);
        primeiro = false;
      }
      if (dnpje && selecionados.has("dnpje")) {
        if (!primeiro) {
          if (y > 220) { doc.addPage(); y = 16; } else y = divisor(doc, y);
        }
        y = secaoDnpje(doc, dnpje, y);
        primeiro = false;
      }
      if (powerbi && selecionados.has("powerbi")) {
        if (!primeiro) {
          if (y > 180) { doc.addPage(); y = 16; } else y = divisor(doc, y);
        }
        secaoPowerbi(doc, powerbi, y);
      }

      const nomes = SECOES.filter(s=>selecionados.has(s.key)).map(s=>s.key).join("-");
      doc.save(`relatorio-chamados-${nomes}-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch {
      setErro("Erro ao buscar dados. Verifique se há chamados importados.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Relatório de Chamados</h2>
        <p className="text-sm text-gray-400 mt-0.5">Selecione as seções para incluir no PDF</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {SECOES.map(s => {
          const ativo = selecionados.has(s.key);
          return (
            <button key={s.key} onClick={() => toggle(s.key)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition text-left
                ${ativo
                  ? "bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/20"
                  : "bg-gray-900 border-gray-700 hover:border-gray-500"}`}>
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${ativo?"text-white":"text-gray-400"}`}>{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ativo ? "Incluído no PDF" : "Não incluído"}</p>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                ${ativo ? "bg-blue-500 border-blue-500" : "border-gray-600"}`}>
                {ativo && <span className="text-white text-xs font-bold">✓</span>}
              </div>
            </button>
          );
        })}
      </div>

      {erro && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {erro}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={gerarPDF} disabled={gerando || selecionados.size === 0}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition text-sm flex items-center gap-2">
          {gerando ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              Gerando PDF...
            </>
          ) : (
            <>↓ Gerar PDF Combinado</>
          )}
        </button>
        {selecionados.size === 0 && (
          <p className="text-sm text-gray-500">Selecione ao menos uma seção</p>
        )}
        {selecionados.size > 0 && !gerando && (
          <p className="text-sm text-gray-400">
            {selecionados.size} {selecionados.size === 1 ? "seção" : "seções"} selecionada{selecionados.size > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
