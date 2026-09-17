"use client";

import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Produtividade = {
  id: number;
  numeroChamado: string;
  dataAbertura: string | null;
  equipeAtribuida: string | null;
  usuarioAtribuido: string | null;
  usuarioFechamento: string | null;
  dataResolucao: string | null;
  situacaoRegra: string | null;
};

type Dados = {
  registros: Produtividade[];
  total: number;
  page: number;
  totalPages: number;
  totalRegistros: number;
  equipes: string[];
  atendentes: string[];
  atendentesCount: number;
  periodoInicio: string | null;
  periodoFim: string | null;
  periodoResInicio: string | null;
  periodoResFim: string | null;
};

type UserStat = {
  usuario: string;
  equipe: string | null;
  recebidos: number;
  emAberto: number;
  pausados: number;
  resolvidos: number;
  taxaResolucao: number;
  tmrHoras: number;
  tmrDias: number;
};

type Totais = UserStat & { usuario: never };

type DadosStats = {
  stats: UserStat[];
  totais: Omit<UserStat, "usuario">;
  equipes: string[];
  totalRegistros: number;
  periodoInicio: string | null;
  periodoFim: string | null;
  periodoResInicio: string | null;
  periodoResFim: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function diasResolucao(abertura: string | null, resolucao: string | null): number | null {
  if (!abertura || !resolucao) return null;
  return Math.max(0, Math.floor((new Date(resolucao).getTime() - new Date(abertura).getTime()) / 86400000));
}

function DiasBadge({ dias }: { dias: number }) {
  if (dias > 30) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">⚠ {dias}d</span>;
  if (dias > 14) return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold">{dias}d</span>;
  if (dias > 3) return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">{dias}d</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-600 text-white text-xs font-bold">{dias}d</span>;
}

const CORES_CHART = [
  "#4f8ef7","#34d399","#fb923c","#a78bfa","#f472b6",
  "#38bdf8","#facc15","#4ade80","#e879f9","#2dd4bf",
  "#fbbf24","#818cf8","#f87171",
];

function DonutChartProd({ itens, onSelect, selecionado }: {
  itens: { label: string; value: number }[];
  onSelect?: (label: string) => void;
  selecionado?: string;
}) {
  const total = itens.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const cx = 150, cy = 150, or_ = 128, ir = 68;
  let ang = -Math.PI / 2;
  const fatias = itens.map((d, i) => {
    const frac = d.value / total;
    const sa = ang, ea = ang + frac * 2 * Math.PI; ang = ea;
    const ox1 = cx + or_ * Math.cos(sa), oy1 = cy + or_ * Math.sin(sa);
    const ox2 = cx + or_ * Math.cos(ea), oy2 = cy + or_ * Math.sin(ea);
    const ix1 = cx + ir * Math.cos(sa),  iy1 = cy + ir * Math.sin(sa);
    const ix2 = cx + ir * Math.cos(ea),  iy2 = cy + ir * Math.sin(ea);
    const large = (ea - sa) > Math.PI ? 1 : 0;
    const path = `M${ox1.toFixed(1)},${oy1.toFixed(1)} A${or_},${or_} 0 ${large} 1 ${ox2.toFixed(1)},${oy2.toFixed(1)} L${ix2.toFixed(1)},${iy2.toFixed(1)} A${ir},${ir} 0 ${large} 0 ${ix1.toFixed(1)},${iy1.toFixed(1)} Z`;
    const ma = sa + (ea - sa) / 2, lr = (or_ + ir) / 2;
    const cor = CORES_CHART[i % CORES_CHART.length];
    return { label: d.label, value: d.value, path, cor, sel: d.label === selecionado,
      pct: (frac * 100).toFixed(1),
      lx: (cx + lr * Math.cos(ma)).toFixed(1), ly: (cy + lr * Math.sin(ma)).toFixed(1),
      show: frac >= 0.03 };
  });
  return (
    <div className="flex flex-col gap-4">
      <svg viewBox="0 0 300 300" className="w-full max-w-[260px] mx-auto">
        {fatias.map((f, i) => (
          <path key={i} d={f.path} fill={f.cor} stroke="#0f172a" strokeWidth="1.5"
            style={f.sel ? { filter: "brightness(1.25) drop-shadow(0 0 6px rgba(255,255,255,0.25))" } : {}}
            className={onSelect ? "cursor-pointer hover:brightness-110 transition-all" : ""}
            onClick={() => onSelect?.(f.label === selecionado ? "" : f.label)} />
        ))}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="26" fontWeight="800" fill="white">
          {total.toLocaleString("pt-BR")}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#64748b" letterSpacing="2">
          RECEBIDOS
        </text>
        {fatias.filter(f => f.show).map((f, i) => (
          <text key={i} x={f.lx} y={f.ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="10.5" fontWeight="700" fill="white" style={{ pointerEvents: "none" }}>
            {f.pct}%
          </text>
        ))}
      </svg>
      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {fatias.map((f, i) => (
          <div key={i} onClick={() => onSelect?.(f.label === selecionado ? "" : f.label)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition
              ${onSelect ? "cursor-pointer hover:bg-white/5" : ""}
              ${f.sel ? "bg-white/10 ring-1 ring-white/20" : ""}`}>
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: f.cor }} />
            <span className="flex-1 text-gray-300 font-medium truncate" title={f.label}>{f.label}</span>
            <span className="font-mono font-bold text-white tabular-nums">{f.value.toLocaleString("pt-BR")}</span>
            <span className="text-gray-500 w-11 text-right">{f.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarrasProd({ itens, total }: { itens: { nome: string; total: number }[]; total: number }) {
  if (itens.length === 0) return null;
  const max = Math.max(...itens.map(d => d.total), 1);
  return (
    <div className="space-y-1.5 overflow-y-auto max-h-[400px] pr-1">
      {itens.map((d, i) => {
        const pct = ((d.total / total) * 100).toFixed(1);
        const barW = ((d.total / max) * 100).toFixed(1);
        return (
          <div key={d.nome} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition">
            <span className="text-xs font-mono text-gray-600 w-5 shrink-0 text-right">{i + 1}</span>
            <span className="text-xs font-medium truncate w-40 shrink-0 text-gray-200" title={d.nome}>{d.nome}</span>
            <div className="flex-1 h-3.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${barW}%` }} />
            </div>
            <span className="font-mono font-bold text-sm tabular-nums w-10 text-right shrink-0 text-white">{d.total}</span>
            <span className="text-gray-500 text-xs w-10 text-right shrink-0">{pct}%</span>
          </div>
        );
      })}
      <div className="flex items-center gap-2.5 px-3 py-2 mt-1 border-t border-gray-800">
        <span className="text-xs text-gray-500 w-5 shrink-0" />
        <span className="text-xs font-semibold text-gray-400 w-40 shrink-0">Total</span>
        <span className="flex-1" />
        <span className="font-mono font-bold text-sm text-white w-10 text-right shrink-0">{total.toLocaleString("pt-BR")}</span>
        <span className="text-gray-500 text-xs w-10 text-right shrink-0">100%</span>
      </div>
    </div>
  );
}

function TaxaBadge({ taxa }: { taxa: number }) {
  const t = taxa;
  const bg = t >= 85 ? "bg-green-600" : t >= 80 ? "bg-yellow-600" : "bg-red-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${bg} min-w-[52px] text-center`}>
      {t.toFixed(1)}%
    </span>
  );
}

export default function ProdutividadePage() {
  const [view, setView] = useState<"lista" | "quantitativo">("lista");
  const [dados, setDados] = useState<Dados | null>(null);
  const [statsData, setStatsData] = useState<DadosStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [importing, setImporting] = useState(false);
  const [xlsExporting, setXlsExporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<{ count?: number; skipped?: number; error?: string } | null>(null);
  const [busca, setBusca] = useState("");
  const [equipe, setEquipe] = useState("");
  const [atendente, setAtendente] = useState("");
  const [anoRec, setAnoRec] = useState("");
  const [dataRecDe, setDataRecDe] = useState("");
  const [dataRecAte, setDataRecAte] = useState("");
  const [anoRes, setAnoRes] = useState("");
  const [dataResDe, setDataResDe] = useState("");
  const [dataResAte, setDataResAte] = useState("");
  const [substituir, setSubstituir] = useState(true);
  const [subViewQuant, setSubViewQuant] = useState<"lista" | "graficos">("lista");
  const [equipeGrafico, setEquipeGrafico] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function buildDateParams(p: URLSearchParams) {
    if (anoRec)    p.set("anoRec", anoRec);
    if (dataRecDe) p.set("dataRecDe", dataRecDe);
    if (dataRecAte)p.set("dataRecAte", dataRecAte);
    if (anoRes)    p.set("anoRes", anoRes);
    if (dataResDe) p.set("dataResDe", dataResDe);
    if (dataResAte)p.set("dataResAte", dataResAte);
  }

  function load(pg = 1, buscaQ = "", equipeQ = "", atendenteQ = "") {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (buscaQ)    params.set("busca", buscaQ);
    if (equipeQ)   params.set("equipe", equipeQ);
    if (atendenteQ)params.set("atendente", atendenteQ);
    buildDateParams(params);
    fetch(`/api/produtividade?${params}`)
      .then(r => r.json())
      .then((d: Dados) => { setDados(d); setLoading(false); });
  }

  function loadStats(equipeQ = "", atendenteQ = "") {
    setLoadingStats(true);
    const params = new URLSearchParams({ stats: "1" });
    if (equipeQ)    params.set("equipe", equipeQ);
    if (atendenteQ) params.set("atendente", atendenteQ);
    buildDateParams(params);
    fetch(`/api/produtividade?${params}`)
      .then(r => r.json())
      .then((d: DadosStats) => { setStatsData(d); setLoadingStats(false); });
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (view === "quantitativo") loadStats(equipe, atendente);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, equipe, atendente, anoRec, dataRecDe, dataRecAte, anoRes, dataResDe, dataResAte]);

  useEffect(() => {
    const t = setTimeout(() => load(1, busca, equipe, atendente), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, equipe, atendente, anoRec, dataRecDe, dataRecAte, anoRes, dataResDe, dataResAte]);

  async function handleImport() {
    if (selectedFiles.length === 0) return;
    setImporting(true);
    setImportResult(null);
    let totalCount = 0, totalSkipped = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      const formData = new FormData();
      formData.append("file", selectedFiles[i]);
      formData.append("substituir", (i === 0 && substituir) ? "1" : "0");
      const res = await fetch("/api/produtividade/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setImportResult({ error: data.error ?? "Erro ao importar" }); setImporting(false); return; }
      totalCount += data.count ?? 0;
      totalSkipped += data.skipped ?? 0;
    }
    setImportResult({ count: totalCount, skipped: totalSkipped });
    setImportModal(false);
    setSelectedFiles([]);
    load(1, busca, equipe, atendente);
    if (view === "quantitativo") loadStats(equipe);
    setImporting(false);
  }

  async function handleLimpar() {
    if (!confirm("Limpar todos os registros de produtividade importados?")) return;
    await fetch("/api/produtividade", { method: "DELETE" });
    setEquipe(""); setAtendente(""); setBusca("");
    load();
    setStatsData(null);
  }

  async function exportXLS() {
    setXlsExporting(true);
    try {
      const params = new URLSearchParams({ export: "1" });
      if (busca) params.set("busca", busca);
      if (equipe) params.set("equipe", equipe);
      if (atendente) params.set("atendente", atendente);
      const res = await fetch(`/api/produtividade?${params}`);
      const data = await res.json();
      const todos: Produtividade[] = data.registros ?? [];
      function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
      const dataRows = todos.map(r =>
        `<tr><td>${esc(r.numeroChamado)}</td><td>${esc(fmtDateTime(r.dataAbertura))}</td><td>${esc(r.equipeAtribuida ?? "")}</td><td>${esc(r.usuarioAtribuido ?? "")}</td><td>${esc(r.usuarioFechamento ?? "")}</td><td>${esc(fmtDateTime(r.dataResolucao))}</td><td>${esc(r.situacaoRegra ?? "")}</td></tr>`
      ).join("");
      const html = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}th{background:#f0f0f0}</style></head><body><table><tr><th>Nº Chamado</th><th>Abertura</th><th>Equipe Atribuída</th><th>Usuário Atribuído</th><th>Usuário Fechamento</th><th>Resolução</th><th>Situação</th></tr>${dataRows}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "produtividade.xls"; a.click();
      URL.revokeObjectURL(url);
    } finally { setXlsExporting(false); }
  }

  function gerarPDF() {
    if (!statsData || statsData.stats.length === 0) return;

    function hexToRgbPDF(hex: string): [number, number, number] {
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }

    function desenharDonutPDF(
      doc: jsPDF,
      dados: { label: string; value: number }[],
      total: number,
      ox: number, oy: number, sz: number
    ) {
      const cx = ox + sz / 2, cy = oy + sz / 2;
      const R = sz / 2 * 0.90, ri = sz / 2 * 0.44;
      const STEPS = 64;
      let ang = -Math.PI / 2;
      dados.forEach((d, i) => {
        const frac = d.value / total;
        const sa = ang, ea = ang + frac * 2 * Math.PI;
        ang = ea;
        const steps = Math.max(4, Math.ceil(STEPS * frac));
        const pts: [number, number][] = [];
        for (let j = 0; j <= steps; j++) {
          const a = sa + (ea - sa) * j / steps;
          pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
        }
        for (let j = steps; j >= 0; j--) {
          const a = sa + (ea - sa) * j / steps;
          pts.push([cx + ri * Math.cos(a), cy + ri * Math.sin(a)]);
        }
        const [r, g, b] = hexToRgbPDF(CORES_CHART[i % CORES_CHART.length]);
        doc.setFillColor(r, g, b);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.35);
        const lines: [number, number][] = pts.slice(1).map((p, k) => [p[0] - pts[k][0], p[1] - pts[k][1]]);
        doc.lines(lines, pts[0][0], pts[0][1], [1, 1], "FD", true);
        if (frac >= 0.03) {
          const ma = sa + (ea - sa) / 2, lr = (R + ri) / 2;
          doc.setFontSize(6.5);
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.text(`${(frac * 100).toFixed(1)}%`, cx + lr * Math.cos(ma), cy + lr * Math.sin(ma), { align: "center", baseline: "middle" });
        }
      });
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(255, 255, 255);
      doc.circle(cx, cy, ri, "F");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(total.toLocaleString("pt-BR"), cx, cy - 1.5, { align: "center", baseline: "middle" });
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.text("RESOLVIDOS", cx, cy + 3.5, { align: "center", baseline: "middle" });
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const geradoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const totalResolvidos = statsData.totais.resolvidos;

    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Produtividade - Quantitativo", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total: ${totalResolvidos.toLocaleString("pt-BR")} resolvidos`, 14, 26);
    doc.text(`Gerado em: ${geradoEm}`, 14, 31);

    // Agrupa stats por equipe
    const porEquipe = new Map<string, UserStat[]>();
    for (const s of statsData.stats) {
      const eq = s.equipe ?? "Sem equipe";
      if (!porEquipe.has(eq)) porEquipe.set(eq, []);
      porEquipe.get(eq)!.push(s);
    }
    const equipesSorted = [...porEquipe.entries()].sort((a, b) =>
      b[1].reduce((s, u) => s + u.resolvidos, 0) - a[1].reduce((s, u) => s + u.resolvidos, 0)
    );

    const donutItens = equipesSorted.map(([eq, us]) => ({ label: eq, value: us.reduce((s, u) => s + u.resolvidos, 0) }));
    const donutTotal = donutItens.reduce((s, d) => s + d.value, 0);

    let y = 37;
    if (donutTotal > 0) {
      const chartX = 14, chartY = 36, chartSz = 78;
      desenharDonutPDF(doc, donutItens, donutTotal, chartX, chartY, chartSz);
      const legX = chartX + chartSz + 5;
      let legY = chartY + 5;
      donutItens.forEach((d, i) => {
        const [r, g, b] = hexToRgbPDF(CORES_CHART[i % CORES_CHART.length]);
        doc.setFillColor(r, g, b);
        doc.rect(legX, legY - 2.8, 3.5, 3.5, "F");
        const pct = ((d.value / donutTotal) * 100).toFixed(1);
        doc.setFontSize(7.5);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "normal");
        doc.text(`${d.label}  ${d.value.toLocaleString("pt-BR")} (${pct}%)`, legX + 4.8, legY);
        legY += 6.8;
      });
      y = chartY + chartSz + 8;
    }

    for (const [eq, usuarios] of equipesSorted) {
      const eqResolvidos = usuarios.reduce((s, u) => s + u.resolvidos, 0);
      const pct = donutTotal > 0 ? ((eqResolvidos / donutTotal) * 100).toFixed(1) : "0.0";
      const rows = usuarios.map((u, i) => [
        `${i + 1}`,
        u.usuario,
        u.recebidos.toLocaleString("pt-BR"),
        u.emAberto > 0 ? u.emAberto.toLocaleString("pt-BR") : "—",
        u.pausados  > 0 ? u.pausados.toLocaleString("pt-BR")  : "—",
        u.resolvidos.toLocaleString("pt-BR"),
        `${u.taxaResolucao.toFixed(1)}%`,
        String(u.tmrDias || "—"),
      ]);
      autoTable(doc, {
        startY: y,
        head: [[{ content: `${eq}  -  ${eqResolvidos.toLocaleString("pt-BR")} resolvidos (${pct}%)`, colSpan: 8 }]],
        body: rows,
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "center", cellWidth: 22 },
          7: { halign: "right", cellWidth: 16 },
        },
        headStyles: { fillColor: [30, 41, 59], textColor: [200, 200, 220], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          if (data.column.index === 6) {
            const txt = String(data.cell.raw ?? "").replace("%", "").trim();
            const taxa = parseFloat(txt);
            if (!isNaN(taxa)) {
              const [r, g, b] = taxa >= 85 ? [34, 197, 94] : taxa >= 80 ? [161, 98, 7] : [185, 28, 28];
              data.cell.styles.fillColor = [r, g, b];
              data.cell.styles.textColor = [255, 255, 255];
            }
          }
        },
        didDrawPage: () => { y = 14; },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    // Linha de totais
    const t = statsData.totais;
    const totalDen = t.resolvidos + t.emAberto + t.pausados;
    autoTable(doc, {
      startY: y,
      body: [[
        "", "TOTAL",
        t.recebidos.toLocaleString("pt-BR"),
        t.emAberto  > 0 ? t.emAberto.toLocaleString("pt-BR")  : "—",
        t.pausados  > 0 ? t.pausados.toLocaleString("pt-BR")  : "—",
        t.resolvidos.toLocaleString("pt-BR"),
        totalDen > 0 ? `${((t.resolvidos / totalDen) * 100).toFixed(1)}%` : "—",
        String(t.tmrDias || "—"),
      ]],
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "center", cellWidth: 22 },
        7: { halign: "right", cellWidth: 16 },
      },
      bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40], fontStyle: "bold", fillColor: [226, 232, 240] },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.column.index === 6) {
          const txt = String(data.cell.raw ?? "").replace("%", "").trim();
          const taxa = parseFloat(txt);
          if (!isNaN(taxa)) {
            const [r, g, b] = taxa >= 98 ? [21, 128, 61] : taxa >= 95 ? [22, 163, 74] : taxa >= 90 ? [34, 197, 94] : taxa >= 80 ? [161, 98, 7] : [185, 28, 28];
            data.cell.styles.fillColor = [r, g, b];
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      },
    });

    doc.save(`produtividade-quantitativo-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function baixarJPEG() {
    if (!statsData || statsData.stats.length === 0) return;
    const W = 1100;
    const PAD = 24;
    const ROW_H = 28;
    const HEADER_H = 80;
    const COLS = [300, 140, 80, 80, 80, 80, 100, 80, 80];
    const HEADS = ["Usuário Fechamento", "Equipe", "Recebidos", "Em Aberto", "Pausados", "Resolvidos", "Taxa Resolução", "TMR Dias", "TMR Horas"];
    const totalH = HEADER_H + (ROW_H * 1.5) + (statsData.stats.length + 1) * ROW_H + PAD;

    const canvas = document.createElement("canvas");
    canvas.width = W * 2; canvas.height = totalH * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);

    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, totalH);
    ctx.fillStyle = "#f1f5f9"; ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText("Produtividade - Quantitativo", PAD, 30);
    ctx.fillStyle = "#64748b"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(`Gerado em: ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`, PAD, 50);

    let x = PAD, y = HEADER_H;
    ctx.fillStyle = "#1e293b"; ctx.fillRect(PAD, y, W - PAD * 2, ROW_H * 1.4);
    ctx.fillStyle = "#94a3b8"; ctx.font = "bold 10px system-ui, sans-serif";
    x = PAD + 8;
    for (let i = 0; i < HEADS.length; i++) {
      ctx.fillText(HEADS[i], x + 4, y + 20);
      x += COLS[i];
    }
    y += ROW_H * 1.4;

    const allRows = [...statsData.stats, { ...statsData.totais, usuario: "TOTAL" } as UserStat];
    for (let ri = 0; ri < allRows.length; ri++) {
      const s = allRows[ri];
      const isTotal = ri === allRows.length - 1;
      ctx.fillStyle = isTotal ? "#1e293b" : ri % 2 === 0 ? "#0f172a" : "#111827";
      ctx.fillRect(PAD, y, W - PAD * 2, ROW_H);

      const cells = [
        s.usuario,
        (s as UserStat).equipe ?? "—",
        s.recebidos.toLocaleString("pt-BR"),
        s.emAberto > 0 ? s.emAberto.toLocaleString("pt-BR") : "—",
        s.pausados  > 0 ? s.pausados.toLocaleString("pt-BR")  : "—",
        s.resolvidos.toLocaleString("pt-BR"),
        `${s.taxaResolucao.toFixed(1)}%`,
        String(s.tmrDias  || "—"),
        String(s.tmrHoras || "—"),
      ];
      x = PAD + 8;
      for (let i = 0; i < cells.length; i++) {
        // Coluna Taxa Resolução (índice 6): badge colorido
        if (i === 6) {
          const taxa = s.taxaResolucao;
          const bgColor = taxa >= 85 ? "#22c55e" : taxa >= 80 ? "#a16207" : "#b91c1c";
          const badgeW = COLS[i] - 12;
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 6, badgeW, ROW_H - 12, 4);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px monospace";
          const tw = ctx.measureText(cells[i]).width;
          ctx.fillText(cells[i], x + 2 + (badgeW - tw) / 2, y + 19);
        } else {
          ctx.fillStyle = isTotal ? "#e2e8f0" : i === 0 ? "#e2e8f0" : i === 3 && s.emAberto > 0 ? "#fbbf24" : i === 4 && s.pausados > 0 ? "#fb923c" : "#94a3b8";
          ctx.font = isTotal ? "bold 10px monospace" : i === 0 ? "11px system-ui" : "10px monospace";
          ctx.fillText(cells[i], x + 4, y + 19);
        }
        x += COLS[i];
      }
      y += ROW_H;
    }

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.95);
    a.download = `produtividade-quantitativo-${new Date().toISOString().slice(0, 10)}.jpg`;
    a.click();
  }

  const totalRegistros = dados?.totalRegistros ?? 0;
  const registros = dados?.registros ?? [];
  const page = dados?.page ?? 1;
  const totalPages = dados?.totalPages ?? 1;
  const total = dados?.total ?? 0;
  const equipes = dados?.equipes ?? statsData?.equipes ?? [];
  const atendentes = dados?.atendentes ?? [];
  const temFiltro = !!(busca || equipe || atendente || anoRec || dataRecDe || dataRecAte || anoRes || dataResDe || dataResAte);

  function anosEntre(ini: string | null | undefined, fim: string | null | undefined): number[] {
    if (!ini || !fim) return [];
    const start = new Date(ini).getFullYear();
    const end   = new Date(fim).getFullYear();
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  const anosRecebimento = anosEntre(
    dados?.periodoInicio ?? statsData?.periodoInicio,
    dados?.periodoFim    ?? statsData?.periodoFim
  );
  const anosResolucao = anosEntre(
    dados?.periodoResInicio ?? statsData?.periodoResInicio,
    dados?.periodoResFim    ?? statsData?.periodoResFim
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Produtividade</h2>
          <p className="text-sm text-gray-400 mt-0.5">Registros de produtividade por operador</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {view === "lista" && totalRegistros > 0 && (
            <button onClick={exportXLS} disabled={xlsExporting}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              {xlsExporting ? "Exportando..." : "↓ Exportar XLS"}
            </button>
          )}
          {view === "quantitativo" && statsData && statsData.stats.length > 0 && (
            <>
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
          {totalRegistros > 0 && (
            <button onClick={handleLimpar}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
              Limpar dados
            </button>
          )}
          <button onClick={() => { setImportModal(true); setSelectedFiles([]); setImportResult(null); }}
            className="bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar planilha
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        <button onClick={() => setView("lista")}
          className={`text-sm px-4 py-1.5 rounded-md transition ${view === "lista" ? "bg-gray-700 text-white font-medium" : "text-gray-500 hover:text-gray-300"}`}>
          Lista
        </button>
        <button onClick={() => setView("quantitativo")}
          className={`text-sm px-4 py-1.5 rounded-md transition ${view === "quantitativo" ? "bg-gray-700 text-white font-medium" : "text-gray-500 hover:text-gray-300"}`}>
          Quantitativo
        </button>
      </div>

      {/* Sub-abas do Quantitativo */}
      {view === "quantitativo" && statsData && statsData.stats.length > 0 && (
        <div className="flex gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
          <button onClick={() => setSubViewQuant("lista")}
            className={`text-xs px-3 py-1.5 rounded transition ${subViewQuant === "lista" ? "bg-gray-700 text-white font-medium" : "text-gray-500 hover:text-gray-300"}`}>
            Lista
          </button>
          <button onClick={() => { setSubViewQuant("graficos"); setEquipeGrafico(""); }}
            className={`text-xs px-3 py-1.5 rounded transition ${subViewQuant === "graficos" ? "bg-gray-700 text-white font-medium" : "text-gray-500 hover:text-gray-300"}`}>
            Gráficos
          </button>
        </div>
      )}

      {/* Stats cards (Lista) */}
      {dados && totalRegistros > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Atendentes</p>
            <p className="text-3xl font-bold text-white">{(dados.atendentesCount ?? 0).toLocaleString("pt-BR")}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Período dos dados</p>
            <p className="text-xl font-bold text-white">
              {dados.periodoInicio && dados.periodoFim
                ? `${fmtDate(dados.periodoInicio)} → ${fmtDate(dados.periodoFim)}`
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Filtros (Lista + Quantitativo) */}
      {totalRegistros > 0 && (
        <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Equipe */}
          {equipes.length > 0 && (
            <select value={equipe} onChange={e => { setEquipe(e.target.value); setAtendente(""); }}
              className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48">
              <option value="">Todas as equipes</option>
              {equipes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          )}
          {/* Atendente — Lista e Quantitativo */}
          {atendentes.length > 0 && (
            <select value={atendente} onChange={e => setAtendente(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56">
              <option value="">Todos os atendentes</option>
              {atendentes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          {/* Busca — só na Lista */}
          {view === "lista" && (
            <div className="relative">
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Pesquisar chamado..."
                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg pl-7 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">🔍</span>
              {busca && <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>}
            </div>
          )}
          {temFiltro && (
            <button onClick={() => { setBusca(""); setEquipe(""); setAtendente(""); setAnoRec(""); setDataRecDe(""); setDataRecAte(""); setAnoRes(""); setDataResDe(""); setDataResAte(""); }}
              className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition">
              Limpar filtros
            </button>
          )}
        </div>

        {/* Filtros de data */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Recebimento */}
          <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Ano Receb.</span>
            <select value={anoRec} onChange={e => setAnoRec(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none">
              <option value="">Todos</option>
              {anosRecebimento.map(a => <option key={a} value={String(a)}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Data Receb.</span>
            <input type="date" value={dataRecDe} onChange={e => setDataRecDe(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none p-0 w-[105px]" />
            <span className="text-gray-600 text-xs">→</span>
            <input type="date" value={dataRecAte} onChange={e => setDataRecAte(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none p-0 w-[105px]" />
          </div>
          {/* Resolução */}
          <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Ano Resolução</span>
            <select value={anoRes} onChange={e => setAnoRes(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none">
              <option value="">Todos</option>
              {anosResolucao.map(a => <option key={a} value={String(a)}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Data Resolução</span>
            <input type="date" value={dataResDe} onChange={e => setDataResDe(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none p-0 w-[105px]" />
            <span className="text-gray-600 text-xs">→</span>
            <input type="date" value={dataResAte} onChange={e => setDataResAte(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none p-0 w-[105px]" />
          </div>
        </div>
        </div>
      )}

      {/* ── LISTA ── */}
      {view === "lista" && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[28%]" />
              <col className="w-[16%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nº Chamado</th>
                <th className="text-left px-4 py-3">Abertura</th>
                <th className="text-left px-4 py-3">Usuário Fechamento</th>
                <th className="text-left px-4 py-3">Resolução</th>
                <th className="text-left px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>}
              {!loading && registros.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {totalRegistros === 0 ? "Nenhum registro importado" : "Nenhum registro encontrado"}
                </td></tr>
              )}
              {registros.map(r => {
                const dias = diasResolucao(r.dataAbertura, r.dataResolucao);
                return (
                  <tr key={r.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={`https://cati.tjce.jus.br/assystnet/#events/${r.numeroChamado}?eventType=1&currentIndex=0`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-mono font-medium text-xs hover:underline transition">
                          {r.numeroChamado}
                        </a>
                        {dias !== null && <DiasBadge dias={dias} />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">{fmtDateTime(r.dataAbertura)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/40 truncate block max-w-full">
                        {r.usuarioFechamento ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs font-mono whitespace-nowrap">{fmtDateTime(r.dataResolucao)}</td>
                    <td className="px-4 py-3">
                      {r.situacaoRegra ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.situacaoRegra.toLowerCase().includes("resolvido") || r.situacaoRegra.toLowerCase().includes("fechado")
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : r.situacaoRegra.toLowerCase().includes("paus")
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : "bg-gray-700 text-gray-400"
                        }`}>{r.situacaoRegra}</span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação Lista */}
      {view === "lista" && totalPages > 1 && total > 0 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-gray-500">
            Exibindo <span className="text-gray-300">{(page - 1) * 100 + 1}–{Math.min(page * 100, total)}</span> de <span className="text-gray-300">{total.toLocaleString("pt-BR")}</span>
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => load(page - 1, busca, equipe, atendente)} disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">← Anterior</button>
            <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
            <button onClick={() => load(page + 1, busca, equipe, atendente)} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">Próxima →</button>
          </div>
        </div>
      )}

      {/* ── QUANTITATIVO ── */}
      {view === "quantitativo" && (
        loadingStats ? (
          <p className="text-gray-500 text-sm">Calculando estatísticas...</p>
        ) : !statsData || statsData.stats.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
            <p className="text-gray-500 text-sm">Nenhum dado importado ainda.</p>
          </div>
        ) : subViewQuant === "graficos" ? (() => {
          // Agrupa por equipe para o donut
          const porEquipe = new Map<string, { total: number; usuarios: { nome: string; total: number }[] }>();
          for (const s of statsData.stats) {
            const eq = s.equipe ?? "(Sem equipe)";
            if (!porEquipe.has(eq)) porEquipe.set(eq, { total: 0, usuarios: [] });
            const g = porEquipe.get(eq)!;
            g.total += s.recebidos;
            g.usuarios.push({ nome: s.usuario, total: s.recebidos });
          }
          const equipesList = [...porEquipe.entries()].map(([equipe, g]) => ({ equipe, ...g }))
            .sort((a, b) => b.total - a.total);
          const donutItens = equipesList.map(e => ({ label: e.equipe, value: e.total }));
          const eqSel = equipeGrafico ? equipesList.find(e => e.equipe === equipeGrafico) : null;
          return (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <p className="text-sm font-semibold text-white mb-0.5">Distribuição por equipe</p>
                <p className="text-xs text-gray-500 mb-5">Clique numa fatia ou item da legenda para ver os atendentes</p>
                <DonutChartProd itens={donutItens} onSelect={setEquipeGrafico} selecionado={equipeGrafico} />
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                {eqSel ? (
                  <>
                    <p className="text-sm font-semibold text-white mb-0.5">{eqSel.equipe}</p>
                    <p className="text-xs text-gray-500 mb-5">
                      {eqSel.total.toLocaleString("pt-BR")} recebidos · {eqSel.usuarios.length} atendente{eqSel.usuarios.length !== 1 ? "s" : ""}
                    </p>
                    <BarrasProd itens={eqSel.usuarios.sort((a, b) => b.total - a.total)} total={eqSel.total} />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[360px] gap-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-2xl opacity-40">📊</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-400">Selecione uma equipe</p>
                      <p className="text-xs text-gray-600 mt-1">Clique em uma fatia do gráfico ao lado<br/>para ver a distribuição por atendente</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide bg-gray-800/60">
                  <th className="text-left px-4 py-3">Usuário Fechamento</th>
                  <th className="text-left px-3 py-3">Equipe</th>
                  <th className="text-right px-3 py-3">Recebidos</th>
                  <th className="text-right px-3 py-3">Em Aberto</th>
                  <th className="text-right px-3 py-3">Pausados</th>
                  <th className="text-right px-3 py-3">Resolvidos</th>
                  <th className="text-center px-3 py-3">Taxa Resolução</th>
                  <th className="text-right px-3 py-3">TMR Dias</th>
                  <th className="text-right px-3 py-3">TMR Horas</th>
                </tr>
              </thead>
              <tbody>
                {statsData.stats.map((s, i) => (
                  <tr key={s.usuario} className={`border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40 transition ${i % 2 === 1 ? "bg-gray-800/20" : ""}`}>
                    <td className="px-4 py-2.5 text-sm text-gray-200 font-medium">{s.usuario}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">{s.equipe ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-white tabular-nums">{s.recebidos.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums">
                      {s.emAberto > 0 ? <span className="text-yellow-400 font-bold">{s.emAberto.toLocaleString("pt-BR")}</span> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums">
                      {s.pausados > 0 ? <span className="text-orange-400 font-bold">{s.pausados.toLocaleString("pt-BR")}</span> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-white tabular-nums">{s.resolvidos.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2.5 text-center"><TaxaBadge taxa={s.taxaResolucao} /></td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-gray-300 tabular-nums">{s.tmrDias || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-gray-300 tabular-nums">{s.tmrHoras || "—"}</td>
                  </tr>
                ))}
              </tbody>
              {/* Totais */}
              <tfoot>
                <tr className="border-t-2 border-gray-600 bg-gray-800/80">
                  <td className="px-4 py-3 text-sm font-bold text-white">TOTAL</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-white tabular-nums">{statsData.totais.recebidos.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold tabular-nums">
                    {statsData.totais.emAberto > 0 ? <span className="text-yellow-400">{statsData.totais.emAberto.toLocaleString("pt-BR")}</span> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold tabular-nums">
                    {statsData.totais.pausados > 0 ? <span className="text-orange-400">{statsData.totais.pausados.toLocaleString("pt-BR")}</span> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-white tabular-nums">{statsData.totais.resolvidos.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-3 text-center"><TaxaBadge taxa={statsData.totais.taxaResolucao} /></td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-gray-200 tabular-nums">{statsData.totais.tmrDias || "—"}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-gray-200 tabular-nums">{statsData.totais.tmrHoras || "—"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      {/* Modal Importar */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Importar Produtividade</h3>
            <p className="text-xs text-gray-400 mb-4">Selecione o arquivo exportado do Power BI (.ods ou .xlsx).</p>
            <div className="border-2 border-dashed border-gray-700 hover:border-blue-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {selectedFiles.length === 0
                  ? "Clique para selecionar arquivo(s) (.ods / .xlsx)"
                  : selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} arquivos selecionados`}
              </p>
              {importResult?.error && <p className="text-red-400 text-xs mt-2">{importResult.error}</p>}
            </div>
            <input ref={fileRef} type="file" accept=".ods,.xlsx,.xls" multiple className="hidden"
              onChange={e => { setSelectedFiles(Array.from(e.target.files ?? [])); setImportResult(null); }} />
            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo-prod" checked={substituir} onChange={() => setSubstituir(true)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Substituir todos os dados</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo-prod" checked={!substituir} onChange={() => setSubstituir(false)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Adicionar aos existentes</span>
              </label>
            </div>
            {substituir && <p className="text-xs text-amber-500/80 mt-1.5">Os dados anteriores serão apagados antes de importar.</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImportModal(false); setSelectedFiles([]); setImportResult(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">Cancelar</button>
              <button onClick={handleImport} disabled={selectedFiles.length === 0 || importing}
                className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                {importing ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
