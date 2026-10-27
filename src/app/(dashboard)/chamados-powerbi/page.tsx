"use client";

import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChamadoPowerbi = {
  id: number;
  numero: string;
  dataAbertura: string | null;
  equipeAtribuida: string | null;
  usuarioAtribuido: string | null;
  dataMovimentacao: string | null;
  situacaoRegra: string | null;
};

type CategoriaStats = { categoria: string; total: number };

type Dados = {
  chamados: ChamadoPowerbi[];
  total: number;
  page: number;
  totalPages: number;
  totalValidos: number;
  periodoMin: string | null;
  periodoMax: string | null;
  porCategoria: CategoriaStats[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SLA_RULES = [
  { keyword: "Cadastro",      days: 2  },
  { keyword: "Migração",      days: 15 },
  { keyword: "Orientação",    days: 5  },
  { keyword: "Erro ou Falha", days: 5  },
];

function getSLA(equipeAtribuida: string | null): number | null {
  if (!equipeAtribuida) return null;
  const lower = equipeAtribuida.toLowerCase();
  for (const { keyword, days } of SLA_RULES) {
    if (lower.includes(keyword.toLowerCase())) return days;
  }
  return null;
}

function diasDesde(dataAbertura: string | null): number {
  if (!dataAbertura) return 0;
  return Math.floor((Date.now() - new Date(dataAbertura).getTime()) / 86400000);
}

function DiasBadge({ dias, equipeAtribuida }: { dias: number; equipeAtribuida: string | null }) {
  const sla = getSLA(equipeAtribuida);
  if (sla === null || dias < sla) return null;
  return (
    <span title={`SLA: ${sla}d`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse cursor-help">
      ⚠ {dias}d
    </span>
  );
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Chart components ─────────────────────────────────────────────────────────

const CORES_CHART = [
  "#4f8ef7","#34d399","#fb923c","#a78bfa","#f472b6",
  "#38bdf8","#facc15","#4ade80","#e879f9","#2dd4bf",
  "#fbbf24","#818cf8","#f87171",
];

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function desenharDonutPDF(
  doc: jsPDF,
  dados: { label: string; value: number }[],
  total: number,
  ox: number, oy: number, sz: number
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
    const [r,g,b]=hexToRgb(CORES_CHART[i%CORES_CHART.length]);
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

function DonutChart({ itens, onSelect, selecionado }: {
  itens: { label: string; value: number }[];
  onSelect?: (label: string) => void;
  selecionado?: string;
}) {
  const total = itens.reduce((s,d)=>s+d.value,0);
  if (total===0) return null;
  const cx=150,cy=150,or_=128,ir=68;
  let ang=-Math.PI/2;
  const fatias = itens.map((d,i)=>{
    const frac=d.value/total;
    const sa=ang,ea=ang+frac*2*Math.PI;ang=ea;
    const ox1=cx+or_*Math.cos(sa),oy1=cy+or_*Math.sin(sa);
    const ox2=cx+or_*Math.cos(ea),oy2=cy+or_*Math.sin(ea);
    const ix1=cx+ir*Math.cos(sa),iy1=cy+ir*Math.sin(sa);
    const ix2=cx+ir*Math.cos(ea),iy2=cy+ir*Math.sin(ea);
    const large=(ea-sa)>Math.PI?1:0;
    const path=`M${ox1.toFixed(1)},${oy1.toFixed(1)} A${or_},${or_} 0 ${large} 1 ${ox2.toFixed(1)},${oy2.toFixed(1)} L${ix2.toFixed(1)},${iy2.toFixed(1)} A${ir},${ir} 0 ${large} 0 ${ix1.toFixed(1)},${iy1.toFixed(1)} Z`;
    const ma=sa+(ea-sa)/2,lr=(or_+ir)/2;
    const cor=CORES_CHART[i%CORES_CHART.length];
    const sel=d.label===selecionado;
    return{label:d.label,value:d.value,path,cor,sel,
      pct:(frac*100).toFixed(1),
      lx:(cx+lr*Math.cos(ma)).toFixed(1),ly:(cy+lr*Math.sin(ma)).toFixed(1),
      show:frac>=0.03};
  });
  return (
    <div className="flex flex-col gap-4">
      <svg viewBox="0 0 300 300" className="w-full max-w-[260px] mx-auto">
        {fatias.length === 1 ? (
          <>
            <circle cx={cx} cy={cy} r={or_} fill={fatias[0].cor} stroke="#0f172a" strokeWidth="1.5"
              className={onSelect?"cursor-pointer hover:brightness-110 transition-all":""}
              onClick={()=>onSelect?.(fatias[0].label===selecionado?"":fatias[0].label)}/>
            <circle cx={cx} cy={cy} r={ir} fill="#0f172a" />
          </>
        ) : fatias.map((f,i)=>(
          <path key={i} d={f.path} fill={f.cor} stroke="#0f172a" strokeWidth="1.5"
            style={f.sel?{filter:"brightness(1.25) drop-shadow(0 0 6px rgba(255,255,255,0.25))"}:{}}
            className={onSelect?"cursor-pointer hover:brightness-110 transition-all":""}
            onClick={()=>onSelect?.(f.label===selecionado?"":f.label)}/>
        ))}
        <text x={cx} y={cy-10} textAnchor="middle" fontSize="26" fontWeight="800" fill="white">
          {total.toLocaleString("pt-BR")}
        </text>
        <text x={cx} y={cy+14} textAnchor="middle" fontSize="10" fill="#64748b" letterSpacing="2">CHAMADOS</text>
        {fatias.filter(f=>f.show).map((f,i)=>(
          <text key={i} x={f.lx} y={f.ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="10.5" fontWeight="700" fill="white" style={{pointerEvents:"none"}}>
            {f.pct}%
          </text>
        ))}
      </svg>
      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {fatias.map((f,i)=>(
          <div key={i} onClick={()=>onSelect?.(f.label===selecionado?"":f.label)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition
              ${onSelect?"cursor-pointer hover:bg-white/5":""}
              ${f.sel?"bg-white/10 ring-1 ring-white/20":""}`}>
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:f.cor}}/>
            <span className="flex-1 text-gray-300 font-medium truncate" title={f.label}>{f.label}</span>
            <span className="font-mono font-bold text-white tabular-nums">{f.value.toLocaleString("pt-BR")}</span>
            <span className="text-gray-500 w-11 text-right">{f.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarrasHorizontais({ itens, total }: { itens: CategoriaStats[]; total: number }) {
  if (itens.length===0) return null;
  const max=Math.max(...itens.map(d=>d.total),1);
  return (
    <div className="space-y-1.5 overflow-y-auto max-h-[400px] pr-1">
      {itens.map((d,i)=>{
        const pct=((d.total/total)*100).toFixed(1);
        const barW=((d.total/max)*100).toFixed(1);
        return (
          <div key={d.categoria} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition">
            <span className="text-xs font-mono text-gray-600 w-5 shrink-0 text-right">{i+1}</span>
            <span className="text-xs font-medium truncate w-48 shrink-0 text-gray-200" title={d.categoria}>{d.categoria}</span>
            <div className="flex-1 h-3.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500/60" style={{width:`${barW}%`}}/>
            </div>
            <span className="font-mono font-bold text-sm tabular-nums w-10 text-right shrink-0 text-white">{d.total.toLocaleString("pt-BR")}</span>
            <span className="text-gray-500 text-xs w-11 text-right shrink-0">{pct}%</span>
          </div>
        );
      })}
      <div className="flex items-center gap-2.5 px-3 py-2 mt-1 border-t border-gray-800">
        <span className="text-xs text-gray-500 w-5 shrink-0"/>
        <span className="text-xs font-semibold text-gray-400 flex-1">Total</span>
        <span className="font-mono font-bold text-sm text-white w-10 text-right shrink-0">{total.toLocaleString("pt-BR")}</span>
        <span className="text-gray-500 text-xs w-11 text-right shrink-0">100%</span>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChamadosPowerbiPage() {
  const [view, setView] = useState<"lista"|"quantitativo">("lista");
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [xlsExporting, setXlsExporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<{ count?: number; skipped?: number; error?: string } | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [substituir, setSubstituir] = useState(true);
  const [equipeQuant, setEquipeQuant] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function load(pg = 1, buscaQ = "", cat: string | null = null) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (buscaQ) params.set("busca", buscaQ);
    if (cat) params.set("categoria", cat);
    fetch(`/api/chamados-powerbi?${params}`)
      .then(r => r.json())
      .then((d: Dados) => { setDados(d); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(1, busca, filtroCategoria), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function toggleCategoria(cat: string) {
    const novo = filtroCategoria === cat ? null : cat;
    setFiltroCategoria(novo);
    load(1, busca, novo);
  }

  function clearFiltros() {
    setFiltroCategoria(null);
    load(1, busca, null);
  }

  async function handleImport() {
    if (selectedFiles.length === 0) return;
    setImporting(true);
    setImportResult(null);
    let totalCount = 0, totalSkipped = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      const formData = new FormData();
      formData.append("file", selectedFiles[i]);
      formData.append("substituir", (i === 0 && substituir) ? "1" : "0");
      const res = await fetch("/api/chamados-powerbi/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setImportResult({ error: data.error ?? "Erro ao importar" }); setImporting(false); return; }
      totalCount += data.count ?? 0;
      totalSkipped += data.skipped ?? 0;
    }
    setImportResult({ count: totalCount, skipped: totalSkipped });
    setImportModal(false);
    setSelectedFiles([]);
    load(1, busca, filtroCategoria);
    setImporting(false);
  }

  async function handleLimpar() {
    if (!confirm("Limpar todos os chamados importados?")) return;
    await fetch("/api/chamados-powerbi", { method: "DELETE" });
    setFiltroCategoria(null);
    load();
  }

  async function exportXLS() {
    setXlsExporting(true);
    try {
      const params = new URLSearchParams({ export: "1" });
      if (filtroCategoria) params.set("categoria", filtroCategoria);
      if (busca) params.set("busca", busca);
      const res = await fetch(`/api/chamados-powerbi?${params}`);
      const data = await res.json();
      const todos: ChamadoPowerbi[] = data.chamados ?? [];
      function esc(s: string) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
      const dataRows = todos.map(c => {
        const dias = diasDesde(c.dataAbertura);
        const url = `https://cati.tjce.jus.br/assystnet/#events/${c.numero}?eventType=1&currentIndex=0`;
        return `<tr><td><a href="${esc(url)}">${esc(c.numero)}</a></td><td>${dias}</td><td>${esc(fmtDateTime(c.dataAbertura))}</td><td>${esc(c.equipeAtribuida??"")}</td><td>${esc(c.usuarioAtribuido??"")}</td><td>${esc(fmtDateTime(c.dataMovimentacao))}</td><td>${esc(c.situacaoRegra??"")}</td></tr>`;
      }).join("");
      const html = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}th{background:#f0f0f0}a{color:#1155cc}</style></head><body><table><tr><th>Nº Chamado (Assyst)</th><th>Dias em aberto</th><th>Abertura</th><th>Equipe Atribuída</th><th>Usuário Atribuído</th><th>Movimentação</th><th>Situação</th></tr>${dataRows}</table></body></html>`;
      const blob = new Blob([html],{type:"application/vnd.ms-excel;charset=utf-8;"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="chamados_powerbi.xls"; a.click();
      URL.revokeObjectURL(url);
    } finally { setXlsExporting(false); }
  }

  function gerarPDF() {
    if (!dados) return;
    const doc = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const geradoEm = new Date().toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
    doc.setFontSize(16);doc.setTextColor(30,30,30);
    doc.text("Chamados Power BI - Quantitativo",14,18);
    doc.setFontSize(9);doc.setTextColor(100,100,100);
    doc.text(`Total: ${dados.totalValidos.toLocaleString("pt-BR")} chamados`,14,26);
    doc.text(`Gerado em: ${geradoEm}`,14,31);

    const itensExp = equipeQuant
      ? dados.porCategoria.filter(c=>c.categoria===equipeQuant)
      : dados.porCategoria;
    const donutItens = itensExp.map(c=>({label:c.categoria,value:c.total}));
    const donutTotal = donutItens.reduce((s,d)=>s+d.value,0);

    let y=37;
    if (donutTotal>0) {
      const chartX=14,chartY=36,chartSz=78;
      desenharDonutPDF(doc,donutItens,donutTotal,chartX,chartY,chartSz);
      const legX=chartX+chartSz+5;let legY=chartY+5;
      donutItens.forEach((d,i)=>{
        const [r,g,b]=hexToRgb(CORES_CHART[i%CORES_CHART.length]);
        doc.setFillColor(r,g,b);doc.rect(legX,legY-2.8,3.5,3.5,"F");
        const pct=((d.value/donutTotal)*100).toFixed(1);
        doc.setFontSize(7.5);doc.setTextColor(40,40,40);doc.setFont("helvetica","normal");
        doc.text(`${d.label}  ${d.value.toLocaleString("pt-BR")} (${pct}%)`,legX+4.8,legY);
        legY+=6.8;
      });
      y=chartY+chartSz+8;
    }

    autoTable(doc,{
      startY:y,
      head:[["#","Equipe","Chamados","%"]],
      body:itensExp.map((c,i)=>[
        String(i+1),c.categoria,
        c.total.toLocaleString("pt-BR"),
        `${((c.total/(dados.totalValidos||1))*100).toFixed(1)}%`,
      ]),
      columnStyles:{0:{cellWidth:12,halign:"center"},2:{cellWidth:28,halign:"right"},3:{cellWidth:18,halign:"right"}},
      headStyles:{fillColor:[30,41,59],textColor:[200,200,220],fontStyle:"bold",fontSize:9},
      bodyStyles:{fontSize:8.5,textColor:[40,40,40]},
      alternateRowStyles:{fillColor:[248,250,252]},
      margin:{left:14,right:14},
    });

    doc.save(`chamados-powerbi-quantitativo-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  function baixarJPEG() {
    if (!dados) return;
    const itensExp = equipeQuant
      ? dados.porCategoria.filter(c=>c.categoria===equipeQuant)
      : dados.porCategoria;
    const W=800,PAD=24,ROW_H=30,TEAM_H=38,GAP=10,HEADER_H=70;
    const totalH=HEADER_H+TEAM_H+itensExp.length*ROW_H+GAP+PAD;
    const canvas=document.createElement("canvas");
    canvas.width=W*2;canvas.height=totalH*2;
    const ctx=canvas.getContext("2d")!;
    ctx.scale(2,2);
    ctx.fillStyle="#0f172a";ctx.fillRect(0,0,W,totalH);
    ctx.fillStyle="#f1f5f9";ctx.font="bold 18px system-ui, sans-serif";
    ctx.fillText("Chamados Power BI - Quantitativo",PAD,30);
    ctx.fillStyle="#64748b";ctx.font="12px system-ui, sans-serif";
    const geradoEm=new Date().toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
    ctx.fillText(`Total: ${dados.totalValidos.toLocaleString("pt-BR")} chamados   Gerado em: ${geradoEm}`,PAD,52);
    let y=HEADER_H;
    ctx.fillStyle="#1e293b";ctx.fillRect(PAD,y,W-PAD*2,TEAM_H);
    ctx.fillStyle="#cbd5e1";ctx.font="bold 12px system-ui, sans-serif";
    ctx.fillText("Chamados por Equipe",PAD+12,y+24);
    y+=TEAM_H;
    for (let i=0;i<itensExp.length;i++){
      const c=itensExp[i];
      const pct=((c.total/(dados.totalValidos||1))*100).toFixed(1);
      ctx.fillStyle=i%2===0?"#1e2d3d":"#0f172a";
      ctx.fillRect(PAD,y,W-PAD*2,ROW_H);
      ctx.fillStyle="#475569";ctx.font="11px monospace";
      ctx.fillText(`${i+1}`,PAD+8,y+20);
      ctx.fillStyle="#e2e8f0";ctx.font="12px system-ui, sans-serif";
      ctx.fillText(c.categoria,PAD+36,y+20);
      const txt=`${c.total.toLocaleString("pt-BR")}  ${pct}%`;
      ctx.fillStyle="#f1f5f9";ctx.font="bold 12px monospace";
      ctx.fillText(txt,W-PAD-10-ctx.measureText(txt).width,y+20);
      y+=ROW_H;
    }
    const a=document.createElement("a");
    a.href=canvas.toDataURL("image/jpeg",0.95);
    a.download=`chamados-powerbi-quantitativo-${new Date().toISOString().slice(0,10)}.jpg`;
    a.click();
  }

  const totalValidos = dados?.totalValidos ?? 0;
  const chamados     = dados?.chamados     ?? [];
  const page         = dados?.page         ?? 1;
  const totalPages   = dados?.totalPages   ?? 1;
  const total        = dados?.total        ?? 0;
  const porCategoria = dados?.porCategoria ?? [];
  const temFiltro    = filtroCategoria !== null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Chamados Power BI</h2>
          <p className="text-sm text-gray-400 mt-0.5">Listagem de chamados por equipe e usuário</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {view === "quantitativo" && dados && dados.totalValidos > 0 && (
            <>
              <select value={equipeQuant} onChange={e=>setEquipeQuant(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]">
                <option value="">Todas as equipes</option>
                {porCategoria.map(c=><option key={c.categoria} value={c.categoria}>{c.categoria}</option>)}
              </select>
              <button onClick={gerarPDF}
                className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition">
                ↓ PDF
              </button>
              <button onClick={baixarJPEG}
                className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition">
                ↓ JPEG
              </button>
            </>
          )}
          {view === "lista" && totalValidos > 0 && (
            <button onClick={exportXLS} disabled={xlsExporting}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {xlsExporting ? "Exportando..." : "↓ Exportar XLS"}
            </button>
          )}
          {totalValidos > 0 && (
            <button onClick={handleLimpar}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
              Limpar dados
            </button>
          )}
          <button onClick={() => { setImportModal(true); setSelectedFiles([]); setImportResult(null); }}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar chamados
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        <button onClick={() => setView("lista")}
          className={`px-4 py-1.5 text-sm rounded-md transition font-medium ${view==="lista"?"bg-gray-700 text-white":"text-gray-400 hover:text-white"}`}>
          Lista
        </button>
        <button onClick={() => setView("quantitativo")}
          className={`px-4 py-1.5 text-sm rounded-md transition font-medium ${view==="quantitativo"?"bg-gray-700 text-white":"text-gray-400 hover:text-white"}`}>
          Quantitativo
        </button>
      </div>

      {/* ── LISTA ── */}
      {view === "lista" && (
        <>
          {/* Stats principais */}
          {dados && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-w-[150px] border-t-2 border-t-blue-600">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Total</p>
                  <p className="text-3xl font-bold text-white tabular-nums">{totalValidos.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-gray-500 mt-1">chamados</p>
                </div>

                {porCategoria.map(cat => {
                  const ativo = filtroCategoria === cat.categoria;
                  const sla = getSLA(cat.categoria);
                  const tipoMatch = SLA_RULES.find(r => cat.categoria.toLowerCase().includes(r.keyword.toLowerCase()));
                  const label = tipoMatch ? tipoMatch.keyword : cat.categoria;
                  const colorMap: Record<string, string> = {
                    "Erro ou Falha": "border-t-red-500",
                    Cadastro:        "border-t-sky-500",
                    Orientação:      "border-t-green-500",
                    Migração:        "border-t-orange-500",
                  };
                  const numColor: Record<string, string> = {
                    "Erro ou Falha": "text-red-400",
                    Cadastro:        "text-sky-400",
                    Orientação:      "text-green-400",
                    Migração:        "text-orange-400",
                  };
                  const accent = Object.keys(colorMap).find(k => cat.categoria.includes(k)) ?? "";
                  return (
                    <button key={cat.categoria} onClick={() => toggleCategoria(cat.categoria)} title={cat.categoria}
                      className={`rounded-xl px-4 py-4 border text-left transition min-w-[150px] border-t-2 ${
                        colorMap[accent] ?? "border-t-gray-500"
                      } ${ativo ? "bg-gray-700 border-gray-500 ring-2 ring-white/20" : "bg-gray-900 border-gray-800 hover:bg-gray-800"}`}>
                      <p className="text-sm font-medium text-gray-300 mb-2">{label}</p>
                      <p className={`text-3xl font-bold tabular-nums ${numColor[accent] ?? "text-white"}`}>
                        {cat.total.toLocaleString("pt-BR")}
                      </p>
                      {sla !== null && <p className="text-xs text-gray-500 mt-1">≥{sla} dias</p>}
                      {ativo && <p className="text-xs text-white/60 mt-1">✓ filtrado</p>}
                    </button>
                  );
                })}

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-w-[150px] border-t-2 border-t-gray-600">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Período</p>
                  <p className="text-xs font-medium text-gray-300">
                    {dados.periodoMin ? fmtDateTime(dados.periodoMin).slice(0,10) : "—"}
                  </p>
                  <p className="text-xs text-gray-500">→ {dados.periodoMax ? fmtDateTime(dados.periodoMax).slice(0,10) : "—"}</p>
                </div>
              </div>

              {temFiltro && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-yellow-400">
                    {`Filtrando: ${filtroCategoria}`} — {total.toLocaleString("pt-BR")} resultado(s)
                  </span>
                  <button onClick={clearFiltros} className="text-xs text-gray-500 hover:text-white underline">Limpar filtro</button>
                </div>
              )}
            </>
          )}

          {/* Pesquisa */}
          {totalValidos > 0 && (
            <div className="mb-4">
              <div className="relative w-fit">
                <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Pesquisar Chamado..."
                  className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg pl-7 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">🔍</span>
                {busca && <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>}
              </div>
            </div>
          )}

          {/* Tabela */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Nº Chamado (Assyst)</th>
                  <th className="text-left px-4 py-3">Abertura</th>
                  <th className="text-left px-4 py-3">Equipe Atribuída</th>
                  <th className="text-left px-4 py-3">Usuário Atribuído</th>
                  <th className="text-left px-4 py-3">Movimentação</th>
                  <th className="text-left px-4 py-3">Situação</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>}
                {!loading && chamados.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {totalValidos===0?"Nenhum chamado importado":"Nenhum chamado encontrado"}
                  </td></tr>
                )}
                {chamados.map(c => {
                  const dias = diasDesde(c.dataAbertura);
                  const sla = getSLA(c.equipeAtribuida);
                  const atrasado = sla !== null && dias >= sla;
                  return (
                    <tr key={c.id} className={`border-b border-gray-800 last:border-0 transition ${atrasado?"bg-red-950/30 hover:bg-red-950/50 border-l-2 border-l-red-600":"hover:bg-gray-800/50"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a href={`https://cati.tjce.jus.br/assystnet/#events/${c.numero}?eventType=1&currentIndex=0`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-mono font-medium hover:underline transition">
                            {c.numero}
                          </a>
                          <DiasBadge dias={dias} equipeAtribuida={c.equipeAtribuida}/>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">{fmtDateTime(c.dataAbertura)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 whitespace-nowrap">{c.equipeAtribuida??"—"}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                        {c.usuarioAtribuido ?? <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">{fmtDateTime(c.dataMovimentacao)}</td>
                      <td className="px-4 py-3">
                        {c.situacaoRegra
                          ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.situacaoRegra.toLowerCase()==="aberto"?"bg-green-500/20 text-green-400 border border-green-500/30":"bg-gray-700 text-gray-400"}`}>{c.situacaoRegra}</span>
                          : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && total > 0 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-gray-500">
                Exibindo <span className="text-gray-300">{(page-1)*100+1}–{Math.min(page*100,total)}</span> de <span className="text-gray-300">{total.toLocaleString("pt-BR")}</span> registros
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => load(page-1, busca, filtroCategoria)} disabled={page===1}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
                  ← Anterior
                </button>
                <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
                <button onClick={() => load(page+1, busca, filtroCategoria)} disabled={page===totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── QUANTITATIVO ── */}
      {view === "quantitativo" && (
        <div>
          {!dados || dados.totalValidos === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">Nenhum dado disponível</p>
              <p className="text-sm mt-1">Importe chamados primeiro.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Total de chamados</p>
                  <p className="text-3xl font-bold text-white">{dados.totalValidos.toLocaleString("pt-BR")}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Período dos dados</p>
                  <p className="text-sm font-medium text-gray-300 mt-1">
                    {dados.periodoMin ? fmtDateTime(dados.periodoMin).slice(0,10) : "—"} → {dados.periodoMax ? fmtDateTime(dados.periodoMax).slice(0,10) : "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Distribuição por equipe</h3>
                  <DonutChart
                    itens={(equipeQuant?porCategoria.filter(c=>c.categoria===equipeQuant):porCategoria).map(c=>({label:c.categoria,value:c.total}))}
                    onSelect={label=>setEquipeQuant(label===equipeQuant?"":label)}
                    selecionado={equipeQuant}
                  />
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Chamados por equipe</h3>
                  <BarrasHorizontais
                    itens={equipeQuant?porCategoria.filter(c=>c.categoria===equipeQuant):porCategoria}
                    total={equipeQuant?porCategoria.filter(c=>c.categoria===equipeQuant).reduce((s,c)=>s+c.total,0):dados.totalValidos}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Importar */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Importar Chamados Power BI</h3>
            <p className="text-xs text-gray-400 mb-4">Selecione o arquivo exportado do Power BI (.ods ou .xlsx). A coluna G deve conter o Usuário Atribuído.</p>
            <div className="border-2 border-dashed border-gray-700 hover:border-blue-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {selectedFiles.length===0
                  ? "Clique para selecionar arquivo(s) (.ods / .xlsx)"
                  : selectedFiles.length===1 ? selectedFiles[0].name : `${selectedFiles.length} arquivos selecionados`}
              </p>
              {importResult?.error && <p className="text-red-400 text-xs mt-2">{importResult.error}</p>}
            </div>
            <input ref={fileRef} type="file" accept=".ods,.xlsx,.xls" multiple className="hidden"
              onChange={e=>{setSelectedFiles(Array.from(e.target.files??[]));setImportResult(null);}}/>
            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo-powerbi" checked={substituir} onChange={()=>setSubstituir(true)} className="accent-blue-500"/>
                <span className="text-sm text-gray-300">Substituir todos os dados</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo-powerbi" checked={!substituir} onChange={()=>setSubstituir(false)} className="accent-blue-500"/>
                <span className="text-sm text-gray-300">Adicionar aos existentes</span>
              </label>
            </div>
            {substituir && <p className="text-xs text-amber-500/80 mt-1.5">Os dados anteriores serão apagados antes de importar.</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImportModal(false); setSelectedFiles([]); setImportResult(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
              <button onClick={handleImport} disabled={selectedFiles.length===0||importing}
                className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                {importing?"Importando...":"Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
